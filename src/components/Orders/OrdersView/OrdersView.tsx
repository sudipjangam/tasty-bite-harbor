import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  SlidersHorizontal,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import OrderList from "../OrderList";
import AddOrderForm from "../AddOrderForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import {
  startOfToday,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Order } from "@/types/orders";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/utils/exportUtils";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { EnhancedSkeleton } from "@/components/ui/enhanced-skeleton";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { SyncOrdersButton } from "./SyncOrdersButton";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface OrdersViewProps {
  searchTrigger?: number;
  filterTrigger?: number;
  exportTrigger?: number;
  refreshTrigger?: number;
}

const OrdersView = ({
  searchTrigger = 0,
  filterTrigger = 0,
  exportTrigger = 0,
  refreshTrigger = 0,
}: OrdersViewProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isRole } = useAuth();
  const { symbol: currencySymbol } = useCurrencyContext();

  // Handle triggers from parent component
  useEffect(() => {
    if (searchTrigger > 0) searchInputRef.current?.focus();
  }, [searchTrigger]);

  useEffect(() => {
    if (filterTrigger > 0) setShowFilters(!showFilters);
  }, [filterTrigger]);

  useEffect(() => {
    if (exportTrigger > 0) handleExportOrders();
  }, [exportTrigger]);

  useEffect(() => {
    if (refreshTrigger > 0) refetchOrders();
  }, [refreshTrigger]);

  const getDateRange = useCallback((filter: string) => {
    const now = new Date();
    switch (filter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday": {
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      }
      case "last7days":
        // Last 7 days: 6 days ago (start of day) → today (end of day) = 7 full days
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case "last30days":
        // Last 30 days: 29 days ago (start of day) → today (end of day) = 30 full days
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case "lastMonth": {
        // Full calendar month: 1st → last day of previous month
        const firstOfLastMonth = startOfMonth(subMonths(now, 1));
        const lastOfLastMonth = endOfMonth(subMonths(now, 1));
        return { start: startOfDay(firstOfLastMonth), end: endOfDay(lastOfLastMonth) };
      }
      case "custom":
        if (customDateRange?.from && customDateRange?.to) {
          return { start: startOfDay(customDateRange.from), end: endOfDay(customDateRange.to) };
        }
        return { start: startOfToday(), end: endOfDay(now) };
      default:
        return { start: startOfToday(), end: endOfDay(now) };
    }
  }, [customDateRange]);

  const {
    data: orders,
    refetch: refetchOrders,
    isLoading,
  } = useQuery({
    queryKey: [
      "all-orders",
      dateFilter,
      customDateRange?.from?.toISOString(),
      customDateRange?.to?.toISOString(),
      sourceFilter,
    ],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("No restaurant found for user");

      const dateRange = getDateRange(dateFilter);
      let query = supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      if (sourceFilter !== "all") {
        query = query.eq("source", sourceFilter);
      }

      const { data: allOrders, error: ordersError } = await query.order("created_at", { ascending: false });
      if (ordersError) throw ordersError;
      return (allOrders || []) as Order[];
    },
    staleTime: 0, // Always fetch fresh — orders change frequently
  });

  useRealtimeSubscription({
    table: "orders",
    queryKey: [
      "all-orders",
      dateFilter,
      customDateRange?.from?.toISOString(),
      customDateRange?.to?.toISOString(),
    ],
    schema: "public",
  });

  const handleOrderAdded = useCallback(() => {
    setShowAddForm(false);
    setEditingOrder(null);
    refetchOrders();
  }, [refetchOrders]);

  const handleRefresh = useCallback(() => {
    refetchOrders();
    toast({ title: "Orders Refreshed", description: "Order data has been updated successfully." });
  }, [refetchOrders, toast]);

  const handleExportOrders = useCallback(() => {
    if (!filteredOrders || filteredOrders.length === 0) {
      toast({ variant: "destructive", title: "No Data to Export", description: "There are no orders to export for the selected filters." });
      return;
    }
    try {
      const totalEarned = filteredOrders.reduce((sum, order) => sum + order.total, 0);
      const totalDiscount = filteredOrders.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
      const totalOrders = filteredOrders.length;

      const exportData = filteredOrders.map((order) => ({
        "Order ID": order.id,
        "Customer Name": order.customer_name,
        Items: order.items.join(", "),
        [`Total Amount (${currencySymbol})`]: parseFloat(order.total.toFixed(2)),
        [`Discount (${currencySymbol})`]: order.discount_amount
          ? `${order.discount_amount.toFixed(2)} (${order.discount_percentage}%)`
          : "-",
        "Payment Method": order.payment_method ? order.payment_method.toUpperCase() : "-",
        Status: order.status as string,
        "Created Date": new Date(order.created_at).toLocaleDateString(),
        "Created Time": new Date(order.created_at).toLocaleTimeString(),
      }));

      exportData.push({
        "Order ID": "",
        "Customer Name": "",
        Items: "",
        [`Total Amount (${currencySymbol})`]: "",
        [`Discount (${currencySymbol})`]: "",
        "Payment Method": "",
        Status: "",
        "Created Date": "",
        "Created Time": "",
      });

      exportData.push({
        "Order ID": "SUMMARY",
        "Customer Name": `Total Orders: ${totalOrders}`,
        Items: "",
        [`Total Amount (${currencySymbol})`]: parseFloat(totalEarned.toFixed(2)),
        [`Discount (${currencySymbol})`]: parseFloat(totalDiscount.toFixed(2)),
        "Payment Method": "",
        Status: "",
        "Created Date": getDateFilterLabel(),
        "Created Time": "",
      });

      const filename = `orders_export_${new Date().toISOString().split("T")[0]}`;
      const success = exportToExcel(exportData, filename, "Orders");

      if (success) {
        toast({ title: "Export Successful", description: `Orders exported to ${filename}.xlsx` });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({ variant: "destructive", title: "Export Failed", description: "Failed to export orders. Please try again." });
    }
  }, [currencySymbol, toast]);

  // Filter + sort orders
  const filteredOrders = useMemo(() => {
    let result = orders?.filter((order) => {
      const matchesSearch =
        !searchQuery ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some((item) => item.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pay_later"
            ? order.payment_method === "pay_later"
            : order.status === statusFilter;
      return matchesSearch && matchesStatus;
    }) || [];

    // Sort
    if (sortOrder === "oldest") {
      result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortOrder === "highest") {
      result = [...result].sort((a, b) => b.total - a.total);
    }
    // "newest" is default from server

    return result;
  }, [orders, searchQuery, statusFilter, sortOrder]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedOrders,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination({ data: filteredOrders, itemsPerPage, initialPage: 1 });

  const orderStats = useMemo(() => ({
    totalOrders: filteredOrders.length || 0,
    pendingOrders: filteredOrders.filter((order) =>
      ["pending", "preparing", "ready", "held"].includes(order.status)
    ).length || 0,
    completedOrders: filteredOrders.filter((order) => order.status === "completed").length || 0,
    totalRevenue: filteredOrders
      .filter((order) => order.status === "completed" && order.order_type !== "non-chargeable")
      .reduce((sum, order) => sum + order.total, 0) || 0,
  }), [filteredOrders]);

  const getDateFilterLabel = useCallback(() => {
    switch (dateFilter) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "last7days": return "Last 7 Days";
      case "last30days": return "Last 30 Days";
      case "lastMonth": return "Last Month";
      case "custom":
        if (customDateRange?.from && customDateRange?.to) {
          return `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d")}`;
        }
        return "Custom Range";
      default: return "Today";
    }
  }, [dateFilter, customDateRange]);

  // Status tabs
  const statusTabs = useMemo(() => [
    { id: "all", label: "All Orders", count: orders?.length || 0 },
    { id: "pending", label: "New", count: orders?.filter((o) => o.status === "pending").length || 0 },
    { id: "preparing", label: "Preparing", count: orders?.filter((o) => o.status === "preparing").length || 0 },
    { id: "ready", label: "Ready", count: orders?.filter((o) => o.status === "ready").length || 0 },
    { id: "completed", label: "Completed", count: orders?.filter((o) => o.status === "completed").length || 0 },
    { id: "held", label: "Held", count: orders?.filter((o) => o.status === "held").length || 0 },
    { id: "cancelled", label: "Cancelled", count: orders?.filter((o) => o.status === "cancelled").length || 0 },
    { id: "pay_later", label: "💰 Pay Later", count: orders?.filter((o) => o.payment_method === "pay_later").length || 0 },
  ], [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="p-6 flex-shrink-0">
          <EnhancedSkeleton type="orders" count={1} showHeader={false} />
        </div>
        <div className="flex-1 overflow-hidden p-6">
          <EnhancedSkeleton type="orders" count={itemsPerPage} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ═══ Topbar ═══ */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #f97316 100%)",
          minHeight: isMobile ? 64 : 80,
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 70% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)"
        }} />
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/[0.06]" />

        <div className="relative z-10 h-full flex items-center gap-2 md:gap-4 px-3 md:px-7 py-2 md:py-0" style={{ minHeight: isMobile ? 56 : 80 }}>
          <div className="flex-1 min-w-0">
            {!isMobile && (
              <div className="text-[10px] font-semibold tracking-widest uppercase text-white/60 mb-0.5">
                Restaurant Management
              </div>
            )}
            <h1 className="text-lg md:text-[22px] font-extrabold text-white tracking-tight truncate">
              Orders Management ✦
            </h1>
          </div>

          {/* Live indicator */}
          {!isMobile && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-white/15 px-3 py-1.5 rounded-full border border-white/25 backdrop-blur-sm">
              <span className="w-[7px] h-[7px] rounded-full bg-green-400 shadow-[0_0_8px_#4ade80] animate-pulse" />
              Live · {getDateFilterLabel()}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {(isRole("admin") || isRole("manager") || isRole("owner")) && (
              <button
                onClick={handleExportOrders}
                disabled={!filteredOrders || filteredOrders.length === 0}
                className={`flex items-center justify-center rounded-[10px] text-xs font-semibold text-white bg-white/15 border border-white/30 backdrop-blur-sm hover:bg-white/25 transition-all disabled:opacity-40 ${
                  isMobile ? 'w-8 h-8' : 'gap-1.5 px-4 py-2'
                }`}
                title="Export"
              >
                <Download className="w-3.5 h-3.5" />
                {!isMobile && 'Export'}
              </button>
            )}

            {isRole("admin") && !isMobile && <SyncOrdersButton />}

            <button
              onClick={() => setShowAddForm(true)}
              className={`flex items-center justify-center rounded-[10px] font-bold bg-white text-blue-700 shadow-lg hover:shadow-xl hover:-translate-y-px transition-all ${
                isMobile ? 'w-8 h-8 text-xs' : 'gap-1.5 px-4 py-2 text-xs'
              }`}
              title="New Order"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              {!isMobile && 'New Order'}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <ScrollArea className="flex-1 overflow-auto">
        <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-3.5 mb-5 md:mb-6">
            {/* Active Orders */}
            <div className="relative overflow-hidden rounded-2xl p-4 md:p-[18px] text-white cursor-default transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)", boxShadow: "0 8px 28px rgba(249,115,22,0.45)" }}>
              <div className="absolute -right-5 -bottom-5 w-[90px] h-[90px] rounded-full bg-white/[0.12]" />
              <div className="absolute right-5 bottom-5 w-[50px] h-[50px] rounded-full bg-white/[0.08]" />
              <div className="relative z-10">
                <div className="text-[10px] font-bold tracking-widest uppercase text-white/70 mb-2">Active Orders</div>
                <div className="text-[28px] md:text-[30px] font-extrabold font-mono leading-none tracking-tight">{orderStats.pendingOrders}</div>
                <div className="text-[11px] text-white/65 mt-1.5 font-medium">In preparation now</div>
              </div>
            </div>

            {/* Completed */}
            <div className="relative overflow-hidden rounded-2xl p-4 md:p-[18px] text-white cursor-default transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #059669 0%, #10b981 100%)", boxShadow: "0 8px 28px rgba(5,150,105,0.40)" }}>
              <div className="absolute -right-5 -bottom-5 w-[90px] h-[90px] rounded-full bg-white/[0.12]" />
              <div className="absolute right-5 bottom-5 w-[50px] h-[50px] rounded-full bg-white/[0.08]" />
              <div className="relative z-10">
                <div className="text-[10px] font-bold tracking-widest uppercase text-white/70 mb-2">Completed</div>
                <div className="text-[28px] md:text-[30px] font-extrabold font-mono leading-none tracking-tight">{orderStats.completedOrders}</div>
                <div className="text-[11px] text-white/65 mt-1.5 font-medium">Today so far</div>
              </div>
            </div>

            {/* Total Orders */}
            <div className="relative overflow-hidden rounded-2xl p-4 md:p-[18px] text-white cursor-default transition-transform hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)", boxShadow: "0 8px 28px rgba(29,78,216,0.40)" }}>
              <div className="absolute -right-5 -bottom-5 w-[90px] h-[90px] rounded-full bg-white/[0.12]" />
              <div className="absolute right-5 bottom-5 w-[50px] h-[50px] rounded-full bg-white/[0.08]" />
              <div className="relative z-10">
                <div className="text-[10px] font-bold tracking-widest uppercase text-white/70 mb-2">Total Orders</div>
                <div className="text-[28px] md:text-[30px] font-extrabold font-mono leading-none tracking-tight">{orderStats.totalOrders}</div>
                <div className="text-[11px] text-white/65 mt-1.5 font-medium">{getDateFilterLabel()}</div>
              </div>
            </div>

            {/* Revenue */}
            {(isRole("admin") || isRole("manager") || isRole("owner")) && (
              <div className="relative overflow-hidden rounded-2xl p-4 md:p-[18px] text-white cursor-default transition-transform hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #f97316 0%, #1d4ed8 100%)", boxShadow: "0 8px 28px rgba(249,115,22,0.35)" }}>
                <div className="absolute -right-5 -bottom-5 w-[90px] h-[90px] rounded-full bg-white/[0.12]" />
                <div className="absolute right-5 bottom-5 w-[50px] h-[50px] rounded-full bg-white/[0.08]" />
                <div className="relative z-10">
                  <div className="text-[10px] font-bold tracking-widest uppercase text-white/70 mb-2">Revenue</div>
                  <div className="text-[28px] md:text-[30px] font-extrabold font-mono leading-none tracking-tight">
                    {currencySymbol}{orderStats.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-white/65 mt-1.5 font-medium">Pending collection</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Search + Filters Bar ── */}
          <div className="flex flex-col gap-2 mb-4">
            {/* Search row */}
            <div className="flex flex-col md:flex-row gap-2">
              <div className="w-full md:flex-1 flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-white/85 rounded-xl px-3 md:px-4 py-2 md:py-2.5"
                style={{ boxShadow: "0 8px 32px rgba(29,78,216,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}>
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isMobile ? "Search orders…" : "Search orders, customers, items…"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-[13px] font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {/* Source filter */}
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="flex-1 md:w-[130px] bg-white/70 backdrop-blur-xl border-white/85 rounded-xl text-xs font-semibold text-slate-600 shadow-sm truncate">
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-slate-500 flex-shrink-0" />
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="table">Table Order</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="quickserve">QSR / QuickServe</SelectItem>
                    <SelectItem value="room_service">Room Service</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date filter */}
                <Select
                  value={dateFilter}
                  onValueChange={(value) => {
                    setDateFilter(value);
                    if (value !== "custom") setCustomDateRange(undefined);
                  }}
                >
                  <SelectTrigger className="flex-1 md:w-[130px] bg-white/70 backdrop-blur-xl border-white/85 rounded-xl text-xs font-semibold text-slate-600 shadow-sm truncate">
                    <CalendarDays className="w-3.5 h-3.5 mr-1 text-slate-500 flex-shrink-0" />
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom date picker - separate row */}
            {dateFilter === "custom" && (
              <DatePickerWithRange
                initialDateRange={customDateRange}
                onDateRangeChange={(range) => setCustomDateRange(range)}
              />
            )}
          </div>

          {/* ── Status Tabs ── */}
          <div className="relative mb-4">
            {/* Fade-out gradient on the right edge for scrollable hint */}
            {isMobile && (
              <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none rounded-r-[14px]"
                style={{ background: 'linear-gradient(to right, transparent, rgba(240,244,255,0.95))' }}
              />
            )}
            <div
              className="flex gap-1 overflow-x-auto pb-0 bg-white/70 backdrop-blur-xl border border-white/85 rounded-[14px] p-1"
              style={{ boxShadow: "0 8px 32px rgba(29,78,216,0.12), 0 2px 8px rgba(0,0,0,0.06)", scrollbarWidth: "none", WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none' }}
            >
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`
                    flex items-center gap-1 md:gap-1.5 px-3 md:px-4 py-[7px] rounded-[10px] text-[11px] md:text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
                    ${statusFilter === tab.id
                      ? "text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-600 hover:bg-white/55"
                    }
                  `}
                  style={statusFilter === tab.id ? {
                    background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #f97316 100%)",
                    boxShadow: "0 4px 16px rgba(29,78,216,0.35)",
                  } : {}}
                >
                  {tab.label}
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-px rounded-md ${
                    statusFilter === tab.id ? "bg-white/[0.22]" : "bg-slate-100 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Orders Header ── */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-slate-500">
              Showing {filteredOrders.length} orders
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-white/70 backdrop-blur-sm border border-white/85 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-600 outline-none cursor-pointer"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
              </select>
            </div>
          </div>

          {/* ── Order Cards ── */}
          <OrderList
            orders={paginatedOrders}
            onOrdersChange={refetchOrders}
            onEditOrder={setEditingOrder}
            isLoading={isLoading}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={goToPage}
                onItemsPerPageChange={setItemsPerPage}
                showItemsPerPage={true}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add/Edit Order Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent
          className={`${isMobile ? "w-[95%] max-w-lg" : "max-w-4xl"} max-h-[95vh] overflow-y-auto p-0 [&>button]:hidden`}
        >
          <AddOrderForm
            onSuccess={handleOrderAdded}
            onCancel={() => {
              setShowAddForm(false);
              setEditingOrder(null);
            }}
            editingOrder={editingOrder}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersView;
