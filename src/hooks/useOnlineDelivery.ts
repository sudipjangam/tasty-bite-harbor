import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { AggregatorStore } from "@/types/aggregators";

export interface UseOnlineDeliveryResult {
  /** Whether online delivery (Swiggy / Zomato / aggregators) is enabled for the current restaurant */
  isOnlineDeliveryEnabled: boolean;
  /** Whether the subscription plan allows online delivery features */
  isPlanFeatureEnabled: boolean;
  /** Whether check is currently loading */
  isLoading: boolean;
  /** Connected aggregator stores for this restaurant */
  connectedStores: AggregatorStore[];
  /** Whether Swiggy specifically is connected */
  hasSwiggy: boolean;
  /** Whether Zomato specifically is connected */
  hasZomato: boolean;
  /** Toggle online delivery flag in restaurant settings */
  toggleOnlineDelivery: (enabled: boolean) => Promise<void>;
  /** Whether toggling is in progress */
  isToggling: boolean;
}

export const useOnlineDelivery = (): UseOnlineDeliveryResult => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Subscription Feature Gate Checks (matches Feature Permissions screen)
  const { isLocked: isAggregatorsViewLocked, loading: isViewLoading } = useFeatureGate("aggregators.view");
  const { isLocked: isMenuSyncLocked, loading: isMenuSyncLoading } = useFeatureGate("aggregators.menu_sync");
  const { isLocked: isLive86Locked, loading: isLive86Loading } = useFeatureGate("aggregators.live_86");
  const { isLocked: isSwiggyLocked, loading: isSwiggyLoading } = useFeatureGate("aggregators.swiggy");
  const { isLocked: isZomatoLocked, loading: isZomatoLoading } = useFeatureGate("aggregators.zomato");
  const isGateLoading = isViewLoading || isMenuSyncLoading || isLive86Loading || isSwiggyLoading || isZomatoLoading;

  // 2. Realtime listener on aggregator stores and restaurant settings
  useRealtimeSubscription({
    table: "aggregator_stores",
    queryKey: ["restaurant-online-delivery-stores", restaurantId],
  });

  useRealtimeSubscription({
    table: "restaurant_settings",
    queryKey: ["restaurant-settings-online-delivery", restaurantId],
  });

  // 3. Fetch connected aggregator stores
  const {
    data: stores = [],
    isLoading: isLoadingStores,
  } = useQuery({
    queryKey: ["restaurant-online-delivery-stores", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("aggregator_stores")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("[useOnlineDelivery] Error fetching stores:", error);
        return [];
      }
      return (data || []) as AggregatorStore[];
    },
  });

  // 4. Fetch restaurant_settings (online_delivery_enabled setting)
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
  } = useQuery({
    queryKey: ["restaurant-settings-online-delivery", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("settings")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) {
        console.error("[useOnlineDelivery] Error fetching settings:", error);
        return null;
      }
      return (data?.settings as Record<string, any>) || {};
    },
  });

  // 5. Derive connected channels
  const connectedStores = useMemo(
    () => stores.filter((s) => s.is_connected),
    [stores]
  );

  // 6. Whether any aggregator / 86 delivery feature is granted by the plan (from Feature Permissions screen)
  const isPlanFeatureEnabled = useMemo(() => {
    if (isGateLoading) {
      return false;
    }
    return (
      !isLive86Locked ||
      !isMenuSyncLocked ||
      !isSwiggyLocked ||
      !isZomatoLocked ||
      !isAggregatorsViewLocked
    );
  }, [
    isGateLoading,
    isLive86Locked,
    isMenuSyncLocked,
    isSwiggyLocked,
    isZomatoLocked,
    isAggregatorsViewLocked,
  ]);

  // Overall enabled status:
  // 1. Subscription feature gate: plan must allow aggregator features
  // 2. Explicit restaurant setting: if user turns toggle OFF, it is DISABLED
  // 3. If user turns toggle ON, it is ENABLED
  // 4. If unset in settings: defaults to true if plan permits
  const isOnlineDeliveryEnabled = useMemo(() => {
    if (isGateLoading || isLoadingStores || isLoadingSettings) {
      return false;
    }
    // Plan feature gate lock
    if (!isPlanFeatureEnabled) {
      return false;
    }
    // Master switch explicitly toggled off
    if (settingsData?.online_delivery_enabled === false) {
      return false;
    }
    // Master switch explicitly toggled on
    if (settingsData?.online_delivery_enabled === true) {
      return true;
    }
    // Legacy aggregators_enabled flag
    if (settingsData?.aggregators_enabled === false) {
      return false;
    }
    return true;
  }, [
    isGateLoading,
    isLoadingStores,
    isLoadingSettings,
    isPlanFeatureEnabled,
    settingsData,
  ]);

  const hasSwiggy = useMemo(
    () => isOnlineDeliveryEnabled && connectedStores.some((s) => s.provider === "swiggy"),
    [isOnlineDeliveryEnabled, connectedStores]
  );

  const hasZomato = useMemo(
    () => isOnlineDeliveryEnabled && connectedStores.some((s) => s.provider === "zomato"),
    [isOnlineDeliveryEnabled, connectedStores]
  );

  // 7. Mutation to toggle online delivery setting
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!restaurantId) throw new Error("No restaurant selected");

      if (enabled && !isPlanFeatureEnabled) {
        throw new Error("Online delivery features are not enabled for your subscription plan.");
      }

      const currentSettings = settingsData || {};
      const updatedSettings = {
        ...currentSettings,
        online_delivery_enabled: enabled,
        ...(enabled
          ? { aggregators_enabled: true }
          : {
              aggregators_enabled: false,
              swiggy_enabled: false,
              zomato_enabled: false,
            }),
      };

      const { error } = await supabase
        .from("restaurant_settings")
        .upsert(
          {
            restaurant_id: restaurantId,
            settings: updatedSettings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id" }
        );

      if (error) throw error;
      return enabled;
    },
    onMutate: async (enabled: boolean) => {
      await queryClient.cancelQueries({
        queryKey: ["restaurant-settings-online-delivery", restaurantId],
      });
      const previousSettings = queryClient.getQueryData<Record<string, any>>([
        "restaurant-settings-online-delivery",
        restaurantId,
      ]);
      queryClient.setQueryData(
        ["restaurant-settings-online-delivery", restaurantId],
        (old: Record<string, any> | undefined) => ({
          ...(old || {}),
          online_delivery_enabled: enabled,
          ...(enabled
            ? { aggregators_enabled: true }
            : {
                aggregators_enabled: false,
                swiggy_enabled: false,
                zomato_enabled: false,
              }),
        })
      );
      return { previousSettings };
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousSettings !== undefined) {
        queryClient.setQueryData(
          ["restaurant-settings-online-delivery", restaurantId],
          context.previousSettings
        );
      }
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update online delivery setting.",
        variant: "destructive",
      });
    },
    onSuccess: (enabled) => {
      toast({
        title: enabled ? "Online Delivery Enabled" : "Online Delivery Disabled",
        description: enabled
          ? "Swiggy & Zomato integration and Quick 86 features are now active."
          : "Online delivery features have been turned off for this restaurant.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["restaurant-settings-online-delivery", restaurantId],
      });
    },
  });

  const toggleOnlineDelivery = useCallback(
    async (enabled: boolean) => {
      await toggleMutation.mutateAsync(enabled);
    },
    [toggleMutation]
  );

  return {
    isOnlineDeliveryEnabled,
    isPlanFeatureEnabled,
    isLoading: isGateLoading || isLoadingStores || isLoadingSettings,
    connectedStores,
    hasSwiggy,
    hasZomato,
    toggleOnlineDelivery,
    isToggling: toggleMutation.isPending,
  };
};
