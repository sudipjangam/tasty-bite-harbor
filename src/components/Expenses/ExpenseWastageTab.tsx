import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Calendar,
  TrendingDown,
  Layers,
  AlertTriangle,
  Package,
} from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

const ExpenseWastageTab = () => {
  const [monthOffset, setMonthOffset] = useState("0");
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const isDark = document.documentElement.classList.contains("dark");

  const dateRange = useMemo(() => {
    const offset = parseInt(monthOffset);
    const targetMonth = subMonths(new Date(), offset);
    return {
      start: startOfMonth(targetMonth),
      end: endOfMonth(targetMonth),
      label: format(targetMonth, "MMMM yyyy"),
    };
  }, [monthOffset]);

  // Fetch wastage data grouped by item
  const { data: wastageData = [], isLoading } = useQuery({
    queryKey: ["expense-wastage-breakdown", restaurantId, monthOffset],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          inventory_item_id,
          quantity_change,
          total_cost,
          unit_cost_at_time,
          created_at,
          inventory_items!inner(name, unit, category)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("transaction_type", "waste")
        .gte("created_at", format(dateRange.start, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.end, "yyyy-MM-dd'T'23:59:59"))
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Group by item
  const itemBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { name: string; unit: string; category: string; qty: number; cost: number; count: number }
    >();
    for (const t of wastageData) {
      const info = t.inventory_items as any;
      const id = t.inventory_item_id;
      const existing = map.get(id);
      if (existing) {
        existing.qty += Math.abs(t.quantity_change || 0);
        existing.cost += Math.abs(t.total_cost || 0);
        existing.count++;
      } else {
        map.set(id, {
          name: info?.name || "Unknown",
          unit: info?.unit || "unit",
          category: info?.category || "Other",
          qty: Math.abs(t.quantity_change || 0),
          cost: Math.abs(t.total_cost || 0),
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [wastageData]);

  // Group by category
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of itemBreakdown) {
      map.set(item.category, (map.get(item.category) || 0) + item.cost);
    }
    return Array.from(map.entries())
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [itemBreakdown]);

  // Daily trend
  const dailyTrend = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of wastageData) {
      const date = format(new Date(t.created_at), "yyyy-MM-dd");
      map.set(date, (map.get(date) || 0) + Math.abs(t.total_cost || 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost }));
  }, [wastageData]);

  const totalCost = itemBreakdown.reduce((sum, i) => sum + i.cost, 0);
  const totalEntries = wastageData.length;

  const COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#ec4899", "#a855f7",
    "#6366f1", "#14b8a6", "#84cc16",
  ];

  // Pie chart
  const pieOptions: Highcharts.Options = {
    chart: { type: "pie", height: 250, backgroundColor: "transparent" },
    title: { text: undefined },
    credits: { enabled: false },
    tooltip: {
      backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderWidth: 0,
      borderRadius: 12,
      useHTML: true,
      formatter: function (this: any) {
        return `<div style="padding:6px"><strong>${this.point?.name}</strong><br/>${currencySymbol}${Number(this.y).toLocaleString()}</div>`;
      },
    },
    plotOptions: {
      pie: { innerSize: "55%", borderWidth: 0, dataLabels: { enabled: false }, showInLegend: false },
    },
    series: [
      {
        type: "pie",
        data: categoryBreakdown.map((c, i) => ({
          name: c.name,
          y: c.cost,
          color: COLORS[i % COLORS.length],
        })),
      },
    ],
  };

  // Bar chart for daily trend
  const barOptions: Highcharts.Options = {
    chart: { type: "column", height: 250, backgroundColor: "transparent" },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: dailyTrend.map((d) => format(new Date(d.date), "MMM dd")),
      labels: { style: { color: isDark ? "#9ca3af" : "#6b7280", fontSize: "10px" } },
      lineColor: isDark ? "#374151" : "#e5e7eb",
    },
    yAxis: {
      title: { text: undefined },
      labels: {
        formatter: function () { return `${currencySymbol}${this.value}`; },
        style: { color: isDark ? "#9ca3af" : "#6b7280", fontSize: "10px" },
      },
      gridLineColor: isDark ? "#374151" : "#e5e7eb",
    },
    tooltip: {
      backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
      borderWidth: 0,
      borderRadius: 12,
      useHTML: true,
      formatter: function (this: any) {
        return `<div style="padding:6px"><strong>${this.x}</strong><br/>Wastage: <span style="color:#ef4444;font-weight:600">${currencySymbol}${Number(this.y).toLocaleString()}</span></div>`;
      },
    },
    legend: { enabled: false },
    plotOptions: {
      column: { borderRadius: 6, borderWidth: 0 },
    },
    series: [
      {
        type: "column",
        name: "Wastage",
        data: dailyTrend.map((d) => d.cost),
        color: { linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 }, stops: [[0, "#ef4444"], [1, "#f97316"]] },
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Month Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-md">
            <Trash2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Wastage Analytics
            </h2>
            <p className="text-sm text-gray-500">
              Track inventory losses from spoilage and waste
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Select value={monthOffset} onValueChange={setMonthOffset}>
            <SelectTrigger className="w-44 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Current Month</SelectItem>
              <SelectItem value="1">Last Month</SelectItem>
              <SelectItem value="2">2 Months Ago</SelectItem>
              <SelectItem value="3">3 Months Ago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 via-red-600 to-rose-700 rounded-2xl p-5 text-white shadow-xl shadow-red-500/30 transform hover:scale-[1.02] transition-all">
          <p className="text-red-100 text-sm font-medium">Total Wastage</p>
          <p className="text-3xl font-bold mt-1">
            {currencySymbol}
            {Math.round(totalCost).toLocaleString()}
          </p>
          <p className="text-red-200 text-sm mt-2">{dateRange.label}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 rounded-2xl p-5 text-white shadow-xl shadow-orange-500/30 transform hover:scale-[1.02] transition-all">
          <p className="text-orange-100 text-sm font-medium">Waste Entries</p>
          <p className="text-3xl font-bold mt-1">{totalEntries}</p>
          <p className="text-orange-200 text-sm mt-2">Total transactions</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-xl shadow-purple-500/30 transform hover:scale-[1.02] transition-all">
          <p className="text-purple-100 text-sm font-medium">Items Affected</p>
          <p className="text-3xl font-bold mt-1">{itemBreakdown.length}</p>
          <p className="text-purple-200 text-sm mt-2">Unique items wasted</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 via-pink-600 to-fuchsia-700 rounded-2xl p-5 text-white shadow-xl shadow-pink-500/30 transform hover:scale-[1.02] transition-all">
          <p className="text-pink-100 text-sm font-medium">Top Wasted</p>
          <p className="text-xl font-bold mt-1 truncate">
            {itemBreakdown[0]?.name || "—"}
          </p>
          {itemBreakdown[0] && (
            <p className="text-pink-200 text-sm mt-1">
              {currencySymbol}{Math.round(itemBreakdown[0].cost).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Wastage Trend */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-red-500/20 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Daily Wastage Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyTrend.length > 0 ? (
              <HighchartsReact highcharts={Highcharts} options={barOptions} />
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No wastage data for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-red-500/20 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              <Layers className="h-5 w-5 text-orange-500" />
              Wastage by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <div className="flex items-center">
                <div className="w-1/2">
                  <HighchartsReact highcharts={Highcharts} options={pieOptions} />
                </div>
                <div className="w-1/2 space-y-2">
                  {categoryBreakdown.map((cat, index) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
                        {cat.name}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-white">
                        {currencySymbol}{Math.round(cat.cost).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No wastage data for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Item Breakdown Table */}
      {itemBreakdown.length > 0 && (
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-red-500/20 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              <Trash2 className="h-5 w-5 text-red-500" />
              Wastage by Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y dark:divide-gray-700">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">
                  Item
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-right">
                  Entries
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-right">
                  Qty Wasted
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">
                  Cost Lost
                </span>
              </div>
              {itemBreakdown.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                      <Trash2 className="h-3 w-3 text-red-400 shrink-0" />
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">{item.category}</p>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-300 w-20 text-right">
                    {item.count}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 w-24 text-right">
                    {item.qty.toFixed(2)} {item.unit}
                  </span>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400 w-28 text-right">
                    {currencySymbol}{item.cost.toFixed(2)}
                  </span>
                </div>
              ))}
              {/* Total */}
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20">
                <div className="flex-1 text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Total Wastage
                </div>
                <span className="text-sm font-bold text-red-700 dark:text-red-400 w-28 text-right">
                  {currencySymbol}{totalCost.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExpenseWastageTab;
