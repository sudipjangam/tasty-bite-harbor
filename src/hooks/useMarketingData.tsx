
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
    cost: number;
  }>;
  messageGrowth: number;
  revenueGrowth: number;
  avgOrderValue: number;
  repeatCustomerRate: number;
  customerLifetimeValue: number;
  churnRate: number;
}

const EMPTY_ANALYTICS: AnalyticsData = {
  messagesSent: 0,
  revenueImpact: 0,
  specialOccasions: 0,
  campaignPerformance: [],
  messageGrowth: 0,
  revenueGrowth: 0,
  avgOrderValue: 0,
  repeatCustomerRate: 0,
  customerLifetimeValue: 0,
  churnRate: 0,
};

export const useMarketingData = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

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
        if (profile?.restaurant_id) setRestaurantId(profile.restaurant_id);
      } catch (error) {
        console.error('Error fetching restaurant ID:', error);
      }
    };
    fetchRestaurantId();
  }, []);

  // Campaigns
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

  // Customers — filter out walk-in table ghost records
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-marketing', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Customers query error:', error.message);
        return [];
      }
      // Filter out auto-created walk-in records (names like "Table T2", "Table Stone1")
      return (data || []).filter(
        (c) => !(/^table\s/i.test(c.name || ''))
      );
    },
    enabled: !!restaurantId,
  });

  // Analytics — all data fetched inside queryFn to avoid stale closure bugs
  const { data: analytics = EMPTY_ANALYTICS, isLoading: analyticsLoading } = useQuery({
    queryKey: ['marketing-analytics', restaurantId],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!restaurantId) return EMPTY_ANALYTICS;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // All sent promotions (for campaign performance)
      const { data: sentPromotions } = await supabase
        .from('sent_promotions')
        .select('*')
        .eq('restaurant_id', restaurantId);

      // Recent 30-day promotions for messagesSent stat
      const { data: recentPromotions } = await supabase
        .from('sent_promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('sent_date', thirtyDaysAgo.toISOString());

      const { data: previousPromotions } = await supabase
        .from('sent_promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('sent_date', sixtyDaysAgo.toISOString())
        .lt('sent_date', thirtyDaysAgo.toISOString());

      // Only orders with a promotion applied (marketing-attributed revenue)
      const { data: promoOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('discount_amount', 'is', null)
        .gt('discount_amount', 0);

      const { data: previousPromoOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString())
        .not('discount_amount', 'is', null)
        .gt('discount_amount', 0);

      // All recent orders for avg order value
      const { data: allRecentOrders } = await supabase
        .from('orders')
        .select('id, total')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // All customers (unfiltered) for proper metrics
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('visit_count, total_spent, last_visit_date, name')
        .eq('restaurant_id', restaurantId);

      // Filter real customers (no walk-in tables)
      const realCustomers = (allCustomers || []).filter(
        (c) => !(/^table\s/i.test(c.name || ''))
      );

      const { data: reservations } = await supabase
        .from('reservations')
        .select('special_occasion')
        .eq('restaurant_id', restaurantId)
        .not('special_occasion', 'is', null);

      // All campaigns for performance
      const { data: allCampaigns } = await supabase
        .from('promotion_campaigns')
        .select('id, name')
        .eq('restaurant_id', restaurantId);

      // Messages sent
      const messagesSent = recentPromotions?.length || 0;
      const previousMessagesSent = previousPromotions?.length || 0;
      const messageGrowth = previousMessagesSent > 0
        ? ((messagesSent - previousMessagesSent) / previousMessagesSent * 100)
        : 0;

      // Marketing-attributed revenue only
      const recentRevenue = promoOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const previousRevenue = previousPromoOrders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const revenueGrowth = previousRevenue > 0
        ? ((recentRevenue - previousRevenue) / previousRevenue * 100)
        : 0;

      // Avg order value from all orders
      const avgOrderValue = allRecentOrders && allRecentOrders.length > 0
        ? allRecentOrders.reduce((sum, o) => sum + (o.total || 0), 0) / allRecentOrders.length
        : 0;

      // Customer metrics from real customers
      const totalCustomers = realCustomers.length;
      const repeatCustomers = realCustomers.filter(c => (c.visit_count || 0) > 1).length;
      const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100) : 0;

      const avgLifetimeValue = totalCustomers > 0
        ? realCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / totalCustomers
        : 0;

      // Churn: null last_visit_date = inactive
      const activeCustomers = realCustomers.filter(c => {
        if (!c.last_visit_date) return false;
        const daysSince = (Date.now() - new Date(c.last_visit_date).getTime()) / (1000 * 3600 * 24);
        return daysSince <= 30;
      }).length;
      const churnRate = totalCustomers > 0 ? ((totalCustomers - activeCustomers) / totalCustomers * 100) : 0;

      const specialOccasions = reservations?.length || 0;

      // Campaign performance — actual sends + estimated cost
      const MSG_COST = 0.12; // ₹/msg utility template
      const campaignPerformance = (allCampaigns || []).map(campaign => {
        const sends = (sentPromotions || []).filter(
          sp => sp.promotion_campaign_id === campaign.id
        );
        const sent = sends.length;
        const cost = Math.round(sent * MSG_COST * 100) / 100;
        // Revenue: orders with promo code matching campaign (best effort)
        const revenue = sent > 0 ? Math.round(sent * avgOrderValue * 0.3) : 0; // 30% attribution
        return { id: campaign.id, name: campaign.name, sent, revenue, cost };
      });

      return {
        messagesSent,
        revenueImpact: Math.round(recentRevenue),
        specialOccasions,
        campaignPerformance,
        messageGrowth: Math.round(messageGrowth * 10) / 10,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        avgOrderValue: Math.round(avgOrderValue),
        repeatCustomerRate: Math.round(repeatRate * 10) / 10,
        customerLifetimeValue: Math.round(avgLifetimeValue),
        churnRate: Math.round(churnRate * 10) / 10,
      };
    },
    enabled: !!restaurantId,
  });

  const isLoading = campaignsLoading || customersLoading || analyticsLoading;

  return { campaigns, customers, analytics, isLoading, restaurantId };
};
