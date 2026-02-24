/**
 * syncManager.ts
 *
 * Manages offline write operations:
 *  - enqueueWrite()  → saves a pending DB write to IndexedDB
 *  - flushQueue()    → replays queued writes to Supabase on reconnect
 *  - generateOfflineOrderNumber() → creates a temporary offline token
 *
 * Conflict strategy: LAST-WRITE-WINS (by timestamp).
 * Conflicts are logged to the "conflictLog" IDB store.
 */

import { v4 as uuidv4 } from "uuid";
import { getDB, QueuedWrite, ConflictRecord } from "./offlineDB";
import { supabase } from "@/integrations/supabase/client";

// ─── Enqueue ─────────────────────────────────────────────────────────────────

/**
 * Add a write operation to the offline queue.
 * Call this whenever Supabase is unreachable (isOnline === false).
 */
export async function enqueueWrite(
  type: QueuedWrite["type"],
  payload: Record<string, unknown>,
): Promise<string> {
  const db = await getDB();
  const id = uuidv4();
  const item: QueuedWrite = {
    id,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };
  await db.put("writeQueue", item);
  console.log(`[SyncManager] Queued ${type}:`, id);
  return id;
}

/** How many items are currently waiting to be synced */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.count("writeQueue");
}

// ─── Flush ────────────────────────────────────────────────────────────────────

let isFlushing = false;

/**
 * Replay all queued writes to Supabase in chronological order.
 * Safe to call multiple times; concurrent calls are de-duplicated.
 */
export async function flushQueue(
  onProgress?: (remaining: number) => void,
): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;

  try {
    const db = await getDB();
    // Fetch all items sorted by timestamp (oldest first)
    const items = await db.getAllFromIndex("writeQueue", "by-timestamp");

    console.log(`[SyncManager] Flushing ${items.length} queued writes`);

    for (const item of items) {
      try {
        await replayWrite(item);
        await db.delete("writeQueue", item.id);
        const remaining = await db.count("writeQueue");
        onProgress?.(remaining);
      } catch (err) {
        console.error(`[SyncManager] Failed to flush ${item.type}:`, err);
        // Increment retry counter; leave in queue for next flush
        await db.put("writeQueue", { ...item, retries: item.retries + 1 });
      }
    }
  } finally {
    isFlushing = false;
  }
}

// ─── Replay individual writes ─────────────────────────────────────────────────

async function replayWrite(item: QueuedWrite): Promise<void> {
  const { type, payload, timestamp } = item;

  switch (type) {
    case "kitchen_order":
      await replayWithConflictCheck(
        "kitchen_orders",
        payload,
        timestamp,
        item.id,
        type,
      );
      break;

    case "order":
      await replayWithConflictCheck("orders", payload, timestamp, item.id, type);
      break;

    case "pos_transaction":
      // POS transactions are append-only — no conflict check needed
      await supabase.from("pos_transactions").insert(payload as never);
      break;

    case "table_status":
      await replayWithConflictCheck(
        "tables",
        payload,
        timestamp,
        item.id,
        type,
      );
      break;

    default:
      console.warn("[SyncManager] Unknown write type:", type);
  }
}

/**
 * Insert/upsert with last-write-wins conflict resolution.
 * If an existing server row was updated AFTER our local timestamp, we log a
 * conflict but do NOT overwrite (server row is newer).
 */
async function replayWithConflictCheck(
  table: string,
  payload: Record<string, unknown>,
  localTimestamp: number,
  queueId: string,
  type: string,
): Promise<void> {
  // If the payload has no "id", it's a new record — just insert
  if (!payload.id) {
    const { error } = await (supabase as any).from(table).insert(payload);
    if (error) throw error;
    return;
  }

  // Check if server has a newer version
  const { data: existing } = await (supabase as any)
    .from(table)
    .select("updated_at, created_at")
    .eq("id", payload.id)
    .maybeSingle();

  if (existing) {
    const serverTs = new Date(
      existing.updated_at ?? existing.created_at,
    ).getTime();

    if (serverTs > localTimestamp) {
      // Server is newer — log conflict, skip write
      console.warn(
        `[SyncManager] Conflict on ${table}/${payload.id}: server newer, skipping`,
      );
      const db = await getDB();
      const conflict: ConflictRecord = {
        id: queueId,
        type,
        localTimestamp,
        serverTimestamp: serverTs,
        resolvedAt: Date.now(),
        payload,
      };
      await db.put("conflictLog", conflict);
      return;
    }

    // Local is newer — upsert
    const { error } = await (supabase as any)
      .from(table)
      .upsert({ ...payload, updated_at: new Date().toISOString() });
    if (error) throw error;
  } else {
    // Record doesn't exist on server yet — insert
    const { error } = await (supabase as any).from(table).insert(payload);
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
