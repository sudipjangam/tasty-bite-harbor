/**
 * syncManager.ts
 *
 * Manages offline write operations:
 *  - enqueueWrite()  → saves a pending DB write to IndexedDB
 *  - flushQueue()    → replays queued writes to Supabase on reconnect
 *  - removeQueuedWritesForOrder() → cancels unsynced writes when an offline order is deleted
 *  - generateOfflineOrderNumber() → creates a temporary offline token
 *
 * Conflict strategy: LAST-WRITE-WINS (by timestamp).
 * Conflicts are logged to the "conflictLog" IDB store.
 */

import { v4 as uuidv4 } from "uuid";
import {
  allocateQueueSeq,
  getDB,
  QueuedWrite,
  ConflictRecord,
  withLocalOrderLock,
  OFFLINE_QUEUE_EVENT,
  LOCAL_ORDERS_EVENT,
  SYNC_COMPLETED_EVENT,
} from "./offlineDB";
import { supabase } from "@/integrations/supabase/client";

// BUG-03 fix: Maximum retries before moving item to dead letter queue
const MAX_RETRIES = 10;

function emitSyncEvent(eventName: string, detail?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(eventName, detail ? { detail } : undefined));
  }
}

// ─── Enqueue ─────────────────────────────────────────────────────────────────

/**
 * Add a write operation to the offline queue.
 * Call this whenever Supabase is unreachable (isOnline === false).
 */
export async function enqueueWrite(
  type: QueuedWrite["type"],
  payload: Record<string, unknown>,
  operation: QueuedWrite["operation"] = "upsert",
): Promise<string> {
  const db = await getDB();
  const id = uuidv4();
  const item: QueuedWrite = {
    id,
    type,
    operation,
    payload,
    timestamp: Date.now(),
    seq: allocateQueueSeq(),
    retries: 0,
  };
  await db.put("writeQueue", item);
  emitSyncEvent(OFFLINE_QUEUE_EVENT, { source: "enqueue" });
  return id;
}

/** How many items are currently waiting to be synced */
export async function getPendingCount(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  const db = await getDB();
  return db.count("writeQueue");
}

/** Check whether legacy localStorage payment queue still holds unmigrated items */
export function hasLegacyPendingPayments(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem("pos_offline_payments_queue");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * Remove unsynced queue items belonging to an offline-created order if deleted before sync.
 * Returns the number of queued insert operations cancelled (0 if an insert already flushed or is in-flight).
 */
export async function removeQueuedWritesForOrder(
  kitchenOrderId: string,
  orderId?: string | null,
): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  const db = await getDB();
  const items = await db.getAll("writeQueue");
  let removedInserts = 0;
  let removedAny = false;
  const insertAlreadyDispatched =
    flushedOrInFlightInsertTargets.has(kitchenOrderId) ||
    (Boolean(orderId) && flushedOrInFlightInsertTargets.has(orderId!));

  for (const item of items) {
    if (item.id === inFlightItemId) {
      continue;
    }
    const p = item.payload || {};
    const matchesKitchen =
      (item.type === "kitchen_order" &&
        (p.id === kitchenOrderId ||
          p._updateByOrderId === kitchenOrderId ||
          (Boolean(orderId) && p._updateByOrderId === orderId))) ||
      p.kitchen_order_id === kitchenOrderId ||
      p._resolveOrderIdFromKitchenOrderId === kitchenOrderId;
    const matchesOrder =
      Boolean(orderId) &&
      ((item.type === "order" && p.id === orderId) || p.order_id === orderId);

    if (matchesKitchen || matchesOrder) {
      await db.delete("writeQueue", item.id);
      removedAny = true;
      if (item.operation !== "update") {
        removedInserts += 1;
      }
    }
  }

  if (removedAny) {
    emitSyncEvent(OFFLINE_QUEUE_EVENT);
  }
  return insertAlreadyDispatched ? 0 : removedInserts;
}

// ─── Flush ────────────────────────────────────────────────────────────────────

let isFlushing = false;
let inFlightItemId: string | null = null;
const flushedOrInFlightInsertTargets = new Set<string>();

