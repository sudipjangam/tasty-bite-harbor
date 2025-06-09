
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  messagesSent: number;
  revenueImpact: number;
  specialOccasions: number;
  campaignPerformance: Array<{
    id: string;
    name: string;
    sent: number;
    revenue: number;
  }>;
}

export const useMarketingData = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Fetch restaurant ID
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .single();

        if (profile?.restaurant_id) {
          setRestaurantId(profile.restaurant_id);
        }
      } catch (error) {
        console.error('Error fetching restaurant ID:', error);
      }
    };

    fetchRestaurantId();
  }, []);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['promotion-campaigns', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Fetch customers with marketing data
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-marketing', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          loyalty_tiers(name, points_required),
          orders(id, total, created_at)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Fetch marketing analytics
  const { data: analytics = {
    messagesSent: 0,
    revenueImpact: 0,
    specialOccasions: 0,
    campaignPerformance: []
  } as AnalyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['marketing-analytics', restaurantId],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!restaurantId) {
        return {
          messagesSent: 0,
          revenueImpact: 0,
          specialOccasions: 0,
          campaignPerformance: []
        };
      }
      
      // Fetch sent promotions
      const { data: sentPromotions, error: promoError } = await supabase
        .from('sent_promotions')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (promoError) throw promoError;

      // Fetch reservation data for special occasions
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .not('special_occasion', 'is', null);

      if (resError) throw resError;

      return {
        messagesSent: sentPromotions?.length || 0,
        revenueImpact: sentPromotions?.reduce((acc, promo) => acc + (promo.revenue_generated || 0), 0) || 0,
        specialOccasions: reservations?.length || 0,
        campaignPerformance: campaigns.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          sent: sentPromotions?.filter(p => p.promotion_id === campaign.id).length || 0,
          revenue: sentPromotions?.filter(p => p.promotion_id === campaign.id)
            .reduce((acc, p) => acc + (p.revenue_generated || 0), 0) || 0
        }))
      };
    },
    enabled: !!restaurantId && campaigns.length > 0,
  });

  const isLoading = campaignsLoading || customersLoading || analyticsLoading;

  return {
    campaigns,
    customers,
    analytics,
    isLoading,
    restaurantId,
  };
};
