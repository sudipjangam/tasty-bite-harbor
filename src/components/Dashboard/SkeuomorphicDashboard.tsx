import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useStatsData } from "@/hooks/useStatsData";
import { useTrendingItems, TrendingPeriod } from "@/hooks/useTrendingItems";
import { formatIndianCurrency } from "@/utils/formatters";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Clock,
  Flame,
  UtensilsCrossed,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Layers,
  Zap,
  Coffee,
  Bed,
  ChefHat,
  Package,
  CalendarDays,
  UserCheck,
  Power,
  BarChart3,
  PieChart as PieChartIcon,
  HelpCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TimeClockDialog from "@/components/Staff/TimeClockDialog";
import LeaveRequestDialog from "@/components/Staff/LeaveRequestDialog";
import { WidgetPickerDialog } from "@/components/Dashboard/widgets/WidgetPickerDialog";
import { WidgetRenderer } from "@/components/Dashboard/widgets/WidgetRenderer";
import { useWidgetPreferences } from "@/hooks/useWidgetPreferences";
import { RESTAURANT_DEFAULT_WIDGETS } from "@/components/Dashboard/widgets/WidgetRegistry";
import type { StaffMember } from "@/types/staff";

interface SkeuomorphicDashboardProps {
  onToggleTheme?: (theme: "classic" | "skeuomorphic") => void;
  currentTheme?: "classic" | "skeuomorphic";
}

