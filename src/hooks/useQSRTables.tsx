import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import { useEffect } from "react";
import { QSRTable } from "@/types/qsr";
import {
  getCachedByRestaurant,
  getLocalOrdersByRestaurant,
  LOCAL_ORDERS_EVENT,
  replaceCachedByRestaurant,
  updateCachedTableStatus,
} from "@/utils/offlineDB";
import { enqueueWrite } from "@/utils/syncManager";

const ACTIVE_TICKETS_SNAPSHOT_PREFIX = "qsr_active_tickets_snapshot_";

export const useQSRTables = () => {
  const { restaurantId } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  // Fetch tables with active order status (online + IDB offline fallback + local offline orders)
  const {
    data: tables = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["qsr-tables", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return [];

      const offline =
        !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

      let tablesData: Array<{ id: string; name: string; capacity: number; status?: string }> =
        [];

      if (offline) {
        const cached = await getCachedByRestaurant<{
          id: string;
          name?: string;
          capacity?: number;
          status?: string;
        }>("tables", restaurantId);
        tablesData = cached
          .map((t) => ({
            id: t.id,
            name: t.name || "Table",
            capacity: Number(t.capacity) || 4,
            status: t.status,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      } else {
        try {
          // M-1: Include status column so "reserved" status is preserved
          const { data, error: tablesError } = await supabase
            .from("restaurant_tables")
            .select("id, name, capacity, status")
            .eq("restaurant_id", restaurantId)
            .order("name");

          if (tablesError) throw tablesError;
          tablesData = data || [];
          replaceCachedByRestaurant(
            "tables",
            restaurantId,
            tablesData.map((t) => ({ ...t, restaurant_id: restaurantId })),
          ).catch(() => {});
        } catch (err) {
          const cached = await getCachedByRestaurant<{
            id: string;
            name?: string;
            capacity?: number;
            status?: string;
          }>("tables", restaurantId);
          if (cached.length > 0) {
            tablesData = cached
              .map((t) => ({
                id: t.id,
                name: t.name || "Table",
                capacity: Number(t.capacity) || 4,
                status: t.status,
              }))
              .sort((a, b) => a.name.localeCompare(b.name));
          } else {
            throw err;
          }
        }
      }

      // Fetch active kitchen orders when online; fall back to cached ticket snapshot when offline/error
      type OrderShape = {
        id: string;
        source: string | null;
        items: unknown;
        status: string;
        created_at: string;
        updated_at: string;
        customer_name: string | null;
        item_completion_status: unknown;
        table_number: string | null;
        table_id?: string | null;
      };

      const snapshotKey = `${ACTIVE_TICKETS_SNAPSHOT_PREFIX}${restaurantId}`;
      const loadTicketSnapshot = (): {
        orders: OrderShape[];
        hasSnapshot: boolean;
      } => {
        try {
          const raw = localStorage.getItem(snapshotKey);
          if (raw === null) return { orders: [], hasSnapshot: false };
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed)
            ? { orders: parsed, hasSnapshot: true }
            : { orders: [], hasSnapshot: false };
        } catch {
          return { orders: [], hasSnapshot: false };
        }
      };

      let serverActiveOrders: OrderShape[] = [];
      let hasOccupancyKnowledge = false;
      let serverFetchSucceeded = false;

      if (offline) {
        const snap = loadTicketSnapshot();
        serverActiveOrders = snap.orders;
        hasOccupancyKnowledge = snap.hasSnapshot;
      } else {
        try {
          const { data: activeOrders, error: ordersError } = await supabase
            .from("kitchen_orders")
            .select(
              "id, source, items, status, created_at, updated_at, customer_name, item_completion_status, table_number",
            )
            .eq("restaurant_id", restaurantId)
            .in("status", ["new", "preparing", "ready", "held"]);

          if (ordersError) {
            console.error("Error fetching active orders:", ordersError);
            const snap = loadTicketSnapshot();
            serverActiveOrders = snap.orders;
            hasOccupancyKnowledge = snap.hasSnapshot;
          } else {
            serverActiveOrders = activeOrders || [];
            hasOccupancyKnowledge = true;
            serverFetchSucceeded = true;
            try {
              localStorage.setItem(
                snapshotKey,
                JSON.stringify(serverActiveOrders),
              );
            } catch {
              /* ignore storage errors */
            }
          }
        } catch (err) {
          console.warn("[useQSRTables] Active orders offline fallback:", err);
          const snap = loadTicketSnapshot();
          serverActiveOrders = snap.orders;
          hasOccupancyKnowledge = snap.hasSnapshot;
        }
      }

      // Merge locally queued offline orders (new, updated, or completed/deleted offline)
      const localOrders = await getLocalOrdersByRestaurant(restaurantId);
      const orderMap = new Map<string, OrderShape>();
      for (const order of serverActiveOrders) {
        orderMap.set(order.id, order);
      }
      for (const lo of localOrders) {
        if (serverFetchSucceeded && lo.synced === true) {
          // M-5: Ignore already-synced mirrors once a fresh live fetch succeeded
          continue;
        }
        if (lo.status === "completed" || lo.status === "deleted") {
          if (!serverFetchSucceeded || !lo.synced) {
            orderMap.delete(lo.id);
          }
        } else if (!lo.synced) {
          // M-3: Never discard server/snapshot table_id/table_number/source/completion when unsynced mirror lacks tableId
          const existing = orderMap.get(lo.id);
          if (existing && !lo.tableId && !lo.tableName) {
            orderMap.set(lo.id, {
              ...existing,
              status: lo.status,
              items: lo.items,
              updated_at: lo.updatedAt,
              customer_name: lo.customerName || existing.customer_name,
              item_completion_status:
                lo.itemCompletionStatus ?? existing.item_completion_status,
            });
          } else {
            orderMap.set(lo.id, {
              id: lo.id,
              source: lo.source || existing?.source || null,
              items: lo.items,
              status: lo.status,
              created_at: lo.createdAt,
              updated_at: lo.updatedAt,
              customer_name: lo.customerName || existing?.customer_name || null,
              item_completion_status:
                lo.itemCompletionStatus ?? existing?.item_completion_status ?? [],
              table_number: lo.tableName || existing?.table_number || null,
              table_id: lo.tableId || existing?.table_id || null,
            });
          }
        }
      }
      const mergedActiveOrders = Array.from(orderMap.values());

      // Map tables with active order info
      const tablesWithStatus: QSRTable[] = tablesData.map((table) => {
        const tableOrder = mergedActiveOrders.find((order) => {
          // M-2: If order carries an explicit table_id, match exclusively on table_id (avoid text-heuristic false positives)
          if (order.table_id) {
            return order.table_id === table.id;
          }

          const source = order.source?.toLowerCase() || "";
          const customerName = order.customer_name?.toLowerCase() || "";
          const tableName = table.name?.toLowerCase() || "";

          // Check table_number explicitly (supporting both "Table 1" and normalized "1")
          if (order.table_number) {
            const tn = order.table_number.trim().toLowerCase();
            if (tn === tableName || `table ${tn}` === tableName || tn === tableName.replace(/^table\s+/, "")) {
              return true;
            }
          }

          // Check source field
          const sourceMatch =
            source.includes(`table ${tableName}`) ||
            source.includes(`table-${tableName}`) ||
            source === `pos-table ${tableName}` ||
            source === `qsr-${tableName}`;

          // Check customer_name field (used for dine-in orders)
          const customerNameMatch =
            customerName === `table ${tableName}` || customerName === tableName;

          return sourceMatch || customerNameMatch;
        });

        let activeOrderTotal = 0;
        let activeOrderItems = 0;
        let totalItemsCount = 0;
        let servedItemsCount = 0;

        if (tableOrder && tableOrder.items) {
          const items = tableOrder.items as {
            price: number;
            quantity: number;
          }[];
          const itemCompletionStatus =
            (tableOrder?.item_completion_status as boolean[]) || [];

          activeOrderTotal = items.reduce(
            (sum, item) =>
              sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
            0,
          );
          activeOrderItems = items.reduce(
            (sum, item) => sum + (Number(item.quantity) || 0),
            0,
          );

          items.forEach((item, index) => {
            const qty = Number(item.quantity) || 0;
            totalItemsCount += qty;
            if (itemCompletionStatus[index] === true) {
              servedItemsCount += qty;
            }
          });
        }

        const itemCompletionStatus =
          (tableOrder?.item_completion_status as boolean[]) || [];
        const itemsArray = (tableOrder?.items as unknown[]) || [];
        const allItemsDelivered =
          itemsArray.length > 0 &&
          itemCompletionStatus.length >= itemsArray.length &&
          itemCompletionStatus
            .slice(0, itemsArray.length)
            .every((status) => status === true);

        return {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          status: tableOrder
            ? "occupied"
            : hasOccupancyKnowledge
            ? table.status === "reserved"
              ? "reserved"
              : "available"
            : "unknown",
          activeOrderId: tableOrder?.id,
          activeOrderTotal,
          activeOrderItems,
          orderCreatedAt: tableOrder?.created_at,
          lastActivityAt: tableOrder?.updated_at,
          allItemsDelivered,
          totalItemsCount,
          servedItemsCount,
        };
      });

      return tablesWithStatus;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 15, // 15 sec cache - real-time handles instant updates
    gcTime: 1000 * 60 * 5, // 5 min garbage collection
    refetchInterval: 120000, // 2 min fallback (real-time is primary)
  });

  // Real-time subscription for table and order changes + offline local order listener
  useEffect(() => {
    if (!restaurantId) return;

    const handleLocalChange = () => {
      queryClient.invalidateQueries({
        queryKey: ["qsr-tables", restaurantId],
      });
      refetch();
    };
    window.addEventListener(LOCAL_ORDERS_EVENT, handleLocalChange);

    const channel = supabase
      .channel(`qsr-tables-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["qsr-tables", restaurantId],
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["qsr-tables", restaurantId],
          });
          refetch();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["qsr-tables", restaurantId],
          });
          refetch();
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener(LOCAL_ORDERS_EVENT, handleLocalChange);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient, refetch]);

  // Update table status (supports offline queue fallback)
  const updateTableStatus = async (
    tableId: string,
    status: "available" | "occupied" | "reserved",
  ) => {
    const offline =
      !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

    if (offline) {
      // M-4: Enqueue first so a crash cannot leave dirty IDB state without a queued write
      await enqueueWrite("table_status", { id: tableId, status }, "update");
      await updateCachedTableStatus(tableId, status);
      refetch();
      return;
    }

    try {
      const { error } = await supabase
        .from("restaurant_tables")
        .update({ status })
        .eq("id", tableId);

      if (error) throw error;
    } catch (error) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueWrite("table_status", { id: tableId, status }, "update");
        await updateCachedTableStatus(tableId, status);
      } else {
        console.error("Error updating table status:", error);
        throw error;
      }
    }

    // Refetch tables
    refetch();
  };

  return {
    tables,
    isLoading,
    refetch,
    updateTableStatus,
  };
};
