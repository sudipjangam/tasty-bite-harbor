import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6"];

const PaymentSplitWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol } = useCurrencyContext();

  const { data: paymentData, isLoading } = useQuery({
    queryKey: ["payment-split-today", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      const { data, error } = await supabase
        .from("pos_transactions")
        .select("amount, payment_method, status")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      if (error) throw error;

      const methodMap: Record<string, number> = {};
      (data || []).forEach((t) => {
        const method =
          (t.payment_method || "Cash").charAt(0).toUpperCase() +
          (t.payment_method || "Cash").slice(1).toLowerCase();
        methodMap[method] = (methodMap[method] || 0) + (Number(t.amount) || 0);
      });

      return Object.entries(methodMap)
        .map(([name, value]) => ({ name, value }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value);
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <Skeleton className="w-full h-[250px] rounded-lg" />;
  }

  if (!paymentData || paymentData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
        No payment data yet today
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={paymentData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          animationDuration={800}
          stroke="none"
        >
          {paymentData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `${symbol}${value.toFixed(0)}`}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PaymentSplitWidget;