function collectTargetIds(
  payload: Record<string, unknown> | undefined,
  targetSet: Set<string>,
) {
  if (!payload) return;
  if (typeof payload.id === "string") targetSet.add(payload.id);
  if (typeof payload.order_id === "string") targetSet.add(payload.order_id);
  if (typeof payload.kitchen_order_id === "string")
    targetSet.add(payload.kitchen_order_id);
  if (typeof payload._resolveOrderIdFromKitchenOrderId === "string")
    targetSet.add(payload._resolveOrderIdFromKitchenOrderId);
  if (typeof payload._updateByOrderId === "string")
    targetSet.add(payload._updateByOrderId);
}

/**
 * Replay all queued writes to Supabase in chronological order.
 * Safe to call multiple times; concurrent calls are de-duplicated.
 */
export async function flushQueue(
  onProgress?: (remaining: number) => void,
): Promise<void> {
  if (isFlushing || typeof indexedDB === "undefined") return;
  isFlushing = true;

  let syncedAny = false;
  const flushStartedAt = Date.now();
  const newlySyncedKitchenOrderIds: string[] = [];
  const syncedTargetIds = new Set<string>();
  const deadLetterTargetIds = new Set<string>();
  flushedOrInFlightInsertTargets.clear();

  try {
    const db = await getDB();
    // Fetch all items sorted by durable sequence (fallback to timestamp)
    const rawItems = await db.getAllFromIndex("writeQueue", "by-timestamp");
    const items = [...rawItems].sort(
      (a, b) => (a.seq ?? a.timestamp) - (b.seq ?? b.timestamp),
    );

    for (const item of items) {
      const currentItem = await db.get("writeQueue", item.id);
      if (!currentItem) {
        continue;
      }

      const needsInventoryDeduct =
        currentItem.type === "kitchen_order" &&
        typeof currentItem.payload?.id === "string" &&
        (currentItem.payload._deductInventory === true ||
          (currentItem.operation !== "update" &&
            (currentItem.payload.status === "preparing" ||
              currentItem.payload.status === "completed")));

      inFlightItemId = currentItem.id;
      if (currentItem.operation !== "update") {
        collectTargetIds(currentItem.payload, flushedOrInFlightInsertTargets);
      }

      try {
        await replayWrite(currentItem);
        const tx = db.transaction("writeQueue", "readwrite");
        await tx.store.delete(currentItem.id);
        if (needsInventoryDeduct) {
          const koId = String(currentItem.payload.id);
          await tx.store.put({
            id: `deduct_${koId}`,
            type: "deduct_inventory",
            operation: "insert",
            payload: { order_id: koId },
            timestamp: Date.now(),
            retries: 0,
          });
          newlySyncedKitchenOrderIds.push(koId);
        }
        await tx.done;
        syncedAny = true;
        collectTargetIds(currentItem.payload, syncedTargetIds);

        const remaining = await db.count("writeQueue");
        onProgress?.(remaining);
        emitSyncEvent(OFFLINE_QUEUE_EVENT);
      } catch (err) {
        const stillExists = await db.get("writeQueue", currentItem.id);
        if (!stillExists) {
          continue;
        }

        const nextRetries = stillExists.retries + 1;
        if (nextRetries >= MAX_RETRIES) {
          // BUG-03 fix: evict to conflict log as dead letter instead of retrying forever
          console.error(
            `[SyncManager] Max retries (${MAX_RETRIES}) exceeded for ${stillExists.type}/${stillExists.id}, moving to dead letter`,
          );
          const deadLetter: ConflictRecord = {
            id: stillExists.id,
            type: stillExists.type,
            localTimestamp: stillExists.timestamp,
            serverTimestamp: 0,
            resolvedAt: Date.now(),
            payload: {
              ...stillExists.payload,
              _deadLetterReason: String(err),
              _retries: nextRetries,
            },
          };
          await db.put("conflictLog", deadLetter);
          await db.delete("writeQueue", stillExists.id);
          collectTargetIds(stillExists.payload, deadLetterTargetIds);
          emitSyncEvent(OFFLINE_QUEUE_EVENT);
        } else {
          console.error(
            `[SyncManager] Failed to flush ${stillExists.type} (retry ${nextRetries}/${MAX_RETRIES}):`,
            err,
          );
          await db.put("writeQueue", { ...stillExists, retries: nextRetries });
        }
      } finally {
        inFlightItemId = null;
      }
    }

    // Drain any legacy localStorage queue entries created by older PaymentDialog builds
    await drainLegacyPaymentQueue();

    // Trigger inventory deduction for newly synced kitchen orders; delete durable retry row on success
    for (const koId of newlySyncedKitchenOrderIds) {
      try {
        const result = await supabase.functions.invoke("deduct-inventory-on-prep", {
          body: { order_id: koId },
        });
        if (result?.error || result?.data?.error) {
          throw result.error || new Error(String(result.data.error));
        }
        await db.delete("writeQueue", `deduct_${koId}`);
        emitSyncEvent(OFFLINE_QUEUE_EVENT);
      } catch (deductErr) {
        console.warn(
          `[SyncManager] Inventory deduction deferred for retry (${koId}):`,
          deductErr,
        );
      }
    }

    // Clean up localOrders mirror entries that have been synced and have no pending/dead-letter writes
    await pruneSyncedLocalOrders(db, syncedTargetIds, deadLetterTargetIds, flushStartedAt);

    if (syncedAny || deadLetterTargetIds.size > 0) {
      emitSyncEvent(LOCAL_ORDERS_EVENT);
    }
    if (syncedAny) {
      emitSyncEvent(SYNC_COMPLETED_EVENT);
    }
  } finally {
    inFlightItemId = null;
    flushedOrInFlightInsertTargets.clear();
    isFlushing = false;
  }
}

