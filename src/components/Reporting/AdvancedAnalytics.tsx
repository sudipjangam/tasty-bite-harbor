
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Download, Calendar, BarChart, PieChart, FileText } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { addDays, format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

const AdvancedAnalytics = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [reportType, setReportType] = useState("revenue");
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();

  const { data: revenueStats } = useQuery({
    queryKey: ["revenue-stats", restaurantId, dateRange],
    queryFn: async () => {
      if (!restaurantId || !dateRange?.from || !dateRange?.to) return null;

      const { data, error } = await supabase
        .from("daily_revenue_stats")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("date", format(dateRange.to, "yyyy-MM-dd"))
        .order("date");

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId && !!dateRange?.from && !!dateRange?.to,
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products", restaurantId, dateRange],
    queryFn: async () => {
      if (!restaurantId || !dateRange?.from || !dateRange?.to) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("items, total, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());

      if (error) throw error;

      // Process items to get top products
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      
      data.forEach(order => {
        if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (item.name) {
              if (!itemCounts[item.name]) {
                itemCounts[item.name] = { count: 0, revenue: 0 };
              }
              itemCounts[item.name].count += item.quantity || 1;
              itemCounts[item.name].revenue += (item.price || 0) * (item.quantity || 1);
            }
          });
        }
      });

      return Object.entries(itemCounts)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
    enabled: !!restaurantId && !!dateRange?.from && !!dateRange?.to,
  });

  const { data: customerInsights } = useQuery({
    queryKey: ["customer-insights", restaurantId, dateRange],
    queryFn: async () => {
      if (!restaurantId || !dateRange?.from || !dateRange?.to) return null;

      const { data, error } = await supabase
        .from("orders")
        .select("customer_name, total, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", dateRange.to.toISOString());

      if (error) throw error;

      const customerStats: Record<string, { totalSpent: number; orderCount: number; lastVisit: string }> = {};
      
      data.forEach(order => {
        if (!customerStats[order.customer_name]) {
          customerStats[order.customer_name] = {
            totalSpent: 0,
            orderCount: 0,
            lastVisit: order.created_at
          };
        }
        customerStats[order.customer_name].totalSpent += order.total;
        customerStats[order.customer_name].orderCount += 1;
        if (new Date(order.created_at) > new Date(customerStats[order.customer_name].lastVisit)) {
          customerStats[order.customer_name].lastVisit = order.created_at;
        }
      });

      return {
        totalCustomers: Object.keys(customerStats).length,
        topCustomers: Object.entries(customerStats)
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 10),
        averageOrderValue: data.length > 0 ? data.reduce((sum, order) => sum + order.total, 0) / data.length : 0
      };
    },
    enabled: !!restaurantId && !!dateRange?.from && !!dateRange?.to,
  });

  const calculateTrends = () => {
    if (!revenueStats || revenueStats.length < 2) return null;

    const currentPeriod = revenueStats.slice(-7); // Last 7 days
    const previousPeriod = revenueStats.slice(-14, -7); // Previous 7 days

    const currentRevenue = currentPeriod.reduce((sum, day) => sum + Number(day.total_revenue), 0);
    const previousRevenue = previousPeriod.reduce((sum, day) => sum + Number(day.total_revenue), 0);

    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    const currentOrders = currentPeriod.reduce((sum, day) => sum + day.order_count, 0);
    const previousOrders = previousPeriod.reduce((sum, day) => sum + day.order_count, 0);

    const orderGrowth = previousOrders > 0 ? ((currentOrders - previousOrders) / previousOrders) * 100 : 0;

    return {
      revenueGrowth: revenueGrowth.toFixed(1),
      orderGrowth: orderGrowth.toFixed(1),
      currentRevenue,
      currentOrders
    };
  };

  const trends = calculateTrends();

  const exportReport = () => {
    const csvData = revenueStats?.map(stat => ({
      Date: stat.date,
      Revenue: stat.total_revenue,
      Orders: stat.order_count,
      'Average Order Value': stat.average_order_value
    }));

    if (csvData) {
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Report exported successfully" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Advanced Analytics & Reporting</h2>
        <div className="flex gap-2">
          <StandardizedButton variant="secondary" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </StandardizedButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <DatePickerWithRange onDateRangeChange={setDateRange} />
        </div>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="revenue">Revenue Analysis</SelectItem>
            <SelectItem value="products">Product Performance</SelectItem>
            <SelectItem value="customers">Customer Insights</SelectItem>
            <SelectItem value="trends">Trend Analysis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {trends && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StandardizedCard className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Revenue Growth</p>
                <p className="text-2xl font-bold">{trends.revenueGrowth}%</p>
              </div>
            </div>
          </StandardizedCard>
          <StandardizedCard className="p-4">
            <div className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Order Growth</p>
                <p className="text-2xl font-bold">{trends.orderGrowth}%</p>
              </div>
            </div>
          </StandardizedCard>
          <StandardizedCard className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">${trends.currentRevenue.toFixed(2)}</p>
              </div>
            </div>
          </StandardizedCard>
          <StandardizedCard className="p-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{trends.currentOrders}</p>
              </div>
            </div>
          </StandardizedCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Products</h3>
          <div className="space-y-3">
            {topProducts?.map((product, index) => (
              <div key={product.name} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">#{index + 1} {product.name}</span>
                  <p className="text-sm text-gray-600">{product.count} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${product.revenue.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </StandardizedCard>

        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Customer Insights</h3>
          {customerInsights && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold">{customerInsights.totalCustomers}</p>
                  <p className="text-sm text-gray-600">Total Customers</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold">${customerInsights.averageOrderValue.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Avg Order Value</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Top Customers</h4>
                <div className="space-y-2">
                  {customerInsights.topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={customer.name} className="flex justify-between items-center text-sm">
                      <span>#{index + 1} {customer.name}</span>
                      <span className="font-medium">${customer.totalSpent.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </StandardizedCard>
      </div>

      {revenueStats && (
        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Revenue Trend</h3>
          <div className="h-64 flex items-end gap-2">
            {revenueStats.map((stat, index) => (
              <div key={stat.date} className="flex-1 flex flex-col items-center">
                <div
                  className="bg-blue-500 w-full rounded-t"
                  style={{
                    height: `${(Number(stat.total_revenue) / Math.max(...revenueStats.map(s => Number(s.total_revenue)))) * 200}px`
                  }}
                ></div>
                <div className="text-xs mt-2 text-center">
                  <p>{format(new Date(stat.date), 'MM/dd')}</p>
                  <p className="font-medium">${Number(stat.total_revenue).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        </StandardizedCard>
      )}
    </div>
  );
};

export default AdvancedAnalytics;
