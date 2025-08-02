
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";

export interface BookingChannel {
  id: string;
  restaurant_id: string;
  channel_name: string;
  channel_type: string;
  api_endpoint?: string;
  api_key?: string;
  api_secret?: string;
  commission_rate: number;
  is_active: boolean;
  last_sync?: string;
  sync_frequency_minutes: number;
  channel_settings: any;
  created_at: string;
  updated_at: string;
}

export interface RatePlan {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  plan_type: string;
  base_rate: number;
  currency: string;
  is_refundable: boolean;
  cancellation_policy: any;
  min_stay_nights: number;
  max_stay_nights?: number;
  advance_booking_days?: number;
  blackout_dates: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  restaurant_id: string;
  rule_name: string;
  rule_type: string;
  trigger_condition: any;
  adjustment_type: string;
  adjustment_value: number;
  min_price?: number;
  max_price?: number;
  priority: number;
  is_active: boolean;
  valid_from?: string;
  valid_to?: string;
  days_of_week: number[];
  created_at: string;
  updated_at: string;
}

export const useChannelManagement = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch booking channels
  const { data: bookingChannels = [], isLoading: isLoadingChannels } = useQuery({
    queryKey: ["booking-channels", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("booking_channels")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("channel_name");

      if (error) throw error;
      return data as BookingChannel[];
    },
    enabled: !!restaurantId,
  });

  // Fetch rate plans
  const { data: ratePlans = [], isLoading: isLoadingRatePlans } = useQuery({
    queryKey: ["rate-plans", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("rate_plans")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data as RatePlan[];
    },
    enabled: !!restaurantId,
  });

  // Fetch pricing rules
  const { data: pricingRules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ["pricing-rules", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("pricing_rules")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("priority", { ascending: false });

      if (error) throw error;
      return data as PricingRule[];
    },
    enabled: !!restaurantId,
  });

  // Create new channel
  const createChannel = useMutation({
    mutationFn: async (channelData: Partial<BookingChannel>) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const { data, error } = await supabase
        .from("booking_channels")
        .insert([{
          restaurant_id: restaurantId,
          ...channelData,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-channels"] });
      toast({
        title: "Success",
        description: "Channel created successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create channel: ${error.message}`,
      });
    },
  });

  // Update channel settings
  const updateChannel = useMutation({
    mutationFn: async ({ channelId, updates }: { channelId: string; updates: Partial<BookingChannel> }) => {
      const { data, error } = await supabase
        .from("booking_channels")
        .update(updates)
        .eq("id", channelId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-channels"] });
      toast({
        title: "Success",
        description: "Channel updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update channel: ${error.message}`,
      });
    },
  });

  // Delete channel
  const deleteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from("booking_channels")
        .delete()
        .eq("id", channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-channels"] });
      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete channel: ${error.message}`,
      });
    },
  });

  // Create/update rate plan
  const saveRatePlan = useMutation({
    mutationFn: async (ratePlan: Partial<RatePlan>) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      if (ratePlan.id) {
        const { data, error } = await supabase
          .from("rate_plans")
          .update(ratePlan)
          .eq("id", ratePlan.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("rate_plans")
          .insert([{
            restaurant_id: restaurantId,
            ...ratePlan,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-plans"] });
      toast({
        title: "Success",
        description: "Rate plan saved successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to save rate plan: ${error.message}`,
      });
    },
  });

  // Create/update pricing rule
  const savePricingRule = useMutation({
    mutationFn: async (rule: Partial<PricingRule>) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      if (rule.id) {
        const { data, error } = await supabase
          .from("pricing_rules")
          .update(rule)
          .eq("id", rule.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("pricing_rules")
          .insert([{
            restaurant_id: restaurantId,
            ...rule,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast({
        title: "Success",
        description: "Pricing rule saved successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to save pricing rule: ${error.message}`,
      });
    },
  });

  // Sync channels
  const syncChannels = useMutation({
    mutationFn: async ({ channelId, syncType = 'all' }: { channelId?: string; syncType?: 'rates' | 'availability' | 'all' }) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const { data, error } = await supabase.functions.invoke('sync-channels', {
        body: {
          channelId,
          restaurantId,
          syncType,
          bulkSync: !channelId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-channels"] });
      toast({
        title: "Success",
        description: "Channels synchronized successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Sync Error",
        description: `Failed to sync channels: ${error.message}`,
      });
    },
  });

  // Bulk update prices across channels
  const bulkUpdatePrices = useMutation({
    mutationFn: async ({ priceAdjustment, channels }: { priceAdjustment: number; channels: string[] }) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      // Update rate plans with new pricing
      const updatePromises = channels.map(async (channelId) => {
        const channel = bookingChannels.find(c => c.id === channelId);
        if (!channel) return;

        // Apply price adjustment based on channel commission
        const adjustedRate = priceAdjustment * (1 + channel.commission_rate / 100);
        
        return supabase
          .from('channel_inventory')
          .upsert({
            channel_id: channelId,
            restaurant_id: restaurantId,
            date: new Date().toISOString().split('T')[0],
            price: adjustedRate,
            last_updated: new Date().toISOString()
          });
      });

      const results = await Promise.all(updatePromises);
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-channels"] });
      toast({
        title: "Success",
        description: "Prices updated across all channels",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update prices: ${error.message}`,
      });
    },
  });

  return {
    bookingChannels,
    ratePlans,
    pricingRules,
    isLoadingChannels,
    isLoadingRatePlans,
    isLoadingRules,
    createChannel,
    updateChannel,
    deleteChannel,
    saveRatePlan,
    savePricingRule,
    syncChannels,
    bulkUpdatePrices,
  };
};