async function pruneSyncedLocalOrders(
  db: Awaited<ReturnType<typeof getDB>>,
  syncedTargetIds: Set<string>,
  deadLetterTargetIds: Set<string>,
  flushStartedAt: number,
): Promise<void> {
  try {
    const localOrders = await db.getAll("localOrders");
    for (const lo of localOrders) {
      await withLocalOrderLock(lo.id, async () => {
        const tx = db.transaction(["localOrders", "writeQueue"], "readwrite");
        const localStore = tx.objectStore("localOrders");
        const writeStore = tx.objectStore("writeQueue");
        const latest = await localStore.get(lo.id);
        if (!latest) {
          await tx.done;
          return;
        }

        const remainingWrites = await writeStore.getAll();
        const pendingIds = new Set<string>();
        for (const w of remainingWrites) {
          collectTargetIds(w.payload, pendingIds);
        }

        const idsForMirror = [latest.id, ...(latest.orderId ? [latest.orderId] : [])];
        const matchesDeadLetter = idsForMirror.some((id) =>
          deadLetterTargetIds.has(id),
        );
        if (matchesDeadLetter && !latest.syncFailed) {
          await localStore.put({
            ...latest,
            syncFailed: true,
            synced: false,
          });
          await tx.done;
          return;
        }

        const stillPending = idsForMirror.some((id) => pendingIds.has(id));
        const editedDuringFlush =
          latest.synced === false &&
          new Date(latest.updatedAt).getTime() >= flushStartedAt;
        const wasSynced =
          latest.synced === true ||
          (!editedDuringFlush && idsForMirror.some((id) => syncedTargetIds.has(id)));

        if (!stillPending && !latest.syncFailed && !matchesDeadLetter && wasSynced) {
          await localStore.delete(latest.id);
        }
        await tx.done;
      });
    }
  } catch (err) {
    console.warn("[SyncManager] Failed to prune localOrders:", err);
  }
}

