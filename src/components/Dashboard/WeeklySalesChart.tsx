
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, addDays, format } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";

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

      // Fetch room billings revenue
      const { data: roomBillings } = await supabase
        .from("room_billings")
        .select("billing_date, total_amount, payment_status")
        .eq("restaurant_id", profile?.restaurant_id)
        .eq("payment_status", "paid")
        .gte("billing_date", startDate.toISOString())
        .lte("billing_date", endDate.toISOString());

      // Calculate revenue per day
      const dailyRevenue: { [key: string]: number } = {};
      
      orders?.forEach(order => {
        const day = format(new Date(order.created_at), 'EEE');
        dailyRevenue[day] = (dailyRevenue[day] || 0) + (order.total || 0);
      });

      roomBillings?.forEach(billing => {
        const day = format(new Date(billing.billing_date), 'EEE');
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
  const backgroundColor = isDarkMode ? 'transparent' : 'transparent';
  const textColor = isDarkMode ? '#F7FAFC' : '#2D3748';
  const gridColor = isDarkMode ? '#4A5568' : '#E2E8F0';
  const barColor = isDarkMode ? '#48BB78' : '#48BB78';

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
      text: null
    },
    xAxis: {
      categories: weeklyData.map(item => item.day),
      labels: {
        style: {
          color: textColor
        }
      },
      lineColor: gridColor,
      tickColor: gridColor
    },
    yAxis: {
      title: {
        text: 'Revenue (₹)',
        style: {
          color: textColor
        }
      },
      labels: {
        style: {
          color: textColor
        },
        formatter: function() {
          return '₹' + this.value;
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
        '<td style="padding:0"><b>₹{point.y:.0f}</b></td></tr>',
      footerFormat: '</table>',
      shared: true,
      useHTML: true,
      backgroundColor: isDarkMode ? '#2D3748' : '#FFFFFF',
      borderColor: isDarkMode ? '#4A5568' : '#E2E8F0',
      style: {
        color: textColor
      }
    },
    plotOptions: {
      column: {
        borderRadius: 6,
        color: barColor,
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
    <Card className="p-4 shadow-card hover:shadow-card-hover transition-all duration-300">
      <HighchartComponent options={chartOptions} />
    </Card>
  );
};

export default WeeklySalesChart;
