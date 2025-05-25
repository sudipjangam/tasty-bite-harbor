
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * A custom hook that fetches the restaurant ID and name for the current user
 * This centralizes the restaurant information fetching logic that was previously duplicated across components
 */
export const useRestaurantId = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (error) throw error;
      
      // If we have a restaurant ID, fetch the restaurant name as well
      if (userProfile?.restaurant_id) {
        const { data: restaurant, error: restError } = await supabase
          .from("restaurants")
          .select("id, name")
          .eq("id", userProfile.restaurant_id)
          .single();
          
        if (restError) throw restError;
        
        return {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name
        };
      }
      
      return { restaurantId: null, restaurantName: null };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return { 
    restaurantId: data?.restaurantId || null, 
    restaurantName: data?.restaurantName || null,
    isLoading, 
    error 
  };
};
