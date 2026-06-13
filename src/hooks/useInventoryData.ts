import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useEffect } from "react";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  reorder_level: number | null;
  cost_per_unit: number | null;
  restaurant_id: string;
  category: string;
  notification_sent?: boolean;
  is_produced?: boolean;
  storage_location_id?: string | null;
}

export const useInventoryData = () => {
  const {
    data: items = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["inventory"],
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

      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const { data: storageLocations = [] } = useQuery({
    queryKey: ["inventory-storage-locations"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return [];
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();
      if (!userProfile?.restaurant_id) return [];
      const { data, error } = await supabase
        .from("storage_locations")
        .select("id, name")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Keep inventory data synced in real-time
  useRealtimeSubscription({
    table: "inventory_items",
    queryKey: ["inventory"],
  });

  // Check for low stock items and notify
  useEffect(() => {
    const checkLowStock = async () => {
      if (!items || items.length === 0) return;

      const lowStockItems = items.filter(
        (item) => item.reorder_level !== null && item.quantity <= item.reorder_level,
      );

      if (lowStockItems.length > 0) {
        try {
          const { data: profile } = await supabase.auth.getUser();
          if (!profile.user) return;

          const { data: userProfile } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", profile.user.id)
            .single();

          if (!userProfile?.restaurant_id) return;

          await supabase.functions.invoke("check-low-stock", {
            body: { restaurant_id: userProfile.restaurant_id },
          });
        } catch (error) {
          console.error("Failed to check low stock:", error);
        }
      }
    };

    checkLowStock();
  }, [items]);

  return {
    items,
    storageLocations,
    isLoading,
    refetch,
  };
};
