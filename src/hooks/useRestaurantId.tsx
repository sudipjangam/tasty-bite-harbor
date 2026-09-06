import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * A custom hook that fetches the restaurant ID and name for the current user
 * This centralizes the restaurant information fetching logic that was previously duplicated across components.
 * Supports active branch selection in multi-branch/franchise mode.
 */
export const useRestaurantId = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleBranchChange = () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
    };
    window.addEventListener("active_branch_changed", handleBranchChange);
    return () => {
      window.removeEventListener("active_branch_changed", handleBranchChange);
    };
  }, [queryClient]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      // 1. Check if user selected an active branch (franchise / multi-branch mode)
      const activeBranchOverride = localStorage.getItem("active_branch_id");
      if (activeBranchOverride) {
        try {
          const { data: hasAccess } = await supabase.rpc("check_user_branch_access", {
            target_branch_id: activeBranchOverride,
          });

          if (hasAccess) {
            const { data: branch, error: branchError } = await supabase
              .from("restaurants")
              .select("id, name")
              .eq("id", activeBranchOverride)
              .maybeSingle();

            if (!branchError && branch) {
              return {
                restaurantId: branch.id,
                restaurantName: branch.name,
                id: branch.id,
              };
            }
          }
        } catch {
          // If RPC not yet applied, fallback safely to profiles
        }
      }

      // 2. Default/Fallback: lookup profiles.restaurant_id
      const { data: userProfile, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .maybeSingle();

      if (error) throw error;

      // If we have a restaurant ID, fetch the restaurant name as well
      if (userProfile?.restaurant_id) {
        const { data: restaurant, error: restError } = await supabase
          .from("restaurants")
          .select("id, name")
          .eq("id", userProfile.restaurant_id)
          .maybeSingle();

        if (restError) throw restError;

        if (restaurant) {
          return {
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            id: restaurant.id,
          };
        }
      }

      return { restaurantId: null, restaurantName: null };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    restaurantId: data?.restaurantId || data?.id || null,
    restaurantName: data?.restaurantName || null,
    isLoading,
    error,
  };
};
