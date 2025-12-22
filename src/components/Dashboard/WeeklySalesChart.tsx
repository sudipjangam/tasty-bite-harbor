
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, addDays, format } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

const WeeklySalesChart = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { symbol } = useCurrencyContext();
  
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
      const endDate = addDays(startDate, 6);
      const days = [...Array(7)].map((_, i) => format(addDays(startDate, i), 'EEE'));
      
      // Fetch orders revenue
      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total, status")
        .eq("restaurant_id", profile?.restaurant_id)
        .eq("status", "completed")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Fetch room billings revenue (use checkout_date instead of billing_date)
      const { data: roomBillings, error: roomBillingsError } = await supabase
        .from("room_billings")
        .select("checkout_date, total_amount, payment_status")
        .eq("restaurant_id", profile?.restaurant_id)
        .eq("payment_status", "paid")
        .gte("checkout_date", startDate.toISOString())
        .lte("checkout_date", endDate.toISOString());

      if (roomBillingsError) {
        console.log('Room billings query error:', roomBillingsError.message);
      }

      // Calculate revenue per day
      const dailyRevenue: { [key: string]: number } = {};
      
      orders?.forEach(order => {
        const day = format(new Date(order.created_at), 'EEE');
        dailyRevenue[day] = (dailyRevenue[day] || 0) + (order.total || 0);
      });

      roomBillings?.forEach(billing => {
        const day = format(new Date(billing.checkout_date), 'EEE');
        dailyRevenue[day] = (dailyRevenue[day] || 0) + (billing.total_amount || 0);
      });

      return days.map(day => ({
        day,
        amount: dailyRevenue[day] || 0
      }));
    },
  });

  // Return a loading state while data is being fetched
  if (isLoading || !weeklyData) {
    return <Skeleton className="w-full h-[300px] rounded-lg bg-secondary/20" />;
  }

  // Theme-aware colors
  const backgroundColor = 'transparent';
  const textColor = isDarkMode ? '#F7FAFC' : '#64748B'; // Slate-500 for better contrast on glass
  const gridColor = isDarkMode ? '#334155' : '#E2E8F0';
  const barColor = isDarkMode ? '#48BB78' : '#3B82F6'; // Blue-500 for premium look

  const chartOptions: Options = {
    chart: {
      type: 'column' as const,
      backgroundColor: backgroundColor,
      style: {
        fontFamily: 'Inter, sans-serif'
      },
      height: 300
    },
    title: {
      text: undefined
    },
    xAxis: {
      categories: weeklyData.map(item => item.day),
      labels: {
        style: {
          color: textColor,
          fontWeight: '500'
        }
      },
      lineColor: gridColor,
      tickColor: gridColor
    },
    yAxis: {
      title: {
        text: `Revenue (${symbol})`,
        style: {
          color: textColor
        }
      },
      labels: {
        style: {
          color: textColor
        },
        formatter: function() {
          return symbol + this.value;
        }
      },
      gridLineColor: gridColor
    },
    legend: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    tooltip: {
      headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
      pointFormat: '<tr><td style="color:{series.color};padding:0">Revenue: </td>' +
        `<td style="padding:0"><b>${symbol}{point.y:.0f}</b></td></tr>`,
      footerFormat: '</table>',
      shared: true,
      useHTML: true,
      backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: isDarkMode ? '#475569' : '#E2E8F0',
      borderRadius: 12,
      style: {
        color: textColor
      },
      shadow: true
    },
    plotOptions: {
      column: {
        borderRadius: 8,
        color: {
          linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
          stops: [
            [0, '#6366f1'], // Indigo 500
            [1, '#3b82f6'] // Blue 500
          ]
        },
        pointWidth: 20,
        animation: {
          duration: 1000
        }
      }
    },
    series: [{
      type: 'column' as const,
      name: 'Revenue',
      data: weeklyData.map(item => item.amount),
      colorByPoint: false
    }]
  };

  return (
    <Card className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 rounded-3xl shadow-2xl p-6 hover:shadow-3xl transition-all duration-300 group">
      {/* 3D Gradient Overlay Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 pointer-events-none" />
      
      {/* Subtle border gradient */}
      <div className="absolute inset-0 border border-white/20 dark:border-gray-700/30 rounded-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Sales Trend
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Weekly revenue overview</p>
        </div>
      </div>

      <div className="relative z-10">
        <HighchartComponent options={chartOptions} />
      </div>
    </Card>
  );
};

export default WeeklySalesChart;
