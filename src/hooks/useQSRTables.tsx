import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useEffect } from "react";
import { QSRTable } from "@/types/qsr";

export const useQSRTables = () => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  // Fetch tables with active order status
  const {
    data: tables = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["qsr-tables", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      // Fetch tables
      const { data: tablesData, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("id, name, capacity")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (tablesError) throw tablesError;

      // Fetch active kitchen orders to determine occupied status
      const { data: activeOrders, error: ordersError } = await supabase
        .from("kitchen_orders")
        .select(
          "id, source, items, status, created_at, updated_at, customer_name, item_completion_status"
        )
        .eq("restaurant_id", restaurantId)
        .in("status", ["new", "preparing", "ready", "held"]);

      if (ordersError) {
        console.error("Error fetching active orders:", ordersError);
      }

      // Map tables with active order info
      const tablesWithStatus: QSRTable[] = tablesData.map((table) => {
        // Check if there's an active order for this table
        // Match by source OR customer_name (customer_name contains "Table X" for dine-in)
        const tableOrder = activeOrders?.find((order) => {
          const source = order.source?.toLowerCase() || "";
          const customerName = order.customer_name?.toLowerCase() || "";
          const tableName = table.name?.toLowerCase() || "";

          // Check source field
          const sourceMatch =
            source.includes(`table ${tableName}`) ||
            source.includes(`table-${tableName}`) ||
            source === `pos-table ${tableName}`;

          // Check customer_name field (used for dine-in orders)
          const customerNameMatch =
            customerName === `table ${tableName}` || customerName === tableName;

          return sourceMatch || customerNameMatch;
        });

        let activeOrderTotal = 0;
        let activeOrderItems = 0;

        if (tableOrder && tableOrder.items) {
          const items = tableOrder.items as {
            price: number;
            quantity: number;
          }[];
          activeOrderTotal = items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          activeOrderItems = items.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
        }

        // Check if all items are delivered (ready for payment)
        const itemCompletionStatus =
          (tableOrder?.item_completion_status as boolean[]) || [];
        const totalItems = tableOrder?.items
          ? (tableOrder.items as { quantity: number }[]).reduce(
              (sum, item) => sum + item.quantity,
              0
            )
          : 0;
        const allItemsDelivered =
          totalItems > 0 &&
          itemCompletionStatus.length >= totalItems &&
          itemCompletionStatus
            .slice(0, totalItems)
            .every((status) => status === true);

        return {
          id: table.id,
          name: table.name,
          capacity: table.capacity,
          // Always derive status from active orders - don't use stale database status
          // Table is occupied only if there's an active order, otherwise available
          status: tableOrder ? "occupied" : "available",
          activeOrderId: tableOrder?.id,
          activeOrderTotal,
          activeOrderItems,
          orderCreatedAt: tableOrder?.created_at,
          lastActivityAt: tableOrder?.updated_at,
          allItemsDelivered,
        };
      });

      return tablesWithStatus;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 15, // 15 sec cache - real-time handles instant updates
    gcTime: 1000 * 60 * 5, // 5 min garbage collection
    refetchInterval: 120000, // 2 min fallback (real-time is primary)
  });

  // Real-time subscription for table and order changes
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("qsr-tables-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          console.log("🔄 [QSR] Restaurant table changed - refreshing");
          queryClient.invalidateQueries({
            queryKey: ["qsr-tables", restaurantId],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          // Immediately refetch when order status changes (especially to 'completed')
          console.log("🔄 [QSR] Kitchen order changed - refreshing", payload);
          queryClient.invalidateQueries({
            queryKey: ["qsr-tables", restaurantId],
          });
          // Also trigger an immediate refetch for faster UI update
          refetch();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          // Listen to orders table for payment status changes
          console.log("🔄 [QSR] Order changed - refreshing", payload);
          queryClient.invalidateQueries({
            queryKey: ["qsr-tables", restaurantId],
          });
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient, refetch]);

  // Update table status
  const updateTableStatus = async (
    tableId: string,
    status: "available" | "occupied" | "reserved"
  ) => {
    const { error } = await supabase
      .from("restaurant_tables")
      .update({ status })
      .eq("id", tableId);

    if (error) {
      console.error("Error updating table status:", error);
      throw error;
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