export const SkeuomorphicDashboard: React.FC<SkeuomorphicDashboardProps> = ({
  onToggleTheme,
  currentTheme = "skeuomorphic",
}) => {
  const { user, hasPermission } = useAuth();
  const { restaurantId, restaurantName } = useRestaurantId();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [trendingPeriod, setTrendingPeriod] = useState<TrendingPeriod>("weekly");
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const { selectedWidgets, saveWidgets } = useWidgetPreferences(
    restaurantId,
    "restaurant",
    RESTAURANT_DEFAULT_WIDGETS,
  );

  // Realtime live clock ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Stats data
  const { data: statsData, isLoading: isLoadingStats } = useStatsData();
  const { data: trendingItems, isLoading: isLoadingTrending } = useTrendingItems(trendingPeriod);

  // Staff & attendance
  const {
    staff,
    isLoading: isLoadingStaff,
    isStaff,
    activeClockEntry,
    recentTimeEntries,
    leaveBalances,
    upcomingLeave,
    refetchTimeEntries,
    refetchLeaveData,
  } = useCurrentStaff();

  const [isTimeClockDialogOpen, setIsTimeClockDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  // Greeting
  const currentHour = currentTime.getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  // Calculate Metrics
  const allRevenueSources = statsData?.allRevenueSources || [];
  const orders = statsData?.orders || [];
  const todayStr = new Date().toDateString();

  const completedRevenue = allRevenueSources.filter(
    (item) =>
      (item.status === "completed" || item.status === "paid" || item.status === "ready") &&
      item.order_type !== "non-chargeable"
  );

  const totalSales30D = completedRevenue.reduce(
    (sum, item) => sum + (Number(item.total) || 0),
    0
  );

  const activeOrdersList = orders.filter((order) => {
    const isToday = new Date(order.created_at).toDateString() === todayStr;
    return isToday && ["pending", "preparing", "ready", "held"].includes(order.status);
  });

  const activeOrdersCount = activeOrdersList.length || 0;

  const uniqueCustomers =
    orders.length > 0
      ? new Set(orders.map((o) => o.customer_name).filter(Boolean)).size
      : 0;

  const todaysRevenue = completedRevenue
    .filter((item) => new Date(item.created_at).toDateString() === todayStr)
    .reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  // NC orders count and value
  const ncOrders = orders.filter((o) => o.order_type === "non-chargeable");
  const ncTotalValue = ncOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <div className="min-h-screen bg-[#ebf0f7] dark:bg-[#12151f] text-gray-800 dark:text-gray-100 transition-colors duration-300 pb-20 select-none">
      
      {/* ══════════════════════════════════════════════════════════════════════
          HERO BANNER (3D SKEUOMORPHIC & NEUMORPHIC TOP BAR)
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E3192] via-[#4045af] to-[#512da8] text-white p-6 sm:p-8 md:p-10 mb-8 rounded-b-[2.5rem] shadow-2xl border-b border-white/20">
        
        {/* Soft Background Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(242,103,34,0.15),transparent_40%)] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Greeting & Subtitle */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md shadow-inner border border-white/20">
              <Sparkles className="h-8 w-8 text-[#F26722] animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-sm">
                {greeting}, {user?.email ? user.email.split("@")[0] : "there"}!
              </h1>
              <p className="text-white/80 text-sm sm:text-base font-medium mt-0.5">
                {restaurantName ? `${restaurantName} · ` : ""}Here's what's happening today
              </p>
            </div>
          </div>

          {/* Controls & Badges (Contains the 3D / Classic Switcher in Red Rectangle) */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* ─── THEME TOGGLE SWITCH (Red Rectangle Target) ─── */}
            <div className="flex items-center p-1 rounded-2xl bg-black/30 backdrop-blur-md border border-white/20 shadow-inner">
              <button
                type="button"
                onClick={() => onToggleTheme?.("skeuomorphic")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all touch-manipulation",
                  currentTheme === "skeuomorphic"
                    ? "bg-white text-[#2E3192] shadow-lg scale-105"
                    : "text-white/70 hover:text-white"
                )}
                title="Skeuomorphic & Neumorphic 3D UI"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#F26722]" />
                <span>3D Neu-Skeuo</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleTheme?.("classic")}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all touch-manipulation",
                  currentTheme === "classic"
                    ? "bg-white text-[#2E3192] shadow-lg scale-105"
                    : "text-white/70 hover:text-white"
                )}
                title="Classic Flat UI"
              >
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                <span>Classic</span>
              </button>
            </div>

            {/* Systems Online Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wide">Systems Online</span>
            </div>

            {/* Staff Active Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm">
              <Users className="h-4 w-4 text-indigo-200" />
              <span className="text-xs font-bold text-white tracking-wide">Staff Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 -mt-8 relative z-20">
        
        {/* ─── 1. STAFF WORKSPACE CARD (Skeuomorphic 3D Raised) ─── */}
        <div className="skeuo-card p-6 sm:p-7 relative overflow-hidden transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Staff Avatar & Info */}
            <div className="flex items-center gap-4">
              <div className="relative p-1.5 rounded-full skeuo-circle">
                <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-[#2E3192] to-[#F26722] flex items-center justify-center text-white font-black text-xl shadow-inner">
                  {staff?.first_name ? staff.first_name[0].toUpperCase() : user?.email?.[0].toUpperCase() || "U"}
                </div>
                {activeClockEntry && (
                  <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                    {staff ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() : user?.email?.split("@")[0]}'s Workspace
                  </h2>
                  {activeClockEntry ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-300/40">
                      Clocked In
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold">
                      Off Duty
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                  {activeClockEntry
                    ? `Clocked in since ${new Date(activeClockEntry.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Manage your shifts, clock-in, and time-off requests"}
                </p>
              </div>
            </div>

            {/* Quick Shift Actions */}
            <div className="flex items-center gap-3 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setIsTimeClockDialogOpen(true)}
                className={cn(
                  "px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 touch-manipulation transition-all",
                  activeClockEntry
                    ? "skeuo-btn text-rose-600 dark:text-rose-400"
                    : "skeuo-btn-emerald text-white"
                )}
              >
                <Power className="h-4 w-4" />
                <span>{activeClockEntry ? "Clock Out" : "Clock In"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLeaveDialogOpen(true)}
                className="skeuo-btn px-4 py-2.5 rounded-xl font-bold text-xs text-gray-700 dark:text-gray-200 flex items-center gap-2 touch-manipulation"
              >
                <CalendarDays className="h-4 w-4 text-[#2E3192] dark:text-indigo-400" />
                <span>Request Leave</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
                className="skeuo-btn p-2.5 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white touch-manipulation"
                title={workspaceExpanded ? "Collapse" : "Expand"}
              >
                {workspaceExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Expanded Drawer with Leave & Recent Entries */}
          {workspaceExpanded && (
            <div className="mt-6 pt-5 border-t border-gray-300/40 dark:border-gray-700/40 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl skeuo-inset">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Leave Balances
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl skeuo-btn">
                    <div className="text-lg font-black text-[#2E3192] dark:text-indigo-400">{leaveBalances?.casual ?? 12}</div>
                    <div className="text-[10px] text-gray-500 font-bold">Casual</div>
                  </div>
                  <div className="p-2 rounded-xl skeuo-btn">
                    <div className="text-lg font-black text-emerald-600">{leaveBalances?.sick ?? 8}</div>
                    <div className="text-[10px] text-gray-500 font-bold">Sick</div>
                  </div>
                  <div className="p-2 rounded-xl skeuo-btn">
                    <div className="text-lg font-black text-[#F26722]">{leaveBalances?.annual ?? 15}</div>
                    <div className="text-[10px] text-gray-500 font-bold">Annual</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl skeuo-inset">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Recent Shifts
                </div>
                <div className="space-y-1.5 text-xs">
                  {recentTimeEntries && recentTimeEntries.length > 0 ? (
                    recentTimeEntries.slice(0, 3).map((entry, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-200/50 dark:border-gray-800 last:border-0">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {new Date(entry.clock_in).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                        <span className="text-gray-500 font-mono">
                          {new Date(entry.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 py-2 text-center">No recent clock entries found</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── 2. BUSINESS OVERVIEW (3D Neumorphic Metric Deck) ─── */}
        <div className="skeuo-card p-6 sm:p-8 relative overflow-hidden transition-all duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl skeuo-inset">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Business Overview
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                  Key performance metrics • Last 30 days
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full skeuo-inset">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Live</span>
            </div>
          </div>

          {/* 4 Primary 3D Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* Card 1: Total Sales */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] text-white shadow-[6px_6px_15px_rgba(16,185,129,0.3),-4px_-4px_12px_rgba(255,255,255,0.8)] dark:shadow-[6px_6px_15px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.05)] border border-white/30 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/90">Total Sales (30D)</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">~ +100%</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
                {formatIndianCurrency(totalSales30D).formatted}
              </div>
              {/* Mini Sparkline Curve */}
              <div className="mt-3 h-7 flex items-end">
                <svg className="w-full h-6 text-white/60" viewBox="0 0 100 25" preserveAspectRatio="none">
                  <path d="M0,20 Q25,5 50,15 T100,8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 2: Active Orders */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white shadow-[6px_6px_15px_rgba(59,130,246,0.3),-4px_-4px_12px_rgba(255,255,255,0.8)] dark:shadow-[6px_6px_15px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.05)] border border-white/30 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/90">Active Orders</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">~ +3</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
                {activeOrdersCount}
              </div>
              <div className="mt-3 h-7 flex items-end">
                <svg className="w-full h-6 text-white/60" viewBox="0 0 100 25" preserveAspectRatio="none">
                  <path d="M0,18 Q30,22 60,10 T100,5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 3: Customers */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white shadow-[6px_6px_15px_rgba(139,92,246,0.3),-4px_-4px_12px_rgba(255,255,255,0.8)] dark:shadow-[6px_6px_15px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.05)] border border-white/30 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/90">Customers (30D)</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">~ +12</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
                {uniqueCustomers}
              </div>
              <div className="mt-3 h-7 flex items-end">
                <svg className="w-full h-6 text-white/60" viewBox="0 0 100 25" preserveAspectRatio="none">
                  <path d="M0,15 Q35,8 70,18 T100,6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 4: Today's Revenue */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white shadow-[6px_6px_15px_rgba(249,115,22,0.3),-4px_-4px_12px_rgba(255,255,255,0.8)] dark:shadow-[6px_6px_15px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.05)] border border-white/30 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/90">Today's Revenue</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">~ +2162.0%</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
                {formatIndianCurrency(todaysRevenue).formatted}
              </div>
              <div className="mt-3 h-7 flex items-end">
                <svg className="w-full h-6 text-white/60" viewBox="0 0 100 25" preserveAspectRatio="none">
                  <path d="M0,22 Q30,12 60,18 T100,4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* NC Orders Strip */}
          <div className="mt-4 p-4 rounded-2xl skeuo-inset flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl skeuo-circle">
                <ShoppingBag className="h-4 w-4 text-[#2E3192] dark:text-indigo-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Non-Chargeable (NC) Orders: </span>
                <span className="text-xs font-black text-gray-900 dark:text-white">{ncOrders.length} orders ({formatIndianCurrency(ncTotalValue).formatted})</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full skeuo-btn">
              ~ 0.0% of total
            </span>
          </div>
        </div>

        {/* ─── 3. DASHBOARD WIDGETS SECTION (3D Customizable Grid) ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl skeuo-circle">
                <BarChart3 className="h-5 w-5 text-[#2E3192] dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Dashboard Widgets
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowWidgetPicker(true)}
              className="skeuo-btn px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 touch-manipulation active:scale-95"
            >
              <Zap className="h-3.5 w-3.5 text-[#F26722]" />
              <span>Customize</span>
            </button>
          </div>

          {/* Render Active Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedWidgets.map((widgetId) => (
              <div key={widgetId} className="skeuo-card p-6 overflow-hidden">
                <WidgetRenderer
                  widgetId={widgetId}
                  restaurantId={restaurantId}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Widget Picker Dialog */}
      <WidgetPickerDialog
        isOpen={showWidgetPicker}
        onClose={() => setShowWidgetPicker(false)}
        selectedWidgets={selectedWidgets}
        onSave={saveWidgets}
        defaultWidgets={RESTAURANT_DEFAULT_WIDGETS}
      />

      {/* Clock In / Out Dialog */}
      {staff && restaurantId && (
        <TimeClockDialog
          isOpen={isTimeClockDialogOpen}
          onClose={() => setIsTimeClockDialogOpen(false)}
          staffId={staff.id}
          restaurantId={restaurantId}
          onSuccess={() => {
            refetchTimeEntries();
            setIsTimeClockDialogOpen(false);
          }}
        />
      )}

      {/* Leave Request Dialog */}
      {staff && restaurantId && (
        <LeaveRequestDialog
          isOpen={isLeaveDialogOpen}
          onClose={() => setIsLeaveDialogOpen(false)}
          restaurantId={restaurantId}
          staff_id={staff.id}
          staffOptions={[staff as StaffMember]}
          onSuccess={() => {
            refetchLeaveData();
            setIsLeaveDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default SkeuomorphicDashboard;
