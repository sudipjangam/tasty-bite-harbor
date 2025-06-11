
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";

export interface RevenueMetrics {
  id: string;
  restaurant_id: string;
  date: string;
  total_revenue: number;
  room_revenue: number;
  f_and_b_revenue: number;
  occupancy_rate: number;
  adr: number;
  revpar: number;
  total_rooms: number;
  occupied_rooms: number;
  created_at: string;
  updated_at: string;
}

export interface CompetitorPricing {
  id: string;
  restaurant_id: string;
  competitor_name: string;
  competitor_url?: string;
  room_type?: string;
  date: string;
  price: number;
  currency: string;
  last_scraped: string;
  created_at: string;
}

export const useRevenueManagement = () => {
  const { restaurantId } = useRestaurantId();

  // Fetch revenue metrics
  const { data: revenueMetrics = [], isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["revenue-metrics", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("revenue_metrics")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as RevenueMetrics[];
    },
    enabled: !!restaurantId,
  });

  // Fetch competitor pricing
  const { data: competitorPricing = [], isLoading: isLoadingCompetitors } = useQuery({
    queryKey: ["competitor-pricing", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("competitor_pricing")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CompetitorPricing[];
    },
    enabled: !!restaurantId,
  });

  // Calculate key metrics
  const currentMetrics = revenueMetrics[0];
  const previousMetrics = revenueMetrics[1];

  const metricsComparison = {
    occupancy: {
      current: currentMetrics?.occupancy_rate || 0,
      change: currentMetrics && previousMetrics 
        ? currentMetrics.occupancy_rate - previousMetrics.occupancy_rate 
        : 0,
    },
    adr: {
      current: currentMetrics?.adr || 0,
      change: currentMetrics && previousMetrics 
        ? currentMetrics.adr - previousMetrics.adr 
        : 0,
    },
    revpar: {
      current: currentMetrics?.revpar || 0,
      change: currentMetrics && previousMetrics 
        ? currentMetrics.revpar - previousMetrics.revpar 
        : 0,
    },
    revenue: {
      current: currentMetrics?.total_revenue || 0,
      change: currentMetrics && previousMetrics 
        ? currentMetrics.total_revenue - previousMetrics.total_revenue 
        : 0,
    },
  };

  return {
    revenueMetrics,
    competitorPricing,
    metricsComparison,
    isLoadingMetrics,
    isLoadingCompetitors,
  };
};
