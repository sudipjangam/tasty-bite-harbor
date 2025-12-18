import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpenseData } from "@/hooks/useExpenseData";
import { BarChart3, TrendingUp, Store } from "lucide-react";
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
  LineChart,
  Line
} from "recharts";
import { useCurrencyContext } from '@/contexts/CurrencyContext';

const ExpenseAnalytics = () => {
  const { data: expenseData, isLoading } = useExpenseData();
  const { symbol: currencySymbol } = useCurrencyContext();

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="h-80 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Generate mock comparison data for demonstration
  // In production, this would come from actual monthly expense queries
  const monthlyComparison = [
    { month: format(subMonths(new Date(), 5), "MMM"), amount: 45000, budget: 50000 },
    { month: format(subMonths(new Date(), 4), "MMM"), amount: 52000, budget: 50000 },
    { month: format(subMonths(new Date(), 3), "MMM"), amount: 48000, budget: 50000 },
    { month: format(subMonths(new Date(), 2), "MMM"), amount: 55000, budget: 55000 },
    { month: format(subMonths(new Date(), 1), "MMM"), amount: 42000, budget: 55000 },
    { month: format(new Date(), "MMM"), amount: expenseData?.totalMonthlyExpenses || 0, budget: 55000 },
  ];

  // Category trends over time (simulated)
  const categoryTrends = (expenseData?.expenseBreakdown || []).slice(0, 4).map(category => ({
    name: category.name.split(' ')[0], // Shorten name
    current: category.value,
    previous: Math.round(category.value * (0.8 + Math.random() * 0.4)), // ±20% variation
  }));

  return (
    <div className="space-y-6">
      {/* Monthly Comparison Chart */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 shadow-xl dark:shadow-purple-500/10 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            Monthly Expense Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#6b7280' }}
                  className="text-xs"
                />
                <YAxis 
                  tickFormatter={(value) => `${currencySymbol}${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                  tick={{ fill: '#6b7280' }}
                  className="text-xs"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${currencySymbol}${value.toLocaleString()}`, 
                    name === 'amount' ? 'Actual' : 'Budget'
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="amount" 
                  name="Actual Expense"
                  fill="url(#barGradient)" 
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                />
                <Bar 
                  dataKey="budget" 
                  name="Budget"
                  fill="url(#budgetGradient)" 
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={categoryTrends} 
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `${currencySymbol}${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: '#6b7280' }}
                    width={60}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, ""]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="current" name="This Month" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="previous" name="Last Month" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
            {/* Insight Cards */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border border-purple-200 dark:border-purple-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">Highest Spending Day</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {expenseData?.expenseTrendData?.reduce(
                      (max, curr) => curr.amount > max.amount ? curr : max,
                      { date: "N/A", amount: 0 }
                    )?.date ? format(new Date(expenseData.expenseTrendData.reduce(
                      (max, curr) => curr.amount > max.amount ? curr : max,
                      { date: new Date().toISOString(), amount: 0 }
                    ).date), "MMM dd") : "No data"} - {currencySymbol}{expenseData?.expenseTrendData?.reduce(
                      (max, curr) => curr.amount > max.amount ? curr : max,
                      { amount: 0 }
                    )?.amount.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30 border border-cyan-200 dark:border-cyan-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">Total Categories</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {expenseData?.expenseBreakdown?.length || 0} active expense categories
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-lg">
                  <Store className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">Staff Expenses</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {currencySymbol}{expenseData?.staffExpenses?.toLocaleString() || 0} this period
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
