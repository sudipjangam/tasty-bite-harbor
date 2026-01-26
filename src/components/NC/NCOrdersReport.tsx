import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Ban, TrendingUp, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const NCOrdersReport = () => {
  const { restaurantId } = useRestaurantId();
  const [dateRange, setDateRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [ncOrders, setNcOrders] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Calculate date range
        const end = new Date();
        const start = new Date();

        if (dateRange === "today") {
          start.setHours(0, 0, 0, 0);
        } else if (dateRange === "week") {
          start.setDate(end.getDate() - 7);
        } else {
          start.setDate(end.getDate() - 30);
        }

        // Fetch NC orders
        const { data: ncData, error: ncError } = await supabase
          .from("orders")
          .select("id, created_at, total, original_subtotal, nc_reason")
          .eq("restaurant_id", restaurantId)
          .eq("order_type", "non-chargeable")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        if (ncError) {
          console.error("Error fetching NC orders:", ncError);
          setNcOrders([]);
        } else {
          setNcOrders(ncData || []);
        }

        // Fetch total revenue for percentage calculation
        const { data: revenueData, error: revenueError } = await supabase
          .from("orders")
          .select("total")
          .eq("restaurant_id", restaurantId)
          .neq("order_type", "non-chargeable")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        if (!revenueError && revenueData) {
          const revenue = revenueData.reduce(
            (sum, order) => sum + (Number(order.total) || 0),
            0,
          );
          setTotalRevenue(revenue);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error in fetchData:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, dateRange]);

  // Calculate metrics
  const totalNCValue = ncOrders.reduce((sum, order) => {
    const value = Number(order.original_subtotal) || Number(order.total) || 0;
    return sum + value;
  }, 0);

  const ncOrderCount = ncOrders.length;

  const ncPercentage =
    totalRevenue > 0 ? (totalNCValue / (totalRevenue + totalNCValue)) * 100 : 0;

  // Group by reason
  const reasonMap = new Map();
  ncOrders.forEach((order) => {
    const reason = order.nc_reason || "unknown";
    const existing = reasonMap.get(reason) || { value: 0, count: 0 };
    const value = Number(order.original_subtotal) || Number(order.total) || 0;
    reasonMap.set(reason, {
      value: existing.value + value,
      count: existing.count + 1,
    });
  });

  const reasonBreakdown = Array.from(reasonMap.entries()).map(
    ([reason, stats]) => ({
      reason,
      ...stats,
    }),
  );

  const reasonLabels: Record<string, string> = {
    staff_meal: "Staff Meal",
    promotional: "Promotional",
    vip_guest: "VIP Guest",
    complaint: "Complaint Resolution",
    management: "Management Discretion",
    event: "Event/Catering",
    other: "Other",
    unknown: "Unknown",
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Non-Chargeable Orders Report
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track and analyze complimentary orders
          </p>
        </div>

        {/* Date Range Selector */}
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total NC Value */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total NC Value
            </CardTitle>
            <Ban className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              <CurrencyDisplay amount={totalNCValue} showTooltip={false} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cost of complimentary orders
            </p>
          </CardContent>
        </Card>

        {/* NC Order Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NC Orders</CardTitle>
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ncOrderCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total non-chargeable orders
            </p>
          </CardContent>
        </Card>

        {/* NC Percentage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% of Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ncPercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              NC value as % of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Reason */}
      <Card>
        <CardHeader>
          <CardTitle>NC Orders by Reason</CardTitle>
        </CardHeader>
        <CardContent>
          {reasonBreakdown.length === 0 ? (
            <div className="text-center py-8">
              <Ban className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No NC orders in this period
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                NC orders will appear here once created
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reasonBreakdown.map((item) => (
                <div
                  key={item.reason}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {reasonLabels[item.reason] || item.reason}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.count} order{item.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      <CurrencyDisplay
                        amount={item.value}
                        showTooltip={false}
                      />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {totalNCValue > 0
                        ? ((item.value / totalNCValue) * 100).toFixed(1)
                        : "0"}
                      %
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
