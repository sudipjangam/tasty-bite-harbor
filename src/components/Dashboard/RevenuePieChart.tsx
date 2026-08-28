import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatIndianCurrency } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Bed,
  ChefHat,
  Sparkles,
  PieChart as PieChartIcon,
  Layers,
  ArrowUpRight,
} from "lucide-react";

interface CategoryRevenue {
  category: string;
  revenue: number;
}

type FilterPeriod = "today" | "yesterday" | "month" | "all";

// Sample fallback data when no orders exist yet
const SAMPLE_DATA: CategoryRevenue[] = [
  { category: "Dine In", revenue: 56200 },
  { category: "Takeaway", revenue: 12400 },
  { category: "Delivery", revenue: 6800 },
  { category: "Room Service", revenue: 4200 },
  { category: "Non Chargeable", revenue: 1500 },
];

const CATEGORY_ICONS: Record<string, any> = {
  "Dine In": UtensilsCrossed,
  "Dine-In": UtensilsCrossed,
  "Takeaway": ShoppingBag,
  "Delivery": Truck,
  "Room Service": Bed,
  "Catering": ChefHat,
  "Non Chargeable": Layers,
  "NC": Layers,
};

// Vibrant modern gradient palettes matching the mockup
const SLICE_COLORS = [
  { stroke: "url(#gradient-orange-pink)", solid: "#ff6b4a", glow: "rgba(255, 107, 74, 0.4)", text: "text-orange-500" },
  { stroke: "url(#gradient-yellow-lime)", solid: "#ffd147", glow: "rgba(255, 209, 71, 0.4)", text: "text-amber-500" },
  { stroke: "url(#gradient-emerald-teal)", solid: "#10b981", glow: "rgba(16, 185, 129, 0.4)", text: "text-emerald-500" },
  { stroke: "url(#gradient-cyan-blue)", solid: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)", text: "text-cyan-500" },
  { stroke: "url(#gradient-indigo-purple)", solid: "#6366f1", glow: "rgba(99, 102, 241, 0.4)", text: "text-indigo-500" },
  { stroke: "url(#gradient-pink-rose)", solid: "#ec4899", glow: "rgba(236, 72, 153, 0.4)", text: "text-pink-500" },
];

