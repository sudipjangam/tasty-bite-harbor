import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import { Options } from "highcharts";
import { UniversalChart } from "@/components/ui/universal-chart";
import { CHART_COLORS, TimePeriod } from "@/utils/chartUtils";
import { subDays, subYears, startOfDay, parseISO, isAfter } from "date-fns";
import { BarChart3, Table } from "lucide-react";

interface CategoryDataItem {
  name: string;
  value: number;
  percentage: number;
}

interface RevenueByCategoryChartProps {
  data: CategoryDataItem[];
  orders?: any[];
  menuItems?: any[];
}

// Pie chart colors
const PIE_COLORS = [
  "#8b5cf6", // Violet
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

const RevenueByCategoryChart = ({
  data,
  orders = [],
  menuItems = [],
}: RevenueByCategoryChartProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30d");
  const [showTable, setShowTable] = useState(false);

  // Filter orders by time period and recalculate category data
  const filteredCategoryData = useMemo(() => {
    // If no orders provided, use the pre-calculated data
    if (!orders || orders.length === 0) {
      return data;
    }

    const now = new Date();
    let startDate: Date;

    switch (timePeriod) {
      case "1d":
        startDate = startOfDay(now);
        break;
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subDays(now, 90);
        break;
      case "1y":
        startDate = subYears(now, 1);
        break;
      case "all":
      default:
        startDate = new Date(0); // Beginning of time
    }

    // Filter orders by time period
    const filteredOrders = orders.filter((order) => {
      const orderDate = order.created_at ? new Date(order.created_at) : null;
      return orderDate && isAfter(orderDate, startDate);
    });

    // Calculate category revenue from filtered orders
    const categoryStats: { [key: string]: number } = {};
    let totalRevenue = 0;

    filteredOrders.forEach((order) => {
      const items = Array.isArray(order.items)
        ? order.items
        : order.items
        ? JSON.parse(order.items)
        : [];

      items.forEach((item: any) => {
        const menuItem = menuItems?.find(
          (mi) => mi.id === item.id || mi.name === item.name
        );
        const category = menuItem?.category || "Other";
        const quantity = item.quantity || 1;
        const price = item.price || menuItem?.price || 0;
        const revenue = quantity * price;

        categoryStats[category] = (categoryStats[category] || 0) + revenue;
        totalRevenue += revenue;
      });
    });

    // If no categories found after filtering, return original data
    if (Object.keys(categoryStats).length === 0) {
      return data;
    }

    return Object.entries(categoryStats)
      .map(([name, value]) => ({
        name,
        value,
        percentage:
          totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [orders, menuItems, timePeriod, data]);

  // Chart data
  const chartData = filteredCategoryData.map((item, index) => ({
    name: item.name,
    y: item.value,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));

  const options: Options = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
    },
    title: { text: undefined },
    plotOptions: {
      pie: {
        innerSize: "50%",
        borderWidth: 0,
        dataLabels: {
          enabled: false,
        },
        showInLegend: true,
      },
    },
    legend: {
      align: "center",
      verticalAlign: "bottom",
      layout: "horizontal",
      itemStyle: {
        color: isDarkMode ? "#e2e8f0" : "#334155",
        fontWeight: "500",
      },
    },
    tooltip: {
      pointFormat: "<b>₹{point.y:,.0f}</b> ({point.percentage:.1f}%)",
    },
    series: [
      {
        name: "Revenue",
        type: "pie",
        data: chartData,
      },
    ],
  };

  const timePeriods: { value: TimePeriod; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "1y", label: "1Y" },
  ];

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-medium">
            Revenue by Menu Category
          </CardTitle>
          <CardDescription>
            Distribution of revenue across menu categories
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {/* Chart/Table Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button
              className={`p-1.5 rounded transition-all ${
                !showTable
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "text-gray-500 dark:text-gray-400"
              }`}
              onClick={() => setShowTable(false)}
              title="Chart View"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              className={`p-1.5 rounded transition-all ${
                showTable
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "text-gray-500 dark:text-gray-400"
              }`}
              onClick={() => setShowTable(true)}
              title="Table View"
            >
              <Table className="h-4 w-4" />
            </button>
          </div>

          {/* Time period selector */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {timePeriods.map((period) => (
              <button
                key={period.value}
                className={`px-2 py-1 rounded text-xs font-medium uppercase transition-colors ${
                  timePeriod === period.value
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                onClick={() => setTimePeriod(period.value)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {!showTable ? (
          <div className="h-[280px]">
            {filteredCategoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available for the selected time period
              </div>
            ) : (
              <UniversalChart options={options} />
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[280px]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-muted z-10">
                <tr>
                  <th className="p-3 text-left font-medium">Category</th>
                  <th className="p-3 text-right font-medium">Revenue</th>
                  <th className="p-3 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategoryData.map((item, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}
                  >
                    <td className="p-3 flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      {item.name}
                    </td>
                    <td className="p-3 text-right">
                      ₹{item.value.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueByCategoryChart;
