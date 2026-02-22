import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const HourlySalesWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol } = useCurrencyContext();

  const { data: hourlyData, isLoading } = useQuery({
    queryKey: ["hourly-sales-today", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      const { data, error } = await supabase
        .from("pos_transactions")
        .select("amount, created_at, status")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      if (error) throw error;

      // Group by hour
      const hourMap: Record<number, number> = {};
      (data || []).forEach((t) => {
        const hr = new Date(t.created_at).getHours();
        hourMap[hr] = (hourMap[hr] || 0) + (Number(t.amount) || 0);
      });

      // Build 24-hour array (only show open hours: 8AM to 11PM)
      const hours = [];
      for (let h = 8; h <= 23; h++) {
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        hours.push({
          hour: `${h12}${ampm}`,
          sales: hourMap[h] || 0,
        });
      }
      return hours;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <Skeleton className="w-full h-[250px] rounded-lg" />;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart
        data={hourlyData || []}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="hour"
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
          formatter={(value: number) => [
            `${symbol}${value.toFixed(0)}`,
            "Sales",
          ]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="#06b6d4"
          strokeWidth={2.5}
          fill="url(#salesGradient)"
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default HourlySalesWidget;
