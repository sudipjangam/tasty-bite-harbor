/**
 * offlineDB.ts
 * Initialises the local IndexedDB ("swadeshi-offline") used for:
 *   - read caching    : menus, categories, tables, restaurant, paymentSettings
 *   - local orders    : offline-created/updated QSR orders visible until synced
 *   - write queue     : orders/updates saved while offline
 *   - conflict log    : records last-write-wins resolution events
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A pending write that needs to be flushed to Supabase */
export interface QueuedWrite {
  id: string; // Local UUID
  type:
    | "kitchen_order"
    | "order"
    | "pos_transaction"
    | "pos_transaction_clear_pending"
    | "table_status"
    | "kitchen_order_delete"
    | "order_delete"
    | "deduct_inventory"
    | "loyalty_redemption"
    | "room_food_order";
  operation?: "insert" | "upsert" | "update" | "delete";
  payload: Record<string, unknown>;
  timestamp: number; // ms epoch — used for last-write-wins
  seq?: number; // Monotonic durable sequence for replay ordering
  retries: number;
}

/** A record of a conflict that was resolved automatically */
export interface ConflictRecord {
  id: string;
  type: string;
  localTimestamp: number;
  serverTimestamp: number;
  resolvedAt: number;
  payload: Record<string, unknown>;
}

/** Cached restaurant info */
export interface CachedRestaurant {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  gstin?: string | null;
  upi_id?: string | null;
  logo_url?: string | null;
  [key: string]: unknown;
}

/** Cached payment settings */
export interface CachedPaymentSettings {
  restaurant_id: string;
  id?: string;
  upi_id?: string | null;
  upi_name?: string | null;
  is_active?: boolean | null;
  voice_announcement_language?: string | null;
  [key: string]: unknown;
}

/** Cached menu item */
export interface CachedMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  category?: string;
  category_id?: string;
  description?: string;
  image_url?: string;
  is_available?: boolean;
  is_veg?: boolean;
  [key: string]: unknown;
}

/** Cached table */
export interface CachedTable {
  id: string;
  restaurant_id: string;
  name?: string;
  table_number?: number;
  capacity?: number;
  status?: string;
  [key: string]: unknown;
}

/** Cached category */
export interface CachedCategory {
  id: string;
  restaurant_id: string;
  name: string;
  [key: string]: unknown;
}

/** Local QSR order mirror for offline UI rendering, recall, and billing */
export interface OfflineQsrOrder {
  id: string; // kitchen_orders.id
  orderId: string | null; // orders.id
  restaurant_id: string;
  source: string;
  tableId?: string | null;
  tableName?: string | null;
  orderType: "dine_in" | "takeaway" | "delivery" | "nc";
  status: "new" | "preparing" | "ready" | "served" | "held" | "completed" | "deleted";
  priority: "normal" | "rush" | "vip";
  roundNumber?: number;
  orderNumber?: number | null;
  formattedItems?: string[];
  items: Array<{
    name: string;
    quantity: number;
    printed_qty?: number;
    price: number;
    menuItemId?: string;
    notes?: string | string[];
    priority?: string;
  }>;
  itemCompletionStatus?: boolean[];
  total: number;
  subtotal?: number;
  discount?: number;
  discountType?: "percentage" | "amount";
  fixedDiscountAmount?: number;
  customerName?: string;
  customerPhone?: string;
  attendant?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  splitPayments?: Array<{ method: string; amount: number }>;
  offlineToken?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  synced?: boolean;
  syncFailed?: boolean;
  paidAmount?: number;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

interface SwadeshiDB extends DBSchema {
  writeQueue: {
    key: string;
    value: QueuedWrite;
    indexes: { "by-timestamp": number };
  };
  conflictLog: {
    key: string;
    value: ConflictRecord;
  };
  restaurants: {
    key: string;
    value: CachedRestaurant;
  };
  paymentSettings: {
    key: string;
    value: CachedPaymentSettings;
  };
  menuItems: {
    key: string;
    value: CachedMenuItem;
    indexes: { "by-restaurant": string };
  };
  categories: {
    key: string;
    value: CachedCategory;
    indexes: { "by-restaurant": string };
  };
  tables: {
    key: string;
    value: CachedTable;
    indexes: { "by-restaurant": string };
  };
  localOrders: {
    key: string;
    value: OfflineQsrOrder;
    indexes: { "by-restaurant": string };
  };
}

const DB_NAME = "swadeshi-offline";
const DB_VERSION = 2;

export const OFFLINE_QUEUE_EVENT = "swadeshi:offline-queue-changed";
export const LOCAL_ORDERS_EVENT = "swadeshi:local-orders-changed";
export const SYNC_COMPLETED_EVENT = "swadeshi:sync-completed";

function emitEvent(name: string, detail?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
  }
}

