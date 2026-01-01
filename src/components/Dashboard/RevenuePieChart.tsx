import { useEffect, useRef } from "react";
import Highcharts from "highcharts";
import Highcharts3D from "highcharts/highcharts-3d";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SwadeshiLoader from "@/styles/Loader/SwadeshiLoader";

// Initialize 3D module
if (typeof Highcharts3D === "function") {
  Highcharts3D(Highcharts);
}

interface CategoryRevenue {
  category: string;
  revenue: number;
}

// Sample data for demo when no real data exists
const SAMPLE_DATA: CategoryRevenue[] = [
  { category: "Dine-In", revenue: 45000 },
  { category: "Takeaway", revenue: 28000 },
  { category: "Delivery", revenue: 18500 },
  { category: "Room Service", revenue: 12000 },
  { category: "Catering", revenue: 8500 },
];

const RevenuePieChart = () => {
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: revenueData, isLoading } = useQuery<CategoryRevenue[]>({
    queryKey: ["revenue-by-order-type"],
    queryFn: async () => {
      // Fetch all orders and group by order_type
      const { data: orders, error } = await supabase
        .from("orders")
        .select("order_type, total, status")
        .in("status", ["completed", "paid", "ready", "pending", "preparing"]);

      if (error) throw error;

      if (!orders || orders.length === 0) {
        // Return sample data if no real data
        return SAMPLE_DATA;
      }

      // Aggregate revenue by order_type
      const typeMap: Record<string, number> = {};

      orders.forEach((order) => {
        const orderType = order.order_type || "Dine-In";
        // Format order type for display
        const displayType = orderType
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        typeMap[displayType] = (typeMap[displayType] || 0) + (order.total || 0);
      });

      const result = Object.entries(typeMap)
        .map(([category, revenue]) => ({ category, revenue }))
        .filter((item) => item.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);

      // Return sample data if all revenues are 0
      return result.length > 0 ? result : SAMPLE_DATA;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!chartRef.current || isLoading || !revenueData) return;

    // Define vibrant colors
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#E7E9ED",
      "#8B5CF6",
    ];

    // Prepare data for pie chart
    const chartData = revenueData.map((item, index) => ({
      name: item.category,
      y: item.revenue,
      color: colors[index % colors.length],
    }));

    // Check if dark mode
    const isDarkMode = document.documentElement.classList.contains("dark");

    const chart = Highcharts.chart(chartRef.current, {
      chart: {
        type: "pie",
        options3d: {
          enabled: true,
          alpha: 45,
          beta: 0,
        },
        backgroundColor: "transparent",
        height: 300,
      },
      title: {
        text: "",
      },
      credits: {
        enabled: false,
      },
      accessibility: {
        point: {
          valueSuffix: "%",
        },
      },
      tooltip: {
        pointFormat: "<b>₹{point.y:,.0f}</b> ({point.percentage:.1f}%)",
        backgroundColor: isDarkMode ? "#374151" : "#ffffff",
        borderColor: isDarkMode ? "#4B5563" : "#E5E7EB",
        style: {
          color: isDarkMode ? "#F3F4F6" : "#1F2937",
        },
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          depth: 35,
          innerSize: "40%", // Donut style
          dataLabels: {
            enabled: true,
            format: "<b>{point.name}</b>: {point.percentage:.0f}%",
            style: {
              color: isDarkMode ? "#E5E7EB" : "#374151",
              fontSize: "11px",
              fontWeight: "500",
              textOutline: "none",
            },
          },
          colors: colors,
        },
      },
      series: [
        {
          type: "pie",
          name: "Revenue",
          data: chartData,
        },
      ],
    });

    return () => {
      chart.destroy();
    };
  }, [revenueData, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <SwadeshiLoader
          loadingText="loading"
          words={["revenue", "charts", "data"]}
          size={100}
        />
      </div>
    );
  }

  if (!revenueData || revenueData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium">No revenue data available</p>
          <p className="text-sm">
            Complete some orders to see category breakdown
          </p>
        </div>
      </div>
    );
  }

  return <div ref={chartRef} className="w-full h-[300px]" />;
};

export default RevenuePieChart;
