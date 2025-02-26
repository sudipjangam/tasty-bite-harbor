
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAnalyticsData = () => {
  return useQuery({
    queryKey: ["analytics-data"],
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

      // Fetch revenue stats
      const { data: revenueStats } = await supabase
        .from("daily_revenue_stats")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("date", { ascending: false })
        .limit(30);

      // Fetch customer insights
      const { data: customerInsights } = await supabase
        .from("customer_insights")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("total_spent", { ascending: false })
        .limit(100);

      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("created_at", { ascending: false })
        .limit(50);

      return {
        revenueStats: revenueStats || [],
        customerInsights: customerInsights || [],
        recentOrders: recentOrders || [],
      };
    },
    // Add refetching configuration
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when the window regains focus
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};
