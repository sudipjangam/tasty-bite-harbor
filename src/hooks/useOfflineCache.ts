/**
 * useOfflineCache.ts
 *
 * Populates IndexedDB with essential data on app load (when online).
 * On subsequent loads (including offline), reads fall back to IDB.
 *
 * Call this once from a top-level component (e.g. AppWithRealtime).
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cacheAll } from "@/utils/offlineDB";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";

export function useOfflineCache() {
  const { restaurantId } = useRestaurantId();
  const { isOnline } = useNetworkStatus();

  // ─── Fetch & cache menus ────────────────────────────────────────────────────
  const { data: menuItems } = useQuery({
    queryKey: ["offline-cache-menu", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
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
        .select("*")
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
        .from("tables")
        .select("*")
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
        .select("*")
        .eq("id", restaurantId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && isOnline,
    staleTime: 1000 * 60 * 60,
  });

  // Write to IDB whenever we get fresh data
  useEffect(() => {
    if (menuItems?.length) {
      cacheAll("menuItems", menuItems as any[]).catch(console.error);
    }
  }, [menuItems]);

  useEffect(() => {
    if (categories?.length) {
      cacheAll("categories", categories as any[]).catch(console.error);
    }
  }, [categories]);

  useEffect(() => {
    if (tables?.length) {
      cacheAll("tables", tables as any[]).catch(console.error);
    }
  }, [tables]);

  useEffect(() => {
    if (restaurant) {
      cacheAll("restaurants", [restaurant]).catch(console.error);
    }
  }, [restaurant]);
}
