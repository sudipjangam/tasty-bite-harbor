
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, addDays, format } from "date-fns";

const WeeklySalesChart = () => {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      const startDate = startOfWeek(new Date());
      const days = [...Array(7)].map((_, i) => format(addDays(startDate, i), 'EEE'));
      
      const { data: dailyStats } = await supabase
        .from("daily_revenue_stats")
        .select("date, total_revenue")
        .eq("restaurant_id", profile?.restaurant_id)
        .gte("date", startDate.toISOString())
        .lte("date", addDays(startDate, 6).toISOString());

      return days.map(day => ({
        day,
        amount: dailyStats?.find(stat => 
          format(new Date(stat.date), 'EEE') === day
        )?.total_revenue || 0
      }));
    },
  });

  if (isLoading) {
    return <Skeleton className="w-full h-[300px] rounded-lg bg-secondary/50" />;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={weeklyData} className="mt-4">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="day"
          tick={{ fill: '#888888' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tick={{ fill: '#888888' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickFormatter={(value) => `₹${value}`}
        />
        <Tooltip 
          formatter={(value) => [`₹${value}`, 'Revenue']}
          contentStyle={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
          cursor={{ fill: 'rgba(155, 135, 245, 0.1)' }}
        />
        <Bar 
          dataKey="amount" 
          fill="#9b87f5"
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default WeeklySalesChart;
