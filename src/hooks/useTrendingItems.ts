
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { subDays, subMonths } from "date-fns";

export interface TrendingItem {
  name: string;
  count: number;
  revenue: number;
}

export type TrendingPeriod = "weekly" | "monthly";

export const useTrendingItems = (period: TrendingPeriod = "weekly") => {
  const { restaurantId, isLoading: isRestaurantLoading } = useRestaurantId();

  // Setup real-time subscription for live updates
  useRealtimeSubscription({
    table: "orders_unified",
    queryKey: "trending-items",
    schema: "public",
  });

  return useQuery({
    queryKey: ["trending-items", restaurantId, period],
    queryFn: async () => {
      if (!restaurantId) throw new Error("No restaurant found");

      // Calculate date range based on period
      const now = new Date();
      const startDate = period === "weekly" 
        ? subDays(now, 7) 
        : subMonths(now, 1);

      // Fetch completed orders from unified table within the date range
      const { data: orders, error } = await supabase
        .from("orders_unified")
        .select("items, total_amount, created_at")
        .eq("restaurant_id", restaurantId)
        .eq("kitchen_status", "completed")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group and count items
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      
      orders?.forEach(order => {
        // Handle items as array of objects with name property
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach((item: any) => {
          // Handle both string and object formats
          const name = typeof item === 'string' ? item.trim() : (item?.name || '').trim();
          if (!name) return;
          
          if (!itemCounts[name]) {
            itemCounts[name] = { count: 0, revenue: 0 };
          }
          itemCounts[name].count += typeof item === 'object' ? (item.quantity || 1) : 1;
        });
      });

      // Convert to array and sort
      const sortedItems = Object.entries(itemCounts)
        .map(([name, stats]) => ({
          name,
          count: stats.count,
          revenue: stats.revenue 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      return sortedItems;
    },
    enabled: !!restaurantId && !isRestaurantLoading,
  });
};
