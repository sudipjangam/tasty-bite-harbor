import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  Send,
  BarChart3,
  PieChart,
  TrendingUp,
  X,
  Lightbulb,
  SlidersHorizontal,
  MessageSquareText,
} from "lucide-react";
import Highcharts, { Options } from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useTheme } from "@/hooks/useTheme";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import ManualChartBuilder from "./ManualChartBuilder";

interface AIChartBuilderProps {
  orders: any[];
  menuItems: any[];
  revenueStats: any[];
  customerInsights: any[];
  topProducts: any[];
  dateRange?: DateRange;
}

const SUGGESTIONS = [
  "Revenue vs Orders over time",
  "Top 10 menu items by quantity sold",
  "Order distribution by type (dine-in, takeaway, delivery)",
  "Daily revenue comparison weekday vs weekend",
  "Customer spending distribution",
  "Revenue by menu category pie chart",
  "Average order value trend over time",
  "Peak ordering hours analysis",
];

const AIChartBuilder = ({
  orders,
  menuItems,
  revenueStats,
  customerInsights,
  topProducts,
  dateRange,
}: AIChartBuilderProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const { restaurantId } = useRestaurantId();
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  const [builderMode, setBuilderMode] = useState<"ai" | "manual">("manual");
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chartOptions, setChartOptions] = useState<Options | null>(null);
  const [chartTitle, setChartTitle] = useState("");
  const [error, setError] = useState("");

  // Build context data summary for AI
  const buildDataContext = () => {
    // Revenue summary
    const revSummary = revenueStats.slice(0, 30).map((s: any) => ({
      date: format(new Date(s.date), "yyyy-MM-dd"),
      revenue: Number(s.total_revenue),
      orders: s.order_count,
      avg_order: Number(s.average_order_value),
    }));

    // Menu item names and categories
    const menuSummary = menuItems.map((m: any) => ({
      name: m.name,
      category: m.category,
      price: m.price,
      is_veg: m.is_veg,
    }));

    // Order type counts
    const orderTypeCounts: Record<string, number> = {};
    const orderHourCounts: Record<string, number> = {};
    const itemQuantities: Record<string, number> = {};

    orders.forEach((o: any) => {
      const type = o.order_type || "dine-in";
      orderTypeCounts[type] = (orderTypeCounts[type] || 0) + 1;

      // Hour analysis
      if (o.created_at) {
        const hour = new Date(o.created_at).getHours();
        const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
        orderHourCounts[hourLabel] = (orderHourCounts[hourLabel] || 0) + 1;
      }

      // Item quantities
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          let name = "";
          let qty = 1;
          try {
            const parsed = typeof item === "string" ? JSON.parse(item) : item;
            name = parsed.name || "";
            qty = parsed.quantity || 1;
          } catch {
            const match = String(item).match(/^(\d+)x\s+(.+)$/i);
            if (match) {
              qty = parseInt(match[1], 10);
              name = match[2].replace(/@\d+(\.\d+)?\s*$/, "").trim();
            } else {
              name = String(item).replace(/@\d+(\.\d+)?\s*$/, "").trim();
            }
          }
          if (name) {
            itemQuantities[name] = (itemQuantities[name] || 0) + qty;
          }
        });
      }
    });

    // Customer spending
    const customerSpending = customerInsights.slice(0, 20).map((c: any) => ({
      name: c.customer_name,
      total_spent: c.total_spent,
      visits: c.visit_count,
    }));

    return {
      revenue_daily: revSummary,
      menu_items: menuSummary.slice(0, 50),
      order_types: orderTypeCounts,
      order_hours: orderHourCounts,
      item_sales: Object.entries(itemQuantities)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 30)
        .map(([name, qty]) => ({ name, quantity: qty })),
      top_customers: customerSpending,
      top_products: topProducts.map((p: any) => ({
        name: p.name,
        orders: p.orders,
        revenue: p.revenue,
      })),
      total_orders: orders.length,
      date_range: dateRange
        ? {
            from: dateRange.from
              ? format(dateRange.from, "yyyy-MM-dd")
              : null,
            to: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : null,
          }
        : null,
    };
  };

  const generateChart = async (userPrompt: string) => {
    if (!userPrompt.trim() || !restaurantId) return;

    setIsLoading(true);
    setError("");
    setChartOptions(null);

    try {
      const dataContext = buildDataContext();

      const systemPrompt = `You are a data visualization expert for a restaurant analytics system. The user wants to create a custom chart.

Given the restaurant data below, generate a Highcharts configuration as JSON that visualizes what the user requests.

RESTAURANT DATA:
${JSON.stringify(dataContext, null, 2)}

RULES:
1. Return ONLY valid JSON with these fields:
   - "title": chart title string
   - "chartConfig": a valid Highcharts Options object (JSON)
2. The chartConfig must include: chart.type, xAxis, yAxis (if applicable), series, and tooltip
3. Use appealing colors: #8b5cf6, #10b981, #f59e0b, #ec4899, #06b6d4, #f97316, #3b82f6
4. For pie charts, use data format: [{name, y, color}]
5. For bar/line/column charts, use categories on xAxis and data arrays in series
6. Keep chart.backgroundColor as "transparent"
7. Set credits.enabled to false
8. Make the chart responsive and readable
9. Use the actual data from the restaurant data provided
10. If user asks something not possible with the data, explain in the title and show what IS possible
11. Do NOT include any markdown, code fences, or explanation. ONLY the JSON object.`;

      const { data, error: fnError } = await supabase.functions.invoke(
        "chat-with-gemini",
        {
          body: {
            messages: [
              { role: "user", content: userPrompt },
            ],
            restaurantId,
            systemPrompt,
            analysisType: "custom_chart",
          },
        }
      );

      if (fnError) throw fnError;

      // Try to extract JSON from the response
      let responseText = data?.reply || data?.response || data?.text || "";
      if (typeof responseText !== "string") {
        responseText = JSON.stringify(responseText);
      }

      // Clean up response - remove markdown fences if present
      responseText = responseText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();

      // Try to find JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Fallback: generate chart locally based on the prompt
        const fallbackChart = generateLocalChart(userPrompt, dataContext);
        setChartTitle(fallbackChart.title);
        setChartOptions(fallbackChart.chartConfig);
        return;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const config = parsed.chartConfig || parsed;
      const title = parsed.title || userPrompt;

      // Ensure transparent bg and no credits
      if (config.chart) config.chart.backgroundColor = "transparent";
      if (!config.credits) config.credits = { enabled: false };
      config.credits.enabled = false;

      setChartTitle(title);
      setChartOptions(config);
    } catch (err: any) {
      console.error("AI chart generation error:", err);
      // Fallback to local chart generation
      try {
        const dataContext = buildDataContext();
        const fallbackChart = generateLocalChart(userPrompt, dataContext);
        setChartTitle(fallbackChart.title);
        setChartOptions(fallbackChart.chartConfig);
      } catch {
        setError("Could not generate chart. Try a different query.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Local fallback chart generation when AI fails
  const generateLocalChart = (
    query: string,
    data: any
  ): { title: string; chartConfig: Options } => {
    const q = query.toLowerCase();

    // Revenue over time
    if (q.includes("revenue") && (q.includes("time") || q.includes("trend") || q.includes("over"))) {
      return {
        title: "Revenue Over Time",
        chartConfig: {
          chart: { type: "areaspline", backgroundColor: "transparent" },
          credits: { enabled: false },
          xAxis: {
            categories: data.revenue_daily.map((d: any) => d.date),
          },
          yAxis: {
            title: { text: "Revenue (₹)" },
            labels: { format: "₹{value}" },
          },
          series: [
            {
              name: "Revenue",
              type: "areaspline",
              data: data.revenue_daily.map((d: any) => d.revenue),
              color: "#8b5cf6",
            },
          ],
        },
      };
    }

    // Top items
    if (q.includes("top") && (q.includes("item") || q.includes("menu") || q.includes("product"))) {
      const items = data.item_sales.slice(0, 10);
      return {
        title: "Top 10 Menu Items by Quantity Sold",
        chartConfig: {
          chart: { type: "bar", backgroundColor: "transparent" },
          credits: { enabled: false },
          xAxis: { categories: items.map((i: any) => i.name) },
          yAxis: { title: { text: "Quantity Sold" } },
          series: [
            {
              name: "Qty Sold",
              type: "bar",
              data: items.map((i: any, idx: number) => ({
                y: i.quantity,
                color: ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#f97316", "#3b82f6", "#a855f7", "#14b8a6", "#f43f5e"][idx % 10],
              })),
            },
          ],
        },
      };
    }

    // Order type distribution
    if (q.includes("order") && (q.includes("type") || q.includes("distribution"))) {
      const types = Object.entries(data.order_types);
      return {
        title: "Order Distribution by Type",
        chartConfig: {
          chart: { type: "pie", backgroundColor: "transparent" },
          credits: { enabled: false },
          plotOptions: { pie: { innerSize: "50%", showInLegend: true } },
          series: [
            {
              name: "Orders",
              type: "pie",
              data: types.map(([name, value], i) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                y: value as number,
                color: ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"][i % 5],
              })),
            },
          ],
        },
      };
    }

    // Category revenue
    if (q.includes("category") || q.includes("categor")) {
      const catMap: Record<string, number> = {};
      data.menu_items.forEach((m: any) => {
        const sold = data.item_sales.find(
          (s: any) => s.name.toLowerCase() === m.name.toLowerCase()
        );
        if (sold) {
          catMap[m.category] = (catMap[m.category] || 0) + sold.quantity * m.price;
        }
      });
      const cats = Object.entries(catMap).sort(([, a], [, b]) => b - a);
      return {
        title: "Revenue by Menu Category",
        chartConfig: {
          chart: { type: "pie", backgroundColor: "transparent" },
          credits: { enabled: false },
          plotOptions: { pie: { innerSize: "50%", showInLegend: true } },
          series: [
            {
              name: "Revenue",
              type: "pie",
              data: cats.map(([name, value], i) => ({
                name,
                y: value,
                color: ["#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#f97316"][i % 6],
              })),
            },
          ],
        },
      };
    }

    // Customer spending
    if (q.includes("customer") && (q.includes("spend") || q.includes("top"))) {
      return {
        title: "Top Customers by Spending",
        chartConfig: {
          chart: { type: "bar", backgroundColor: "transparent" },
          credits: { enabled: false },
          xAxis: { categories: data.top_customers.map((c: any) => c.name) },
          yAxis: { title: { text: "Total Spent (₹)" } },
          series: [
            {
              name: "Spent",
              type: "bar",
              data: data.top_customers.map((c: any) => c.total_spent),
              color: "#10b981",
            },
          ],
        },
      };
    }

    // Orders vs Revenue
    if (q.includes("order") && q.includes("revenue")) {
      return {
        title: "Orders vs Revenue Over Time",
        chartConfig: {
          chart: { type: "line", backgroundColor: "transparent" },
          credits: { enabled: false },
          xAxis: { categories: data.revenue_daily.map((d: any) => d.date) },
          yAxis: [
            { title: { text: "Revenue (₹)" }, labels: { format: "₹{value}" } },
            { title: { text: "Orders" }, opposite: true },
          ],
          series: [
            {
              name: "Revenue",
              type: "line",
              yAxis: 0,
              data: data.revenue_daily.map((d: any) => d.revenue),
              color: "#8b5cf6",
            },
            {
              name: "Orders",
              type: "column",
              yAxis: 1,
              data: data.revenue_daily.map((d: any) => d.orders),
              color: "#10b981",
            },
          ],
        },
      };
    }

    // Average order value
    if (q.includes("average") || q.includes("avg")) {
      return {
        title: "Average Order Value Over Time",
        chartConfig: {
          chart: { type: "areaspline", backgroundColor: "transparent" },
          credits: { enabled: false },
          xAxis: { categories: data.revenue_daily.map((d: any) => d.date) },
          yAxis: { title: { text: "Avg Order Value (₹)" }, labels: { format: "₹{value}" } },
          series: [
            {
              name: "Avg Order",
              type: "areaspline",
              data: data.revenue_daily.map((d: any) => Math.round(d.avg_order)),
              color: "#f59e0b",
            },
          ],
        },
      };
    }

    // Peak hours
    if (q.includes("hour") || q.includes("peak") || q.includes("time of day")) {
      const hours = Object.entries(data.order_hours)
        .sort(([a], [b]) => a.localeCompare(b));
      return {
        title: "Peak Ordering Hours",
        chartConfig: {
          chart: { type: "column", backgroundColor: "transparent" },
          credits: { enabled: false },
          xAxis: { categories: hours.map(([h]) => h) },
          yAxis: { title: { text: "Number of Orders" } },
          series: [
            {
              name: "Orders",
              type: "column",
              data: hours.map(([, v]) => v as number),
              color: "#06b6d4",
            },
          ],
          plotOptions: { column: { borderRadius: 4 } },
        },
      };
    }

    // Default: revenue + orders combo
    return {
      title: "Revenue & Orders Overview",
      chartConfig: {
        chart: { type: "line", backgroundColor: "transparent" },
        credits: { enabled: false },
        xAxis: { categories: data.revenue_daily.map((d: any) => d.date) },
        yAxis: [
          { title: { text: "Revenue (₹)" }, labels: { format: "₹{value}" } },
          { title: { text: "Orders" }, opposite: true },
        ],
        series: [
          {
            name: "Revenue",
            type: "areaspline",
            yAxis: 0,
            data: data.revenue_daily.map((d: any) => d.revenue),
            color: "#8b5cf6",
          },
          {
            name: "Orders",
            type: "column",
            yAxis: 1,
            data: data.revenue_daily.map((d: any) => d.orders),
            color: "#10b981",
          },
        ],
      },
    };
  };

  const handleSubmit = () => {
    if (prompt.trim()) {
      generateChart(prompt);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
    generateChart(suggestion);
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white/90 to-purple-50/50 dark:from-gray-900/90 dark:to-purple-950/30 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl shadow-lg shadow-purple-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                Custom Chart Builder
              </CardTitle>
              <CardDescription className="text-xs">
                Build charts manually or let AI generate them from your data
              </CardDescription>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                builderMode === "manual"
                  ? "bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
              onClick={() => setBuilderMode("manual")}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Custom Builder
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                builderMode === "ai"
                  ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
              onClick={() => setBuilderMode("ai")}
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              AI Prompt
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {builderMode === "manual" ? (
          /* ── Manual Builder Mode ── */
          <ManualChartBuilder
            orders={orders}
            menuItems={menuItems}
            revenueStats={revenueStats}
            customerInsights={customerInsights}
            topProducts={topProducts}
          />
        ) : (
          /* ── AI Prompt Mode ── */
          <>
            {/* Input area */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Show me revenue vs orders over time, or top 10 items by sales..."
                  className="min-h-[44px] max-h-[80px] resize-none pr-10 text-sm border-purple-200 dark:border-purple-800 focus:border-purple-400 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !prompt.trim()}
                className="h-[44px] px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Suggestions */}
            {!chartOptions && !isLoading && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  <span>Try these:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer text-xs py-1 px-2.5 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-950/50 dark:hover:border-purple-600 transition-colors"
                      onClick={() => handleSuggestion(s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-200 dark:border-purple-800" />
                  <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-purple-500 animate-pulse" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">
                  AI analyzing your data and building chart...
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-sm text-red-600 dark:text-red-400">
                <X className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Chart result */}
            {chartOptions && !isLoading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {chartTitle}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setChartOptions(null);
                      setChartTitle("");
                      setPrompt("");
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={{
                      ...chartOptions,
                      chart: {
                        ...(chartOptions.chart || {}),
                        backgroundColor: "transparent",
                        height: 350,
                      },
                    }}
                    ref={chartRef}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AIChartBuilder;

