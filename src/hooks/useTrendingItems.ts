
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
    table: "orders",
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

      // Fetch completed orders within the date range
      const { data: orders, error } = await supabase
        .from("orders")
        .select("items, total, created_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group and count items
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      
      orders?.forEach(order => {
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach((item: any) => {
          let rawName = "";
          let quantity = 1;

          if (typeof item === "string") {
            rawName = item.trim();
          } else if (typeof item === "object" && item !== null) {
            rawName = (item.name || item.item_name || "").trim();
            quantity = Number(item.quantity || item.qty) || 1;
          }

          if (!rawName) return;

          // Parse raw strings like "1x Paneer Tikka @199" -> name: "Paneer Tikka", qty: 1
          const match = rawName.match(/^(?:(\d+)x\s+)?(.+?)(?:\s*@\s*\d+(?:\.\d+)?)?$/i);
          const cleanName = match && match[2] ? match[2].trim() : rawName;
          const parsedQty = match && match[1] ? parseInt(match[1], 10) : quantity;

          if (!cleanName) return;

          if (!itemCounts[cleanName]) {
            itemCounts[cleanName] = { count: 0, revenue: 0 };
          }
          itemCounts[cleanName].count += parsedQty;
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
