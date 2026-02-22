import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DailyOrdersWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();

  const { data: dailyData, isLoading } = useQuery({
    queryKey: ["daily-orders-7d", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const today = new Date();
      const startDate = subDays(today, 6);

      const { data, error } = await supabase
        .from("orders")
        .select("created_at, status")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .gte("created_at", startOfDay(startDate).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      if (error) throw error;

      // Group by day
      const dayMap: Record<string, number> = {};
      (data || []).forEach((o) => {
        const day = format(new Date(o.created_at), "EEE");
        dayMap[day] = (dayMap[day] || 0) + 1;
      });

      // Build 7-day array
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        const label = format(d, "EEE");
        days.push({
          day: label,
          orders: dayMap[label] || 0,
        });
      }
      return days;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="w-full h-[250px] rounded-lg" />;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={dailyData || []}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: number) => [value, "Orders"]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
        <Bar
          dataKey="orders"
          fill="#10b981"
          radius={[6, 6, 0, 0]}
          animationDuration={800}
          barSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default DailyOrdersWidget;
