
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertTriangle, Target, Calendar, Users, DollarSign, Package, Clock, BarChart3 } from "lucide-react";
import { useBusinessDashboardData } from "@/hooks/useBusinessDashboardData";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const SmartInsights = () => {
  const { data: businessData, isLoading } = useBusinessDashboardData();

  if (isLoading) {
    return <div className="p-6">Loading insights...</div>;
  }

  if (!businessData) {
    return <div className="p-6">No data available for insights.</div>;
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Expenses</p>
                <p className="text-2xl font-bold">₹{businessData.totalOperationalCost?.toLocaleString() || '0'}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Staff Expenses</p>
                <p className="text-2xl font-bold">₹{businessData.staffExpenses?.toLocaleString() || '0'}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold">{businessData.lowStockItems?.length || 0}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Trend</p>
                <p className="text-2xl font-bold">{businessData.revenueTrend > 0 ? '+' : ''}{businessData.revenueTrend?.toFixed(1) || '0'}%</p>
              </div>
              <TrendingUp className={`h-8 w-8 ${businessData.revenueTrend > 0 ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>Current month expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={businessData.expenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {businessData.expenseData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Hours Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Peak Hours Analysis
            </CardTitle>
            <CardDescription>Customer traffic by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={businessData.peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="customers" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Expense Trend */}
        {businessData.expenseTrendData && businessData.expenseTrendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Monthly Expense Trend
              </CardTitle>
              <CardDescription>Daily expense tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={businessData.expenseTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                  <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Weekday Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Weekday Performance
            </CardTitle>
            <CardDescription>Orders by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={businessData.weekdayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            AI-Powered Insights & Recommendations
          </CardTitle>
          <CardDescription>
            Smart analysis of your business data with actionable insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {businessData.insights && businessData.insights.length > 0 ? (
            businessData.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex-shrink-0 mt-1">
                  {insight.type === "inventory" && <AlertTriangle className="h-5 w-5 text-orange-600" />}
                  {insight.type === "revenue" && <Target className="h-5 w-5 text-green-600" />}
                  {insight.type === "seasonal" && <Calendar className="h-5 w-5 text-blue-600" />}
                  {insight.type === "expense" && <DollarSign className="h-5 w-5 text-red-600" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {insight.message}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Gathering business insights...</p>
              <p className="text-sm">Add more data to get personalized recommendations.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartInsights;