async function drainLegacyPaymentQueue(): Promise<void> {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem("pos_offline_payments_queue");
    if (!raw) return;
    const legacyQueue = JSON.parse(raw);
    if (!Array.isArray(legacyQueue) || legacyQueue.length === 0) return;

    const remaining: unknown[] = [];
    for (const item of legacyQueue) {
      try {
        if (item?.orderId) {
          const { data: ko, error: koLookupError } = await supabase
            .from("kitchen_orders")
            .select("order_id")
            .eq("id", item.orderId)
            .maybeSingle();
          if (koLookupError) throw koLookupError;

          const { data: updatedKo, error: koUpdateError } = await supabase
            .from("kitchen_orders")
            .update({
              status: "completed",
              bumped_at: new Date().toISOString(),
              ...(item.customer_name && { customer_name: item.customer_name }),
              ...(item.customer_phone && { customer_phone: item.customer_phone }),
            })
            .eq("id", item.orderId)
            .select("id")
            .maybeSingle();
          if (koUpdateError) throw koUpdateError;
          if (!updatedKo) {
            throw new Error(`Kitchen order ${item.orderId} not found for legacy payment`);
          }

          if (ko?.order_id) {
            const { error: orderUpdateError } = await supabase
              .from("orders")
              .update({
                status: item.payment_status === "nc" ? "nc" : "completed",
                payment_status: item.payment_status,
                payment_method: item.payment_method,
                total: item.total_amount,
                ...(item.customer_name && { customer_name: item.customer_name }),
                ...(item.customer_phone && {
                  customer_phone: item.customer_phone,
                }),
                updated_at: new Date().toISOString(),
              })
              .eq("id", ko.order_id);
            if (orderUpdateError) throw orderUpdateError;
          }
        }
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length === 0) {
      localStorage.removeItem("pos_offline_payments_queue");
    } else {
      localStorage.setItem(
        "pos_offline_payments_queue",
        JSON.stringify(remaining),
      );
    }
  } catch {
    // Ignore malformed legacy storage
  }
}

// ─── Replay individual writes ─────────────────────────────────────────────────

function stripInternalKeys(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload)) {
    if (!key.startsWith("_")) {
      clean[key] = val;
    }
  }
  return clean;
}

export async function hasPendingKitchenOrderInsert(
  kitchenOrderId: string,
): Promise<boolean> {
  if (!kitchenOrderId || typeof indexedDB === "undefined") return false;
  try {
    const db = await getDB();
    const pending = await db.getAll("writeQueue");
    return pending.some(
      (w) =>
        w.type === "kitchen_order" &&
        w.operation !== "update" &&
        w.payload?.id === kitchenOrderId,
    );
  } catch {
    return false;
  }
}

async function resolveLinkedOrderId(
  kitchenOrderId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("kitchen_orders")
    .select("order_id")
    .eq("id", kitchenOrderId)
    .maybeSingle();
  if (error) throw error;
  if (data?.order_id) return data.order_id;

  // If the kitchen_order insert is still pending in the local writeQueue, retry later
  if (await hasPendingKitchenOrderInsert(kitchenOrderId)) {
    throw new Error(
      `Kitchen order ${kitchenOrderId} is still queued; retrying linked order resolution`,
    );
  }

  return null;
}

