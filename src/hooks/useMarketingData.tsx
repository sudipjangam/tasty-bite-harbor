
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DateRange = '7d' | '30d' | '90d' | 'all';

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
    redemptions: number;
    promoCode: string | null;
  }>;
  messageGrowth: number;
  revenueGrowth: number;
  avgOrderValue: number;
  repeatCustomerRate: number;
  customerLifetimeValue: number;
  churnRate: number;
  channelStats: {
    whatsapp: { sent: number; delivered: number; failed: number };
    sms: { sent: number; delivered: number; failed: number };
    email: { sent: number; delivered: number; failed: number };
  };
  totalRedemptions: number;
  upcomingBirthdays: number;
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
  channelStats: {
    whatsapp: { sent: 0, delivered: 0, failed: 0 },
    sms: { sent: 0, delivered: 0, failed: 0 },
    email: { sent: 0, delivered: 0, failed: 0 },
  },
  totalRedemptions: 0,
  upcomingBirthdays: 0,
};

const getDateRangeMs = (range: DateRange): number => {
  switch (range) {
    case '7d': return 7 * 24 * 3600 * 1000;
    case '30d': return 30 * 24 * 3600 * 1000;
    case '90d': return 90 * 24 * 3600 * 1000;
    case 'all': return 365 * 10 * 24 * 3600 * 1000; // 10 years
  }
};

