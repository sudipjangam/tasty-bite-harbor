
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";

export interface TrendingItem {
  name: string;
  count: number;
  revenue: number;
}

export const useTrendingItems = () => {
  const { restaurantId, isLoading: isRestaurantLoading } = useRestaurantId();

  return useQuery({
    queryKey: ["trending-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error("No restaurant found");

      // Fetch completed orders to calculate trending items
      const { data: orders, error } = await supabase
        .from("orders")
        .select("items, total")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .limit(100); // Analyze last 100 orders for trends

      if (error) throw error;

      // Group and count items
      // Assuming items is a string[] of names based on prior checks
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      
      orders?.forEach(order => {
        // Fallback if items is not an array or is null
        const items = Array.isArray(order.items) ? order.items : [];
        items.forEach((itemName: string) => {
           // Basic cleaning
           const name = itemName.trim();
           if (!itemCounts[name]) {
             itemCounts[name] = { count: 0, revenue: 0 };
           }
           itemCounts[name].count += 1;
           // Estimate revenue share (rough approximation since individual item prices aren't stored in simple order items array)
           // For accurate revenue we'd need item prices. Here we focus on popularity (count).
           // If we have total, we can assign average? No, that's misleading.
           // Let's stick to popularity (count) for "Trending".
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