async function replayWrite(item: QueuedWrite): Promise<void> {
  const { type, payload, timestamp, operation } = item;

  switch (type) {
    case "kitchen_order":
      if (typeof payload._updateByOrderId === "string") {
        const cleanPayload = stripInternalKeys(payload);
        const { error } = await supabase
          .from("kitchen_orders")
          .update({
            ...cleanPayload,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("order_id", payload._updateByOrderId);
        if (error) throw error;
        break;
      }
      await replayWithConflictCheck(
        "kitchen_orders",
        payload,
        timestamp,
        item.id,
        type,
        operation,
      );
      break;

    case "order": {
      const resolvedPayload = { ...payload };
      if (
        typeof payload._resolveOrderIdFromKitchenOrderId === "string" &&
        (!payload.id || payload.id === payload._resolveOrderIdFromKitchenOrderId)
      ) {
        const candidateId = payload._resolveOrderIdFromKitchenOrderId;
        const realOrderId = await resolveLinkedOrderId(candidateId);
        if (realOrderId) {
          resolvedPayload.id = realOrderId;
        } else {
          // Fallback: caller may have passed a direct orders.id without kitchen_order
          const { data: directOrder, error: directOrderErr } = await supabase
            .from("orders")
            .select("id")
            .eq("id", candidateId)
            .maybeSingle();
          if (directOrderErr) throw directOrderErr;
          if (!directOrder?.id) {
            return;
          }
          resolvedPayload.id = directOrder.id;
        }
      }
      await replayWithConflictCheck(
        "orders",
        resolvedPayload,
        timestamp,
        item.id,
        type,
        operation,
      );
      break;
    }

    case "pos_transaction": {
      const cleanPayload = stripInternalKeys(payload);
      if (
        !cleanPayload.order_id &&
        typeof payload._resolveOrderIdFromKitchenOrderId === "string"
      ) {
        const realOrderId = await resolveLinkedOrderId(
          payload._resolveOrderIdFromKitchenOrderId,
        );
        if (realOrderId) {
          cleanPayload.order_id = realOrderId;
        }
      }
      // POS transactions use upsert when a client UUID id is provided so retries are idempotent
      const { error } = cleanPayload.id
        ? await supabase
            .from("pos_transactions")
            .upsert(cleanPayload as never, { onConflict: "id", ignoreDuplicates: true })
        : await supabase
            .from("pos_transactions")
            .insert(cleanPayload as never);
      if (error) throw error;
      break;
    }

    case "pos_transaction_clear_pending": {
      if (payload.order_id) {
        const { error } = await supabase
          .from("pos_transactions")
          .delete()
          .eq("order_id", String(payload.order_id))
          .eq("status", "pending");
        if (error) throw error;
      }
      break;
    }

    case "deduct_inventory": {
      if (typeof payload.order_id === "string" && payload.order_id) {
        const { data, error } = await supabase.functions.invoke(
          "deduct-inventory-on-prep",
          { body: { order_id: payload.order_id } },
        );
        if (error || (data as any)?.error) {
          throw error || new Error(String((data as any).error));
        }
      }
      break;
    }

    case "room_food_order": {
      const cleanPayload = stripInternalKeys(payload);
      let resolvedOrderId =
        typeof cleanPayload.order_id === "string" ? cleanPayload.order_id : null;
      if (
        !resolvedOrderId &&
        typeof payload._resolveOrderIdFromKitchenOrderId === "string"
      ) {
        resolvedOrderId = await resolveLinkedOrderId(
          payload._resolveOrderIdFromKitchenOrderId,
        );
      }
      if (cleanPayload.id) {
        const { data: existingById, error: byIdErr } = await supabase
          .from("room_food_orders")
          .select("id")
          .eq("id", String(cleanPayload.id))
          .maybeSingle();
        if (byIdErr) throw byIdErr;
        if (existingById) break;
      }
      if (resolvedOrderId && cleanPayload.room_id) {
        const { data: existingRoomCharge, error: lookupError } = await supabase
          .from("room_food_orders")
          .select("id")
          .eq("room_id", String(cleanPayload.room_id))
          .eq("order_id", resolvedOrderId)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (existingRoomCharge) break;
      }
      if (
        !cleanPayload.customer_name ||
        typeof cleanPayload.customer_name !== "string" ||
        !cleanPayload.customer_name.trim()
      ) {
        cleanPayload.customer_name = "Room Guest";
      }
      if (!cleanPayload.restaurant_id && cleanPayload.room_id) {
        const { data: roomRow } = await supabase
          .from("rooms")
          .select("restaurant_id")
          .eq("id", String(cleanPayload.room_id))
          .maybeSingle();
        if (roomRow?.restaurant_id) {
          cleanPayload.restaurant_id = roomRow.restaurant_id;
        }
      }
      const { error } = await supabase
        .from("room_food_orders")
        .insert({ ...cleanPayload, order_id: resolvedOrderId } as never);
      if (error) throw error;
      break;
    }

    case "loyalty_redemption": {
      const restaurantId =
        typeof payload.restaurant_id === "string" ? payload.restaurant_id : "";
      const pointsRedeemed = Number(payload.points_redeemed) || 0;
      if (!restaurantId || pointsRedeemed <= 0) break;

      let resolvedSourceId =
        typeof payload.source_id === "string" ? payload.source_id : null;
      if (
        !resolvedSourceId &&
        typeof payload._resolveOrderIdFromKitchenOrderId === "string"
      ) {
        resolvedSourceId = await resolveLinkedOrderId(
          payload._resolveOrderIdFromKitchenOrderId,
        );
      }

      if (resolvedSourceId) {
        const { data: existingRedemption, error: txLookupErr } = await supabase
          .from("loyalty_transactions")
          .select("id")
          .eq("source_id", resolvedSourceId)
          .in("transaction_type", ["redeem", "redeemed"])
          .maybeSingle();
        if (txLookupErr) throw txLookupErr;
        if (existingRedemption) break;
      }

      const txId =
        typeof payload.id === "string" && payload.id ? payload.id : item.id;
      const { error: rpcErr } = await supabase.rpc(
        "redeem_loyalty_points_atomic" as never,
        {
          p_tx_id: txId,
          p_restaurant_id: restaurantId,
          p_customer_id:
            typeof payload.customer_id === "string" && payload.customer_id
              ? payload.customer_id
              : null,
          p_customer_phone:
            typeof payload.customer_phone === "string" && payload.customer_phone
              ? payload.customer_phone
              : null,
          p_points: pointsRedeemed,
          p_transaction_type: String(payload.transaction_type || "redeem"),
          p_source: String(payload.source || "pos"),
          p_source_id: resolvedSourceId,
          p_notes:
            typeof payload.notes === "string"
              ? payload.notes
              : `Redeemed ${pointsRedeemed} points offline`,
          p_created_by:
            typeof payload.created_by === "string" ? payload.created_by : null,
        } as never,
      );
      if (rpcErr) throw rpcErr;
      break;
    }

    case "table_status":
      // Partial update on restaurant_tables
      await replayWithConflictCheck(
        "restaurant_tables",
        payload,
        timestamp,
        item.id,
        type,
        "update",
      );
      break;

    case "kitchen_order_delete": {
      if (payload.id) {
        const { error } = await supabase
          .from("kitchen_orders")
          .delete()
          .eq("id", String(payload.id));
        if (error) throw error;
      }
      break;
    }

    case "order_delete": {
      if (payload.id) {
        const { error } = await supabase
          .from("orders")
          .delete()
          .eq("id", String(payload.id));
        if (error) throw error;
      }
      break;
    }

    default:
      console.warn("[SyncManager] Unknown write type:", type);
  }
}

/**
 * Insert/update/upsert with last-write-wins conflict resolution.
 * If an existing server row was updated AFTER our local timestamp, we log a
 * conflict but do NOT overwrite (server row is newer).
 */
async function replayWithConflictCheck(
  table: string,
  payload: Record<string, unknown>,
  localTimestamp: number,
  queueId: string,
  type: string,
  operation: QueuedWrite["operation"] = "upsert",
): Promise<void> {
  const preserveExistingPaidStatus =
    table === "orders" && payload._preserveExistingPaidStatus === true;
  const cleanPayload = stripInternalKeys(payload);

  // If the payload has no "id", it's a new record — just insert
  if (!cleanPayload.id) {
    const { error } = await (supabase as any).from(table).insert(cleanPayload);
    if (error) throw error;
    return;
  }

  // Check if server has a newer version (and payment_status when requested)
  const selectCols = preserveExistingPaidStatus
    ? "updated_at, created_at, payment_status"
    : "updated_at, created_at";
  const { data: existing, error: lookupError } = await (supabase as any)
    .from(table)
    .select(selectCols)
    .eq("id", cleanPayload.id)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const mutationIso =
    typeof cleanPayload.updated_at === "string" && cleanPayload.updated_at
      ? cleanPayload.updated_at
      : new Date(localTimestamp).toISOString();

  if (existing) {
    const serverTs = new Date(
      existing.updated_at ?? existing.created_at,
    ).getTime();

    if (serverTs > localTimestamp) {
      // Server is newer — log conflict, skip write
      console.warn(
        `[SyncManager] Conflict on ${table}/${cleanPayload.id}: server newer, skipping`,
      );
      const db = await getDB();
      const conflict: ConflictRecord = {
        id: queueId,
        type,
        localTimestamp,
        serverTimestamp: serverTs,
        resolvedAt: Date.now(),
        payload: cleanPayload,
      };
      await db.put("conflictLog", conflict);
      return;
    }

    // Use update instead of upsert so partial payloads never violate NOT NULL constraints
    const { id: recordId, ...fieldsToUpdate } = cleanPayload;
    if (
      preserveExistingPaidStatus &&
      (existing.payment_status === "paid" || existing.payment_status === "nc") &&
      fieldsToUpdate.payment_status !== "paid" &&
      fieldsToUpdate.payment_status !== "nc"
    ) {
      delete fieldsToUpdate.payment_status;
      if (fieldsToUpdate.payment_method === "pay_later") {
        delete fieldsToUpdate.payment_method;
      }
    }
    let updateQuery = (supabase as any)
      .from(table)
      .update({ ...fieldsToUpdate, updated_at: mutationIso })
      .eq("id", recordId);
    if (existing.updated_at) {
      updateQuery = updateQuery.eq("updated_at", existing.updated_at);
    }
    const { data: updatedRow, error } = await updateQuery
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!updatedRow) {
      throw new Error(
        `Concurrent modification on ${table}/${cleanPayload.id}; will retry conflict check`,
      );
    }
  } else if (operation === "update") {
    const db = await getDB();
    const pendingWrites = await db.getAll("writeQueue");
    const hasPendingCreate = pendingWrites.some(
      (w) =>
        w.id !== queueId &&
        w.type === type &&
        w.operation !== "update" &&
        w.payload?.id === cleanPayload.id,
    );
    if (hasPendingCreate || flushedOrInFlightInsertTargets.has(String(cleanPayload.id))) {
      throw new Error(
        `Pending create for ${table}/${cleanPayload.id}; deferring update`,
      );
    }
    // Row no longer exists on server (e.g. deleted elsewhere) — skip cleanly
    console.warn(
      `[SyncManager] Skipping update for missing ${table}/${cleanPayload.id}`,
    );
  } else {
    // Record doesn't exist on server yet — insert preserving local mutation timestamp
    const { error } = await (supabase as any)
      .from(table)
      .insert({ ...cleanPayload, updated_at: mutationIso });
    if (error) throw error;
  }
}

// ─── Offline Order Number ─────────────────────────────────────────────────────

/** Generates a local temporary order number for display while offline */
export function generateOfflineOrderNumber(): string {
  return `OFFLINE-${Date.now()}`;
}

/** Returns true if an order number is a temporary offline one */
export function isOfflineOrderNumber(orderNumber: string | number): boolean {
  return String(orderNumber).startsWith("OFFLINE-");
}

function getDailyTokenStorageKey(restaurantId: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `qs_daily_token_${restaurantId}_${ymd}`;
}

/** Track the highest QuickServe token seen online today for seamless offline continuation */
export function recordQuickServeOrderNumber(
  restaurantId: string,
  orderNumber: number,
): void {
  if (
    typeof localStorage === "undefined" ||
    !restaurantId ||
    !Number.isFinite(orderNumber)
  ) {
    return;
  }
  try {
    const key = getDailyTokenStorageKey(restaurantId);
    const prev = Number(localStorage.getItem(key) || "0") || 0;
    if (orderNumber > prev) {
      localStorage.setItem(key, String(orderNumber));
    }
  } catch {
    /* ignore storage errors */
  }
}

/** Allocate the next sequential integer token for an offline QuickServe order */
export function allocateOfflineQuickServeToken(restaurantId: string): number {
  if (typeof localStorage === "undefined" || !restaurantId) {
    return Math.floor(Date.now() % 900) + 100;
  }
  try {
    const key = getDailyTokenStorageKey(restaurantId);
    const prev = Number(localStorage.getItem(key) || "0") || 0;
    const next = prev + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return Math.floor(Date.now() % 900) + 100;
  }
}
