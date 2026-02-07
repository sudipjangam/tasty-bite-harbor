import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useEffect, useState } from "react";
import { ActiveKitchenOrder } from "@/types/qsr";
import { useToast } from "@/hooks/use-toast";
import { getDateRange, DateFilter } from "@/utils/dateRangeUtils";

export type { DateFilter } from "@/utils/dateRangeUtils";
export type StatusFilter = "all" | "new" | "preparing" | "ready" | "held";

interface UseActiveKitchenOrdersOptions {
  dateFilter?: DateFilter;
  statusFilter?: StatusFilter;
  searchQuery?: string;
}

export const useActiveKitchenOrders = (
  options: UseActiveKitchenOrdersOptions = {},
) => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState(options.searchQuery || "");
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    options.dateFilter || "today",
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    options.statusFilter || "all",
  );

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "active-kitchen-orders",
      restaurantId,
      dateFilter,
      statusFilter,
      searchQuery,
    ],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { start, end } = getDateRange(dateFilter);

      let query = supabase
        .from("kitchen_orders")
        .select(
          "id, source, items, status, priority, created_at, order_id, item_completion_status, order_type",
        )
        .eq("restaurant_id", restaurantId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      } else {
        // Default: show active orders (not completed)
        query = query.in("status", ["new", "preparing", "ready", "held"]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map to ActiveKitchenOrder format and apply search filter
      const mappedOrders: ActiveKitchenOrder[] = (data || [])
        .map((order) => {
          const items =
            (order.items as {
              name: string;
              quantity: number;
              price: number;
            }[]) || [];
          const total = items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          );

          return {
            id: order.id,
            orderId: order.order_id,
            source: order.source || "Unknown",
            items,
            status: order.status as ActiveKitchenOrder["status"],
            priority: order.priority as ActiveKitchenOrder["priority"],
            createdAt: order.created_at,
            total,
            itemCompletionStatus:
              (order.item_completion_status as boolean[]) || [],
            orderType: order.order_type as ActiveKitchenOrder["orderType"],
          };
        })
        .filter((order) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            order.source.toLowerCase().includes(query) ||
            order.items.some((item) => item.name.toLowerCase().includes(query))
          );
        });

      return mappedOrders;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 5, // 5 sec cache - orders change often, real-time handles updates
    gcTime: 1000 * 60 * 5, // 5 min garbage collection
  });

  // Real-time subscription for kitchen orders
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("active-kitchen-orders-realtime")
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
            queryKey: ["active-kitchen-orders", restaurantId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // Get order by ID for recall
  const getOrderById = async (
    orderId: string,
  ): Promise<ActiveKitchenOrder | null> => {
    const { data, error } = await supabase
      .from("kitchen_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !data) return null;

    const items =
      (data.items as { name: string; quantity: number; price: number }[]) || [];
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return {
      id: data.id,
      orderId: data.order_id,
      source: data.source || "Unknown",
      items,
      status: data.status as ActiveKitchenOrder["status"],
      priority: data.priority as ActiveKitchenOrder["priority"],
      createdAt: data.created_at,
      total,
      itemCompletionStatus: (data.item_completion_status as boolean[]) || [],
      orderType: data.order_type as ActiveKitchenOrder["orderType"],
    };
  };

  // Toggle item completion status (strikethrough)
  const toggleItemCompletion = async (
    orderId: string,
    itemIndex: number,
    currentStatus: boolean[] = [],
  ): Promise<boolean> => {
    // Create a copy of current status or initialize new array
    const newCompletionStatus = [...currentStatus];

    // Ensure array is long enough
    while (newCompletionStatus.length <= itemIndex) {
      newCompletionStatus.push(false);
    }

    // Toggle status
    newCompletionStatus[itemIndex] = !newCompletionStatus[itemIndex];

    try {
      const { error } = await supabase
        .from("kitchen_orders")
        .update({ item_completion_status: newCompletionStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Invalidate query to refresh data
      queryClient.invalidateQueries({
        queryKey: ["active-kitchen-orders", restaurantId],
      });

      return true;
    } catch (error) {
      console.error("Error toggling item completion:", error);
      return false;
    }
  };

  // Update order priority
  const handlePriorityChange = async (
    orderId: string,
    priority: "normal" | "rush" | "vip",
  ) => {
    try {
      const { error } = await supabase
        .from("kitchen_orders")
        .update({ priority })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Priority Updated",
        description: `Order priority changed to ${priority.toUpperCase()}`,
      });

      // Refetch to update the list
      await refetch();
    } catch (error) {
      console.error("Error updating priority:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update order priority",
      });
      throw error;
    }
  };

  return {
    orders,
    isLoading,
    refetch,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    getOrderById,
    toggleItemCompletion,
    handlePriorityChange,
  };
};
