
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStatsData = () => {
  return useQuery({
    queryKey: ["dashboard-orders"],
    queryFn: async () => {
      console.log("Fetching dashboard orders data...");
      
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
      
      // Get orders for this restaurant
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id);
      
      if (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
      
      console.log("Fetched orders:", data?.length || 0);
      return data;
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