let inMemQueueSeq = 0;
let queueSeqFloorPromise: Promise<void> | null = null;

export async function ensureQueueSeqFloor(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  if (!queueSeqFloorPromise) {
    queueSeqFloorPromise = (async () => {
      try {
        const db = await getDB();
        const items = await db.getAll("writeQueue");
        let maxSeq = 0;
        for (const item of items) {
          if (typeof item.seq === "number" && item.seq > maxSeq) {
            maxSeq = item.seq;
          }
        }
        if (maxSeq > inMemQueueSeq) {
          inMemQueueSeq = maxSeq;
        }
      } catch {
        /* ignore IDB floor recovery errors */
      }
    })();
  }
  await queueSeqFloorPromise;
}

export function allocateQueueSeq(): number {
  let persisted = 0;
  try {
    if (typeof localStorage !== "undefined") {
      persisted = Number(localStorage.getItem("swadeshi_wq_seq") || "0") || 0;
    }
  } catch {
    /* ignore */
  }
  inMemQueueSeq = Math.max(inMemQueueSeq, persisted) + 1;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("swadeshi_wq_seq", String(inMemQueueSeq));
    }
  } catch {
    /* ignore */
  }
  return inMemQueueSeq;
}

// Singleton promise so `getDB()` is safe to call concurrently
let dbPromise: Promise<IDBPDatabase<SwadeshiDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SwadeshiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SwadeshiDB>(DB_NAME, DB_VERSION, {
      blocking() {
        const current = dbPromise;
        dbPromise = null;
        current?.then((d) => d.close()).catch(() => {});
      },
      upgrade(db) {
        // Write queue
        if (!db.objectStoreNames.contains("writeQueue")) {
          const qs = db.createObjectStore("writeQueue", { keyPath: "id" });
          qs.createIndex("by-timestamp", "timestamp");
        }
        // Conflict log
        if (!db.objectStoreNames.contains("conflictLog")) {
          db.createObjectStore("conflictLog", { keyPath: "id" });
        }
        // Read caches
        if (!db.objectStoreNames.contains("restaurants")) {
          db.createObjectStore("restaurants", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("paymentSettings")) {
          db.createObjectStore("paymentSettings", { keyPath: "restaurant_id" });
        }
        if (!db.objectStoreNames.contains("menuItems")) {
          const ms = db.createObjectStore("menuItems", { keyPath: "id" });
          ms.createIndex("by-restaurant", "restaurant_id");
        }
        if (!db.objectStoreNames.contains("categories")) {
          const cs = db.createObjectStore("categories", { keyPath: "id" });
          cs.createIndex("by-restaurant", "restaurant_id");
        }
        if (!db.objectStoreNames.contains("tables")) {
          const ts = db.createObjectStore("tables", { keyPath: "id" });
          ts.createIndex("by-restaurant", "restaurant_id");
        }
        if (!db.objectStoreNames.contains("localOrders")) {
          const lo = db.createObjectStore("localOrders", { keyPath: "id" });
          lo.createIndex("by-restaurant", "restaurant_id");
        }
      },
    });
  }
  return dbPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Replace all cached items for a single restaurant in a store (empty array clears stale cache) */
export async function replaceCachedByRestaurant<
  T extends { id: string; restaurant_id?: string },
