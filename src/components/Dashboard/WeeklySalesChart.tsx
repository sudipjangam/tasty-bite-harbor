import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, addDays, format, endOfDay } from "date-fns";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatIndianCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeuomorphicBarChart, BarChartDataPoint } from "@/components/ui/skeuomorphic";
import { BarChart3 } from "lucide-react";

export const WeeklySalesChart: React.FC = () => {
  // Setup real-time subscriptions for live chart updates
  useRealtimeSubscription({
    table: "orders",
    queryKey: "weekly-sales",
    schema: "public",
  });

  useRealtimeSubscription({
    table: "room_billings",
    queryKey: "weekly-sales",
    schema: "public",
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: weeklyData, isLoading } = useQuery({
    queryKey: ["weekly-sales", profile?.restaurant_id],
    enabled: !!profile?.restaurant_id,
    queryFn: async () => {
      const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start on Monday
      const endDate = addDays(startDate, 6);
      const days = [...Array(7)].map((_, i) =>
        format(addDays(startDate, i), "EEE d MMM")
      );

      // Fetch orders revenue
      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total, status")
        .eq("restaurant_id", profile?.restaurant_id)
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endOfDay(endDate).toISOString());

      // Fetch room billings revenue
      const { data: roomBillings } = await supabase
        .from("room_billings")
        .select("checkout_date, total_amount, payment_status")
        .eq("restaurant_id", profile?.restaurant_id)
        .eq("payment_status", "paid")
        .gte("checkout_date", startDate.toISOString())
        .lte("checkout_date", endOfDay(endDate).toISOString());

      // Calculate revenue per day
      const dailyRevenue: Record<string, number> = {};

      orders?.forEach((order) => {
        const day = format(new Date(order.created_at), "EEE d MMM");
        dailyRevenue[day] = (dailyRevenue[day] || 0) + (Number(order.total) || 0);
      });

      roomBillings?.forEach((billing) => {
        const day = format(new Date(billing.checkout_date), "EEE d MMM");
        dailyRevenue[day] =
          (dailyRevenue[day] || 0) + (Number(billing.total_amount) || 0);
      });

      return days.map((day) => ({
        day,
        amount: dailyRevenue[day] || 0,
      }));
    },
    staleTime: 60 * 1000,
  });

  if (isLoading || !weeklyData) {
    return (
      <div className="flex flex-col space-y-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-[220px] w-full rounded-2xl" />
      </div>
    );
  }

  // Transform data points for 3D Skeuomorphic Bar Chart
  const chartPoints: BarChartDataPoint[] = weeklyData.map((item) => {
    const parts = item.day.split(" ");
    return {
      label: parts[0], // e.g. Mon, Tue, Wed
      subLabel: `${parts[1]} ${parts[2] || ""}`, // e.g. 24 Aug
      value: item.amount,
    };
  });

  return (
    <SkeuomorphicBarChart
      title="Weekly Sales"
      subtitle="7-day revenue performance"
      icon={<BarChart3 className="h-4 w-4 text-[#3b82f6] dark:text-blue-400" />}
      data={chartPoints}
      formatValue={(val) => formatIndianCurrency(val).formatted}
      barGradient="from-[#3b82f6] to-[#60a5fa]"
      height={220}
    />
  );
};

export default WeeklySalesChart;