export const useMarketingData = (dateRange: DateRange = '30d') => {
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

  // Analytics — uses dateRange param
  const { data: analytics = EMPTY_ANALYTICS, isLoading: analyticsLoading } = useQuery({
    queryKey: ['marketing-analytics', restaurantId, dateRange],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!restaurantId) return EMPTY_ANALYTICS;

      const rangeMs = getDateRangeMs(dateRange);
      const rangeStart = new Date(Date.now() - rangeMs);
      const previousStart = new Date(Date.now() - rangeMs * 2);

      // ── Sent Promotions (all time, for campaign perf) ──
      const { data: allSentPromotions } = await supabase
        .from('sent_promotions')
        .select('*')
        .eq('restaurant_id', restaurantId);

      // Recent sends for messagesSent stat
      const { data: recentPromotions } = await supabase
        .from('sent_promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('sent_date', rangeStart.toISOString());

      const { data: previousPromotions } = await supabase
        .from('sent_promotions')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('sent_date', previousStart.toISOString())
        .lt('sent_date', rangeStart.toISOString());

      // ── Get all campaign promo codes for matching ──
      const { data: allCampaigns } = await supabase
        .from('promotion_campaigns')
        .select('id, name, promotion_code, discount_percentage, discount_amount')
        .eq('restaurant_id', restaurantId);

      const promoCodes = (allCampaigns || [])
        .filter(c => c.promotion_code)
        .map(c => c.promotion_code!.toLowerCase());

      // ── Orders with promo-code-linked discounts (real attribution) ──
      // We look at discount_notes which contains the applied promo code name
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, total, discount_amount, discount_notes, discount_percentage, created_at')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', rangeStart.toISOString());

      const { data: previousOrders } = await supabase
        .from('orders')
        .select('id, total, discount_amount, discount_notes, discount_percentage')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', rangeStart.toISOString());

      // Filter orders that have a matching campaign promo code in discount_notes
      const isPromoLinked = (order: any): boolean => {
        if (!order.discount_amount || order.discount_amount <= 0) return false;
        if (!order.discount_notes) return false;
        const notes = order.discount_notes.toLowerCase();
        return promoCodes.some(code => notes.includes(code));
      };

      const promoLinkedOrders = (recentOrders || []).filter(isPromoLinked);
      const previousPromoLinked = (previousOrders || []).filter(isPromoLinked);

      // Also count orders with any discount as fallback revenue (but separate metric)
      const allDiscountedOrders = (recentOrders || []).filter(
        o => o.discount_amount && o.discount_amount > 0
      );

      // ── All recent orders for avg order value ──
      const avgOrderValue = recentOrders && recentOrders.length > 0
        ? recentOrders.reduce((sum, o) => sum + (o.total || 0), 0) / recentOrders.length
        : 0;

      // ── Customer metrics ──
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('visit_count, total_spent, last_visit_date, name, birthday')
        .eq('restaurant_id', restaurantId);

      const realCustomers = (allCustomers || []).filter(
        (c) => !(/^table\s/i.test(c.name || ''))
      );

      const totalCustomers = realCustomers.length;
      const repeatCustomers = realCustomers.filter(c => (c.visit_count || 0) > 1).length;
      const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers * 100) : 0;

      const avgLifetimeValue = totalCustomers > 0
        ? realCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / totalCustomers
        : 0;

      // Churn
      const activeCustomers = realCustomers.filter(c => {
        if (!c.last_visit_date) return false;
        const daysSince = (Date.now() - new Date(c.last_visit_date).getTime()) / (1000 * 3600 * 24);
        return daysSince <= 30;
      }).length;
      const churnRate = totalCustomers > 0 ? ((totalCustomers - activeCustomers) / totalCustomers * 100) : 0;

      // Upcoming birthdays (next 30 days)
      const now = new Date();
      const upcomingBirthdays = realCustomers.filter(c => {
        if (!c.birthday) return false;
        try {
          const bday = new Date(c.birthday);
          const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
          if (thisYearBday < now) thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
          const daysUntil = (thisYearBday.getTime() - now.getTime()) / (1000 * 3600 * 24);
          return daysUntil >= 0 && daysUntil <= 30;
        } catch { return false; }
      }).length;

      // ── Reservations with special occasions ──
      const { data: reservations } = await supabase
        .from('reservations')
        .select('special_occasion')
        .eq('restaurant_id', restaurantId)
        .not('special_occasion', 'is', null);

      // ── Messages ──
      const messagesSent = recentPromotions?.length || 0;
      const previousMessagesSent = previousPromotions?.length || 0;
      const messageGrowth = previousMessagesSent > 0
        ? ((messagesSent - previousMessagesSent) / previousMessagesSent * 100)
        : 0;

      // ── Revenue from promo-linked orders only ──
      const recentRevenue = promoLinkedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const previousRevenue = previousPromoLinked.reduce((sum, o) => sum + (o.total || 0), 0);
      const revenueGrowth = previousRevenue > 0
        ? ((recentRevenue - previousRevenue) / previousRevenue * 100)
        : 0;

      // ── Real Channel Stats from sent_promotions ──
      const channelStats = {
        whatsapp: { sent: 0, delivered: 0, failed: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 },
        email: { sent: 0, delivered: 0, failed: 0 },
      };

      (allSentPromotions || []).forEach((sp: any) => {
        const channel = (sp.channel || 'whatsapp').toLowerCase();
        const status = (sp.status || 'sent').toLowerCase();
        if (channel in channelStats) {
          const ch = channelStats[channel as keyof typeof channelStats];
          ch.sent++;
          if (status === 'delivered' || status === 'sent') ch.delivered++;
          if (status === 'failed') ch.failed++;
        }
      });

      // ── Campaign performance with real redemption tracking ──
      const MSG_COST_UTILITY = 0.12;
      const MSG_COST_MARKETING = 0.90;

      const campaignPerformance = (allCampaigns || []).map(campaign => {
        const sends = (allSentPromotions || []).filter(
          (sp: any) => sp.promotion_campaign_id === campaign.id
        );
        const sent = sends.length;
        const cost = Math.round(sent * MSG_COST_UTILITY * 100) / 100;

        // Real redemptions: count orders where discount_notes contains this campaign's promo code
        let redemptions = 0;
        let revenue = 0;
        if (campaign.promotion_code) {
          const code = campaign.promotion_code.toLowerCase();
          const redeemedOrders = (recentOrders || []).filter(o =>
            o.discount_notes && o.discount_notes.toLowerCase().includes(code)
          );
          redemptions = redeemedOrders.length;
          revenue = redeemedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        }

        return {
          id: campaign.id,
          name: campaign.name,
          sent,
          revenue: Math.round(revenue),
          cost,
          redemptions,
          promoCode: campaign.promotion_code || null,
        };
      });

      const totalRedemptions = campaignPerformance.reduce((sum, c) => sum + c.redemptions, 0);

      return {
        messagesSent,
        revenueImpact: Math.round(recentRevenue || allDiscountedOrders.reduce((s, o) => s + (o.total || 0), 0)),
        specialOccasions: reservations?.length || 0,
        campaignPerformance,
        messageGrowth: Math.round(messageGrowth * 10) / 10,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        avgOrderValue: Math.round(avgOrderValue),
        repeatCustomerRate: Math.round(repeatRate * 10) / 10,
        customerLifetimeValue: Math.round(avgLifetimeValue),
        churnRate: Math.round(churnRate * 10) / 10,
        channelStats,
        totalRedemptions,
        upcomingBirthdays,
      };
    },
    enabled: !!restaurantId,
  });

  const isLoading = campaignsLoading || customersLoading || analyticsLoading;

  return { campaigns, customers, analytics, isLoading, restaurantId };
};
