import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import {
  Ban,
  TrendingUp,
  Package,
  ChevronRight,
  Clock,
  User,
  ClipboardList,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface NCOrder {
  id: string;
  created_at: string;
  total: number;
  discount_amount: number | null;
  nc_reason: string | null;
  customer_name: string;
  items: string[];
  attendant: string | null;
}

export const NCOrdersReport = () => {
  const { restaurantId } = useRestaurantId();
  const [dateRange, setDateRange] = useState("month");
  const [loading, setLoading] = useState(true);
  const [ncOrders, setNcOrders] = useState<NCOrder[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<NCOrder | null>(null);

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

        // Fetch NC orders with more details
        const { data: ncData, error: ncError } = await supabase
          .from("orders")
          .select(
            "id, created_at, total, discount_amount, nc_reason, customer_name, items, attendant",
          )
          .eq("restaurant_id", restaurantId)
          .eq("order_type", "non-chargeable")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: false });

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

  // Calculate metrics - use discount_amount which stores original order value for NC orders
  const totalNCValue = ncOrders.reduce((sum, order) => {
    const value = Number(order.discount_amount) || Number(order.total) || 0;
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
    const value = Number(order.discount_amount) || Number(order.total) || 0;
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

  const getOrderValue = (order: NCOrder) => {
    return Number(order.discount_amount) || Number(order.total) || 0;
  };

  const parseItems = (items: string[]) => {
    return items.map((item) => {
      // Parse format like "2x Paneer Tikka @200"
      const match = item.match(/^(\d+)x\s+(.+?)\s*@(\d+)$/);
      if (match) {
        return {
          quantity: parseInt(match[1]),
          name: match[2],
          price: parseInt(match[3]),
        };
      }
      // Fallback parsing
      return { quantity: 1, name: item, price: 0 };
    });
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

      {/* Individual Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            All NC Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ncOrders.length === 0 ? (
            <div className="text-center py-8">
              <Ban className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No NC orders in this period
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {ncOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 
                           hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 
                           dark:hover:from-purple-900/20 dark:hover:to-pink-900/20
                           hover:border-purple-300 dark:hover:border-purple-700
                           transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {order.customer_name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        >
                          {reasonLabels[order.nc_reason || "unknown"] ||
                            order.nc_reason ||
                            "Unknown"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(order.created_at), "MMM d, h:mm a")}
                        </span>
                        {order.attendant && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {order.attendant}
                          </span>
                        )}
                        <span className="text-gray-500">
                          {order.items.length} item
                          {order.items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-lg text-purple-600 dark:text-purple-400">
                          <CurrencyDisplay
                            amount={getOrderValue(order)}
                            showTooltip={false}
                          />
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>NC Order Details</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedOrder(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Header Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">
                    {selectedOrder.customer_name}
                  </h3>
                  <Badge className="bg-purple-500 text-white">
                    {reasonLabels[selectedOrder.nc_reason || "unknown"] ||
                      selectedOrder.nc_reason ||
                      "Unknown"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(
                      new Date(selectedOrder.created_at),
                      "MMM d, yyyy 'at' h:mm a",
                    )}
                  </div>
                  {selectedOrder.attendant && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {selectedOrder.attendant}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">Order Items</h4>
                <div className="space-y-2">
                  {parseItems(selectedOrder.items).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-medium px-2 py-1 rounded">
                          {item.quantity}x
                        </span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        @₹{item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Original Value</span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    <CurrencyDisplay
                      amount={getOrderValue(selectedOrder)}
                      showTooltip={false}
                    />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  100% discount applied (Non-Chargeable)
                </p>
              </div>

              {/* Order ID */}
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Order ID:{" "}
                  <span className="font-mono">{selectedOrder.id}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
