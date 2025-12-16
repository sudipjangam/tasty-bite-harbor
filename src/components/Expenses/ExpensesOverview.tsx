import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpenseData } from "@/hooks/useExpenseData";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

const COLORS = [
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#ec4899", // pink
  "#6366f1", // indigo
  "#84cc16", // lime
];

const ExpensesOverview = () => {
  const { data: expenseData, isLoading } = useExpenseData();

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalExpenses = expenseData?.totalExpenses || 0;
  const monthlyExpenses = expenseData?.totalMonthlyExpenses || 0;
  const avgDaily = monthlyExpenses / 30;
  const topCategory = expenseData?.expenseBreakdown?.reduce(
    (max, curr) => (curr.value > max.value ? curr : max),
    { name: "None", value: 0 }
  );

  // Calculate trend (mock comparison with previous period)
  const trendPercentage = 12.5; // In real implementation, compare with previous month
  const isPositiveTrend = trendPercentage > 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses (30 days) */}
        <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-xl shadow-purple-500/30 dark:shadow-purple-500/50 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Last 30 Days</p>
              <p className="text-3xl font-bold mt-1">₹{totalExpenses.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-2">
                {isPositiveTrend ? (
                  <ArrowUpRight className="h-4 w-4 text-red-300" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-green-300" />
                )}
                <span className={`text-sm ${isPositiveTrend ? 'text-red-200' : 'text-green-200'}`}>
                  {trendPercentage}% vs last month
                </span>
              </div>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-700 rounded-2xl p-5 text-white shadow-xl shadow-cyan-500/30 dark:shadow-cyan-500/50 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-sm font-medium">This Month</p>
              <p className="text-3xl font-bold mt-1">₹{monthlyExpenses.toLocaleString()}</p>
              <p className="text-cyan-200 text-sm mt-2">Current billing period</p>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Calendar className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Average Daily */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-xl shadow-amber-500/30 dark:shadow-amber-500/50 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Daily Average</p>
              <p className="text-3xl font-bold mt-1">₹{Math.round(avgDaily).toLocaleString()}</p>
              <p className="text-amber-200 text-sm mt-2">Per day spending</p>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 rounded-2xl p-5 text-white shadow-xl shadow-emerald-500/30 dark:shadow-emerald-500/50 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Top Category</p>
              <p className="text-2xl font-bold mt-1 truncate max-w-[150px]">{topCategory?.name || "None"}</p>
              <p className="text-emerald-200 text-sm mt-2">₹{topCategory?.value?.toLocaleString() || 0}</p>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Wallet className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Trend Chart */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 shadow-xl dark:shadow-purple-500/10 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              Expense Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={expenseData?.expenseTrendData || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                    className="text-xs"
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                    className="text-xs"
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, "Amount"]}
                    labelFormatter={(label) => format(new Date(label), "MMM dd, yyyy")}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fill="url(#expenseGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 shadow-xl dark:shadow-purple-500/10 rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              <PieChart className="h-5 w-5 text-cyan-500" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPieChart>
                    <Pie
                      data={expenseData?.expenseBreakdown || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(expenseData?.expenseBreakdown || []).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, ""]}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2">
                {(expenseData?.expenseBreakdown || []).slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExpensesOverview;
