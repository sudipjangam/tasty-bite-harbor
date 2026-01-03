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
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (tablesError) throw tablesError;

      // Fetch active kitchen orders to determine occupied status
      const { data: activeOrders, error: ordersError } = await supabase
        .from("kitchen_orders")
        .select("id, source, items, status")
        .eq("restaurant_id", restaurantId)
        .in("status", ["new", "preparing", "ready", "held"]);

      if (ordersError) {
        console.error("Error fetching active orders:", ordersError);
      }

      // Map tables with active order info
      const tablesWithStatus: QSRTable[] = tablesData.map((table) => {
        // Check if there's an active order for this table
        const tableOrder = activeOrders?.find((order) => {
          const source = order.source?.toLowerCase() || "";
          const tableName = table.name?.toLowerCase() || "";
          return (
            source.includes(`table ${tableName}`) ||
            source.includes(`table-${tableName}`) ||
            source === `pos-table ${tableName}` ||
            source.includes(tableName)
          );
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
        };
      });

      return tablesWithStatus;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refresh every 30 seconds
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