>(
  storeName: "menuItems" | "categories" | "tables",
  restaurantId: string,
  items: T[],
): Promise<void> {
  if (typeof indexedDB === "undefined" || !restaurantId) return;
  const db = await getDB();
  const tx = db.transaction(storeName, "readwrite");
  try {
    const index = tx.store.index("by-restaurant");
    const existingKeys = await index.getAllKeys(restaurantId);
    for (const key of existingKeys) {
      await tx.store.delete(key);
    }
    for (const item of items) {
      await tx.store.put({ ...item, restaurant_id: restaurantId } as never);
    }
    await tx.done;
  } catch (err) {
    try {
      tx.abort();
    } catch {
      /* ignore abort errors */
    }
    throw err;
  }
}

/** Store all items from an array into the named object store (upsert). */
export async function cacheAll<T extends { id: string }>(
  storeName: "restaurants" | "menuItems" | "categories" | "tables",
  items: T[],
): Promise<void> {
  if (typeof indexedDB === "undefined" || items.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(storeName, "readwrite");
  await Promise.all([
    ...items.map((item) => tx.store.put(item as never)),
    tx.done,
  ]);
}

/** Read all cached items for a restaurant from a store */
export async function getCachedByRestaurant<T>(
  storeName: "menuItems" | "categories" | "tables",
  restaurantId: string,
): Promise<T[]> {
  if (typeof indexedDB === "undefined" || !restaurantId) return [];
  const db = await getDB();
  return db.getAllFromIndex(
    storeName,
    "by-restaurant",
    restaurantId,
  ) as Promise<T[]>;
}

/** Get a single cached restaurant */
export async function getCachedRestaurant(
  restaurantId: string,
): Promise<CachedRestaurant | undefined> {
  if (typeof indexedDB === "undefined" || !restaurantId) return undefined;
  const db = await getDB();
  return db.get("restaurants", restaurantId);
}

/** Cache payment settings for offline UPI QR & voice preferences */
export async function cachePaymentSettings(
  restaurantId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  if (typeof indexedDB === "undefined" || !restaurantId) return;
  const db = await getDB();
  await db.put("paymentSettings", {
    ...settings,
    restaurant_id: restaurantId,
  });
}

/** Retrieve cached payment settings */
export async function getCachedPaymentSettings(
  restaurantId: string,
): Promise<CachedPaymentSettings | undefined> {
  if (typeof indexedDB === "undefined" || !restaurantId) return undefined;
  const db = await getDB();
  return db.get("paymentSettings", restaurantId);
}

/** Delete cached payment settings for a restaurant */
export async function deleteCachedPaymentSettings(
  restaurantId: string,
): Promise<void> {
  if (typeof indexedDB === "undefined" || !restaurantId) return;
  const db = await getDB();
  await db.delete("paymentSettings", restaurantId);
}

/** Update a cached table's local status immediately while offline */
export async function updateCachedTableStatus(
  tableId: string,
  status: string,
): Promise<void> {
  if (typeof indexedDB === "undefined" || !tableId) return;
  const db = await getDB();
  const tx = db.transaction("tables", "readwrite");
  const existing = await tx.store.get(tableId);
  if (existing) {
    await tx.store.put({ ...existing, status });
  }
  await tx.done;
}

// ─── Local QSR Orders Store ───────────────────────────────────────────────────

const localOrderLocks = new Map<string, Promise<unknown>>();

/** Serialize read-modify-write sequences per local order ID */
export function withLocalOrderLock<T>(
  id: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = localOrderLocks.get(id) || Promise.resolve();
  const next = prev.then(fn, fn);
  const tracked = next.then(
    () => undefined,
    () => undefined,
  );
  localOrderLocks.set(id, tracked);
  tracked.finally(() => {
    if (localOrderLocks.get(id) === tracked) {
      localOrderLocks.delete(id);
    }
  });
  return next;
}

/** Save or update a local QSR order mirror in IndexedDB */
export async function saveLocalOrder(order: OfflineQsrOrder): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await getDB();
  await db.put("localOrders", order);
  emitEvent(LOCAL_ORDERS_EVENT);
}

