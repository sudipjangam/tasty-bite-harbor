import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useEffect, useState } from "react";
import { ActiveKitchenOrder } from "@/types/qsr";

export type DateFilter =
  | "today"
  | "yesterday"
  | "last7days"
  | "thisMonth"
  | "custom";
export type StatusFilter = "all" | "new" | "preparing" | "ready" | "held";

interface UseActiveKitchenOrdersOptions {
  dateFilter?: DateFilter;
  statusFilter?: StatusFilter;
  searchQuery?: string;
}

export const useActiveKitchenOrders = (
  options: UseActiveKitchenOrdersOptions = {}
) => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState(options.searchQuery || "");
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    options.dateFilter || "today"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    options.statusFilter || "all"
  );

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case "today":
        return { start: today.toISOString(), end: now.toISOString() };
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday.toISOString(), end: today.toISOString() };
      case "last7days":
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo.toISOString(), end: now.toISOString() };
      case "thisMonth":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart.toISOString(), end: now.toISOString() };
      default:
        return { start: today.toISOString(), end: now.toISOString() };
    }
  };

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

      const { start, end } = getDateRange();

      let query = supabase
        .from("kitchen_orders")
        .select("*")
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
            0
          );

          return {
            id: order.id,
            orderId: order.order_id,
            source: order.source || "Unknown",
            items,
            status: order.status as ActiveKitchenOrder["status"],
            createdAt: order.created_at,
            total,
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
    refetchInterval: 15000, // Refresh every 15 seconds
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // Get order by ID for recall
  const getOrderById = async (
    orderId: string
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
      0
    );

    return {
      id: data.id,
      orderId: data.order_id,
      source: data.source || "Unknown",
      items,
      status: data.status as ActiveKitchenOrder["status"],
      createdAt: data.created_at,
      total,
    };
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
  };
};
