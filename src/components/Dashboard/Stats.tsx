import { useState } from "react";
import { TrendingUp, Users, ShoppingBag, DollarSign } from "lucide-react";
import { useStatsData } from "@/hooks/useStatsData";
import { formatIndianCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from "./StatCard";
import StatDetails from "./StatDetails";
import { NCStatsCard } from "./NCStatsCard";

const Stats = () => {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const { data: statsData, isLoading } = useStatsData();

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 bg-card rounded-lg border">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Get all revenue sources
  const allRevenueSources = statsData?.allRevenueSources || [];
  const orders = statsData?.orders || [];

  const getActualRevenue = (item: any) => {
    // Note: order.total already stores the final discounted amount
    // Do NOT subtract discount_amount again (it was already applied when saving)
    return Number(item.total) || 0;
  };

  const completedRevenue = allRevenueSources.filter(
    (item) =>
      (item.status === "completed" ||
        item.status === "paid" ||
        item.status === "ready") &&
      item.order_type !== "non-chargeable", // Exclude non-chargeable orders from revenue
  );
  const totalSales = completedRevenue.reduce(
    (sum, item) => sum + getActualRevenue(item),
    0,
  );

  // Define today first so it can be used for filtering
  const today = new Date().toDateString();

  const activeOrdersList = orders.filter((order) => {
    const isToday = new Date(order.created_at).toDateString() === today;
    const isActive = ["pending", "preparing", "ready", "held"].includes(
      order.status,
    );
    return isToday && isActive;
  });

  const activeOrdersCount = activeOrdersList.length || 0;

  const uniqueCustomers =
    orders.length > 0
      ? new Set(orders.map((order) => order.customer_name).filter(Boolean)).size
      : 0;

  const todaysRevenue = completedRevenue
    .filter((item) => new Date(item.created_at).toDateString() === today)
    .reduce((sum, item) => sum + getActualRevenue(item), 0);

  // Helper to group revenue by month
  const getMonthlyRevenue = (data: any[]) => {
    const grouped = data.reduce((acc: any, item) => {
      const date = new Date(item.created_at);
      // Use full month name + year for uniqueness and clarity, or just month if preferred.
      // User asked for "jan, feb, march etc". Let's use short month name.
      // To ensure correct sorting, we store timestamp.
      const monthKey = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      const key = `${monthKey} ${year}`;

      if (!acc[key]) {
        acc[key] = {
          date: key,
          amount: 0,
          // Use the first day of the month for sorting purposes
          timestamp: new Date(year, date.getMonth(), 1).getTime(),
        };
      }
      acc[key].amount += getActualRevenue(item);
      return acc;
    }, {});

    return Object.values(grouped).sort(
      (a: any, b: any) => a.timestamp - b.timestamp,
    );
  };

  // ===== DYNAMIC TREND CALCULATIONS =====
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  // Current month and previous month boundaries
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // 1. Total Sales Trend: This month vs last month
  const thisMonthSales = completedRevenue
    .filter((item) => new Date(item.created_at) >= currentMonthStart)
    .reduce((sum, item) => sum + getActualRevenue(item), 0);

  const lastMonthSales = completedRevenue
    .filter((item) => {
      const date = new Date(item.created_at);
      return date >= previousMonthStart && date <= previousMonthEnd;
    })
    .reduce((sum, item) => sum + getActualRevenue(item), 0);

  const salesTrendPercent =
    lastMonthSales > 0
      ? (((thisMonthSales - lastMonthSales) / lastMonthSales) * 100).toFixed(1)
      : thisMonthSales > 0
        ? "+100"
        : "0";
  const salesTrend = `${
    Number(salesTrendPercent) >= 0 ? "+" : ""
  }${salesTrendPercent}%`;

  // 2. Active Orders Trend: Today vs yesterday
  const yesterdaysActiveOrders = orders.filter((order) => {
    const isYesterday =
      new Date(order.created_at).toDateString() === yesterdayStr;
    const isActive = ["pending", "preparing", "ready", "held"].includes(
      order.status,
    );
    return isYesterday && isActive;
  }).length;

  const ordersDiff = activeOrdersCount - yesterdaysActiveOrders;
  const ordersTrend = `${ordersDiff >= 0 ? "+" : ""}${ordersDiff}`;

  // 3. Customers Trend: This month's unique customers vs last month
  const thisMonthCustomers = new Set(
    orders
      .filter((order) => new Date(order.created_at) >= currentMonthStart)
      .map((order) => order.customer_name)
      .filter(Boolean),
  ).size;

  const lastMonthCustomers = new Set(
    orders
      .filter((order) => {
        const date = new Date(order.created_at);
        return date >= previousMonthStart && date <= previousMonthEnd;
      })
      .map((order) => order.customer_name)
      .filter(Boolean),
  ).size;

  const customersDiff = thisMonthCustomers - lastMonthCustomers;
  const customersTrend = `${customersDiff >= 0 ? "+" : ""}${customersDiff}`;

  // 4. Today's Revenue Trend: Today vs yesterday
  const yesterdaysRevenue = completedRevenue
    .filter((item) => new Date(item.created_at).toDateString() === yesterdayStr)
    .reduce((sum, item) => sum + getActualRevenue(item), 0);

  const revenueTrendPercent =
    yesterdaysRevenue > 0
      ? (
          ((todaysRevenue - yesterdaysRevenue) / yesterdaysRevenue) *
          100
        ).toFixed(1)
      : todaysRevenue > 0
        ? "+100"
        : "0";
  const revenueTrend = `${
    Number(revenueTrendPercent) >= 0 ? "+" : ""
  }${revenueTrendPercent}%`;

  // Generate sparkline data from last 7 days of revenue
  const getLast7DaysSpark = () => {
    const spark: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const dayTotal = completedRevenue
        .filter((item) => new Date(item.created_at).toDateString() === dayStr)
        .reduce((sum, item) => sum + getActualRevenue(item), 0);
      spark.push(dayTotal);
    }
    return spark;
  };

  // Generate sparkline for orders (last 7 days count)
  const getLast7DaysOrdersSpark = () => {
    const spark: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const dayCount = orders.filter(
        (order) => new Date(order.created_at).toDateString() === dayStr
      ).length;
      spark.push(dayCount);
    }
    return spark;
  };

  // Generate sparkline for customers (last 7 days unique)
  const getLast7DaysCustomersSpark = () => {
    const spark: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const dayCustomers = new Set(
        orders
          .filter((order) => new Date(order.created_at).toDateString() === dayStr)
          .map((order) => order.customer_name)
          .filter(Boolean)
      ).size;
      spark.push(dayCustomers);
    }
    return spark;
  };

  // Hourly revenue sparkline for today
  const getTodayHourlySpark = () => {
    const spark: number[] = [];
    const currentHour = new Date().getHours();
    for (let h = Math.max(0, currentHour - 7); h <= currentHour; h++) {
      const hourTotal = completedRevenue
        .filter((item) => {
          const d = new Date(item.created_at);
          return d.toDateString() === today && d.getHours() === h;
        })
        .reduce((sum, item) => sum + getActualRevenue(item), 0);
      spark.push(hourTotal);
    }
    return spark;
  };

  const stats = [
    {
      title: "Total Sales (30d)",
      value: formatIndianCurrency(totalSales).formatted,
      icon: DollarSign,
      trend: salesTrend,
      color: "text-emerald-600 dark:text-emerald-400",
      gradient: "from-emerald-500 via-teal-500 to-cyan-600",
      shadow: "shadow-emerald-500/20",
      type: "sales" as const,
      // Use monthly aggregation for Sales chart
      chart: getMonthlyRevenue(completedRevenue),
      sparklineData: getLast7DaysSpark(),
    },
    {
      title: "Active Orders",
      value: activeOrdersCount.toString(),
      icon: ShoppingBag,
      trend: ordersTrend,
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 via-indigo-500 to-violet-600",
      shadow: "shadow-blue-500/20",
      type: "orders" as const,
      data: activeOrdersList,
      sparklineData: getLast7DaysOrdersSpark(),
    },
    {
      title: "Customers (30d)",
      value: uniqueCustomers.toString(),
      icon: Users,
      trend: customersTrend,
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
      shadow: "shadow-purple-500/20",
      type: "customers" as const,
      data: orders.map((order) => ({
        name: order.customer_name,
        orders: 1,
        total: order.total,
      })),
      sparklineData: getLast7DaysCustomersSpark(),
    },
    {
      title: "Today's Revenue",
      value: formatIndianCurrency(todaysRevenue).formatted,
      icon: TrendingUp,
      trend: revenueTrend,
      color: "text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500 via-amber-500 to-rose-500",
      shadow: "shadow-orange-500/20",
      type: "revenue" as const,
      chart: completedRevenue
        .filter((item) => new Date(item.created_at).toDateString() === today)
        .map((item) => ({
          time: new Date(item.created_at).toLocaleTimeString(),
          amount: getActualRevenue(item),
        })),
      sparklineData: getTodayHourlySpark(),
    },
  ];

  const selectedStatData = selectedStat
    ? stats.find((stat) => stat.title === selectedStat)
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            color={stat.color}
            gradient={stat.gradient}
            shadow={stat.shadow}
            onClick={() => setSelectedStat(stat.title)}
            index={index}
            sparklineData={stat.sparklineData}
          />
        ))}
      </div>

      {/* NC Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <NCStatsCard />
      </div>

      {selectedStatData && (
        <StatDetails
          title={selectedStat}
          data={selectedStatData}
          type={selectedStatData.type}
          onClose={() => setSelectedStat(null)}
        />
      )}
    </div>
  );
};

export default Stats;
