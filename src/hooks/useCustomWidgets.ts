import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { useToast } from "@/hooks/use-toast";
import { CustomWidget, CustomWidgetQuota } from "@/types/customWidgets";

export const useCustomWidgets = () => {
  const { restaurantId } = useRestaurantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isLocked, loading: gateLoading } = useFeatureGate("ai.custom_components");

  // 1. Fetch user's custom widgets
  const {
    data: widgets = [],
    isLoading: isWidgetsLoading,
    error: widgetsError,
  } = useQuery({
    queryKey: ["custom-widgets", restaurantId],
    enabled: !!restaurantId,
    queryFn: async (): Promise<CustomWidget[]> => {
      const { data, error } = await supabase
        .from("custom_widgets" as any)
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        // If table not created yet or RLS issue, return empty array safely
        console.warn("useCustomWidgets: error fetching widgets:", error.message);
        return [];
      }

      return (data || []) as CustomWidget[];
    },
  });

  // 2. Fetch plan quota limits
  const {
    data: quotaData,
    isLoading: isQuotaLoading,
  } = useQuery({
    queryKey: ["custom-widgets-quota", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data: sub, error } = await supabase
        .from("restaurant_subscriptions")
        .select(`
          status,
          subscription_plans (
            name,
            features,
            max_custom_widgets
          )
        `)
        .eq("restaurant_id", restaurantId)
        .eq("status", "active")
        .maybeSingle();

      if (error || !sub) {
        return { maxLimit: 3 }; // fallback default limit
      }

      const planData: any = Array.isArray(sub.subscription_plans)
        ? sub.subscription_plans[0]
        : sub.subscription_plans;

      const maxLimit = typeof planData?.max_custom_widgets === "number"
        ? planData.max_custom_widgets
        : 3;

      return { maxLimit };
    },
  });

  const activeWidgets = widgets.filter((w) => w.is_active);
  const activeCount = activeWidgets.length;
  const maxLimit = quotaData?.maxLimit ?? 3;
  // If plan provides custom widgets quota or feature gate is unlocked
  const featureUnlocked = !isLocked || (quotaData?.maxLimit ?? 0) > 0;
  const canCreate = Boolean(featureUnlocked && activeCount < maxLimit);

  const quota: CustomWidgetQuota = {
    count: activeCount,
    maxLimit,
    canCreate,
    featureUnlocked,
  };

  // 3. Create mutation
  const createWidgetMutation = useMutation({
    mutationFn: async (
      newWidget: Omit<CustomWidget, "id" | "restaurant_id" | "created_at" | "updated_at">
    ) => {
      if (!restaurantId) throw new Error("Restaurant ID required");
      if (!featureUnlocked) throw new Error("Feature locked in your plan");
      if (activeCount >= maxLimit) {
        throw new Error(`Limit reached (${activeCount}/${maxLimit}). Upgrade your plan.`);
      }

      const { data, error } = await supabase
        .from("custom_widgets" as any)
        .insert({
          ...newWidget,
          restaurant_id: restaurantId,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomWidget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-widgets", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["custom-widgets-quota", restaurantId] });
      toast({
        title: "Component Created",
        description: "Your custom component has been pinned to your dashboard.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to Create Component",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // 4. Update mutation
  const updateWidgetMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CustomWidget>;
    }) => {
      const { data, error } = await supabase
        .from("custom_widgets" as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
        .select()
        .single();

      if (error) throw error;
      return data as CustomWidget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-widgets", restaurantId] });
      toast({
        title: "Component Updated",
        description: "Custom widget updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 5. Delete mutation
  const deleteWidgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_widgets" as any)
        .delete()
        .eq("id", id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-widgets", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["custom-widgets-quota", restaurantId] });
      toast({
        title: "Component Removed",
        description: "Widget deleted from your dashboard.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 6. Toggle active status mutation
  const toggleWidgetMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (is_active && activeCount >= maxLimit) {
        throw new Error(`Limit reached (${activeCount}/${maxLimit}). Cannot activate more.`);
      }

      const { data, error } = await supabase
        .from("custom_widgets" as any)
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
        .select()
        .single();

      if (error) throw error;
      return data as CustomWidget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-widgets", restaurantId] });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return {
    widgets,
    activeWidgets,
    quota,
    isLoading: isWidgetsLoading || isQuotaLoading || gateLoading,
    error: widgetsError,
    createWidget: createWidgetMutation.mutateAsync,
    isCreating: createWidgetMutation.isPending,
    updateWidget: updateWidgetMutation.mutateAsync,
    deleteWidget: deleteWidgetMutation.mutateAsync,
    toggleWidget: toggleWidgetMutation.mutateAsync,
  };
};
