import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCallback } from "react";

export interface DeliveryZone {
  id: string;
  restaurant_id: string;
  zone_name: string;
  min_distance_km: number;
  max_distance_km: number;
  delivery_charge: number;
  is_active: boolean;
}

export interface DeliverySettings {
  delivery_enabled: boolean;
  max_delivery_radius_km: number;
  restaurant_lat: number | null;
  restaurant_lng: number | null;
  default_delivery_charge: number;
  free_delivery_above: number | null;
}

export function useDeliveryConfig() {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  // Fetch delivery settings from restaurant_settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["delivery-settings", restaurantId],
    queryFn: async (): Promise<DeliverySettings> => {
      if (!restaurantId) {
        return {
          delivery_enabled: false,
          max_delivery_radius_km: 10,
          restaurant_lat: null,
          restaurant_lng: null,
          default_delivery_charge: 30,
          free_delivery_above: null,
        };
      }
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select(
          "delivery_enabled, max_delivery_radius_km, restaurant_lat, restaurant_lng, default_delivery_charge, free_delivery_above",
        )
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Delivery settings fetch error:", error);
      }

      return {
        delivery_enabled: (data as any)?.delivery_enabled ?? false,
        max_delivery_radius_km:
          (data as any)?.max_delivery_radius_km ?? 10,
        restaurant_lat: (data as any)?.restaurant_lat ?? null,
        restaurant_lng: (data as any)?.restaurant_lng ?? null,
        default_delivery_charge:
          (data as any)?.default_delivery_charge ?? 30,
        free_delivery_above: (data as any)?.free_delivery_above ?? null,
      };
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 10, // 10 min
  });

  // Fetch delivery zones
  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["delivery-zones", restaurantId],
    queryFn: async (): Promise<DeliveryZone[]> => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("delivery_zones" as any)
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("min_distance_km", { ascending: true });

      if (error) {
        console.error("Delivery zones fetch error:", error);
        return [];
      }
      return (data as any[]) || [];
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 10,
  });

  // Calculate delivery charge via RPC
  const calculateCharge = useCallback(
    async (lat: number, lng: number) => {
      if (!restaurantId) {
        return { success: false, error: "No restaurant selected" };
      }

      try {
        const { data, error } = await supabase.rpc(
          "calculate_delivery_charge" as any,
          {
            p_restaurant_id: restaurantId,
            p_delivery_lat: lat,
            p_delivery_lng: lng,
          },
        );

        if (error) {
          console.error("Delivery charge RPC error:", error);
          return {
            success: false,
            error: "Failed to calculate delivery charge",
          };
        }

        return data as {
          success: boolean;
          distance_km?: number;
          charge?: number;
          zone_name?: string;
          free_delivery_above?: number | null;
          error?: string;
          max_radius_km?: number;
        };
      } catch (err) {
        console.error("Delivery charge error:", err);
        return { success: false, error: "Network error" };
      }
    },
    [restaurantId],
  );

  // Save delivery settings — upsert so toggle works even if no row exists yet
  const saveSettings = useMutation({
    mutationFn: async (newSettings: Partial<DeliverySettings>) => {
      if (!restaurantId) throw new Error("No restaurant");
      const { error } = await supabase
        .from("restaurant_settings")
        .upsert(
          { ...newSettings, restaurant_id: restaurantId } as any,
          { onConflict: "restaurant_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-settings", restaurantId],
      });
    },
  });

  // CRUD for delivery zones
  const addZone = useMutation({
    mutationFn: async (
      zone: Omit<DeliveryZone, "id" | "restaurant_id">,
    ) => {
      if (!restaurantId) throw new Error("No restaurant");
      const { error } = await supabase
        .from("delivery_zones" as any)
        .insert({ ...zone, restaurant_id: restaurantId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-zones", restaurantId],
      });
    },
  });

  const updateZone = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<DeliveryZone> & { id: string }) => {
      const { error } = await supabase
        .from("delivery_zones" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-zones", restaurantId],
      });
    },
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delivery_zones" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["delivery-zones", restaurantId],
      });
    },
  });

  return {
    // Settings
    isDeliveryEnabled: settings?.delivery_enabled ?? false,
    maxRadius: settings?.max_delivery_radius_km ?? 10,
    restaurantLocation: settings
      ? { lat: settings.restaurant_lat, lng: settings.restaurant_lng }
      : null,
    defaultCharge: settings?.default_delivery_charge ?? 30,
    freeDeliveryAbove: settings?.free_delivery_above ?? null,
    settings,
    settingsLoading,

    // Zones
    zones,
    zonesLoading,

    // Actions
    calculateCharge,
    saveSettings,
    addZone,
    updateZone,
    deleteZone,
  };
}
