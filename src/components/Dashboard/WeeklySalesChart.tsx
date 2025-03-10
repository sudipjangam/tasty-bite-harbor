
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, addDays, format } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";

const WeeklySalesChart = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
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

  // Theme-aware colors
  const textColor = isDarkMode ? '#F7FAFC' : '#2D3748';
  const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';
  const barColor = isDarkMode ? '#48BB78' : '#48BB78';
  const cursorFill = isDarkMode ? 'rgba(72, 187, 120, 0.2)' : 'rgba(72, 187, 120, 0.1)';
  const tooltipBg = isDarkMode ? '#2D3748' : 'white';
  const tooltipBorder = isDarkMode ? '#4A5568' : '#E2E8F0';

  if (isLoading) {
    return <Skeleton className="w-full h-[300px] rounded-lg bg-secondary/20" />;
  }

  return (
    <Card className="p-4 shadow-card hover:shadow-card-hover transition-all duration-300">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={weeklyData} className="mt-4">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" stroke={gridColor} />
          <XAxis 
            dataKey="day"
            tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: gridColor }}
          />
          <YAxis 
            tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: gridColor }}
            tickFormatter={(value) => `₹${value}`}
          />
          <Tooltip 
            formatter={(value) => [`₹${value}`, 'Revenue']}
            contentStyle={{ 
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              color: isDarkMode ? '#F7FAFC' : '#2D3748',
              fontWeight: 500
            }}
            cursor={{ fill: cursorFill }}
          />
          <Bar 
            dataKey="amount" 
            fill={barColor}
            radius={[6, 6, 0, 0]}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default WeeklySalesChart;
