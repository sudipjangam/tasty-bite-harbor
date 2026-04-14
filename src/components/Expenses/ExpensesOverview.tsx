import React from "react";
import { useExpenseData } from "@/hooks/useExpenseData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Trash2,
  Star,
  BarChart3,
  Search,
  Calendar,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Megaphone,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

const COLORS = [
  "#6366f1", "#059669", "#d97706", "#e11d48", "#0284c7",
  "#7c3aed", "#a21caf", "#84cc16",
];

const ExpensesOverview = () => {
  const { data: expenseData, isLoading } = useExpenseData();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { restaurantId } = useRestaurantId();

  // Previous month total for trend
  const { data: prevMonthTotal = 0 } = useQuery({
    queryKey: ["prev-month-expenses", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      const prevMonth = subMonths(new Date(), 1);
      const start = format(startOfMonth(prevMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(prevMonth), "yyyy-MM-dd");
      const { data } = await supabase
        .from("expenses")
        .select("amount")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", start)
        .lte("expense_date", end);
      return (data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    },
    enabled: !!restaurantId,
  });

  // Fetch recent expenses for table
  const { data: recentExpenses = [] } = useQuery({
    queryKey: ["recent-expenses-overview", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("expense_date", { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: !!restaurantId,
  });

  const isDark = document.documentElement.classList.contains("dark");

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalExpenses = expenseData?.totalExpenses || 0;
  const monthlyExpenses = expenseData?.totalMonthlyExpenses || 0;
  const inventoryConsumption = expenseData?.inventoryConsumption || 0;
  const inventoryWastage = expenseData?.inventoryWastage || 0;
  const wastageCount = expenseData?.wastageCount || 0;
  const avgDaily = monthlyExpenses / 30;
  const breakdownData = expenseData?.expenseBreakdown || [];
  const topCategory = breakdownData.reduce(
    (max: any, curr: any) => (curr.value > max.value ? curr : max),
    { name: "None", value: 0 },
  );
  const trendData = expenseData?.expenseTrendData || [];

  const trendPercentage =
    prevMonthTotal > 0
      ? Math.round(((monthlyExpenses - prevMonthTotal) / prevMonthTotal) * 100 * 10) / 10
      : 0;
  const isUp = trendPercentage > 0;
  const hasPrev = prevMonthTotal > 0;

  // Budget placeholder (total = sum of all expenses * 1.2 as example budget)
  const totalBudget = monthlyExpenses > 0 ? Math.ceil(monthlyExpenses * 1.2 / 1000) * 1000 : 50000;
  const budgetUsedPct = totalBudget > 0 ? Math.min(100, Math.round((monthlyExpenses / totalBudget) * 100)) : 0;
  const budgetRemaining = Math.max(0, totalBudget - monthlyExpenses);

  // ── Chart configs ──

  const areaChartOptions: Highcharts.Options = {
    chart: {
      type: "area",
      height: 220,
      backgroundColor: "transparent",
      style: { fontFamily: "'Sora', sans-serif" },
    },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: trendData.map((d: any) => format(new Date(d.date), "MMM dd")),
      labels: { style: { color: isDark ? "#5c6191" : "#94a3b8", fontSize: "10px" } },
      lineColor: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
      tickColor: "transparent",
    },
    yAxis: {
      title: { text: undefined },
      labels: {
        formatter: function () {
          const val = Number(this.value);
          return `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;
        },
        style: { color: isDark ? "#5c6191" : "#94a3b8", fontSize: "10px" },
      },
      gridLineColor: isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9",
    },
    tooltip: {
      backgroundColor: isDark ? "rgba(18,20,42,0.95)" : "rgba(255,255,255,0.95)",
      borderColor: isDark ? "rgba(99,102,241,0.3)" : "#e2e8f0",
      borderWidth: 1,
      borderRadius: 10,
      shadow: true,
      useHTML: true,
      formatter: function (this: any) {
        const idx = this.point?.index ?? 0;
        const d = trendData[idx];
        return `<div style="padding:6px 10px;font-family:inherit;">
          <div style="font-weight:700;color:${isDark ? "#fff" : "#1e293b"};font-size:12px;">${d ? format(new Date(d.date), "MMM dd, yyyy") : ""}</div>
          <div style="color:${isDark ? "#9196c0" : "#64748b"};font-size:11px;margin-top:2px;">Amount: <span style="font-weight:700;color:#6366f1;">${currencySymbol}${Number(this.y).toLocaleString()}</span></div>
        </div>`;
      },
    },
    legend: { enabled: false },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
          stops: [
            [0, "rgba(99,102,241,0.30)"],
            [1, "rgba(99,102,241,0)"],
          ],
        },
        lineWidth: 2.5,
        marker: { enabled: false, states: { hover: { enabled: true, radius: 5 } } },
      },
    },
    series: [
      {
        type: "area",
        name: "Expenses",
        data: trendData.map((d: any) => d.amount),
        color: "#6366f1",
      },
    ],
  };

  const pieChartOptions: Highcharts.Options = {
    chart: {
      type: "pie",
      height: 180,
      backgroundColor: "transparent",
      style: { fontFamily: "'Sora', sans-serif" },
    },
    title: { text: undefined },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: isDark ? "rgba(18,20,42,0.95)" : "rgba(255,255,255,0.95)",
      borderColor: isDark ? "rgba(99,102,241,0.3)" : "#e2e8f0",
      borderWidth: 1,
      borderRadius: 10,
      shadow: true,
      useHTML: true,
      formatter: function (this: any) {
        return `<div style="padding:6px 10px;font-family:inherit;">
          <div style="font-weight:700;color:${isDark ? "#fff" : "#1e293b"};font-size:12px;">${this.point?.name}</div>
          <div style="color:${isDark ? "#9196c0" : "#64748b"};font-size:11px;margin-top:2px;">${currencySymbol}${Number(this.y).toLocaleString()}</div>
        </div>`;
      },
    },
    plotOptions: {
      pie: {
        innerSize: "72%",
        borderWidth: 3,
        borderColor: isDark ? "#0d0e1a" : "#ffffff",
        dataLabels: { enabled: false },
        showInLegend: false,
        states: { hover: { brightness: 0.1, halo: { size: 8 } } },
      },
    },
    series: [
      {
        type: "pie",
        name: "Category",
        data: breakdownData.map((item: any, index: number) => ({
          name: item.name,
          y: item.value,
          color: COLORS[index % COLORS.length],
        })),
      },
    ],
  };

  // ── Category helpers ──
  const getCategoryEmoji = (cat: string) => {
    const map: Record<string, string> = {
      staff_salary: "💼", groceries: "📦", ingredients: "📦", utilities: "⚡",
      rent: "🏠", equipment: "🔧", marketing: "📣", maintenance: "🛠️",
      inventory_consumption: "📦", inventory_wastage: "🗑️", other: "📋",
    };
    return map[cat] || "📋";
  };
  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      staff_salary: "Salaries", groceries: "Groceries", ingredients: "Inventory",
      utilities: "Utilities", rent: "Rent", equipment: "Equipment",
      marketing: "Marketing", maintenance: "Maintenance", other: "Other",
    };
    return map[cat] || cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };
  const getCategoryPillClass = (cat: string) => {
    const map: Record<string, string> = {
      staff_salary: "bg-indigo-500/15 dark:bg-indigo-500/18 text-indigo-400 dark:text-indigo-300",
      groceries: "bg-emerald-500/15 dark:bg-emerald-500/18 text-emerald-500 dark:text-emerald-300",
      ingredients: "bg-emerald-500/15 dark:bg-emerald-500/18 text-emerald-500 dark:text-emerald-300",
      utilities: "bg-amber-500/15 dark:bg-amber-500/18 text-amber-600 dark:text-amber-300",
      rent: "bg-sky-500/15 dark:bg-sky-500/18 text-sky-600 dark:text-sky-300",
      marketing: "bg-rose-500/15 dark:bg-rose-500/18 text-rose-500 dark:text-rose-300",
      other: "bg-gray-500/15 dark:bg-gray-500/18 text-gray-500 dark:text-gray-400",
    };
    return map[cat] || map.other;
  };
  const getStatusClass = (status: string) => {
    if (status === "paid") return "bg-green-500/12 dark:bg-green-500/12 text-green-500 dark:text-green-400";
    if (status === "pending") return "bg-amber-500/12 dark:bg-amber-500/12 text-amber-500 dark:text-amber-400";
    if (status === "overdue") return "bg-red-500/12 dark:bg-red-500/12 text-red-500 dark:text-red-400";
    return "bg-gray-500/12 text-gray-500";
  };

  // ── Smart alerts ──
  const alerts: { icon: React.ReactNode; text: string; time: string; type: string }[] = [];
  if (budgetUsedPct >= 80) {
    alerts.push({
      icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
      text: `Budget at ${budgetUsedPct}%. ${currencySymbol}${budgetRemaining.toLocaleString()} remaining.`,
      time: "Now",
      type: "warn",
    });
  }
  alerts.push({
    icon: <Lightbulb className="h-4 w-4 text-indigo-400" />,
    text: `Daily avg expense is ${currencySymbol}${Math.round(avgDaily).toLocaleString()}. On track to hit ${currencySymbol}${monthlyExpenses.toLocaleString()} this month.`,
    time: "Today",
    type: "info",
  });
  if (inventoryConsumption < totalBudget * 0.1) {
    alerts.push({
      icon: <CheckCircle2 className="h-4 w-4 text-green-400" />,
      text: `Inventory costs well under budget — good efficiency this month.`,
      time: format(new Date(), "MMM dd"),
      type: "ok",
    });
  }
  if (wastageCount > 0) {
    alerts.push({
      icon: <Trash2 className="h-4 w-4 text-amber-400" />,
      text: `${wastageCount} wastage entries recorded this month totaling ${currencySymbol}${inventoryWastage.toLocaleString()}.`,
      time: format(new Date(), "MMM dd"),
      type: "warn",
    });
  }

  return (
    <div className="space-y-3 md:space-y-5">

      {/* ══════════════ HERO CARDS ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {/* Last 30 Days */}
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl p-3.5 md:p-5 bg-gradient-to-br from-indigo-900 via-indigo-700 to-indigo-500 dark:from-indigo-900 dark:via-indigo-800 dark:to-indigo-600 shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/30 hover:-translate-y-1 transition-transform duration-300 cursor-default">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/7" />
          <div className="absolute right-8 -bottom-8 w-16 h-16 rounded-full bg-white/5" />
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/60 mb-2 relative z-10">Last 30 Days</p>
          <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono relative z-10">
            {currencySymbol}{totalExpenses.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 md:mt-2 text-xs md:text-sm relative z-10">
            {hasPrev ? (
              <>
                {isUp ? <ArrowUpRight className="h-3.5 w-3.5 text-green-300" /> : <ArrowDownRight className="h-3.5 w-3.5 text-green-300" />}
                <span className={isUp ? "text-red-300" : "text-green-300"}>
                  {isUp ? "+" : ""}{trendPercentage}%
                </span>
                <span className="text-white/50">vs previous period</span>
              </>
            ) : (
              <span className="text-white/40">No previous period data</span>
            )}
          </div>
          <div className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-xl bg-white/15 flex items-center justify-center text-base md:text-xl z-10">💰</div>
        </div>

        {/* This Month */}
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl p-3.5 md:p-5 bg-gradient-to-br from-violet-900 via-violet-700 to-violet-500 dark:from-violet-900 dark:via-violet-800 dark:to-purple-600 shadow-lg shadow-violet-500/20 dark:shadow-violet-500/30 hover:-translate-y-1 transition-transform duration-300 cursor-default">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/7" />
          <div className="absolute right-8 -bottom-8 w-16 h-16 rounded-full bg-white/5" />
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/60 mb-2 relative z-10">This Month</p>
          <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono relative z-10">
            {currencySymbol}{monthlyExpenses.toLocaleString()}
          </p>
          <p className="flex items-center gap-1.5 mt-2 text-sm text-white/50 relative z-10">Current billing period</p>
          <div className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-xl bg-white/15 flex items-center justify-center text-base md:text-xl z-10">📊</div>
        </div>

        {/* Categories Active */}
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl p-3.5 md:p-5 bg-gradient-to-br from-emerald-900 via-emerald-700 to-emerald-500 dark:from-emerald-900 dark:via-emerald-800 dark:to-teal-600 shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/30 hover:-translate-y-1 transition-transform duration-300 cursor-default">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/7" />
          <div className="absolute right-8 -bottom-8 w-16 h-16 rounded-full bg-white/5" />
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/60 mb-2 relative z-10">Categories Active</p>
          <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono relative z-10">{breakdownData.length}</p>
          <p className="flex items-center gap-1.5 mt-2 text-sm text-green-300 relative z-10">
            <CheckCircle2 className="h-3 w-3" /> All tracked
          </p>
          <div className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-xl bg-white/15 flex items-center justify-center text-base md:text-xl z-10">📋</div>
        </div>
      </div>

      {/* ══════════════ METRIC CARDS ══════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
        {/* Daily Average */}
        <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-white/[0.085] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="flex items-start justify-between mb-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-indigo-500/15 dark:bg-indigo-500/18 flex items-center justify-center text-sm">📅</div>
            {hasPrev && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${isUp ? "bg-red-500/12 text-red-400" : "bg-green-500/12 text-green-400"}`}>
                {isUp ? "▲" : "▼"} {Math.abs(trendPercentage)}%
              </span>
            )}
          </div>
          <p className="text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] mb-1">Daily Average</p>
          <p className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white font-mono tracking-tight">{currencySymbol}{Math.round(avgDaily).toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 dark:text-[#5c6191] mt-1">Per day spending</p>
          <div className="h-[3px] rounded-full bg-gray-100 dark:bg-white/[0.07] mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400" style={{ width: "60%" }} />
          </div>
        </div>

        {/* Inventory Used */}
        <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-white/[0.085] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="flex items-start justify-between mb-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-violet-500/15 dark:bg-violet-500/18 flex items-center justify-center text-sm">🏷️</div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono bg-gray-200/60 dark:bg-gray-500/15 text-gray-500 dark:text-gray-400">FIFO</span>
          </div>
          <p className="text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] mb-1">Inventory Used</p>
          <p className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white font-mono tracking-tight">{currencySymbol}{inventoryConsumption.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 dark:text-[#5c6191] mt-1">FIFO cost this month</p>
          <div className="h-[3px] rounded-full bg-gray-100 dark:bg-white/[0.07] mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400" style={{ width: `${Math.min(100, monthlyExpenses > 0 ? (inventoryConsumption / monthlyExpenses * 100) : 0)}%` }} />
          </div>
        </div>

        {/* Wastage Cost */}
        <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-white/[0.085] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="flex items-start justify-between mb-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-amber-500/15 dark:bg-amber-500/18 flex items-center justify-center text-sm">🗑️</div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono bg-red-500/12 text-red-400">{wastageCount} entries</span>
          </div>
          <p className="text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] mb-1">Wastage Cost</p>
          <p className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white font-mono tracking-tight">{currencySymbol}{inventoryWastage.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 dark:text-[#5c6191] mt-1">{wastageCount} waste entries this month</p>
          <div className="h-[3px] rounded-full bg-gray-100 dark:bg-white/[0.07] mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${Math.min(100, monthlyExpenses > 0 ? (inventoryWastage / monthlyExpenses * 100) : 0)}%` }} />
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-white/[0.085] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="flex items-start justify-between mb-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-rose-500/15 dark:bg-rose-500/18 flex items-center justify-center text-sm">⭐</div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono bg-green-500/12 text-green-400">Top</span>
          </div>
          <p className="text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] mb-1">Top Category</p>
          <p className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight truncate">{topCategory?.name || "None"}</p>
          <p className="text-[10px] text-gray-400 dark:text-[#5c6191] mt-1">{currencySymbol}{topCategory?.value?.toLocaleString() || 0} total</p>
          <div className="h-[3px] rounded-full bg-gray-100 dark:bg-white/[0.07] mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-400" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Budget Used */}
        <div className="col-span-2 sm:col-span-1 bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-white/[0.085] hover:-translate-y-0.5 transition-all duration-200 cursor-default">
          <div className="flex items-start justify-between mb-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-emerald-500/15 dark:bg-emerald-500/18 flex items-center justify-center text-sm">📈</div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono bg-green-500/12 text-green-400">▲ {budgetUsedPct}%</span>
          </div>
          <p className="text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] mb-1">Budget Used</p>
          <p className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white font-mono tracking-tight">{budgetUsedPct}%</p>
          <p className="text-[10px] text-gray-400 dark:text-[#5c6191] mt-1">{currencySymbol}{budgetRemaining.toLocaleString()} remaining</p>
          <div className="h-[3px] rounded-full bg-gray-100 dark:bg-white/[0.07] mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" style={{ width: `${budgetUsedPct}%` }} />
          </div>
        </div>
      </div>

      {/* ══════════════ CHARTS ROW ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Expense Trend */}
        <div className="lg:col-span-3 bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs">📉</div>
              <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Expense Trend</span>
            </div>
          </div>
          <HighchartsReact highcharts={Highcharts} options={areaChartOptions} />
          <div className="flex gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-[#5c6191]">
              <span className="w-3 h-[3px] rounded bg-indigo-500 inline-block" /> This month
            </span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs">🍩</div>
            <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Category Breakdown</span>
          </div>
          <HighchartsReact highcharts={Highcharts} options={pieChartOptions} />
          <div className="space-y-2 mt-4">
            {breakdownData.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {item.name}
                </span>
                <span className="font-mono font-bold text-gray-800 dark:text-white">
                  {currencySymbol}{item.value.toLocaleString()}{" "}
                  <span className="text-gray-400 dark:text-[#5c6191] font-normal">{item.percentage}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════ RECENT EXPENSES TABLE ══════════════ */}
      <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs">📄</div>
            <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-white tracking-tight">Recent Expenses</span>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-white/[0.025] border-b border-gray-100 dark:border-white/[0.06]">
                <th className="text-left text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] px-5 py-2.5">Date</th>
                <th className="text-left text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] px-5 py-2.5">Description</th>
                <th className="text-left text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] px-5 py-2.5">Category</th>
                <th className="text-left text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] px-5 py-2.5">Amount</th>
                <th className="text-left text-[9.5px] font-bold tracking-widest uppercase text-gray-400 dark:text-[#5c6191] px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-gray-400 dark:text-[#5c6191]">No expenses yet</td>
                </tr>
              ) : (
                recentExpenses.map((expense: any) => (
                  <tr key={expense.id} className="border-b border-gray-50 dark:border-white/[0.04] hover:bg-gray-50/50 dark:hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-3 text-xs text-gray-400 dark:text-[#5c6191]">
                      {format(new Date(expense.expense_date), "MMM dd")}
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-gray-700 dark:text-gray-200 max-w-[200px] truncate">
                      {expense.description || expense.subcategory || getCategoryLabel(expense.category)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getCategoryPillClass(expense.category)}`}>
                        {getCategoryEmoji(expense.category)} {getCategoryLabel(expense.category)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-mono font-bold text-red-500 dark:text-red-400">
                      −{currencySymbol}{expense.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${getStatusClass(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-white/[0.04]">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400 dark:text-[#5c6191]">No expenses yet</div>
          ) : (
            recentExpenses.slice(0, 5).map((expense: any) => {
              const desc = expense.description || expense.subcategory || getCategoryLabel(expense.category);
              const shortDesc = desc.length > 40 ? desc.substring(0, 40) + "..." : desc;
              return (
                <div key={expense.id} className="flex items-center justify-between px-3 py-2.5 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${getCategoryPillClass(expense.category)}`}>
                        {getCategoryEmoji(expense.category)} {getCategoryLabel(expense.category)}
                      </span>
                      <span className={`px-1.5 py-0 rounded text-[8px] font-bold capitalize ${getStatusClass(expense.status)}`}>
                        {expense.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-[#5c6191] truncate">
                      {format(new Date(expense.expense_date), "MMM dd")} · {shortDesc}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-red-500 dark:text-red-400 shrink-0">
                    −{currencySymbol}{expense.amount.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════ BOTTOM ROW ══════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">

        {/* Spend Distribution */}
        <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Spend Distribution</span>
            <span className="text-[10.5px] text-indigo-500 dark:text-indigo-400 cursor-pointer font-semibold hover:text-white transition-colors">View all</span>
          </div>
          <div className="space-y-3">
            {breakdownData.slice(0, 5).map((item: any, index: number) => {
              const pct = monthlyExpenses > 0 ? ((item.value / monthlyExpenses) * 100).toFixed(1) : "0";
              return (
                <div key={index} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white ml-2">{currencySymbol}{item.value.toLocaleString()}</span>
                    </div>
                    <div className="h-[2px] rounded bg-gray-100 dark:bg-white/[0.07] mt-1.5 overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-[#9196c0] w-10 text-right shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget Tracker */}
        <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Budget Tracker</span>
            <span className="text-[10.5px] text-indigo-500 dark:text-indigo-400 cursor-pointer font-semibold hover:text-white transition-colors">Configure</span>
          </div>
          <div className="space-y-4">
            {breakdownData.slice(0, 4).map((item: any, index: number) => {
              const itemBudget = Math.ceil(item.value * 1.15 / 1000) * 1000 || 5000;
              const usedPct = Math.min(100, Math.round((item.value / itemBudget) * 100));
              const barColor = usedPct >= 90 ? "from-red-500 to-rose-400" : usedPct >= 70 ? "from-amber-500 to-orange-400" : "from-emerald-500 to-green-400";
              const statusText = usedPct >= 90 ? `⚠ ${usedPct}% — near limit` : usedPct >= 70 ? `${usedPct}% used this month` : `✓ Well under budget`;
              const statusColor = usedPct >= 90 ? "text-red-400" : usedPct >= 70 ? "text-amber-400 dark:text-amber-300" : "text-green-400";
              return (
                <div key={index}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{item.name}</span>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-[#5c6191]">
                      {currencySymbol}{(item.value / 1000).toFixed(item.value >= 1000 ? 0 : 1)}k / {currencySymbol}{(itemBudget / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div className="h-[5px] rounded-full bg-gray-100 dark:bg-white/[0.08] mt-1.5 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`} style={{ width: `${usedPct}%` }} />
                  </div>
                  <p className={`text-[9.5px] mt-1 ${statusColor}`}>{statusText}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Smart Alerts */}
        <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-xl md:rounded-2xl p-3 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Smart Alerts</span>
            <span className="text-[10.5px] text-indigo-500 dark:text-indigo-400 cursor-pointer font-semibold hover:text-white transition-colors">View all</span>
          </div>
          <div className="space-y-1">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-2.5 py-2.5 border-b border-gray-100/60 dark:border-white/[0.04] last:border-0">
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                  alert.type === "warn" ? "bg-amber-500/15" : alert.type === "info" ? "bg-indigo-500/15" : "bg-green-500/15"
                }`}>
                  {alert.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-gray-700 dark:text-gray-200 leading-relaxed">{alert.text}</p>
                  <p className="text-[9.5px] text-gray-400 dark:text-[#5c6191] mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesOverview;
