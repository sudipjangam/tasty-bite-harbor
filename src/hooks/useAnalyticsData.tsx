
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAnalyticsData = () => {
  return useQuery({
    queryKey: ["analytics-data"],
    queryFn: async () => {
      console.log("Fetching analytics data...");
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Auth error:", userError);
        throw userError;
      }
      
      if (!userData.user) {
        console.error("No authenticated user found");
        throw new Error("No authenticated user found");
      }
      
      console.log("Authenticated user ID:", userData.user.id);
      
      // Get user's restaurant_id
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", userData.user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }
      
      if (!userProfile?.restaurant_id) {
        console.error("No restaurant found for user");
        throw new Error("No restaurant found for user");
      }
      
      console.log("Restaurant ID:", userProfile.restaurant_id);

      // Fetch revenue stats
      const { data: revenueStats, error: revenueError } = await supabase
        .from("daily_revenue_stats")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("date", { ascending: false })
        .limit(30);
        
      if (revenueError) {
        console.error("Error fetching revenue stats:", revenueError);
      }

      // Fetch customer insights
      const { data: customerInsights, error: customerError } = await supabase
        .from("customer_insights")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("total_spent", { ascending: false })
        .limit(100);
        
      if (customerError) {
        console.error("Error fetching customer insights:", customerError);
      }

      // Fetch recent orders
      const { data: recentOrders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (ordersError) {
        console.error("Error fetching recent orders:", ordersError);
      }

      return {
        revenueStats: revenueStats || [],
        customerInsights: customerInsights || [],
        recentOrders: recentOrders || [],
      };
    },
    refetchOnWindowFocus: true,
    staleTime: 10000,
    retry: 2,
  });
};
