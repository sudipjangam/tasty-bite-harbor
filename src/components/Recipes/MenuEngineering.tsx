import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { Recipe } from "@/hooks/useRecipes";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, Legend,
} from "recharts";
import {
  Star, Beef, PuzzleIcon, Dog, TrendingUp, TrendingDown,
  BarChart3, ArrowUpRight, ArrowDownRight, Lightbulb, Target,
  Search, ArrowUpDown, ChevronLeft, ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { subDays, format } from "date-fns";

interface MenuItemAnalysis {
  id: string;
  name: string;
  category: string;
  totalCost: number;
  sellingPrice: number;
  contributionMargin: number;
  marginPercentage: number;
  orderCount: number;
  totalRevenue: number;
  quadrant: "star" | "plowhorse" | "puzzle" | "dog";
}

const QUADRANT_CONFIG = {
  star: {
    label: "Stars",
    icon: Star,
    color: "#f59e0b",
    bgGradient: "from-amber-500 to-yellow-500",
    bgLight: "from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20",
    border: "border-amber-200 dark:border-amber-800",
    description: "High Profit & High Popularity — Promote heavily",
  },
  plowhorse: {
    label: "Plowhorses",
    icon: Beef,
    color: "#3b82f6",
    bgGradient: "from-blue-500 to-cyan-500",
    bgLight: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
    border: "border-blue-200 dark:border-blue-800",
    description: "Low Profit & High Popularity — Re-engineer recipe or raise price",
  },
  puzzle: {
    label: "Puzzles",
    icon: PuzzleIcon,
    color: "#8b5cf6",
    bgGradient: "from-purple-500 to-violet-500",
    bgLight: "from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20",
    border: "border-purple-200 dark:border-purple-800",
    description: "High Profit & Low Popularity — Market more aggressively",
  },
  dog: {
    label: "Dogs",
    icon: Dog,
    color: "#ef4444",
    bgGradient: "from-red-500 to-rose-500",
    bgLight: "from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20",
    border: "border-red-200 dark:border-red-800",
    description: "Low Profit & Low Popularity — Consider removing from menu",
  },
};

interface MenuEngineeringProps {
  recipes: Recipe[];
}

export const MenuEngineering = ({ recipes }: MenuEngineeringProps) => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [periodDays, setPeriodDays] = useState(30);
  const [filterQuadrant, setFilterQuadrant] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof MenuItemAnalysis | null>("totalRevenue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Fetch order data from kitchen_orders to calculate popularity
  const { data: orderItems = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["menu-engineering-orders", restaurantId, periodDays],
    queryFn: async () => {
      if (!restaurantId) return [];

      const startDate = subDays(new Date(), periodDays).toISOString();

      const { data, error } = await supabase
        .from("kitchen_orders")
        .select("items, status, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .in("status", ["completed", "delivered", "served", "bumped"]);

      if (error) throw error;

      // Parse items from JSON and count per item name
      const itemCounts: Record<string, number> = {};
      (data || []).forEach((order) => {
        const items = order.items as any[];
        if (Array.isArray(items)) {
          items.forEach((item) => {
            const itemName = (item.name || item.item_name || "").trim().toLowerCase();
            const qty = item.quantity || 1;
            if (itemName) {
              itemCounts[itemName] = (itemCounts[itemName] || 0) + qty;
            }
          });
        }
      });

      return Object.entries(itemCounts).map(([name, count]) => ({
        name,
        orderCount: count,
      }));
    },
    enabled: !!restaurantId,
  });

  // Analyze menu items
  const analysis: MenuItemAnalysis[] = useMemo(() => {
    if (!recipes.length) return [];

    const activeRecipes = recipes.filter((r) => r.is_active && r.selling_price > 0);
    if (!activeRecipes.length) return [];

    // Match recipes with order counts
    const items: MenuItemAnalysis[] = activeRecipes.map((recipe) => {
      const recipeName = recipe.name.trim().toLowerCase();
      const matchedOrder = orderItems.find((o) => o.name === recipeName);
      const orderCount = matchedOrder?.orderCount || 0;
      const contributionMargin = recipe.selling_price - recipe.total_cost;

      return {
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        totalCost: recipe.total_cost,
        sellingPrice: recipe.selling_price,
        contributionMargin,
        marginPercentage: recipe.margin_percentage,
        orderCount,
        totalRevenue: orderCount * recipe.selling_price,
        quadrant: "dog" as const, // placeholder
      };
    });

    // Calculate medians for quadrant classification
    const margins = items.map((i) => i.contributionMargin).sort((a, b) => a - b);
    const orders = items.map((i) => i.orderCount).sort((a, b) => a - b);
    const medianMargin = margins[Math.floor(margins.length / 2)] || 0;
    const medianOrders = orders[Math.floor(orders.length / 2)] || 0;

    // Classify into quadrants
    return items.map((item) => ({
      ...item,
      quadrant:
        item.contributionMargin >= medianMargin && item.orderCount >= medianOrders
          ? "star"
          : item.contributionMargin < medianMargin && item.orderCount >= medianOrders
          ? "plowhorse"
          : item.contributionMargin >= medianMargin && item.orderCount < medianOrders
          ? "puzzle"
          : "dog",
    }));
  }, [recipes, orderItems]);

  // Filter & Search
  let filteredAnalysis = filterQuadrant === "all" ? analysis : analysis.filter((a) => a.quadrant === filterQuadrant);
  
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredAnalysis = filteredAnalysis.filter((item) => 
      item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }

  // Sort
  const sortedAnalysis = useMemo(() => {
    if (!sortColumn) return filteredAnalysis;
    return [...filteredAnalysis].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredAnalysis, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedAnalysis.length / ITEMS_PER_PAGE);
  const safePage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  const paginatedAnalysis = sortedAnalysis.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const handleSort = (column: keyof MenuItemAnalysis) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc"); // Default to desc for numbers initially
    }
    setCurrentPage(1);
  };


  // Summary stats
  const quadrantCounts = useMemo(() => {
    const counts = { star: 0, plowhorse: 0, puzzle: 0, dog: 0 };
    analysis.forEach((a) => counts[a.quadrant]++);
    return counts;
  }, [analysis]);

  const totalMenuRevenue = analysis.reduce((sum, a) => sum + a.totalRevenue, 0);
  const avgMargin = analysis.length > 0
    ? analysis.reduce((sum, a) => sum + a.marginPercentage, 0) / analysis.length
    : 0;

  // Chart data
  const chartData = analysis.map((item) => ({
    x: item.orderCount,
    y: item.contributionMargin,
    z: item.totalRevenue || 1,
    name: item.name,
    quadrant: item.quadrant,
  }));

  const medianOrders = useMemo(() => {
    const sorted = analysis.map((a) => a.orderCount).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 0;
  }, [analysis]);

  const medianMargin = useMemo(() => {
    const sorted = analysis.map((a) => a.contributionMargin).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 0;
  }, [analysis]);

  if (isLoadingOrders) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Menu Engineering Matrix
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Profitability vs Popularity analysis — last {periodDays} days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
            <SelectTrigger className="w-[130px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterQuadrant} onValueChange={setFilterQuadrant}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="star">⭐ Stars</SelectItem>
              <SelectItem value="plowhorse">🐎 Plowhorses</SelectItem>
              <SelectItem value="puzzle">🧩 Puzzles</SelectItem>
              <SelectItem value="dog">🐕 Dogs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quadrant Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.entries(QUADRANT_CONFIG) as [keyof typeof QUADRANT_CONFIG, typeof QUADRANT_CONFIG["star"]][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            return (
              <Card
                key={key}
                className={`overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl cursor-pointer ${
                  filterQuadrant === key ? "ring-2 ring-offset-2 ring-amber-500" : ""
                }`}
                onClick={() => setFilterQuadrant(filterQuadrant === key ? "all" : key)}
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${config.bgGradient}`} />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 bg-gradient-to-br ${config.bgGradient} rounded-lg`}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {config.label}
                      </span>
                    </div>
                    <span className="text-2xl font-bold">{quadrantCounts[key]}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 leading-tight">
                    {config.description}
                  </p>
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {/* Scatter Chart */}
      {chartData.length > 0 && (
        <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Profitability × Popularity Matrix
            </CardTitle>
            <CardDescription>
              Each bubble represents a menu item. Size = total revenue generated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Orders"
                    label={{ value: "Popularity (Orders)", position: "insideBottom", offset: -10 }}
                    tick={{ fill: "var(--foreground)", fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Margin"
                    label={{ value: `Contribution Margin (${currencySymbol})`, angle: -90, position: "insideLeft", offset: 10 }}
                    tick={{ fill: "var(--foreground)", fontSize: 12 }}
                  />
                  <ZAxis type="number" dataKey="z" range={[50, 400]} />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const data = payload[0]?.payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                          <p className="font-semibold text-sm">{data?.name}</p>
                          <p className="text-xs text-gray-500">Orders: {data?.x}</p>
                          <p className="text-xs text-gray-500">
                            Margin: {currencySymbol}
                            {data?.y?.toFixed(2)}
                          </p>
                          <Badge
                            className="mt-1 text-[10px]"
                            style={{ backgroundColor: QUADRANT_CONFIG[data?.quadrant as keyof typeof QUADRANT_CONFIG]?.color }}
                          >
                            {QUADRANT_CONFIG[data?.quadrant as keyof typeof QUADRANT_CONFIG]?.label}
                          </Badge>
                        </div>
                      );
                    }}
                  />
                  {medianOrders > 0 && (
                    <ReferenceLine x={medianOrders} stroke="#94a3b8" strokeDasharray="5 5" label="" />
                  )}
                  {medianMargin > 0 && (
                    <ReferenceLine y={medianMargin} stroke="#94a3b8" strokeDasharray="5 5" label="" />
                  )}
                  <Scatter data={chartData} fill="#8884d8">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={QUADRANT_CONFIG[entry.quadrant as keyof typeof QUADRANT_CONFIG]?.color}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 mb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-600" />
              Detailed Analysis ({filteredAnalysis.length} items)
            </CardTitle>
            <div className="relative max-w-sm w-full md:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search items..."
                className="pl-9 h-9 rounded-xl focus-visible:ring-emerald-500/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAnalysis.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No menu items to analyze</p>
              <p className="text-sm mt-1">Ensure recipes have selling prices and are marked as active.</p>
            </div>
          ) : (
            <>
              {/* Classification Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <div className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Stars</span>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">High pop. + High profit<br/>→ Keep & promote</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Beef className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Plowhorses</span>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">High pop. + Low profit<br/>→ Raise price/reduce cost</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PuzzleIcon className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Puzzles</span>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Low pop. + High profit<br/>→ Promote aggressively</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Dog className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Dogs</span>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Low pop. + Low profit<br/>→ Consider removing</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">
                        <Button variant="ghost" onClick={() => handleSort("name")} className="-ml-4 h-8 px-4 font-semibold text-gray-600 dark:text-gray-400">
                          Item
                          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">
                        <Button variant="ghost" onClick={() => handleSort("totalCost")} className="-mr-4 h-8 px-4 font-semibold text-gray-600 dark:text-gray-400 justify-end w-full">
                          Cost
                          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">
                        <Button variant="ghost" onClick={() => handleSort("sellingPrice")} className="-mr-4 h-8 px-4 font-semibold text-gray-600 dark:text-gray-400 justify-end w-full">
                          Price
                          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">
                        <Button variant="ghost" onClick={() => handleSort("marginPercentage")} className="-mr-4 h-8 px-4 font-semibold text-gray-600 dark:text-gray-400 justify-end w-full">
                          Margin
                          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">
                        <Button variant="ghost" onClick={() => handleSort("orderCount")} className="-mr-4 h-8 px-4 font-semibold text-gray-600 dark:text-gray-400 justify-end w-full">
                          Orders
                          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">
                        <Button variant="ghost" onClick={() => handleSort("totalRevenue")} className="-mr-4 h-8 px-4 font-semibold text-gray-600 dark:text-gray-400 justify-end w-full">
                          Revenue
                          <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Class</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600 dark:text-gray-400">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAnalysis.map((item) => {
                        const config = QUADRANT_CONFIG[item.quadrant];
                        const Icon = config.icon;
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <td className="py-3 px-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                <p className="text-[11px] text-gray-500">{item.category}</p>
                              </div>
                            </td>
                            <td className="text-right py-3 px-3 font-mono text-xs">
                              {currencySymbol}{item.totalCost.toFixed(0)}
                            </td>
                            <td className="text-right py-3 px-3 font-mono text-xs">
                              {currencySymbol}{item.sellingPrice.toFixed(0)}
                            </td>
                            <td className="text-right py-3 px-3">
                              <div className="flex items-center justify-end gap-1">
                                {item.marginPercentage >= 65 ? (
                                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                                )}
                                <span
                                  className={`font-semibold text-xs ${
                                    item.marginPercentage >= 65
                                      ? "text-emerald-600"
                                      : item.marginPercentage >= 50
                                      ? "text-amber-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {item.marginPercentage.toFixed(0)}%
                                </span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-3 font-mono text-xs font-bold">
                              {item.orderCount}
                            </td>
                            <td className="text-right py-3 px-3 font-mono text-xs">
                              {currencySymbol}{item.totalRevenue.toFixed(0)}
                            </td>
                            <td className="text-center py-3 px-3">
                              <Badge
                                className="text-[10px] border-0 text-white"
                                style={{ backgroundColor: config.color }}
                              >
                                <Icon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-gray-600 dark:text-gray-400 max-w-[140px]">
                              {item.quadrant === "star" && "Keep promoting — top performer"}
                              {item.quadrant === "plowhorse" && "Raise price or reduce costs"}
                              {item.quadrant === "puzzle" && "Increase visibility & marketing"}
                              {item.quadrant === "dog" && "Consider removing or redesigning"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                  <span className="text-xs text-gray-500">
                    Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredAnalysis.length)} of {filteredAnalysis.length}
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPages || (page >= safePage - 1 && page <= safePage + 1))
                      .map((page, index, array) => (
                      <div key={page} className="inline-flex items-center">
                        {index > 0 && page - array[index - 1] > 1 && (
                          <span className="text-gray-400 px-2">...</span>
                        )}
                        <Button
                          variant={page === safePage ? "default" : "outline"}
                          size="icon"
                          className={`h-8 w-8 rounded-lg text-xs ml-1 ${
                            page === safePage ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg ml-1"
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

      {/* Insights Card */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-0 shadow-lg rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md shadow-blue-500/30">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold text-lg">
              Smart Insights
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-sm shadow-amber-500/50" />
                <span className="text-amber-700 dark:text-amber-400 font-semibold text-sm">Revenue Power</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your <strong>Stars</strong> ({quadrantCounts.star} items) are your revenue engine.
                Focus promotions and upselling on these items — they have both high demand and high margins.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 shadow-sm shadow-blue-500/50" />
                <span className="text-blue-700 dark:text-blue-400 font-semibold text-sm">Margin Opportunity</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {quadrantCounts.plowhorse} <strong>Plowhorses</strong> sell well but earn less.
                A small price increase (5-10%) or ingredient substitution can dramatically boost profit.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-red-400 to-rose-500 shadow-sm shadow-red-500/50" />
                <span className="text-red-700 dark:text-red-400 font-semibold text-sm">Menu Trim</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Consider removing or redesigning the {quadrantCounts.dog} <strong>Dogs</strong> on your menu.
                They consume kitchen capacity without generating meaningful returns.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuEngineering;
