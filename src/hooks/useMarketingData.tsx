
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
  // New analytics properties
  messageGrowth: number;
  revenueGrowth: number;
  avgOrderValue: number;
  repeatCustomerRate: number;
  customerLifetimeValue: number;
  churnRate: number;
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
    campaignPerformance: [],
    messageGrowth: 0,
    revenueGrowth: 0,
    avgOrderValue: 0,
    repeatCustomerRate: 0,
    customerLifetimeValue: 0,
    churnRate: 0
  } as AnalyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['marketing-analytics', restaurantId],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!restaurantId) {
        return {
          messagesSent: 0,
          revenueImpact: 0,
          specialOccasions: 0,
          campaignPerformance: [],
          messageGrowth: 0,
          revenueGrowth: 0,
          avgOrderValue: 0,
          repeatCustomerRate: 0,
          customerLifetimeValue: 0,
          churnRate: 0
        };
      }

      // Fetch sent promotions data with date range for trend analysis
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data: sentPromotions } = await supabase
        .from("sent_promotions")
        .select("*")
        .eq("restaurant_id", restaurantId);

      const { data: recentPromotions } = await supabase
        .from("sent_promotions")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("sent_date", thirtyDaysAgo.toISOString());

      const { data: previousPromotions } = await supabase
        .from("sent_promotions")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("sent_date", sixtyDaysAgo.toISOString())
        .lt("sent_date", thirtyDaysAgo.toISOString());

      // Fetch orders data to calculate actual revenue impact
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      const { data: previousOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());

      // Fetch reservations with special occasions
      const { data: reservations } = await supabase
        .from("reservations")
        .select("special_occasion")
        .eq("restaurant_id", restaurantId)
        .not("special_occasion", "is", null);

      // Calculate actual metrics
      const messagesSent = recentPromotions?.length || 0;
      const previousMessagesSent = previousPromotions?.length || 0;
      const messageGrowth = previousMessagesSent > 0 
        ? ((messagesSent - previousMessagesSent) / previousMessagesSent * 100)
        : 0;

      // Calculate revenue impact from orders
      const recentRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
      const previousRevenue = previousOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
      const revenueGrowth = previousRevenue > 0 
        ? ((recentRevenue - previousRevenue) / previousRevenue * 100)
        : 0;

      // Calculate customer engagement metrics
      const totalCustomers = customers?.length || 0;
      const avgOrderValue = orders && orders.length > 0 
        ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length
        : 0;
      
      const repeatCustomers = customers?.filter(c => c.visit_count > 1)?.length || 0;
      const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100) : 0;

      // Calculate customer lifetime value
      const avgLifetimeValue = customers && customers.length > 0
        ? customers.reduce((sum, customer) => sum + customer.total_spent, 0) / customers.length
        : 0;

      // Calculate churn rate (customers who haven't visited in 30+ days)
      const activeCustomers = customers?.filter(c => {
        if (!c.last_visit_date) return false;
        const lastVisit = new Date(c.last_visit_date);
        const daysSinceVisit = (new Date().getTime() - lastVisit.getTime()) / (1000 * 3600 * 24);
        return daysSinceVisit <= 30;
      })?.length || 0;
      
      const churnRate = totalCustomers > 0 ? ((totalCustomers - activeCustomers) / totalCustomers * 100) : 0;

      const specialOccasions = reservations?.length || 0;

      // Calculate campaign performance with actual data
      const campaignPerformance = campaigns?.map(campaign => {
        const campaignPromotions = sentPromotions?.filter(sp => 
          sp.promotion_campaign_id === campaign.id
        ) || [];
        
        // Estimate revenue based on promotion success and average order value
        const estimatedRevenue = campaignPromotions.length * (avgOrderValue || 300);
        
        return {
          id: campaign.id,
          name: campaign.name,
          sent: campaignPromotions.length,
          revenue: Math.round(estimatedRevenue)
        };
      }) || [];

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
        churnRate: Math.round(churnRate * 10) / 10
      };
    },
    enabled: !!restaurantId && !!campaigns,
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
