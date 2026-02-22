import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const AvgOrderTrendWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol } = useCurrencyContext();

  const { data: trendData, isLoading } = useQuery({
    queryKey: ["avg-order-trend-7d", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const today = new Date();
      const startDate = subDays(today, 6);

      const { data, error } = await supabase
        .from("orders")
        .select("created_at, total, status")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .neq("order_type", "non-chargeable")
        .gte("created_at", startOfDay(startDate).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      if (error) throw error;

      // Group by day
      const dayMap: Record<string, { total: number; count: number }> = {};
      (data || []).forEach((o) => {
        const day = format(new Date(o.created_at), "dd MMM");
        if (!dayMap[day]) dayMap[day] = { total: 0, count: 0 };
        dayMap[day].total += Number(o.total) || 0;
        dayMap[day].count += 1;
      });

      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        const label = format(d, "dd MMM");
        const entry = dayMap[label];
        days.push({
          day: label,
          avg:
            entry && entry.count > 0
              ? Math.round(entry.total / entry.count)
              : 0,
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
      <LineChart
        data={trendData || []}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${symbol}${v}`}
        />
        <Tooltip
          formatter={(value: number) => [`${symbol}${value}`, "Avg Order"]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={{ fill: "#6366f1", r: 4, strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 6, fill: "#6366f1" }}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AvgOrderTrendWidget;
