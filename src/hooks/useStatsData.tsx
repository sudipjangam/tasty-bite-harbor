import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { useRestaurantId } from "./useRestaurantId";

export const useStatsData = () => {
  const { restaurantId, isLoading: isRestaurantLoading } = useRestaurantId();

  // Setup real-time subscription for orders_unified table
  useRealtimeSubscription({
    table: "orders_unified",
    queryKey: "dashboard-orders",
    schema: "public",
  });

  return useQuery({
    queryKey: ["dashboard-orders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        throw new Error("No restaurant found for user");
      }

      // Calculate date 60 days ago to fetch relevant history for trends
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Fetch all orders from unified table (POS, table, manual, room service, QSR, etc.)
      // Limit to last 60 days to ensure we get recent data and don't hit 1000 row limit on older data
      const { data: orders, error } = await supabase
        .from("orders_unified")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sixtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch room billings for revenue calculation
      const { data: roomBillings } = await supabase
        .from("room_billings")
        .select("*")
        .eq("restaurant_id", restaurantId);

      // Transform room billings to match orders structure for easier processing
      const roomBillingsAsOrders = (roomBillings || []).map((billing) => ({
        ...billing,
        // Match orders_unified schema
        total_amount: billing.total_amount,
        kitchen_status:
          billing.payment_status === "paid" ? "completed" : "served", // Treat checkout as completed/served
        payment_status: billing.payment_status,
        customer_name: `Room ${billing.room_id}`,
        created_at: billing.checkout_date,
        source: "room_billing",
        items_completion: [], // Placeholder
        items: [], // Placeholder
      }));

      return {
        orders: orders || [],
        roomBillings: roomBillingsAsOrders,
        allRevenueSources: [...(orders || []), ...roomBillingsAsOrders],
      };
    },
    enabled: !!restaurantId && !isRestaurantLoading,
    // Auto-refresh options for real-time data
    staleTime: 0, // Always consider data stale - fetch fresh on every mount
    refetchOnWindowFocus: true, // Refetch when browser tab gains focus
    refetchOnMount: "always", // Always refetch when component mounts (navigation)
    // Note: refetchInterval removed - useRealtimeSubscription handles live updates
    refetchIntervalInBackground: false, // Don't poll when tab is in background
  });
};
