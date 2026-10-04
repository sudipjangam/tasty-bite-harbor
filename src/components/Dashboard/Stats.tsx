import { useState, useMemo, useEffect } from "react";
import { TrendingUp, Users, ShoppingBag, DollarSign, Calendar, Clock } from "lucide-react";
import { useStatsData } from "@/hooks/useStatsData";
import { formatIndianCurrency } from "@/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays } from "date-fns";
import StatCard from "./StatCard";
import StatDetails from "./StatDetails";
import { NCStatsCard } from "./NCStatsCard";

export type StatsPeriod = "month" | "30d";

interface StatsProps {
  period?: StatsPeriod;
  onPeriodChange?: (period: StatsPeriod) => void;
}

const Stats = ({ period: externalPeriod, onPeriodChange }: StatsProps) => {
  const [internalPeriod, setInternalPeriod] = useState<StatsPeriod>(() => {
    return (localStorage.getItem("dashboard_stats_period") as StatsPeriod) || "month";
  });
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const { data: statsData, isLoading } = useStatsData();

  const activePeriod = externalPeriod || internalPeriod;

  const handlePeriodChange = (newPeriod: StatsPeriod) => {
    setInternalPeriod(newPeriod);
    localStorage.setItem("dashboard_stats_period", newPeriod);
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    }
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-6 bg-card rounded-2xl border">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Get all revenue sources
  const allRevenueSources = statsData?.allRevenueSources || [];
  const orders = statsData?.orders || [];

  const getActualRevenue = (item: any) => {
    return Number(item.total) || 0;
  };

  const completedRevenue = allRevenueSources.filter(
    (item) =>
      (item.status === "completed" ||
        item.status === "paid" ||
        item.status === "ready") &&
      item.order_type !== "non-chargeable",
  );

  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const dayOfMonth = now.getDate();
  const currentMonthShort = now.toLocaleString("default", { month: "short" });

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const thirtyDaysAgo = subDays(now, 30);
  const sixtyDaysAgo = subDays(now, 60);

  // Explicit date range strings
  const monthDateRangeText = `${formatShortDate(currentMonthStart)} – ${formatShortDate(now)}`;
  const thirtyDaysDateRangeText = `${formatShortDate(thirtyDaysAgo)} – ${formatShortDate(now)}`;

  const isMonth = activePeriod === "month";
  const activeDateRangeText = isMonth ? monthDateRangeText : thirtyDaysDateRangeText;

  // 1. Total Sales based on selected period
  const periodRevenueItems = completedRevenue.filter((item) => {
    const d = new Date(item.created_at);
    return isMonth ? d >= currentMonthStart : d >= thirtyDaysAgo;
  });

  const totalSales = periodRevenueItems.reduce(
    (sum, item) => sum + getActualRevenue(item),
    0,
  );

  // Trend calculation: apples-to-apples comparison
  let salesTrendPercent = "0";
  if (isMonth) {
    // Compare day 1 to day D of current month vs day 1 to day D of previous month
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const prevMonthSameDayEnd = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      dayOfMonth,
      now.getHours(),
      now.getMinutes(),
      59,
      999,
    );

    const prevMonthSamePeriodSales = completedRevenue
      .filter((item) => {
        const d = new Date(item.created_at);
        return d >= prevMonthStart && d <= prevMonthSameDayEnd;
      })
      .reduce((sum, item) => sum + getActualRevenue(item), 0);

    if (prevMonthSamePeriodSales > 0) {
      salesTrendPercent = (
        ((totalSales - prevMonthSamePeriodSales) / prevMonthSamePeriodSales) *
        100
      ).toFixed(1);
    } else if (totalSales > 0) {
      salesTrendPercent = "+100";
    }
  } else {
    // Compare last 30 days vs prior 30 days (day 31-60 ago)
    const prior30dSales = completedRevenue
      .filter((item) => {
        const d = new Date(item.created_at);
        return d >= sixtyDaysAgo && d < thirtyDaysAgo;
      })
      .reduce((sum, item) => sum + getActualRevenue(item), 0);

    if (prior30dSales > 0) {
      salesTrendPercent = (
        ((totalSales - prior30dSales) / prior30dSales) *
        100
      ).toFixed(1);
    } else if (totalSales > 0) {
      salesTrendPercent = "+100";
    }
  }

  const salesTrend = `${Number(salesTrendPercent) >= 0 ? "+" : ""}${salesTrendPercent}%`;

  // 2. Active Orders: All orders in pending/preparing/ready/held right now (NO isToday filter!)
  const activeOrdersList = orders.filter((order) =>
    ["pending", "preparing", "ready", "held"].includes(order.status),
  );
  const activeOrdersCount = activeOrdersList.length || 0;

  // Active orders trend: Active now vs yesterday's count
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

  // 3. Customers: Unique customer names for selected period
  const periodOrders = orders.filter((order) => {
    const d = new Date(order.created_at);
    return isMonth ? d >= currentMonthStart : d >= thirtyDaysAgo;
  });

  const uniqueCustomers =
    periodOrders.length > 0
      ? new Set(periodOrders.map((order) => order.customer_name).filter(Boolean)).size
      : 0;

  const prevPeriodCustomers = isMonth
    ? new Set(
        orders
          .filter((order) => {
            const d = new Date(order.created_at);
            const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, dayOfMonth, 23, 59, 59);
            return d >= prevMonthStart && d <= prevMonthEnd;
          })
          .map((order) => order.customer_name)
          .filter(Boolean),
      ).size
    : new Set(
        orders
          .filter((order) => {
            const d = new Date(order.created_at);
            return d >= sixtyDaysAgo && d < thirtyDaysAgo;
          })
          .map((order) => order.customer_name)
          .filter(Boolean),
      ).size;

  const customersDiff = uniqueCustomers - prevPeriodCustomers;
  const customersTrend = `${customersDiff >= 0 ? "+" : ""}${customersDiff}`;

  // 4. Today's Revenue
  const todaysRevenue = completedRevenue
    .filter((item) => new Date(item.created_at).toDateString() === today)
    .reduce((sum, item) => sum + getActualRevenue(item), 0);

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

  // Daily revenue chart helper for current month or last 30 days
  const getDailyRevenue = (data: any[], startDate: Date) => {
    const grouped: { [key: string]: { date: string; amount: number; timestamp: number } } = {};
    data.forEach((item) => {
      const d = new Date(item.created_at);
      if (d >= startDate) {
        const key = d.toLocaleDateString("default", { month: "short", day: "numeric" });
        if (!grouped[key]) {
          grouped[key] = {
            date: key,
            amount: 0,
            timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
          };
        }
        grouped[key].amount += getActualRevenue(item);
      }
    });

    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);
  };

  // Sparkline data
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

  const getLast7DaysOrdersSpark = () => {
    const spark: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const dayCount = orders.filter(
        (order) => new Date(order.created_at).toDateString() === dayStr,
      ).length;
      spark.push(dayCount);
    }
    return spark;
  };

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
          .filter(Boolean),
      ).size;
      spark.push(dayCustomers);
    }
    return spark;
  };

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
      title: "Total Sales",
      subtitle: activeDateRangeText,
      value: formatIndianCurrency(totalSales).formatted,
      icon: DollarSign,
      trend: salesTrend,
      color: "text-emerald-600 dark:text-emerald-400",
      gradient: "from-emerald-500 via-teal-500 to-cyan-600",
      shadow: "shadow-emerald-500/20",
      type: "sales" as const,
      chart: getDailyRevenue(completedRevenue, isMonth ? currentMonthStart : thirtyDaysAgo),
      sparklineData: getLast7DaysSpark(),
    },
    {
      title: "Active Orders",
      subtitle: "In kitchen / open",
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
      title: "Customers",
      subtitle: activeDateRangeText,
      value: uniqueCustomers.toString(),
      icon: Users,
      trend: customersTrend,
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
      shadow: "shadow-purple-500/20",
      type: "customers" as const,
      data: periodOrders.map((order) => ({
        name: order.customer_name,
        orders: 1,
        total: order.total,
      })),
      sparklineData: getLast7DaysCustomersSpark(),
    },
    {
      title: "Today's Revenue",
      subtitle: "Today so far",
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
    ? stats.find((stat) => stat.type === selectedStat || stat.title === selectedStat)
    : null;

  return (
    <div className="space-y-5">
      {/* Time range selector bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-gray-800/90 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-gray-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => handlePeriodChange("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
              isMonth
                ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-gray-400 hover:dark:text-gray-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Current Month</span>
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("30d")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
              !isMonth
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 hover:text-slate-900 dark:text-gray-400 hover:dark:text-gray-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Last 30 Days</span>
          </button>
        </div>

        <div className="text-xs font-medium text-slate-500 dark:text-gray-400">
          Showing: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeDateRangeText}</span>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            subtitle={stat.subtitle}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            color={stat.color}
            gradient={stat.gradient}
            shadow={stat.shadow}
            onClick={() => setSelectedStat(stat.type)}
            index={index}
            sparklineData={stat.sparklineData}
          />
        ))}
      </div>

      {/* NC Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <NCStatsCard
          startDate={isMonth ? currentMonthStart : thirtyDaysAgo}
          endDate={now}
          periodLabel={isMonth ? `This Month (${currentMonthShort})` : "Last 30 Days"}
        />
      </div>

      {selectedStatData && (
        <StatDetails
          title={selectedStatData.title}
          data={selectedStatData}
          type={selectedStatData.type}
          onClose={() => setSelectedStat(null)}
        />
      )}
    </div>
  );
};

export default Stats;
