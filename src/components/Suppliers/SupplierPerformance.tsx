import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Truck, Clock, CheckCircle2,
  BarChart3, ShieldCheck, AlertTriangle, Package,
} from "lucide-react";
import { format, subMonths } from "date-fns";

interface SupplierPerformanceProps {
  restaurantId: string;
  suppliers: Array<{ id: string; name: string }>;
}

const CHART_COLORS = ["#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#ec4899"];

const SupplierPerformance = ({ restaurantId, suppliers }: SupplierPerformanceProps) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>("all");

  // Fetch price history
  const { data: priceHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["supplier-price-history", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_price_history")
        .select(`
          id,
          supplier_id,
          inventory_item_id,
          unit_price,
          quantity,
          recorded_at,
          purchase_order_id,
          suppliers (name),
          inventory_items (name, unit)
        `)
        .eq("restaurant_id", restaurantId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch PO delivery data for reliability scoring
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["supplier-performance-pos", restaurantId],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();

      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, supplier_id, status, total_amount, created_at, updated_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sixMonthsAgo);

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Unique items that have price history
  const trackedItems = useMemo(() => {
    const itemMap = new Map<string, { id: string; name: string; unit: string }>();
    priceHistory.forEach((ph: any) => {
      if (ph.inventory_items && !itemMap.has(ph.inventory_item_id)) {
        itemMap.set(ph.inventory_item_id, {
          id: ph.inventory_item_id,
          name: ph.inventory_items.name,
          unit: ph.inventory_items.unit,
        });
      }
    });
    return Array.from(itemMap.values());
  }, [priceHistory]);

  // Supplier performance metrics
  const supplierMetrics = useMemo(() => {
    return suppliers.map((supplier) => {
      const supplierPOs = purchaseOrders.filter((po: any) => po.supplier_id === supplier.id);
      const totalOrders = supplierPOs.length;
      const receivedOrders = supplierPOs.filter((po: any) => po.status === "received").length;
      const cancelledOrders = supplierPOs.filter((po: any) => po.status === "cancelled").length;
      const totalSpend = supplierPOs
        .filter((po: any) => po.status === "received")
        .reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0);
      const deliveryRate = totalOrders > 0 ? ((receivedOrders / totalOrders) * 100) : 0;

      // Price variance for this supplier
      const supplierPrices = priceHistory.filter((ph: any) => ph.supplier_id === supplier.id);
      const itemPriceGroups: Record<string, number[]> = {};
      supplierPrices.forEach((ph: any) => {
        if (!itemPriceGroups[ph.inventory_item_id]) {
          itemPriceGroups[ph.inventory_item_id] = [];
        }
        itemPriceGroups[ph.inventory_item_id].push(ph.unit_price);
      });

      let avgPriceVariance = 0;
      const itemVariances = Object.values(itemPriceGroups);
      if (itemVariances.length > 0) {
        const variances = itemVariances.map((prices) => {
          if (prices.length < 2) return 0;
          const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
          return ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
        });
        avgPriceVariance = variances.reduce((s, v) => s + v, 0) / variances.length;
      }

      return {
        ...supplier,
        totalOrders,
        receivedOrders,
        cancelledOrders,
        totalSpend,
        deliveryRate,
        avgPriceVariance,
        trackedItems: Object.keys(itemPriceGroups).length,
      };
    });
  }, [suppliers, purchaseOrders, priceHistory]);

  // Price trend chart data
  const chartData = useMemo(() => {
    let filtered = priceHistory;

    if (selectedSupplierId !== "all") {
      filtered = filtered.filter((ph: any) => ph.supplier_id === selectedSupplierId);
    }
    if (selectedItemId !== "all") {
      filtered = filtered.filter((ph: any) => ph.inventory_item_id === selectedItemId);
    }

    // Group by date + supplier
    const dateMap = new Map<string, any>();
    filtered.forEach((ph: any) => {
      const date = format(new Date(ph.recorded_at), "MMM dd");
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }
      const entry = dateMap.get(date);
      const supplierName = ph.suppliers?.name || "Unknown";
      const itemName = ph.inventory_items?.name || "Unknown";
      const key = selectedItemId !== "all" ? supplierName : `${itemName}`;
      entry[key] = ph.unit_price;
    });

    return Array.from(dateMap.values());
  }, [priceHistory, selectedSupplierId, selectedItemId]);

  // Get unique series names for chart
  const chartSeries = useMemo(() => {
    const series = new Set<string>();
    chartData.forEach((entry) => {
      Object.keys(entry).forEach((key) => {
        if (key !== "date") series.add(key);
      });
    });
    return Array.from(series);
  }, [chartData]);

  // Top-level stats
  const totalTrackedItems = trackedItems.length;
  const totalPriceRecords = priceHistory.length;
  const avgDeliveryRate = supplierMetrics.length > 0
    ? supplierMetrics.filter((s) => s.totalOrders > 0).reduce((sum, s) => sum + s.deliveryRate, 0) /
      supplierMetrics.filter((s) => s.totalOrders > 0).length
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-violet-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg">
                <Truck className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Active Suppliers</span>
            </div>
            <span className="text-2xl font-bold">{suppliers.length}</span>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Package className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Tracked Items</span>
            </div>
            <span className="text-2xl font-bold">{totalTrackedItems}</span>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <BarChart3 className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Price Records</span>
            </div>
            <span className="text-2xl font-bold">{totalPriceRecords}</span>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl">
          <div className={`h-1.5 w-full bg-gradient-to-r ${avgDeliveryRate >= 80 ? "from-emerald-500 to-green-500" : "from-red-500 to-rose-500"}`} />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 bg-gradient-to-br rounded-lg ${avgDeliveryRate >= 80 ? "from-emerald-500 to-green-500" : "from-red-500 to-rose-500"}`}>
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Avg Delivery Rate</span>
            </div>
            <span className="text-2xl font-bold">{avgDeliveryRate.toFixed(0)}%</span>
          </CardContent>
        </Card>
      </div>

      {/* Price Trend Chart */}
      <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500" />
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Price Trend Analysis
              </CardTitle>
              <CardDescription>Track ingredient price changes across suppliers</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="w-[160px] rounded-xl text-sm">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="w-[160px] rounded-xl text-sm">
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  {trackedItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No price history data yet</p>
              <p className="text-sm mt-1">Price data will be recorded automatically when Purchase Orders are received.</p>
            </div>
          ) : (
            <div className="h-[300px] md:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                  <YAxis
                    tick={{ fill: "var(--foreground)", fontSize: 11 }}
                    tickFormatter={(v) => `${currencySymbol}${v}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${currencySymbol}${Number(value).toFixed(2)}`, name]}
                  />
                  <Legend />
                  {chartSeries.slice(0, 6).map((series, i) => (
                    <Line
                      key={series}
                      type="monotone"
                      dataKey={series}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Scorecards */}
      <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-emerald-600" />
            Supplier Scorecards
          </CardTitle>
          <CardDescription>Performance overview for each supplier (last 6 months)</CardDescription>
        </CardHeader>
        <CardContent>
          {supplierMetrics.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No suppliers found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplierMetrics.map((supplier) => (
                <div
                  key={supplier.id}
                  className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-700/60 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{supplier.name}</h4>
                    <Badge
                      className={`text-[10px] border-0 text-white ${
                        supplier.deliveryRate >= 90
                          ? "bg-emerald-500"
                          : supplier.deliveryRate >= 70
                          ? "bg-amber-500"
                          : supplier.totalOrders === 0
                          ? "bg-gray-400"
                          : "bg-red-500"
                      }`}
                    >
                      {supplier.totalOrders === 0 ? "No Orders" : `${supplier.deliveryRate.toFixed(0)}% Reliable`}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Total Orders</span>
                      <p className="font-semibold">{supplier.totalOrders}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Total Spend</span>
                      <p className="font-semibold">{currencySymbol}{supplier.totalSpend.toFixed(0)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Received</span>
                      <p className="font-semibold text-emerald-600">{supplier.receivedOrders}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Cancelled</span>
                      <p className={`font-semibold ${supplier.cancelledOrders > 0 ? "text-red-600" : ""}`}>
                        {supplier.cancelledOrders}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Price Trend</span>
                      <p className="font-semibold flex items-center gap-1">
                        {supplier.avgPriceVariance > 0 ? (
                          <>
                            <TrendingUp className="h-3 w-3 text-red-500" />
                            <span className="text-red-600">+{supplier.avgPriceVariance.toFixed(1)}%</span>
                          </>
                        ) : supplier.avgPriceVariance < 0 ? (
                          <>
                            <TrendingDown className="h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-600">{supplier.avgPriceVariance.toFixed(1)}%</span>
                          </>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Tracked Items</span>
                      <p className="font-semibold">{supplier.trackedItems}</p>
                    </div>
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

export default SupplierPerformance;
