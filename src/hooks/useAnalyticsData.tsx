
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, subDays } from "date-fns";

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

      // Mock data for top products (in a real app, this would come from the database)
      const topProducts = [
        { name: "Butter Chicken", orders: 287, revenue: 28700, profit_margin: 68, in_stock: true, trend: 'up' as const },
        { name: "Paneer Tikka", orders: 243, revenue: 24300, profit_margin: 72, in_stock: true, trend: 'up' as const },
        { name: "Veg Biryani", orders: 198, revenue: 19800, profit_margin: 65, in_stock: true, trend: 'stable' as const },
        { name: "Chicken Biryani", orders: 176, revenue: 21120, profit_margin: 58, in_stock: true, trend: 'up' as const },
        { name: "Masala Dosa", orders: 152, revenue: 12160, profit_margin: 75, in_stock: true, trend: 'down' as const },
        { name: "Gulab Jamun", orders: 145, revenue: 7250, profit_margin: 82, in_stock: false, trend: 'stable' as const },
        { name: "Tandoori Roti", orders: 134, revenue: 5360, profit_margin: 70, in_stock: true, trend: 'stable' as const },
        { name: "Chicken 65", orders: 123, revenue: 12300, profit_margin: 60, in_stock: true, trend: 'up' as const },
        { name: "Dal Makhani", orders: 118, revenue: 11800, profit_margin: 78, in_stock: true, trend: 'down' as const },
        { name: "Ras Malai", orders: 98, revenue: 4900, profit_margin: 80, in_stock: false, trend: 'down' as const }
      ];

      // Mock data for sales prediction (in a real app, this would come from an AI model or calculation)
      const today = new Date();
      const salesPrediction = Array.from({ length: 14 }).map((_, i) => {
        const date = i < 7 ? subDays(today, 7 - i) : addDays(today, i - 7);
        const isHistory = i < 7;
        const baseValue = Math.floor(8000 + Math.random() * 4000);
        const dayOfWeek = date.getDay();
        
        // Weekend boost
        const weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.4 : 1;
        
        return {
          date: format(date, 'dd MMM'),
          actual: isHistory ? Math.floor(baseValue * weekendMultiplier) : null,
          predicted: isHistory ? null : Math.floor(baseValue * weekendMultiplier)
        };
      });

      // Return all the data
      return {
        revenueStats: revenueStats || [],
        customerInsights: customerInsights || [],
        recentOrders: recentOrders || [],
        topProducts,
        salesPrediction
      };
    },
    // Add refetching configuration
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when the window regains focus
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};
