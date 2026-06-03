import { useState, useEffect, useMemo } from "react";
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
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  ChevronLeft,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { DateRange } from "react-day-picker";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
} from "date-fns";

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

type DatePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "last7"
  | "last30"
  | "thisMonth"
  | "thisYear"
  | "custom";

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "thisWeek", label: "This Week" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "thisYear", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

const getPresetRange = (preset: DatePreset): DateRange | undefined => {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday":
      return {
        from: startOfDay(subDays(now, 1)),
        to: endOfDay(subDays(now, 1)),
      };
    case "thisWeek":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case "last7":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last30":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "thisYear":
      return { from: startOfYear(now), to: endOfDay(now) };
    default:
      return undefined;
  }
};

type SortField = "created_at" | "value" | "customer_name" | "nc_reason";
type SortDirection = "asc" | "desc";

const REASON_LABELS: Record<string, string> = {
  staff_meal: "Staff Meal",
  promotional: "Promotional",
  vip_guest: "VIP Guest",
  complaint: "Complaint Resolution",
  management: "Management Discretion",
  event: "Event/Catering",
  owner_complimentary: "Owner Complimentary",
  other: "Other",
  unknown: "Unknown",
};

const ROWS_PER_PAGE = 10;

export const NCOrdersReport = () => {
  const { restaurantId } = useRestaurantId();

  const [activePreset, setActivePreset] = useState<DatePreset>("last30");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    getPresetRange("last30")
  );

  const [loading, setLoading] = useState(true);
  const [ncOrders, setNcOrders] = useState<NCOrder[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<NCOrder | null>(null);

  // Search / Sort / Filter
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data
  useEffect(() => {
    if (!restaurantId || !dateRange?.from) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const start = startOfDay(dateRange.from!).toISOString();
        const end = endOfDay(dateRange.to ?? dateRange.from!).toISOString();

        const [ncResult, revenueResult] = await Promise.all([
          supabase
            .from("orders")
            .select(
              "id, created_at, total, discount_amount, nc_reason, customer_name, items, attendant"
            )
            .eq("restaurant_id", restaurantId)
            .eq("order_type", "non-chargeable")
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: false }),

          supabase
            .from("orders")
            .select("total")
            .eq("restaurant_id", restaurantId)
            .neq("order_type", "non-chargeable")
            .eq("status", "completed")
            .gte("created_at", start)
            .lte("created_at", end),
        ]);

        setNcOrders(ncResult.data || []);

        const revenue = (revenueResult.data || []).reduce(
          (sum, o) => sum + (Number(o.total) || 0),
          0
        );
        setTotalRevenue(revenue);
      } catch (err) {
        console.error("NC orders fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId, dateRange]);

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    setCurrentPage(1);
    if (preset === "custom") {
      setShowCustomPicker(true);
      return;
    }
    setShowCustomPicker(false);
    const range = getPresetRange(preset);
    if (range) setDateRange(range);
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setActivePreset("custom");
    setShowCustomPicker(true);
    setCurrentPage(1);
  };

  const getOrderValue = (order: NCOrder) =>
    Number(order.discount_amount) || Number(order.total) || 0;

  // Metrics
  const totalNCValue = useMemo(
    () => ncOrders.reduce((sum, o) => sum + getOrderValue(o), 0),
    [ncOrders]
  );

  const ncPercentage = useMemo(
    () =>
      totalRevenue > 0
        ? (totalNCValue / (totalRevenue + totalNCValue)) * 100
        : 0,
    [totalNCValue, totalRevenue]
  );

  // Reason breakdown
  const reasonBreakdown = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    ncOrders.forEach((o) => {
      const r = o.nc_reason || "unknown";
      const ex = map.get(r) || { value: 0, count: 0 };
      map.set(r, { value: ex.value + getOrderValue(o), count: ex.count + 1 });
    });
    return Array.from(map.entries())
      .map(([reason, stats]) => ({ reason, ...stats }))
      .sort((a, b) => b.value - a.value);
  }, [ncOrders]);

  // All unique reasons for filter dropdown
  const allReasons = useMemo(
    () => ["all", ...Array.from(new Set(ncOrders.map((o) => o.nc_reason || "unknown")))],
    [ncOrders]
  );

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 text-violet-400" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-violet-400" />
    );
  };

  // Filtered + sorted orders
  const processedOrders = useMemo(() => {
    let filtered = ncOrders;

    if (reasonFilter !== "all") {
      filtered = filtered.filter(
        (o) => (o.nc_reason || "unknown") === reasonFilter
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.customer_name?.toLowerCase().includes(q) ||
          (o.nc_reason || "").toLowerCase().includes(q) ||
          (o.attendant || "").toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at") {
        cmp =
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === "value") {
        cmp = getOrderValue(a) - getOrderValue(b);
      } else if (sortField === "customer_name") {
        cmp = (a.customer_name || "").localeCompare(b.customer_name || "");
      } else if (sortField === "nc_reason") {
        cmp = (a.nc_reason || "").localeCompare(b.nc_reason || "");
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [ncOrders, search, reasonFilter, sortField, sortDir]);

  const totalPages = Math.ceil(processedOrders.length / ROWS_PER_PAGE);
  const paginatedOrders = processedOrders.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const parseItems = (items: string[]) =>
    items.map((item) => {
      const match = item.match(/^(\d+)x\s+(.+?)\s*@(\d+)$/);
      if (match)
        return {
          quantity: parseInt(match[1]),
          name: match[2],
          price: parseInt(match[3]),
        };
      return { quantity: 1, name: item, price: 0 };
    });

  // ──────────────────────────────────────────────────────────
  // LOADING SKELETON
  // ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 p-1">
        <div className="animate-pulse space-y-4">
          <div className="h-10 rounded-2xl bg-white/10 dark:bg-white/5 w-1/2" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 w-24 rounded-full bg-white/10 dark:bg-white/5"
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white/10 dark:bg-white/5"
              />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-white/10 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div
      className="relative space-y-6 p-1"
      style={{
        background: "transparent",
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #ea580c 100%)",
              }}
            >
              <Ban className="h-5 w-5 text-white" />
            </div>
            <h2
              className="text-2xl font-extrabold tracking-tight"
              style={{
                background:
                  "linear-gradient(90deg, #7c3aed, #db2777, #ea580c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Non-Chargeable Orders
            </h2>
          </div>
          <p className="text-sm text-muted-foreground ml-13 pl-0.5">
            Track and analyze all complimentary orders
          </p>
        </div>
      </div>

      {/* ── DATE PRESETS ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset.id)}
              className={`px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-full border transition-all duration-200 ${
                activePreset === preset.id
                  ? "border-violet-500/40 text-violet-600 dark:text-violet-400 shadow-sm"
                  : "bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10 text-muted-foreground hover:bg-white/20 hover:text-foreground"
              }`}
              style={
                activePreset === preset.id
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.08))",
                    }
                  : {}
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
        {showCustomPicker && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <DatePickerWithRange
              initialDateRange={dateRange}
              onDateRangeChange={handleCustomDateChange}
            />
          </div>
        )}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total NC Value */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 border shadow-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(219,39,119,0.12) 50%, rgba(234,88,12,0.08) 100%)",
            borderColor: "rgba(124,58,237,0.3)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* 3D Glow */}
          <div
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)",
            }}
          />
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              Total NC Value
            </p>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(219,39,119,0.3))",
              }}
            >
              <Ban className="h-4 w-4 text-violet-300" />
            </div>
          </div>
          <div
            className="text-3xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #a78bfa, #f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            <CurrencyDisplay amount={totalNCValue} showTooltip={false} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cost of complimentary orders
          </p>
        </div>

        {/* NC Order Count */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 border shadow-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(6,182,212,0.08) 100%)",
            borderColor: "rgba(59,130,246,0.25)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
            }}
          />
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
              NC Orders
            </p>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(6,182,212,0.3))",
              }}
            >
              <Package className="h-4 w-4 text-blue-300" />
            </div>
          </div>
          <div
            className="text-3xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {ncOrders.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total non-chargeable orders
          </p>
        </div>

        {/* % of Revenue */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 border shadow-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(234,88,12,0.12) 0%, rgba(251,146,60,0.08) 100%)",
            borderColor: "rgba(234,88,12,0.25)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(234,88,12,0.25) 0%, transparent 70%)",
            }}
          />
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-400">
              % of Revenue
            </p>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(234,88,12,0.4), rgba(251,146,60,0.3))",
              }}
            >
              <TrendingUp className="h-4 w-4 text-orange-300" />
            </div>
          </div>
          <div
            className="text-3xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #fb923c, #fbbf24)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {ncPercentage.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            NC value as % of total revenue
          </p>
        </div>
      </div>

      {/* ── REASON BREAKDOWN ── */}
      <div
        className="rounded-2xl border overflow-hidden shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          borderColor: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Shine top border */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(124,58,237,0.5), rgba(219,39,119,0.4), transparent)",
          }}
        />
        <div className="p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <div
              className="w-1 h-5 rounded-full"
              style={{
                background:
                  "linear-gradient(180deg, #7c3aed, #db2777)",
              }}
            />
            Non-Chargeable Orders by Reason
          </h3>
          {reasonBreakdown.length === 0 ? (
            <div className="text-center py-8">
              <Ban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No NC orders in this period
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reasonBreakdown.map((item, idx) => {
                const pct =
                  totalNCValue > 0
                    ? (item.value / totalNCValue) * 100
                    : 0;
                return (
                  <div key={item.reason} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {REASON_LABELS[item.reason] || item.reason}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({item.count} order{item.count !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-foreground">
                          <CurrencyDisplay
                            amount={item.value}
                            showTooltip={false}
                          />
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-white/10 dark:bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${
                            [
                              "#7c3aed",
                              "#db2777",
                              "#ea580c",
                              "#3b82f6",
                              "#10b981",
                              "#f59e0b",
                              "#ef4444",
                            ][idx % 7]
                          }, ${
                            [
                              "#db2777",
                              "#ea580c",
                              "#f59e0b",
                              "#06b6d4",
                              "#34d399",
                              "#fbbf24",
                              "#fb7185",
                            ][idx % 7]
                          })`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── ALL ORDERS TABLE ── */}
      <div
        className="rounded-2xl border overflow-hidden shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          borderColor: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Shine top border */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), rgba(6,182,212,0.4), transparent)",
          }}
        />

        {/* Table Header */}
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <div
                className="w-1 h-5 rounded-full"
                style={{ background: "linear-gradient(180deg, #3b82f6, #06b6d4)" }}
              />
              <ClipboardList className="h-4 w-4" />
              All Non-Chargeable Orders
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({processedOrders.length} results)
              </span>
            </h3>

            {/* Search + Filter row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-8 py-2 text-xs rounded-xl border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400/40 transition-all w-full sm:w-52"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderColor: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                  }}
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Reason filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={reasonFilter}
                  onChange={(e) => {
                    setReasonFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 text-xs rounded-xl border text-foreground focus:outline-none focus:ring-2 focus:ring-violet-400/30 appearance-none w-full sm:w-44"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderColor: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {allReasons.map((r) => (
                    <option key={r} value={r}>
                      {r === "all"
                        ? "All Reasons"
                        : REASON_LABELS[r] || r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sort header row */}
        <div
          className="grid grid-cols-4 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider border-b border-white/[0.06]"
          style={{ color: "rgba(167,139,250,0.8)" }}
        >
          <button
            className="flex items-center gap-1 hover:text-violet-300 transition-colors text-left"
            onClick={() => handleSort("customer_name")}
          >
            Customer <SortIcon field="customer_name" />
          </button>
          <button
            className="flex items-center gap-1 hover:text-violet-300 transition-colors text-left"
            onClick={() => handleSort("nc_reason")}
          >
            Reason <SortIcon field="nc_reason" />
          </button>
          <button
            className="flex items-center gap-1 hover:text-violet-300 transition-colors text-left"
            onClick={() => handleSort("created_at")}
          >
            Date <SortIcon field="created_at" />
          </button>
          <button
            className="flex items-center gap-1 hover:text-violet-300 transition-colors text-right ml-auto"
            onClick={() => handleSort("value")}
          >
            Value <SortIcon field="value" />
          </button>
        </div>

        {/* Order rows */}
        <div>
          {paginatedOrders.length === 0 ? (
            <div className="text-center py-12">
              <Ban className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search || reasonFilter !== "all"
                  ? "No orders match your filters"
                  : "No NC orders in this period"}
              </p>
            </div>
          ) : (
            paginatedOrders.map((order, idx) => (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full text-left group transition-all duration-200 border-b border-white/[0.04] last:border-0"
                style={{
                  background:
                    idx % 2 === 0
                      ? "rgba(255,255,255,0.01)"
                      : "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(90deg, rgba(124,58,237,0.06), rgba(219,39,119,0.04))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    idx % 2 === 0
                      ? "rgba(255,255,255,0.01)"
                      : "transparent";
                }}
              >
                <div className="grid grid-cols-4 items-center px-5 py-4">
                  {/* Customer */}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {order.customer_name}
                    </p>
                    {order.attendant && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" />
                        {order.attendant}
                      </p>
                    )}
                  </div>

                  {/* Reason */}
                  <div>
                    <span
                      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.15))",
                        border: "1px solid rgba(124,58,237,0.3)",
                        color: "#c4b5fd",
                      }}
                    >
                      {REASON_LABELS[order.nc_reason || "unknown"] ||
                        order.nc_reason ||
                        "Unknown"}
                    </span>
                  </div>

                  {/* Date + items */}
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(order.created_at), "MMM d, h:mm a")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.items.length} item
                      {order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Value + chevron */}
                  <div className="flex items-center justify-end gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{
                        background:
                          "linear-gradient(90deg, #a78bfa, #f472b6)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      <CurrencyDisplay
                        amount={getOrderValue(order)}
                        showTooltip={false}
                      />
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-400 transition-colors" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, processedOrders.length)}
              –{Math.min(currentPage * ROWS_PER_PAGE, processedOrders.length)}{" "}
              of {processedOrders.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 text-muted-foreground hover:text-foreground hover:border-violet-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold border transition-all"
                    style={
                      currentPage === page
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(219,39,119,0.2))",
                            borderColor: "rgba(124,58,237,0.4)",
                            color: "#c4b5fd",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            borderColor: "rgba(255,255,255,0.1)",
                            color: "var(--muted-foreground)",
                          }
                    }
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 text-muted-foreground hover:text-foreground hover:border-violet-400/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ORDER DETAIL DIALOG ── */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent
          className="max-w-lg border-0 p-0 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(17,17,34,0.97) 0%, rgba(30,10,50,0.97) 100%)",
            backdropFilter: "blur(40px)",
          }}
        >
          {/* Dialog shine top */}
          <div
            className="h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(219,39,119,0.5), transparent)",
            }}
          />

          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="flex items-center justify-between">
              <span
                className="text-base font-extrabold"
                style={{
                  background: "linear-gradient(90deg, #a78bfa, #f472b6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                NC Order Details
              </span>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="px-6 pb-6 pt-4 space-y-4">
              {/* Order header info */}
              <div
                className="rounded-xl p-4 border"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.08))",
                  borderColor: "rgba(124,58,237,0.25)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base text-foreground">
                    {selectedOrder.customer_name}
                  </h3>
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(219,39,119,0.2))",
                      border: "1px solid rgba(124,58,237,0.3)",
                      color: "#c4b5fd",
                    }}
                  >
                    {REASON_LABELS[selectedOrder.nc_reason || "unknown"] ||
                      selectedOrder.nc_reason ||
                      "Unknown"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {format(
                      new Date(selectedOrder.created_at),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </div>
                  {selectedOrder.attendant && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {selectedOrder.attendant}
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Order Items
                </h4>
                <div className="space-y-2">
                  {parseItems(selectedOrder.items).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        borderColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{
                            background: "rgba(124,58,237,0.2)",
                            color: "#c4b5fd",
                          }}
                        >
                          {item.quantity}×
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {item.name}
                        </span>
                      </div>
                      {item.price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          @₹{item.price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div
                className="rounded-xl p-4 border flex items-center justify-between"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(219,39,119,0.06))",
                  borderColor: "rgba(124,58,237,0.2)",
                }}
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    Original Value
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    100% complimentary
                  </p>
                </div>
                <div
                  className="text-2xl font-extrabold"
                  style={{
                    background: "linear-gradient(90deg, #a78bfa, #f472b6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  <CurrencyDisplay
                    amount={getOrderValue(selectedOrder)}
                    showTooltip={false}
                  />
                </div>
              </div>

              {/* Order ID */}
              <p className="text-[10px] text-muted-foreground/60 font-mono">
                ID: {selectedOrder.id}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NCOrdersReport;