/** Atomically read, update, and save a local QSR order mirror */
export function updateLocalOrder(
  id: string,
  updater: (current: OfflineQsrOrder | undefined) => OfflineQsrOrder | null | undefined,
): Promise<OfflineQsrOrder | null> {
  return withLocalOrderLock(id, async () => {
    if (typeof indexedDB === "undefined" || !id) return null;
    const db = await getDB();
    const tx = db.transaction("localOrders", "readwrite");
    const current = await tx.store.get(id);
    const updated = updater(current);
    if (!updated) {
      await tx.done;
      return null;
    }
    await tx.store.put(updated);
    await tx.done;
    emitEvent(LOCAL_ORDERS_EVENT);
    return updated;
  });
}

/** Get a single local QSR order by kitchen order ID */
export async function getLocalOrder(
  id: string,
): Promise<OfflineQsrOrder | undefined> {
  if (typeof indexedDB === "undefined" || !id) return undefined;
  const db = await getDB();
  return db.get("localOrders", id);
}

/** Find a local order mirror by either local key (`id`) or linked `orderId` */
export async function getLocalOrderByAnyId(
  id: string,
): Promise<OfflineQsrOrder | undefined> {
  if (typeof indexedDB === "undefined" || !id) return undefined;
  const db = await getDB();
  const direct = await db.get("localOrders", id);
  if (direct) return direct;
  const all = await db.getAll("localOrders");
  return all.find((lo) => lo.orderId === id);
}

/** Get all local QSR orders for a restaurant (returns [] on IDB read failure) */
export async function getLocalOrdersByRestaurant(
  restaurantId: string,
): Promise<OfflineQsrOrder[]> {
  if (typeof indexedDB === "undefined" || !restaurantId) return [];
  try {
    const db = await getDB();
    return await db.getAllFromIndex("localOrders", "by-restaurant", restaurantId);
  } catch (err) {
    console.warn("[offlineDB] getLocalOrdersByRestaurant failed:", err);
    return [];
  }
}

/**
 * Atomically persist queued writes and a local order mirror in a single IDB transaction
 * so flushQueue/pruneSyncedLocalOrders cannot race between them or leave partial state.
 */
export async function commitLocalOrderAndWritesAtomic(
  mirror: OfflineQsrOrder | null,
  writes: Array<{
    type: QueuedWrite["type"];
    payload: Record<string, unknown>;
    operation?: QueuedWrite["operation"];
  }>,
): Promise<string[]> {
  if (typeof indexedDB === "undefined") {
    if (writes.length === 0 && !mirror) return [];
    throw new Error("IndexedDB is unavailable");
  }
  await ensureQueueSeqFloor();
  const db = await getDB();
  const tx = db.transaction(["writeQueue", "localOrders"], "readwrite");
  const writeStore = tx.objectStore("writeQueue");
  const localStore = tx.objectStore("localOrders");
  const ids: string[] = [];
  const baseTs = Date.now();

  try {
    for (let i = 0; i < writes.length; i++) {
      const w = writes[i];
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${baseTs}-${i}-${Math.random().toString(36).slice(2, 10)}`;
      ids.push(id);
      await writeStore.put({
        id,
        type: w.type,
        operation: w.operation ?? "insert",
        payload: w.payload,
        timestamp: baseTs,
        seq: allocateQueueSeq(),
        retries: 0,
      });
    }

    if (mirror) {
      await localStore.put(mirror);
    }

    await tx.done;
  } catch (err) {
    try {
      tx.abort();
    } catch {
      /* ignore abort errors */
    }
    throw err;
  }
  if (ids.length > 0) emitEvent(OFFLINE_QUEUE_EVENT, { source: "enqueue" });
  if (mirror) emitEvent(LOCAL_ORDERS_EVENT);
  return ids;
}

/** Delete a local QSR order mirror by ID */
export async function deleteLocalOrder(id: string): Promise<void> {
  if (typeof indexedDB === "undefined" || !id) return;
  const db = await getDB();
  await db.delete("localOrders", id);
  emitEvent(LOCAL_ORDERS_EVENT);
}
