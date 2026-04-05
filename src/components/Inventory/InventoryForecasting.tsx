import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingDown, TrendingUp, AlertTriangle, Clock, Package, BarChart3,
  ShoppingCart, Zap, Target, ArrowRight, ChevronLeft, ChevronRight,
} from "lucide-react";
import { subDays, format, differenceInDays } from "date-fns";

interface ForecastItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  avgDailyUsage: number;
  daysUntilStockout: number;
  optimalOrderQty: number;
  trend: "increasing" | "decreasing" | "stable";
  urgency: "critical" | "warning" | "ok" | "overstocked";
  costPerUnit: number;
}

const InventoryForecasting = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [lookbackDays, setLookbackDays] = useState(30);
  const [leadTimeDays, setLeadTimeDays] = useState(3);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Fetch inventory items
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["forecast-inventory", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch consumption transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["forecast-transactions", restaurantId, lookbackDays],
    queryFn: async () => {
      if (!restaurantId) return [];
      const startDate = subDays(new Date(), lookbackDays).toISOString();

      const { data, error } = await supabase
        .from("inventory_transactions")
        .select("inventory_item_id, quantity_change, created_at, transaction_type")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .in("transaction_type", ["usage", "waste", "adjustment"]);

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Build forecasting analysis
  const forecastItems: ForecastItem[] = useMemo(() => {
    if (!inventoryItems.length) return [];

    return inventoryItems.map((item: any) => {
      // Get usage transactions for this item (negative quantity_change = consumption)
      const itemTxns = transactions.filter(
        (t: any) => t.inventory_item_id === item.id && t.quantity_change < 0
      );

      // Total consumed (absolute)
      const totalConsumed = itemTxns.reduce(
        (sum: number, t: any) => sum + Math.abs(t.quantity_change),
        0
      );

      const avgDailyUsage = lookbackDays > 0 ? totalConsumed / lookbackDays : 0;
      const daysUntilStockout = avgDailyUsage > 0 ? item.quantity / avgDailyUsage : 999;

      // Calculate trend: compare first half vs second half
      const midpoint = subDays(new Date(), lookbackDays / 2).toISOString();
      const firstHalf = itemTxns.filter((t: any) => t.created_at < midpoint);
      const secondHalf = itemTxns.filter((t: any) => t.created_at >= midpoint);

      const firstHalfUsage = firstHalf.reduce(
        (sum: number, t: any) => sum + Math.abs(t.quantity_change),
        0
      );
      const secondHalfUsage = secondHalf.reduce(
        (sum: number, t: any) => sum + Math.abs(t.quantity_change),
        0
      );

      let trend: "increasing" | "decreasing" | "stable" = "stable";
      if (secondHalfUsage > firstHalfUsage * 1.2) trend = "increasing";
      else if (secondHalfUsage < firstHalfUsage * 0.8) trend = "decreasing";

      // Optimal order quantity: (avg daily usage × (lead time + safety buffer)) - current stock
      const safetyBuffer = 2; // days
      const optimalOrderQty = Math.max(
        0,
        Math.ceil(avgDailyUsage * (leadTimeDays + safetyBuffer + 7) - item.quantity)
      );

      // Urgency classification
      let urgency: "critical" | "warning" | "ok" | "overstocked" = "ok";
      if (daysUntilStockout <= leadTimeDays) urgency = "critical";
      else if (daysUntilStockout <= leadTimeDays * 2) urgency = "warning";
      else if (daysUntilStockout > 60 && avgDailyUsage > 0) urgency = "overstocked";

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentStock: item.quantity,
        reorderLevel: item.reorder_level || 0,
        avgDailyUsage,
        daysUntilStockout: Math.min(daysUntilStockout, 999),
        optimalOrderQty,
        trend,
        urgency,
        costPerUnit: item.cost_per_unit || 0,
      };
    });
  }, [inventoryItems, transactions, lookbackDays, leadTimeDays]);

  // Sort by urgency
  const sortedItems = useMemo(() => {
    const urgencyOrder = { critical: 0, warning: 1, ok: 2, overstocked: 3 };
    return [...forecastItems].sort(
      (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.daysUntilStockout - b.daysUntilStockout
    );
  }, [forecastItems]);

  // KPI
  const criticalCount = forecastItems.filter((f) => f.urgency === "critical").length;
  const warningCount = forecastItems.filter((f) => f.urgency === "warning").length;
  const overstockedCount = forecastItems.filter((f) => f.urgency === "overstocked").length;
  const totalReorderCost = forecastItems
    .filter((f) => f.optimalOrderQty > 0)
    .reduce((sum, f) => sum + f.optimalOrderQty * f.costPerUnit, 0);

  // Consumption chart data (daily usage breakdown for top items)
  const consumptionChart = useMemo(() => {
    // Group usage transactions by day
    const dayMap = new Map<string, number>();
    for (let i = 0; i < Math.min(lookbackDays, 30); i++) {
      const day = format(subDays(new Date(), i), "MMM dd");
      dayMap.set(day, 0);
    }

    transactions
      .filter((t: any) => t.quantity_change < 0)
      .forEach((t: any) => {
        const day = format(new Date(t.created_at), "MMM dd");
        if (dayMap.has(day)) {
          dayMap.set(day, (dayMap.get(day) || 0) + Math.abs(t.quantity_change));
        }
      });

    return Array.from(dayMap.entries())
      .map(([date, usage]) => ({ date, usage: Number(usage.toFixed(2)) }))
      .reverse();
  }, [transactions, lookbackDays]);

  const URGENCY_CONFIG = {
    critical: {
      label: "Critical",
      color: "text-red-600",
      bg: "bg-red-500",
      gradient: "from-red-500 to-rose-500",
      icon: AlertTriangle,
    },
    warning: {
      label: "Warning",
      color: "text-amber-600",
      bg: "bg-amber-500",
      gradient: "from-amber-500 to-orange-500",
      icon: Clock,
    },
    ok: {
      label: "OK",
      color: "text-emerald-600",
      bg: "bg-emerald-500",
      gradient: "from-emerald-500 to-green-500",
      icon: Package,
    },
    overstocked: {
      label: "Overstocked",
      color: "text-blue-600",
      bg: "bg-blue-500",
      gradient: "from-blue-500 to-cyan-500",
      icon: Package,
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Inventory Forecast & Planning
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consumption velocity analysis over {lookbackDays} days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(lookbackDays)} onValueChange={(v) => setLookbackDays(Number(v))}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(leadTimeDays)} onValueChange={(v) => setLeadTimeDays(Number(v))}>
            <SelectTrigger className="w-[150px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Lead: 1 day</SelectItem>
              <SelectItem value="2">Lead: 2 days</SelectItem>
              <SelectItem value="3">Lead: 3 days</SelectItem>
              <SelectItem value="5">Lead: 5 days</SelectItem>
              <SelectItem value="7">Lead: 7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Critical</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
            <p className="text-[10px] text-gray-500 mt-1">Items at risk of stockout</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Warning</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{warningCount}</span>
            <p className="text-[10px] text-gray-500 mt-1">Reorder soon</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Package className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Overstocked</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{overstockedCount}</span>
            <p className="text-[10px] text-gray-500 mt-1">60+ days of supply</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-green-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
                <ShoppingCart className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Reorder Cost</span>
            </div>
            <span className="text-2xl font-bold">{currencySymbol}{totalReorderCost.toFixed(0)}</span>
            <p className="text-[10px] text-gray-500 mt-1">Estimated purchase needed</p>
          </CardContent>
        </Card>
      </div>

      {/* Consumption Chart */}
      {consumptionChart.length > 0 && (
        <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Daily Consumption Volume
            </CardTitle>
            <CardDescription>Total units consumed per day across all items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={consumptionChart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--foreground)", fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#colorUsage)"
                    name="Total Consumed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast Table */}
      {(() => {
        const activeItems = sortedItems.filter((item) => item.avgDailyUsage > 0 || item.currentStock > 0);
        const totalPages = Math.max(1, Math.ceil(activeItems.length / ITEMS_PER_PAGE));
        const safePage = Math.min(currentPage, totalPages);
        const paginatedItems = activeItems.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

        return (
          <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-600" />
                Smart Reorder Suggestions ({activeItems.length} active items)
              </CardTitle>
              <CardDescription>
                Based on consumption velocity, {leadTimeDays}-day lead time, and 2-day safety stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No forecast data available</p>
                  <p className="text-sm mt-1">Inventory usage transactions are needed for predictions.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Item</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Stock</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Daily Use</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Days Left</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Trend</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Order Qty</th>
                          <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Est. Cost</th>
                          <th className="text-center py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedItems.map((item) => {
                          const config = URGENCY_CONFIG[item.urgency];
                          return (
                            <tr
                              key={item.id}
                              className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                item.urgency === "critical"
                                  ? "bg-red-50/50 dark:bg-red-950/10"
                                  : ""
                              }`}
                            >
                              <td className="py-3 px-3">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                <p className="text-[11px] text-gray-500">{item.category} · {item.unit}</p>
                              </td>
                              <td className="text-right py-3 px-3 font-mono text-xs font-bold">
                                {item.currentStock.toFixed(1)}
                              </td>
                              <td className="text-right py-3 px-3 font-mono text-xs">
                                {item.avgDailyUsage.toFixed(2)}/{item.unit}/day
                              </td>
                              <td className="text-right py-3 px-3">
                                <span
                                  className={`font-semibold text-xs ${
                                    item.daysUntilStockout <= leadTimeDays
                                      ? "text-red-600"
                                      : item.daysUntilStockout <= leadTimeDays * 2
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {item.daysUntilStockout >= 999 ? "∞" : `${Math.floor(item.daysUntilStockout)}d`}
                                </span>
                              </td>
                              <td className="text-center py-3 px-3">
                                {item.trend === "increasing" ? (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] border-0">
                                    <TrendingUp className="h-3 w-3 mr-1" />↑
                                  </Badge>
                                ) : item.trend === "decreasing" ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] border-0">
                                    <TrendingDown className="h-3 w-3 mr-1" />↓
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px] border-0">
                                    →
                                  </Badge>
                                )}
                              </td>
                              <td className="text-right py-3 px-3 font-mono text-xs font-bold">
                                {item.optimalOrderQty > 0 ? item.optimalOrderQty : "—"}
                              </td>
                              <td className="text-right py-3 px-3 font-mono text-xs">
                                {item.optimalOrderQty > 0
                                  ? `${currencySymbol}${(item.optimalOrderQty * item.costPerUnit).toFixed(0)}`
                                  : "—"}
                              </td>
                              <td className="text-center py-3 px-3">
                                <Badge
                                  className={`text-[10px] border-0 text-white bg-gradient-to-r ${config.gradient}`}
                                >
                                  {config.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                      <span className="text-xs text-gray-500">
                        Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, activeItems.length)} of {activeItems.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={safePage <= 1}
                          onClick={() => setCurrentPage(safePage - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={page === safePage ? "default" : "outline"}
                            size="icon"
                            className={`h-8 w-8 rounded-lg text-xs ${
                              page === safePage ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                            }`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          disabled={safePage >= totalPages}
                          onClick={() => setCurrentPage(safePage + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
};

export default InventoryForecasting;
