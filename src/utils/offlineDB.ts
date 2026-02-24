/**
 * offlineDB.ts
 * Initialises the local IndexedDB ("swadeshi-offline") used for:
 *   - read caching  : menus, categories, tables, restaurant
 *   - write queue   : orders/updates saved while offline
 *   - conflict log  : records last-write-wins resolution events
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A pending write that needs to be flushed to Supabase */
export interface QueuedWrite {
  id: string;               // Local UUID
  type: "kitchen_order" | "order" | "pos_transaction" | "table_status";
  payload: Record<string, unknown>;
  timestamp: number;        // ms epoch — used for last-write-wins
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
  [key: string]: unknown;
}

/** Cached menu item */
export interface CachedMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  category_id?: string;
  [key: string]: unknown;
}

/** Cached table */
export interface CachedTable {
  id: string;
  restaurant_id: string;
  table_number: number;
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
}

const DB_NAME = "swadeshi-offline";
const DB_VERSION = 1;

// Singleton promise so `getDB()` is safe to call concurrently
let dbPromise: Promise<IDBPDatabase<SwadeshiDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SwadeshiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SwadeshiDB>(DB_NAME, DB_VERSION, {
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
      },
    });
  }
  return dbPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Store all items from an array into the named object store (upsert). */
export async function cacheAll<T extends { id: string }>(
  storeName: "restaurants" | "menuItems" | "categories" | "tables",
  items: T[],
): Promise<void> {
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
  const db = await getDB();
  return db.get("restaurants", restaurantId);
}
