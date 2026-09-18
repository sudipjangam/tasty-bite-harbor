
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * A custom hook that fetches the restaurant ID and name for the current user.
 * Supports active branch override from franchise portal branch switching (via localStorage "active_branch_id").
 */
export const useRestaurantId = () => {
  const queryClient = useQueryClient();
  const [activeBranchOverride, setActiveBranchOverride] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
  });

  // Listen for branch changes triggered by FranchiseBranchSwitcher or storage events
  useEffect(() => {
    const handleBranchChange = () => {
      const nextBranchId = typeof window !== "undefined" ? localStorage.getItem("active_branch_id") : null;
      setActiveBranchOverride(nextBranchId);
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
    };

    window.addEventListener("branch_changed", handleBranchChange);
    window.addEventListener("storage", handleBranchChange);

    return () => {
      window.removeEventListener("branch_changed", handleBranchChange);
      window.removeEventListener("storage", handleBranchChange);
    };
  }, [queryClient]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["restaurant-info", activeBranchOverride],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .maybeSingle();

      if (error) throw error;

      // 1. If an active branch override is present (e.g. switched in franchise portal),
      // try to resolve that branch first.
      if (activeBranchOverride) {
        const { data: branchRest, error: branchErr } = await supabase
          .from("restaurants")
          .select("id, name")
          .eq("id", activeBranchOverride)
          .maybeSingle();

        if (!branchErr && branchRest) {
          return {
            restaurantId: branchRest.id,
            restaurantName: branchRest.name,
            id: branchRest.id,
          };
        } else {
          // If branch is no longer accessible or invalid, clear stale override
          if (typeof window !== "undefined") {
            localStorage.removeItem("active_branch_id");
          }
        }
      }

      // 2. Default fallback: primary profile restaurant ID
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
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return {
    restaurantId: data?.restaurantId || data?.id || null,
    restaurantName: data?.restaurantName || null,
    isLoading,
    error,
  };
};
