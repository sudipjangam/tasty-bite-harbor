import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";

export interface LiveActivityData {
  activeOrders: number;
  pendingOrders: number;
  checkedInGuests: number;
  expectedCheckouts: number;
  kitchenQueue: number;
  avgPrepTime: number;
  hasAlerts: boolean;
  alertCount: number;
}

export const useLiveActivity = () => {
  const { restaurantId } = useRestaurantId();

  return useQuery({
    queryKey: ["liveActivity", restaurantId],
    queryFn: async (): Promise<LiveActivityData> => {
      if (!restaurantId) {
        throw new Error("Restaurant ID not found");
      }

      // Get active orders from ORDERS table (not kitchen_orders)
      // Active = pending, confirmed, preparing, ready (exclude cancelled/completed)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("status", { count: "exact" })
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "confirmed", "preparing", "ready"])
        .neq("status", "cancelled");

      if (ordersError) throw ordersError;

      const activeOrders = ordersData?.length || 0;
      const pendingOrders = ordersData?.filter(o => o.status === "pending").length || 0;

      // Get checked-in guests count
      const { data: guestsData, error: guestsError } = await supabase
        .from("check_ins")
        .select("id, expected_check_out", { count: "exact" })
        .eq("restaurant_id", restaurantId)
        .eq("status", "checked_in");

      if (guestsError) throw guestsError;

      const checkedInGuests = guestsData?.length || 0;
      
      // Count guests expected to checkout today
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const expectedCheckouts = guestsData?.filter(g => {
        const checkoutDate = new Date(g.expected_check_out);
        return checkoutDate <= today;
      }).length || 0;

      // Get kitchen queue (orders being prepared)
      const { data: kitchenData, error: kitchenError } = await supabase
        .from("orders")
        .select("status, created_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "preparing")
        .order("created_at", { ascending: true });

      if (kitchenError) throw kitchenError;

      const kitchenQueue = kitchenData?.length || 0;

      // Calculate average prep time (time from created to completed for last 10 orders)
      const { data: completedOrders, error: completedError } = await supabase
        .from("orders")
        .select("created_at, updated_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(10);

      if (completedError) throw completedError;

      let avgPrepTime = 0;
      if (completedOrders && completedOrders.length > 0) {
        const totalPrepTime = completedOrders.reduce((sum, order) => {
          const created = new Date(order.created_at).getTime();
          const updated = new Date(order.updated_at).getTime();
          return sum + (updated - created);
        }, 0);
        avgPrepTime = Math.round(totalPrepTime / completedOrders.length / 60000); // Convert to minutes
      } else {
        avgPrepTime = 15; // Default value if no data
      }

      // Check for alerts (high kitchen queue or many pending orders)
      const hasAlerts = kitchenQueue > 15 || activeOrders > 20;
      const alertCount = (kitchenQueue > 15 ? 1 : 0) + (activeOrders > 20 ? 1 : 0);

      return {
        activeOrders,
        pendingOrders,
        checkedInGuests,
        expectedCheckouts,
        kitchenQueue,
        avgPrepTime,
        hasAlerts,
        alertCount
      };
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time feel
    enabled: !!restaurantId,
  });
};
