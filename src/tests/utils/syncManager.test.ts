import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  enqueueWrite,
  flushQueue,
  getPendingCount,
  removeQueuedWritesForOrder,
  generateOfflineOrderNumber,
  isOfflineOrderNumber,
  recordQuickServeOrderNumber,
  allocateOfflineQuickServeToken,
} from "@/utils/syncManager";

// In-memory store backing mock getDB()
const stores: Record<string, Map<string, any>> = {
  writeQueue: new Map(),
  conflictLog: new Map(),
  localOrders: new Map(),
};

const mockDb = {
  put: vi.fn(async (store: string, value: any) => {
    stores[store].set(value.id, value);
    return value.id;
  }),
  get: vi.fn(async (store: string, key: string) => {
    return stores[store].get(key);
  }),
  delete: vi.fn(async (store: string, key: string) => {
    stores[store].delete(key);
  }),
  count: vi.fn(async (store: string) => {
    return stores[store].size;
  }),
  getAll: vi.fn(async (store: string) => {
    return Array.from(stores[store].values());
  }),
  getAllFromIndex: vi.fn(async (store: string) => {
    return Array.from(stores[store].values()).sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
    );
  }),
  transaction: vi.fn((storeNames: string | string[]) => {
    const firstStore = Array.isArray(storeNames) ? storeNames[0] : storeNames;
    const makeStoreApi = (name: string) => ({
      get: vi.fn(async (key: string) => stores[name].get(key)),
      getAll: vi.fn(async () => Array.from(stores[name].values())),
      put: vi.fn(async (val: any) => {
        stores[name].set(val.id, val);
        return val.id;
      }),
      delete: vi.fn(async (key: string) => {
        stores[name].delete(key);
      }),
    });
    return {
      store: makeStoreApi(firstStore),
      objectStore: vi.fn((name: string) => makeStoreApi(name)),
      done: Promise.resolve(),
    };
  }),
};

let mockQueueSeq = 0;

vi.mock("@/utils/offlineDB", () => ({
  getDB: vi.fn(async () => mockDb),
  allocateQueueSeq: vi.fn(() => ++mockQueueSeq),
  ensureQueueSeqFloor: vi.fn(async () => undefined),
  withLocalOrderLock: vi.fn(async (_id: string, fn: () => Promise<any>) => fn()),
  OFFLINE_QUEUE_EVENT: "swadeshi:offline-queue-changed",
  LOCAL_ORDERS_EVENT: "swadeshi:local-orders-changed",
  SYNC_COMPLETED_EVENT: "swadeshi:sync-completed",
}));

