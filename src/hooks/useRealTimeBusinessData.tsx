import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface PeakHourData {
  hour: string;
  customers: number;
  revenue: number;
}

export interface RealTimeBusinessMetrics {
  peakHoursData: PeakHourData[];
  busyHours: string[];
  slowHours: string[];
  averageWaitTime: number;
  totalDailyOrders: number;
  todayRevenue: number;
  weekdayComparison: Array<{
    day: string;
    orders: number;
    revenue: number;
  }>;
}

export const useRealTimeBusinessData = () => {
  // Setup real-time subscription for orders table
  useRealtimeSubscription({
    table: 'orders',
    queryKey: 'realtime-business-data',
    schema: 'public',
  });

  return useQuery({
    queryKey: ["realtime-business-data"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("No restaurant found");

      const restaurantId = profile.restaurant_id;

      // Get data for the last 7 days for analysis
      const sevenDaysAgo = subDays(new Date(), 7);
      const today = new Date();

      // Fetch orders for the last 7 days
      const { data: weekOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Fetch today's orders specifically
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      // Calculate peak hours based on order frequency
      const hourCounts: Record<string, { customers: number; revenue: number }> = {};
      
      // Initialize business hours (9 AM to 10 PM)
      for (let i = 9; i <= 22; i++) {
        const hourLabel = i < 12 ? `${i} AM` : i === 12 ? `${i} PM` : `${i-12} PM`;
        hourCounts[hourLabel] = { customers: 0, revenue: 0 };
      }
      
      // Process week orders for hour analysis - ONLY COUNT COMPLETED ORDERS
      if (weekOrders) {
        weekOrders.forEach(order => {
          // Only count completed orders for revenue
          if (order.status !== 'completed') return;
          
          const orderDate = new Date(order.created_at);
          const hour = orderDate.getHours();
          
          if (hour >= 9 && hour <= 22) {
            const hourLabel = hour < 12 ? `${hour} AM` : hour === 12 ? `${hour} PM` : `${hour-12} PM`;
            hourCounts[hourLabel].customers += 1;
            hourCounts[hourLabel].revenue += order.total || 0;
          }
        });
      }
      
      // Convert to peak hours data
      const peakHoursData: PeakHourData[] = Object.entries(hourCounts).map(([hour, data]) => ({
        hour,
        customers: data.customers,
        revenue: data.revenue
      }));

      // Identify busy and slow hours
      const avgCustomersPerHour = peakHoursData.reduce((sum, h) => sum + h.customers, 0) / peakHoursData.length;
      const busyHours = peakHoursData
        .filter(h => h.customers > avgCustomersPerHour * 1.2)
        .map(h => h.hour);
      
      const slowHours = peakHoursData
        .filter(h => h.customers < avgCustomersPerHour * 0.8)
        .map(h => h.hour);

      // Calculate weekday comparison
      const dayOfWeekData: Record<string, { orders: number; revenue: number }> = {
        'Mon': { orders: 0, revenue: 0 },
        'Tue': { orders: 0, revenue: 0 },
        'Wed': { orders: 0, revenue: 0 },
        'Thu': { orders: 0, revenue: 0 },
        'Fri': { orders: 0, revenue: 0 },
        'Sat': { orders: 0, revenue: 0 },
        'Sun': { orders: 0, revenue: 0 }
      };

      if (weekOrders) {
        weekOrders.forEach(order => {
          const dayOfWeek = format(new Date(order.created_at), 'EEE');
          if (dayOfWeekData[dayOfWeek]) {
            dayOfWeekData[dayOfWeek].orders += 1;
            // Only count revenue from completed orders
            if (order.status === 'completed') {
              dayOfWeekData[dayOfWeek].revenue += order.total || 0;
            }
          }
        });
      }

      const weekdayComparison = Object.entries(dayOfWeekData).map(([day, data]) => ({
        day,
        orders: data.orders,
        revenue: data.revenue
      }));

      // Calculate today's metrics - ONLY COUNT COMPLETED ORDERS FOR REVENUE
      const totalDailyOrders = todayOrders?.length || 0;
      const completedTodayOrders = todayOrders?.filter(order => order.status === 'completed') || [];
      const todayRevenue = completedTodayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      // Estimate average wait time based on order volume and hour
      const currentHour = new Date().getHours();
      const currentHourLabel = currentHour < 12 ? `${currentHour} AM` : currentHour === 12 ? `${currentHour} PM` : `${currentHour-12} PM`;
      const currentHourOrders = hourCounts[currentHourLabel]?.customers || 0;
      
      // Basic wait time calculation: more orders = longer wait
      let averageWaitTime = 5; // Base wait time in minutes
      if (currentHourOrders > avgCustomersPerHour * 1.5) {
        averageWaitTime = 15; // Busy period
      } else if (currentHourOrders > avgCustomersPerHour) {
        averageWaitTime = 10; // Moderate period
      }

      const metrics: RealTimeBusinessMetrics = {
        peakHoursData,
        busyHours,
        slowHours,
        averageWaitTime,
        totalDailyOrders,
        todayRevenue,
        weekdayComparison
      };

      return metrics;
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time data
  });
};