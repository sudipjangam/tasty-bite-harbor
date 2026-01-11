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

      // Fetch all orders from unified table (POS, table, manual, room service, QSR, etc.)
      const { data: orders, error } = await supabase
        .from("orders_unified")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      // Fetch room billings for revenue calculation
      const { data: roomBillings } = await supabase
        .from("room_billings")
        .select("*")
        .eq("restaurant_id", restaurantId);

      // Transform room billings to match orders structure for easier processing
      const roomBillingsAsOrders = (roomBillings || []).map((billing) => ({
        ...billing,
        total: billing.total_amount,
        status: billing.payment_status === "paid" ? "completed" : "pending",
        customer_name: `Room ${billing.room_id}`,
        created_at: billing.checkout_date,
        source: "room_billing",
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