// Track Supabase calls in exact execution order
const dbCalls: Array<{ table: string; op: string; payload?: any; eqId?: string }> = [];
let mockExistingRows: Record<string, any> = {};
let mockInsertErrorForTable: Record<string, any> = {};
let mockKitchenOrderLink: Record<string, string | null> = {};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain: any = {
        _selectCols: "",
        _eqCol: "",
        _eqVal: "",
        select: vi.fn((cols: string) => {
          chain._selectCols = cols;
          return chain;
        }),
        eq: vi.fn((col: string, val: string) => {
          chain._eqCol = col;
          chain._eqVal = val;
          return chain;
        }),
        in: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => {
          if (table === "kitchen_orders" && chain._selectCols === "order_id") {
            return {
              data:
                chain._eqVal in mockKitchenOrderLink
                  ? { order_id: mockKitchenOrderLink[chain._eqVal] }
                  : null,
              error: null,
            };
          }
          const key = `${table}:${chain._eqVal}`;
          return { data: mockExistingRows[key] || null, error: null };
        }),
        insert: vi.fn(async (payload: any) => {
          dbCalls.push({ table, op: "insert", payload });
          if (mockInsertErrorForTable[table]) {
            return { error: mockInsertErrorForTable[table] };
          }
          if (payload?.id) {
            mockExistingRows[`${table}:${payload.id}`] = {
              id: payload.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          return { error: null };
        }),
        upsert: vi.fn(async (payload: any) => {
          dbCalls.push({ table, op: "insert", payload });
          if (mockInsertErrorForTable[table]) {
            return { error: mockInsertErrorForTable[table] };
          }
          return { error: null };
        }),
        update: vi.fn((payload: any) => {
          let recorded = false;
          let eqIdVal = "";
          const recordOnce = () => {
            if (!recorded) {
              recorded = true;
              dbCalls.push({ table, op: "update", payload, eqId: eqIdVal });
            }
          };
          const updateChain: any = {
            eq: vi.fn((_col: string, val: string) => {
              if (!eqIdVal) eqIdVal = val;
              recordOnce();
              return updateChain;
            }),
            select: vi.fn(() => updateChain),
            maybeSingle: vi.fn(async () => {
              recordOnce();
              return { data: { id: eqIdVal || "updated" }, error: null };
            }),
            then: (resolve: any, reject: any) => {
              recordOnce();
              return Promise.resolve({ error: null }).then(resolve, reject);
            },
          };
          return updateChain;
        }),
        delete: vi.fn(() => ({
          eq: vi.fn((_col: string, val: string) => {
            const recordAndResolve = () => {
              dbCalls.push({ table, op: "delete", eqId: val });
              return Promise.resolve({ error: null });
            };
            return {
              eq: vi.fn(async () => recordAndResolve()),
              then: (resolve: any, reject: any) =>
                recordAndResolve().then(resolve, reject),
            };
          }),
        })),
      };
      return chain;
    }),
    rpc: vi.fn(async (fnName: string, params: any) => {
      dbCalls.push({ table: fnName, op: "rpc", payload: params });
      return { data: null, error: null };
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

describe("syncManager QSR offline queue & sync", () => {
  beforeEach(() => {
    mockQueueSeq = 0;
    stores.writeQueue.clear();
    stores.conflictLog.clear();
    stores.localOrders.clear();
    dbCalls.length = 0;
    mockExistingRows = {};
    mockInsertErrorForTable = {};
    mockKitchenOrderLink = {};
    // Ensure indexedDB check in getPendingCount/flushQueue passes in jsdom
    if (typeof (globalThis as any).indexedDB === "undefined") {
      Object.defineProperty(globalThis, "indexedDB", {
        value: {},
        configurable: true,
      });
    }
    vi.clearAllMocks();
  });

  it("generates and identifies OFFLINE- order tokens", () => {
    const token = generateOfflineOrderNumber();
    expect(token.startsWith("OFFLINE-")).toBe(true);
    expect(isOfflineOrderNumber(token)).toBe(true);
    expect(isOfflineOrderNumber("104")).toBe(false);
  });

  it("replays QSR order -> kitchen_order -> pos_transaction in chronological order and prunes localOrders", async () => {
    const orderId = "ord-uuid-1";
    const kitchenId = "ko-uuid-1";

    await enqueueWrite(
      "order",
      {
        id: orderId,
        restaurant_id: "rest-1",
        customer_name: "Table 1",
        items: ["2x Burger"],
        total: 300,
        status: "completed",
      },
      "insert",
    );
    await enqueueWrite(
      "kitchen_order",
      {
        id: kitchenId,
        order_id: orderId,
        restaurant_id: "rest-1",
        source: "QSR-Table 1",
        status: "completed",
        items: [{ name: "Burger", quantity: 2, price: 150 }],
      },
      "insert",
    );
    await enqueueWrite(
      "pos_transaction",
      {
        restaurant_id: "rest-1",
        order_id: orderId,
        kitchen_order_id: kitchenId,
        amount: 300,
        payment_method: "cash",
        status: "completed",
      },
      "insert",
    );

    stores.localOrders.set(kitchenId, { id: kitchenId, orderId });
    expect(await getPendingCount()).toBe(3);

    await flushQueue();

    expect(await getPendingCount()).toBe(0);
    expect(stores.localOrders.size).toBe(0);
    expect(dbCalls.map((c) => `${c.table}:${c.op}`)).toEqual([
      "orders:insert",
      "kitchen_orders:insert",
      "pos_transactions:insert",
    ]);
    expect(dbCalls[1].payload.order_id).toBe(orderId);
    expect(dbCalls[2].payload.order_id).toBe(orderId);
    expect(dbCalls[2].payload.kitchen_order_id).toBe(kitchenId);
  });

  it("uses update (not upsert) for table_status and partial order updates", async () => {
    mockExistingRows["restaurant_tables:t-1"] = {
      id: "t-1",
      updated_at: "2020-01-01T00:00:00.000Z",
    };

    await enqueueWrite("table_status", { id: "t-1", status: "occupied" }, "update");
    await flushQueue();

    expect(dbCalls).toHaveLength(1);
    expect(dbCalls[0]).toMatchObject({
      table: "restaurant_tables",
      op: "update",
      eqId: "t-1",
    });
    expect(dbCalls[0].payload.status).toBe("occupied");
  });

  it("resolves linked order_id from kitchen_orders when settling an online-born order offline", async () => {
    mockKitchenOrderLink["ko-online-1"] = "ord-online-1";
    mockExistingRows["orders:ord-online-1"] = {
      id: "ord-online-1",
      updated_at: "2020-01-01T00:00:00.000Z",
    };

    await enqueueWrite(
      "order",
      {
        id: "ko-online-1",
        _resolveOrderIdFromKitchenOrderId: "ko-online-1",
        status: "completed",
        payment_status: "paid",
        payment_method: "upi",
      },
      "update",
    );
    await enqueueWrite(
      "pos_transaction",
      {
        restaurant_id: "rest-1",
        order_id: null,
        _resolveOrderIdFromKitchenOrderId: "ko-online-1",
        kitchen_order_id: "ko-online-1",
        amount: 250,
        payment_method: "upi",
        status: "completed",
      },
      "insert",
    );

    await flushQueue();

    expect(dbCalls[0]).toMatchObject({
      table: "orders",
      op: "update",
      eqId: "ord-online-1",
    });
    expect(dbCalls[0].payload._resolveOrderIdFromKitchenOrderId).toBeUndefined();
    expect(dbCalls[1].payload.order_id).toBe("ord-online-1");
  });

  it("retains failed pos_transaction in queue for retry instead of silently dropping", async () => {
    mockInsertErrorForTable.pos_transactions = new Error("Network timeout");

    await enqueueWrite(
      "pos_transaction",
      {
        restaurant_id: "rest-1",
        amount: 100,
        payment_method: "cash",
        status: "completed",
      },
      "insert",
    );

    await flushQueue();

    expect(await getPendingCount()).toBe(1);
    const queued = Array.from(stores.writeQueue.values())[0];
    expect(queued.retries).toBe(1);
  });

  it("cancels unsynced writes cleanly when an offline order is deleted before sync", async () => {
    await enqueueWrite("order", { id: "ord-local" }, "insert");
    await enqueueWrite(
      "kitchen_order",
      { id: "ko-local", order_id: "ord-local" },
      "insert",
    );
    await enqueueWrite(
      "pos_transaction",
      { order_id: "ord-local", kitchen_order_id: "ko-local" },
      "insert",
    );

    const removed = await removeQueuedWritesForOrder("ko-local", "ord-local");
    expect(removed).toBe(3);
    expect(await getPendingCount()).toBe(0);
  });

  it("handles QuickServe _updateByOrderId, pos_transaction_clear_pending, and sequential offline tokens", async () => {
    recordQuickServeOrderNumber("rest-qs", 7);
    expect(allocateOfflineQuickServeToken("rest-qs")).toBe(8);
    expect(allocateOfflineQuickServeToken("rest-qs")).toBe(9);

    await enqueueWrite(
      "kitchen_order",
      {
        _updateByOrderId: "ord-qs-1",
        status: "served",
      },
      "update",
    );
    await enqueueWrite(
      "pos_transaction_clear_pending",
      { order_id: "ord-qs-1" },
      "delete",
    );

    await flushQueue();

    expect(await getPendingCount()).toBe(0);
    expect(dbCalls).toEqual([
      {
        table: "kitchen_orders",
        op: "update",
        payload: expect.objectContaining({ status: "served" }),
        eqId: "ord-qs-1",
      },
      {
        table: "pos_transactions",
        op: "delete",
        eqId: "ord-qs-1",
      },
    ]);
    expect(dbCalls[0].payload._updateByOrderId).toBeUndefined();
  });

  it("removes queued updates without counting them as cancelable unreplayed inserts", async () => {
    await enqueueWrite("kitchen_order", { id: "ko-srv-1", status: "preparing" }, "update");
    await enqueueWrite("order", { id: "ord-srv-1", payment_status: "paid" }, "update");

    const removedInsertCount = await removeQueuedWritesForOrder("ko-srv-1", "ord-srv-1");
    expect(removedInsertCount).toBe(0);
    expect(await getPendingCount()).toBe(0);
  });

  it("skips items deleted mid-flush and preserves existing server paid status when requested", async () => {
    mockExistingRows["orders:ord-paid-1"] = {
      id: "ord-paid-1",
      payment_status: "paid",
      created_at: "2020-01-01T00:00:00.000Z",
      updated_at: "2020-01-01T00:00:00.000Z",
    };

    const deletedId = await enqueueWrite("kitchen_order", { id: "ko-cancel" }, "update");
    stores.writeQueue.delete(deletedId);

    await enqueueWrite(
      "order",
      {
        id: "ord-paid-1",
        payment_status: "pending",
        payment_method: "pay_later",
        customer_name: "Updated Guest",
        _preserveExistingPaidStatus: true,
      },
      "update",
    );

    await flushQueue();

    expect(dbCalls).toHaveLength(1);
    expect(dbCalls[0]).toMatchObject({
      table: "orders",
      op: "update",
      eqId: "ord-paid-1",
    });
    expect(dbCalls[0].payload.payment_status).toBeUndefined();
    expect(dbCalls[0].payload.payment_method).toBeUndefined();
    expect(dbCalls[0].payload.customer_name).toBe("Updated Guest");
  });

  it("skips unlinked order update cleanly when no pending kitchen_order insert exists, and retries if insert is pending", async () => {
    await enqueueWrite(
      "order",
      { id: "ko-unlinked", _resolveOrderIdFromKitchenOrderId: "ko-unlinked", status: "completed" },
      "update",
    );
    await flushQueue();
    expect(dbCalls).toHaveLength(0);
    expect(await getPendingCount()).toBe(0);

    // When a kitchen_order insert fails transiently and remains in writeQueue, order update waits in queue
    mockInsertErrorForTable.kitchen_orders = new Error("Temp DB error");
    await enqueueWrite(
      "kitchen_order",
      { id: "ko-pending-insert", order_id: "ord-pending", restaurant_id: "rest-1", source: "POS", status: "new", items: [] },
      "insert",
    );
    await enqueueWrite(
      "order",
      { id: "ko-pending-insert", _resolveOrderIdFromKitchenOrderId: "ko-pending-insert", status: "completed" },
      "update",
    );
    await flushQueue();
    expect(await getPendingCount()).toBe(2);
  });

  it("replays deduct_inventory and prevents duplicate room_food_order / loyalty_redemption", async () => {
    mockExistingRows["room_food_orders:ord-room-1"] = { id: "rf-existing" };
    mockExistingRows["loyalty_transactions:ord-loy-1"] = { id: "lt-existing" };
    mockExistingRows["customers:cust-1"] = { id: "cust-1", loyalty_points: 50 };

    await enqueueWrite("deduct_inventory", { order_id: "ko-inv-1" }, "insert");
    await enqueueWrite(
      "room_food_order",
      { room_id: "room-1", order_id: "ord-room-1", total: 300, status: "pending" },
      "insert",
    );
    await enqueueWrite(
      "loyalty_redemption",
      {
        restaurant_id: "rest-1",
        customer_id: "cust-1",
        source_id: "ord-loy-1",
        points_redeemed: 10,
      },
      "insert",
    );

    await flushQueue();

    const { supabase } = await import("@/integrations/supabase/client");
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "deduct-inventory-on-prep",
      { body: { order_id: "ko-inv-1" } },
    );
    // Duplicate room_food_order and loyalty_transactions skipped because existing rows found
    expect(dbCalls.filter((c) => c.table === "room_food_orders" && c.op === "insert")).toHaveLength(0);
    expect(dbCalls.filter((c) => c.table === "loyalty_transactions" && c.op === "insert")).toHaveLength(0);
    expect(await getPendingCount()).toBe(0);
  });

  it("removes queued kitchen_order writes cleanly while persisting deduct_inventory if preparing", async () => {
    await enqueueWrite(
      "kitchen_order",
      { id: "ko-prep-1", status: "preparing", items: [] },
      "insert",
    );
    await enqueueWrite(
      "order",
      { id: "ord-prep-1", status: "preparing" },
      "insert",
    );

    const removed = await removeQueuedWritesForOrder("ko-prep-1", "ord-prep-1");
    expect(removed).toBe(2);
    expect(stores.writeQueue.size).toBe(0);
  });
});