export const RevenuePieChart: React.FC = () => {
  const [period, setPeriod] = useState<FilterPeriod>("month");
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);

  // Fetch orders data grouped by category & filtered by period
  const { data: rawOrders = [], isLoading } = useQuery({
    queryKey: ["revenue-by-order-type", period],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("order_type, total, status, created_at")
        .in("status", ["completed", "paid", "ready", "pending", "preparing"]);

      const now = new Date();
      if (period === "today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        query = query.gte("created_at", todayStart);
      } else if (period === "yesterday") {
        const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte("created_at", yStart.toISOString()).lt("created_at", yEnd.toISOString());
      } else if (period === "month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte("created_at", monthStart);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Process data
  const revenueData = useMemo<CategoryRevenue[]>(() => {
    if (!rawOrders || rawOrders.length === 0) return SAMPLE_DATA;

    const typeMap: Record<string, number> = {};
    rawOrders.forEach((order) => {
      let orderType = order.order_type || "Dine In";
      // Normalize
      const normalized = orderType
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      typeMap[normalized] = (typeMap[normalized] || 0) + (Number(order.total) || 0);
    });

    const list = Object.entries(typeMap)
      .map(([category, revenue]) => ({ category, revenue }))
      .filter((i) => i.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    return list.length > 0 ? list : SAMPLE_DATA;
  }, [rawOrders]);

  const totalRevenue = useMemo(() => {
    return revenueData.reduce((acc, curr) => acc + curr.revenue, 0) || 1;
  }, [revenueData]);

  // SVG Geometry configuration
  const size = 260;
  const strokeWidth = 24;
  const radius = 88;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute segments
  let cumulativePercent = 0;
  const segments = revenueData.map((item, index) => {
    const percent = item.revenue / totalRevenue;
    const strokeDasharray = `${percent * circumference} ${circumference * (1 - percent)}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += percent;

    const colorConfig = SLICE_COLORS[index % SLICE_COLORS.length];
    const IconComponent = CATEGORY_ICONS[item.category] || UtensilsCrossed;

    return {
      ...item,
      percent,
      percentDisplay: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      colorConfig,
      IconComponent,
    };
  });

  const activeItem = activeHoverIndex !== null ? segments[activeHoverIndex] : segments[0];

  return (
    <div className="flex flex-col h-full space-y-5 select-none">
      
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl skeuo-circle">
            <PieChartIcon className="h-4 w-4 text-[#F26722]" />
          </div>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white text-base tracking-tight">
              Revenue by Category
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
              Sales distribution & order channel breakdown
            </p>
          </div>
        </div>

        {/* Sunken Time Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl skeuo-inset self-start sm:self-auto">
          {(["today", "yesterday", "month", "all"] as FilterPeriod[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPeriod(tab)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all touch-manipulation",
                period === tab
                  ? "skeuo-btn text-[#2E3192] dark:text-white scale-105"
                  : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ─── SKEUOMORPHIC 3D DONUT CHART ─── */}
      <div className="relative flex flex-col items-center justify-center py-2">
        
        {/* Sunken Plate Container */}
        <div className="relative flex items-center justify-center p-3 rounded-full skeuo-circle-inset">
          
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 filter drop-shadow-md"
          >
            <defs>
              {/* Vibrant Skeuomorphic Gradients */}
              <linearGradient id="gradient-orange-pink" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F26722" />
                <stop offset="100%" stopColor="#ff4757" />
              </linearGradient>

              <linearGradient id="gradient-yellow-lime" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd147" />
                <stop offset="100%" stopColor="#2ed573" />
              </linearGradient>

              <linearGradient id="gradient-emerald-teal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>

              <linearGradient id="gradient-cyan-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d2d3" />
                <stop offset="100%" stopColor="#2E3192" />
              </linearGradient>

              <linearGradient id="gradient-indigo-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>

              <linearGradient id="gradient-pink-rose" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>

              {/* Shadow filter for segment ends */}
              <filter id="arc-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Recessed track / groove */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-200/80 dark:text-slate-800"
            />

            {/* Colored Glowing Donut Segments with Round Caps */}
            {segments.map((seg, idx) => {
              const isHovered = activeHoverIndex === idx;
              return (
                <circle
                  key={seg.category}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={seg.colorConfig.stroke}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                  filter="url(#arc-glow)"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setActiveHoverIndex(idx)}
                  onMouseLeave={() => setActiveHoverIndex(null)}
                  onClick={() => setActiveHoverIndex(idx)}
                />
              );
            })}
          </svg>

          {/* Central Raised 3D Disc (Neumorphic Core) */}
          <div className="absolute inset-0 m-auto h-28 w-28 rounded-full skeuo-circle flex flex-col items-center justify-center p-2 text-center pointer-events-none transition-transform duration-300 hover:scale-105">
            <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              {activeHoverIndex !== null ? "Selected" : "Total Sales"}
            </div>
            <div className="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight leading-tight mt-0.5">
              {activeHoverIndex !== null
                ? formatIndianCurrency(activeItem.revenue).formatted
                : formatIndianCurrency(totalRevenue).formatted}
            </div>
            <div className="text-[10px] font-bold text-[#2E3192] dark:text-indigo-400 mt-0.5">
              {activeHoverIndex !== null ? `${activeItem.percentDisplay}%` : "100%"}
            </div>
          </div>
        </div>

        {/* ─── Floating Skeuomorphic Active Tag (Exact match to Mockup Tag) ─── */}
        {activeItem && (
          <div className="mt-4 px-4 py-2 rounded-2xl skeuo-btn flex items-center gap-2.5 shadow-lg border border-white/80 dark:border-white/10 transition-all duration-300">
            <div className="p-1.5 rounded-lg skeuo-inset">
              <activeItem.IconComponent className={cn("h-4 w-4", activeItem.colorConfig.text)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-900 dark:text-white">
                {activeItem.percentDisplay}%
              </span>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                ({activeItem.category})
              </span>
              <span className="text-xs font-black text-[#2E3192] dark:text-indigo-400 ml-1">
                {formatIndianCurrency(activeItem.revenue).formatted}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Category Breakdown Cards List ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        {segments.map((seg, idx) => {
          const isHovered = activeHoverIndex === idx;
          return (
            <div
              key={seg.category}
              onMouseEnter={() => setActiveHoverIndex(idx)}
              onMouseLeave={() => setActiveHoverIndex(null)}
              onClick={() => setActiveHoverIndex(idx)}
              className={cn(
                "flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer touch-manipulation",
                isHovered ? "skeuo-btn scale-[1.02] border-primary/30" : "skeuo-card-sm"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="h-3 w-3 rounded-full shadow-sm"
                  style={{ backgroundColor: seg.colorConfig.solid }}
                />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {seg.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-gray-900 dark:text-white">
                  {formatIndianCurrency(seg.revenue).formatted}
                </span>
                <span className="text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded-full skeuo-inset">
                  {seg.percentDisplay}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RevenuePieChart;
