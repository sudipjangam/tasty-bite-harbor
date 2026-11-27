/**
 * useOfflineCache.ts
 *
 * Populates IndexedDB with essential data on app load (when online).
 * On subsequent loads (including offline), reads fall back to IDB.
 * Also invalidates POS/QSR queries once queued offline writes sync to Supabase.
 *
 * Call this once from a top-level component (e.g. AppWithRealtime).
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  cacheAll,
  cachePaymentSettings,
  deleteCachedPaymentSettings,
  replaceCachedByRestaurant,
  SYNC_COMPLETED_EVENT,
} from "@/utils/offlineDB";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";

export function useOfflineCache() {
  const { restaurantId } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();

  // ─── Fetch & cache menus ────────────────────────────────────────────────────
  const { data: menuItems } = useQuery({
    queryKey: ["offline-cache-menu", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id, restaurant_id, name, price, category, description, image_url, is_available, is_veg",
        )
        .eq("restaurant_id", restaurantId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId && isOnline,
    staleTime: 1000 * 60 * 30, // 30 min
  });

  // ─── Fetch & cache categories ───────────────────────────────────────────────
  const { data: categories } = useQuery({
    queryKey: ["offline-cache-categories", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, restaurant_id, name")
        .eq("restaurant_id", restaurantId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId && isOnline,
    staleTime: 1000 * 60 * 30,
  });

  // ─── Fetch & cache tables ───────────────────────────────────────────────────
  const { data: tables } = useQuery({
    queryKey: ["offline-cache-tables", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("id, restaurant_id, name, status, capacity")
        .eq("restaurant_id", restaurantId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId && isOnline,
    staleTime: 1000 * 60 * 10,
  });

  // ─── Fetch & cache restaurant ───────────────────────────────────────────────
  const { data: restaurant } = useQuery({
    queryKey: ["offline-cache-restaurant", restaurantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurants")
        .select("id, name, address, phone, gstin, upi_id, logo_url")
        .eq("id", restaurantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && isOnline,
    staleTime: 1000 * 60 * 60,
  });

  // ─── Fetch & cache payment settings (for offline UPI QR & voice prefs) ─────
  const {
    data: paymentSettings,
    isLoading: paymentSettingsLoading,
    isError: paymentSettingsError,
  } = useQuery({
    queryKey: ["offline-cache-payment-settings", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("id, restaurant_id, upi_id, upi_name, is_active, voice_announcement_language")
        .eq("restaurant_id", restaurantId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && isOnline,
    staleTime: 1000 * 60 * 30,
  });

  // Write to IDB whenever we get fresh data
  useEffect(() => {
    if (menuItems !== undefined && restaurantId) {
      replaceCachedByRestaurant("menuItems", restaurantId, menuItems as any[]).catch(
        console.error,
      );
    }
  }, [menuItems, restaurantId]);

  useEffect(() => {
    if (categories !== undefined && restaurantId) {
      replaceCachedByRestaurant("categories", restaurantId, categories as any[]).catch(
        console.error,
      );
    }
  }, [categories, restaurantId]);

  useEffect(() => {
    if (tables !== undefined && restaurantId) {
      replaceCachedByRestaurant("tables", restaurantId, tables as any[]).catch(
        console.error,
      );
    }
  }, [tables, restaurantId]);

  useEffect(() => {
    if (restaurant) {
      cacheAll("restaurants", [restaurant]).catch(console.error);
    }
  }, [restaurant]);

  useEffect(() => {
    if (!restaurantId) return;
    if (paymentSettings) {
      cachePaymentSettings(restaurantId, paymentSettings as any).catch(
        console.error,
      );
    } else if (
      isOnline &&
      !paymentSettingsLoading &&
      !paymentSettingsError &&
      paymentSettings === null
    ) {
      deleteCachedPaymentSettings(restaurantId).catch(console.error);
    }
  }, [
    paymentSettings,
    paymentSettingsLoading,
    paymentSettingsError,
    isOnline,
    restaurantId,
  ]);

  // Refresh POS/QSR queries automatically when offline queue finishes syncing
  useEffect(() => {
    const handleSyncCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["past-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qsr-tables"] });
      queryClient.invalidateQueries({ queryKey: ["qsr-todays-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-order-history"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["food-truck-today-stats"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary-data"] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
    };

    window.addEventListener(SYNC_COMPLETED_EVENT, handleSyncCompleted);
    return () => {
      window.removeEventListener(SYNC_COMPLETED_EVENT, handleSyncCompleted);
    };
  }, [queryClient]);
}
