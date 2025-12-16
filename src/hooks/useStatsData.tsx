import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export const useStatsData = () => {
  // Setup real-time subscription for orders table
  useRealtimeSubscription({
    table: 'orders',
    queryKey: 'dashboard-orders',
    schema: 'public',
  });

  return useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const restaurantId = userProfile.restaurant_id;

      // Fetch all orders from all sources (POS, table, manual, room service, QSR, etc.)
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      // Fetch room billings for revenue calculation
      const { data: roomBillings } = await supabase
        .from("room_billings")
        .select("*")
        .eq("restaurant_id", restaurantId);

      // Transform room billings to match orders structure for easier processing
      const roomBillingsAsOrders = (roomBillings || []).map(billing => ({
        ...billing,
        total: billing.total_amount,
        status: billing.payment_status === 'paid' ? 'completed' : 'pending',
        customer_name: `Room ${billing.room_id}`,
        created_at: billing.billing_date,
        source: 'room_billing'
      }));

      return {
        orders: orders || [],
        roomBillings: roomBillingsAsOrders,
        allRevenueSources: [...(orders || []), ...roomBillingsAsOrders]
      };
    },
  });
};
