import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";

export interface NCMetrics {
  totalNCValue: number;
  ncOrderCount: number;
  ncPercentageOfRevenue: number;
  byReason: { reason: string; value: number; count: number }[];
  trends: { date: string; value: number; count: number }[];
}

interface UseNCMetricsOptions {
  startDate?: Date;
  endDate?: Date;
}

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get start of day
const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper function to get end of day
const getEndOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const useNCMetrics = (options: UseNCMetricsOptions = {}) => {
  const { restaurantId } = useRestaurantId();
  const { startDate = getStartOfDay(new Date()), endDate = getEndOfDay(new Date()) } = options;

  return useQuery({
    queryKey: ["nc-metrics", restaurantId, startDate, endDate],
    queryFn: async (): Promise<NCMetrics> => {
      if (!restaurantId) {
        return {
          totalNCValue: 0,
          ncOrderCount: 0,
          ncPercentageOfRevenue: 0,
          byReason: [],
          trends: [],
        };
      }

      //Fetch NC orders
      const { data: ncOrders, error: ncError } = await supabase
        .from("orders")
        .select("original_subtotal, nc_reason, created_at, total")
        .eq("restaurant_id", restaurantId)
        .eq("order_type", "non-chargeable")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (ncError) {
        console.error("Error fetching NC orders:", ncError);
        throw ncError;
      }

      // Fetch all orders for percentage calculation
      const { data: allOrders, error: allError } = await supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .neq("order_type", "non-chargeable") // Exclude NC orders from revenue
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (allError) {
        console.error("Error fetching all orders:", allError);
        throw allError;
      }

      // Calculate total NC value
      // For legacy NC orders, fall back to 'total' if original_subtotal is null
      const totalNCValue = (ncOrders || []).reduce(
        (sum, order) => {
          const value = Number(order.original_subtotal) || Number(order.total) || 0;
          return sum + value;
        },
        0
      );

      // Calculate total revenue (excluding NC orders)
      const totalRevenue = (allOrders || []).reduce(
        (sum, order) => sum + (Number(order.total) || 0),
        0
      );

      // Calculate NC percentage
      const ncPercentageOfRevenue =
        totalRevenue > 0 ? (totalNCValue / (totalRevenue + totalNCValue)) * 100 : 0;

      // Group by reason
      const byReasonMap = new Map<string, { value: number; count: number }>();
      (ncOrders || []).forEach((order) => {
        const reason = order.nc_reason || "unknown";
        const existing = byReasonMap.get(reason) || { value: 0, count: 0 };
        const value = Number(order.original_subtotal) || Number(order.total) || 0;
        byReasonMap.set(reason, {
          value: existing.value + value,
          count: existing.count + 1,
        });
      });

      const byReason = Array.from(byReasonMap.entries()).map(([reason, stats]) => ({
        reason,
        ...stats,
      }));

      // Calculate trends (daily aggregation)
      const trendMap = new Map<string, { value: number; count: number }>();
      (ncOrders || []).forEach((order) => {
        const date = formatDate(new Date(order.created_at));
        const existing = trendMap.get(date) || { value: 0, count: 0 };
        const value = Number(order.original_subtotal) || Number(order.total) || 0;
        trendMap.set(date, {
          value: existing.value + value,
          count: existing.count + 1,
        });
      });

      const trends = Array.from(trendMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalNCValue,
        ncOrderCount: (ncOrders || []).length,
        ncPercentageOfRevenue,
        byReason,
        trends,
      };
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
