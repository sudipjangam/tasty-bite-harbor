import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  MapPin,
  TrendingUp,
  TrendingDown,
  Crown,
  AlertCircle,
} from "lucide-react";

interface DaySchedule {
  location: string;
  link: string;
  startTime: string;
  endTime: string;
}
type WeeklySchedule = Record<string, DaySchedule>;

interface LocationStats {
  location: string;
  totalRevenue: number;
  totalOrders: number;
  dayCount: number;
  avgRevenue: number;
}

const LocationPerformanceWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();

  const { data: locationStats, isLoading } = useQuery({
    queryKey: ["location-performance", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      // Fetch restaurant's weekly schedule
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("weekly_schedule")
        .eq("id", restaurantId)
        .single();

      const schedule = (restaurant?.weekly_schedule as WeeklySchedule) || {};

      // Build a map: date → location
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dateLocationMap = new Map<string, string>();
      const today = new Date();

      // Look back 30 days, map each date to its scheduled location
      for (let i = 0; i < 30; i++) {
        const date = subDays(today, i);
        const dayName = dayNames[date.getDay()];
        const daySchedule = schedule[dayName];
        if (daySchedule?.location) {
          dateLocationMap.set(format(date, "yyyy-MM-dd"), daySchedule.location);
        }
      }

      // Fetch last 30 days of pos_transactions
      const thirtyDaysAgo = subDays(today, 30);
      const { data: transactions } = await supabase
        .from("pos_transactions")
        .select("amount, status, created_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .gte("created_at", startOfDay(thirtyDaysAgo).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      // Group revenue by location
      const locationMap = new Map<
        string,
        { revenue: number; orders: number; days: Set<string> }
      >();

      (transactions || []).forEach((txn) => {
        const txnDate = format(new Date(txn.created_at), "yyyy-MM-dd");
        const location = dateLocationMap.get(txnDate);
        if (location) {
          const existing = locationMap.get(location) || {
            revenue: 0,
            orders: 0,
            days: new Set<string>(),
          };
          existing.revenue += Number(txn.amount) || 0;
          existing.orders += 1;
          existing.days.add(txnDate);
          locationMap.set(location, existing);
        }
      });

      // Convert to array and sort by avg revenue (revenue / days)
      const stats: LocationStats[] = Array.from(locationMap.entries())
        .map(([location, data]) => ({
          location,
          totalRevenue: data.revenue,
          totalOrders: data.orders,
          dayCount: data.days.size,
          avgRevenue: data.days.size > 0 ? data.revenue / data.days.size : 0,
        }))
        .sort((a, b) => b.avgRevenue - a.avgRevenue);

      return stats;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (!locationStats || locationStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-gray-400 text-sm gap-2">
        <AlertCircle className="h-8 w-8" />
        <p>No location data yet</p>
        <p className="text-xs">Set your weekly schedule locations first</p>
      </div>
    );
  }

  const maxAvg = Math.max(...locationStats.map((s) => s.avgRevenue));

  return (
    <div className="space-y-2.5">
      {locationStats.map((stat, idx) => {
        const isTop = idx === 0;
        const barWidth = maxAvg > 0 ? (stat.avgRevenue / maxAvg) * 100 : 0;

        return (
          <div
            key={stat.location}
            className={`relative rounded-xl p-3 border transition-all ${
              isTop
                ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800"
                : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {isTop && <Crown className="h-4 w-4 text-amber-500" />}
                <MapPin
                  className={`h-3.5 w-3.5 ${isTop ? "text-amber-600" : "text-gray-400"}`}
                />
                <span
                  className={`text-sm font-semibold truncate max-w-[140px] ${isTop ? "text-amber-800 dark:text-amber-300" : "text-gray-700 dark:text-gray-300"}`}
                >
                  {stat.location}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-bold ${isTop ? "text-amber-700 dark:text-amber-300" : "text-gray-800 dark:text-gray-200"}`}
                >
                  {currencySymbol}
                  {stat.avgRevenue.toFixed(0)}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">/day</span>
              </div>
            </div>
            {/* Revenue bar */}
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTop
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-blue-400 to-indigo-500"
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">
                {stat.totalOrders} orders • {stat.dayCount} days
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                Total: {currencySymbol}
                {stat.totalRevenue.toFixed(0)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LocationPerformanceWidget;
