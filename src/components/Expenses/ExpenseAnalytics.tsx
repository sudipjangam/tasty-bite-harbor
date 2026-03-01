import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpenseData } from "@/hooks/useExpenseData";
import {
  BarChart3,
  TrendingUp,
  Store,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ExpenseAnalytics = () => {
  const { data: expenseData, isLoading } = useExpenseData();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { restaurantId } = useRestaurantId();

  // Fetch real monthly data for last 6 months
  const { data: monthlyData = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ["expense-monthly-analytics", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(new Date(), i);
        const start = format(startOfMonth(month), "yyyy-MM-dd");
        const end = format(endOfMonth(month), "yyyy-MM-dd");

        const { data } = await supabase
          .from("expenses")
          .select("amount")
          .eq("restaurant_id", restaurantId)
          .gte("expense_date", start)
          .lte("expense_date", end);

        const total = (data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
        months.push({
          month: format(month, "MMM"),
          amount: Math.round(total),
        });
      }
      return months;
    },
    enabled: !!restaurantId,
  });

  // Fetch real category comparison: this month vs last month
  const { data: categoryComparison = [], isLoading: catLoading } = useQuery({
    queryKey: ["expense-category-comparison", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const thisMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const thisMonthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const lastMonth = subMonths(new Date(), 1);
      const lastMonthStart = format(startOfMonth(lastMonth), "yyyy-MM-dd");
      const lastMonthEnd = format(endOfMonth(lastMonth), "yyyy-MM-dd");

      const [thisMonthRes, lastMonthRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("category, amount")
          .eq("restaurant_id", restaurantId)
          .gte("expense_date", thisMonthStart)
          .lte("expense_date", thisMonthEnd),
        supabase
          .from("expenses")
          .select("category, amount")
          .eq("restaurant_id", restaurantId)
          .gte("expense_date", lastMonthStart)
          .lte("expense_date", lastMonthEnd),
      ]);

      const thisMonthTotals: Record<string, number> = {};
      const lastMonthTotals: Record<string, number> = {};

      (thisMonthRes.data || []).forEach((e) => {
        thisMonthTotals[e.category] =
          (thisMonthTotals[e.category] || 0) + e.amount;
      });
      (lastMonthRes.data || []).forEach((e) => {
        lastMonthTotals[e.category] =
          (lastMonthTotals[e.category] || 0) + e.amount;
      });

      const allCategories = new Set([
        ...Object.keys(thisMonthTotals),
        ...Object.keys(lastMonthTotals),
      ]);

      const categoryLabels: Record<string, string> = {
        groceries: "Groceries",
        staff_salary: "Salaries",
        utilities: "Utilities",
        rent: "Rent",
        equipment: "Equipment",
        marketing: "Marketing",
        maintenance: "Maintenance",
        other: "Other",
      };

      return Array.from(allCategories).map((cat) => ({
        name:
          categoryLabels[cat] ||
          cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        current: Math.round(thisMonthTotals[cat] || 0),
        previous: Math.round(lastMonthTotals[cat] || 0),
      }));
    },
    enabled: !!restaurantId,
  });

  const isLoadingAll = isLoading || monthlyLoading || catLoading;

  if (isLoadingAll) {
    return (
      <div className="grid gap-6">
        <div className="h-80 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-pulse" />
          <div className="h-72 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Calculate month-over-month insights
  const currentMonthTotal = monthlyData[monthlyData.length - 1]?.amount || 0;
  const lastMonthTotal = monthlyData[monthlyData.length - 2]?.amount || 0;
  const momChange =
    lastMonthTotal > 0
      ? Math.round(
          ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 1000,
        ) / 10
      : 0;
  const hasData = monthlyData.some((m) => m.amount > 0);

  return (
    <div className="space-y-6">
      {/* Monthly Comparison Chart */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 shadow-xl dark:shadow-purple-500/10 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-800 dark:text-white">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Monthly Expense Trend
            </div>
            {hasData && (
              <div
                className={`flex items-center gap-1 text-sm ${momChange > 0 ? "text-red-500" : "text-green-500"}`}
              >
                {momChange > 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(momChange)}% vs last month
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="h-[320px] flex flex-col items-center justify-center text-gray-400">
              <BarChart3 className="h-16 w-16 mb-3 text-gray-200 dark:text-gray-700" />
              <p className="text-sm font-medium">No expense data yet</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                Add expenses to see monthly trends here
              </p>
            </div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                      <stop
                        offset="100%"
                        stopColor="#6366f1"
                        stopOpacity={0.8}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-200 dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#6b7280" }}
                    className="text-xs"
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      `${currencySymbol}${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                    }
                    tick={{ fill: "#6b7280" }}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${currencySymbol}${value.toLocaleString()}`,
                      "Expense",
                    ]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    name="Monthly Expense"
                    fill="url(#barGradient)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Trends */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 shadow-xl dark:shadow-purple-500/10 rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              <TrendingUp className="h-5 w-5 text-cyan-500" />
              Category Comparison
              <span className="text-xs font-normal text-gray-400 ml-1">
                This Month vs Last Month
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryComparison.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
                <TrendingUp className="h-12 w-12 mb-2 text-gray-200 dark:text-gray-700" />
                <p className="text-sm">No category data to compare</p>
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryComparison}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 70, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-gray-200 dark:stroke-gray-700"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(value) =>
                        `${currencySymbol}${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
                      }
                      tick={{ fill: "#6b7280" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#6b7280" }}
                      width={68}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${currencySymbol}${value.toLocaleString()}`,
                        "",
                      ]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="current"
                      name="This Month"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="previous"
                      name="Last Month"
                      fill="#06b6d4"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Insights */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 shadow-xl dark:shadow-purple-500/10 rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              <Store className="h-5 w-5 text-amber-500" />
              Expense Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Highest Spending Day */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    Highest Spending Day
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {expenseData?.expenseTrendData?.length
                      ? (() => {
                          const max = expenseData.expenseTrendData.reduce(
                            (m, c) => (c.amount > m.amount ? c : m),
                            { date: "", amount: 0 },
                          );
                          return max.amount > 0
                            ? `${format(new Date(max.date), "MMM dd")} — ${currencySymbol}${max.amount.toLocaleString()}`
                            : "No expenses recorded yet";
                        })()
                      : "No expenses recorded yet"}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Categories */}
            <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 border border-cyan-200 dark:border-cyan-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    Total Categories
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {expenseData?.expenseBreakdown?.filter(
                      (b) => b.name !== "No Data",
                    ).length || 0}{" "}
                    active expense categories
                  </p>
                </div>
              </div>
            </div>

            {/* Staff Expenses */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    Staff Expenses
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {currencySymbol}
                    {expenseData?.staffExpenses?.toLocaleString() || 0} this
                    period
                  </p>
                </div>
              </div>
            </div>

            {/* Month-over-Month */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg">
                  {momChange > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-white" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">
                    Month-over-Month
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {lastMonthTotal > 0
                      ? `${momChange > 0 ? "+" : ""}${momChange}% compared to last month`
                      : "No previous month data for comparison"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpenseAnalytics;
