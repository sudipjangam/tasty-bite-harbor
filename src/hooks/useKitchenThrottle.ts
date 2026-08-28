import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

const PAUSE_EXPIRY_KEY = "kds_aggregator_pause_expiry";

export type KitchenLoadTier = "normal" | "busy" | "surge";

export interface KitchenThrottleStatus {
  totalPendingItems: number;
  totalActiveTickets: number;
  tier: KitchenLoadTier;
  suggestedBufferMinutes: number;
  isPaused: boolean;
  pauseRemainingSeconds: number;
  pauseRemainingFormatted: string;
}

export const useKitchenThrottle = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Listen to realtime changes on kitchen_orders
  useRealtimeSubscription({
    table: "kitchen_orders",
    queryKey: ["kitchen-throttle-orders", restaurantId],
  });

  // Fetch active kitchen orders
  const { data: activeOrders = [] } = useQuery({
    queryKey: ["kitchen-throttle-orders", restaurantId],
    enabled: !!restaurantId,
    refetchInterval: 15000,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("kitchen_orders")
        .select("id, status, items, priority, created_at")
        .eq("restaurant_id", restaurantId)
        .in("status", ["new", "preparing"]);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate pending items sum
  const { totalPendingItems, totalActiveTickets } = useMemo(() => {
    let itemsCount = 0;
    activeOrders.forEach((order) => {
      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          itemsCount += typeof item.quantity === "number" ? item.quantity : 1;
        });
      }
    });
    return {
      totalPendingItems: itemsCount,
      totalActiveTickets: activeOrders.length,
    };
  }, [activeOrders]);

  // Determine load tier & buffer
  const { tier, suggestedBufferMinutes } = useMemo<{
    tier: KitchenLoadTier;
    suggestedBufferMinutes: number;
  }>(() => {
    if (totalPendingItems > 15) {
      return { tier: "surge", suggestedBufferMinutes: 20 };
    }
    if (totalPendingItems >= 9) {
      return { tier: "busy", suggestedBufferMinutes: 10 };
    }
    return { tier: "normal", suggestedBufferMinutes: 0 };
  }, [totalPendingItems]);

  // Pause Timer State
  const [pauseExpiry, setPauseExpiry] = useState<number | null>(() => {
    const saved = localStorage.getItem(PAUSE_EXPIRY_KEY);
    if (!saved) return null;
    const expiry = parseInt(saved, 10);
    return expiry > Date.now() ? expiry : null;
  });

  const [pauseRemainingSeconds, setPauseRemainingSeconds] = useState<number>(() => {
    if (!pauseExpiry) return 0;
    const diff = Math.max(0, Math.floor((pauseExpiry - Date.now()) / 1000));
    return diff;
  });

  // Ticker for countdown
  useEffect(() => {
    if (!pauseExpiry) {
      setPauseRemainingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((pauseExpiry - Date.now()) / 1000));
      setPauseRemainingSeconds(remaining);
      if (remaining <= 0) {
        setPauseExpiry(null);
        localStorage.removeItem(PAUSE_EXPIRY_KEY);
        toast({
          title: "🟢 Online Stores Resumed",
          description: "20-minute kitchen surge cooldown complete. Incoming orders resumed.",
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pauseExpiry, toast]);

  const isPaused = pauseRemainingSeconds > 0;

  const pauseRemainingFormatted = useMemo(() => {
    if (!isPaused) return "0:00";
    const mins = Math.floor(pauseRemainingSeconds / 60);
    const secs = pauseRemainingSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }, [isPaused, pauseRemainingSeconds]);

  // 1-Click Pause Action
  const pauseStoresForMinutes = useCallback(
    (minutes = 20) => {
      const expiry = Date.now() + minutes * 60 * 1000;
      setPauseExpiry(expiry);
      localStorage.setItem(PAUSE_EXPIRY_KEY, expiry.toString());
      toast({
        title: `⏸️ Online Stores Paused (${minutes}m)`,
        description: `Incoming Swiggy & Zomato orders paused to clear kitchen queue (${totalPendingItems} items).`,
      });
    },
    [toast, totalPendingItems]
  );

  // Resume Action
  const resumeStores = useCallback(() => {
    setPauseExpiry(null);
    localStorage.removeItem(PAUSE_EXPIRY_KEY);
    toast({
      title: "🟢 Online Stores Resumed",
      description: "Aggregator order ingestion active.",
    });
  }, [toast]);

  return {
    totalPendingItems,
    totalActiveTickets,
    tier,
    suggestedBufferMinutes,
    isPaused,
    pauseRemainingSeconds,
    pauseRemainingFormatted,
    pauseStoresForMinutes,
    resumeStores,
  };
};

export default useKitchenThrottle;
