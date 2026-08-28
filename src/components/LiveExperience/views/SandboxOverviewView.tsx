import React, { useState } from "react";
import {
  Sparkles,
  Users,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Maximize2,
  DollarSign,
  ShoppingBag,
  Clock,
  Printer,
  ChefHat,
  ChevronRight,
  Flame,
  CheckCircle2,
  Layers,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSandbox, DemoOrder } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

export const SandboxOverviewView: React.FC = () => {
  const {
    orders,
    advanceOrderStatus,
    simulateOrder,
    setActiveTab,
    setPrintedKOT,
    toggleItemStock,
    menuItems,
  } = useSandbox();

  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);

  const activeOrders = orders.filter((o) => o.status !== "SERVED");
  const completedOrders = orders.filter((o) => o.status === "SERVED");
  const todaysRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalSales30D = 59833 + todaysRevenue;
  const customersCount = 12 + completedOrders.length;

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  // Multi-channel revenue breakdown calculation
  const channelRevenue = {
    "Dine-in": orders
      .filter((o) => o.channel === "Dine-in")
      .reduce((s, o) => s + o.total, 22400),
    WebStore: orders
      .filter((o) => o.channel === "WebStore")
      .reduce((s, o) => s + o.total, 11800),
    Swiggy: orders
      .filter((o) => o.channel === "Swiggy")
      .reduce((s, o) => s + o.total, 8420),
    Zomato: orders
      .filter((o) => o.channel === "Zomato")
      .reduce((s, o) => s + o.total, 6300),
  };

  const channelTotal = Object.values(channelRevenue).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Real App Header Banner (Identical to Screenshot 2) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-800 dark:via-indigo-900 dark:to-blue-900 p-6 sm:p-10 rounded-b-[36px] shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner text-white">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {greeting}, jangamsudip!
              </h1>
              <p className="text-blue-100 text-sm sm:text-base mt-1 font-medium">
                Kiwi · Here's what's happening today
              </p>
            </div>
          </div>

          {/* Quick status indicators */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
              <span className="text-sm font-medium text-white">
                Systems Online
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
              <Users className="h-4 w-4 text-blue-300" />
              <span className="text-sm font-medium text-white">
                Staff Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 space-y-8 -mt-10 relative z-20">
        {/* Workspace Card (Identical to Screenshot 2) */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-5 md:p-6 transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Test User's Workspace
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage your shifts, role permissions, and live operations
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
              className="gap-1.5 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              {workspaceExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>

          {workspaceExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block font-medium">
                  Clocked In
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  08:00 AM (4h 12m)
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block font-medium">
                  Assigned Role
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  Owner & GM
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block font-medium">
                  POS Terminal
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Online & Ready
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block font-medium">
                  KDS Station
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  Curry & Grill Active
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Business Overview Container (Identical to Screenshot 2) */}
        <div className="relative group/section">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 via-blue-500 via-purple-500 to-orange-500 rounded-[26px] opacity-20 blur-sm pointer-events-none" />

          <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Business Overview
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Key performance metrics • Last 30 days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                  Live
                </Badge>
              </div>
            </div>

            {/* Gradient KPI Cards Matching Screenshot 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales (Green Gradient) */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/20">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                    ↗ +100%
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase font-medium text-emerald-100 tracking-wider">
                    Total Sales (30D)
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold mt-1">
                    {formatCurrency(totalSales30D)}
                  </p>
                </div>
                {/* Visual Sparkline */}
                <div className="mt-3 h-6 flex items-end gap-1 opacity-70">
                  {[20, 35, 45, 30, 60, 75, 90, 85, 95, 100].map((v, i) => (
                    <div
                      key={i}
                      style={{ height: `${v}%` }}
                      className="flex-1 bg-white/40 rounded-t-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Active Orders (Blue Gradient) */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                    ↗ +{activeOrders.length}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase font-medium text-blue-100 tracking-wider">
                    Active Orders
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold mt-1">
                    {activeOrders.length}
                  </p>
                </div>
                {/* Visual Sparkline */}
                <div className="mt-3 h-6 flex items-end gap-1 opacity-70">
                  {[30, 50, 40, 65, 80, 55, 70, 85, 60, 95].map((v, i) => (
                    <div
                      key={i}
                      style={{ height: `${v}%` }}
                      className="flex-1 bg-white/40 rounded-t-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Customers (Purple Gradient) */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-purple-600 to-violet-800 text-white shadow-lg shadow-purple-500/20">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <Users className="h-5 w-5" />
                  </div>
                  <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                    ↗ +12
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase font-medium text-purple-100 tracking-wider">
                    Customers (30D)
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold mt-1">
                    {customersCount}
                  </p>
                </div>
                {/* Visual Sparkline */}
                <div className="mt-3 h-6 flex items-end gap-1 opacity-70">
                  {[15, 25, 30, 45, 55, 60, 70, 80, 85, 90].map((v, i) => (
                    <div
                      key={i}
                      style={{ height: `${v}%` }}
                      className="flex-1 bg-white/40 rounded-t-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Today's Revenue (Orange Gradient) */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                    Live
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase font-medium text-amber-100 tracking-wider">
                    Today's Revenue
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold mt-1">
                    {formatCurrency(todaysRevenue)}
                  </p>
                </div>
                <div className="mt-4 w-full bg-white/30 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-white h-full rounded-full w-[65%]" />
                </div>
              </div>
            </div>

            {/* Non-Chargeable Orders Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 border border-purple-200/50 dark:border-purple-900/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                    Non-Chargeable (NC) Orders
                  </span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                    ₹0
                  </span>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold">
                0.0% of total
              </Badge>
            </div>
          </div>
        </div>

        {/* Operational Split & Live Simulation Triggers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Multi-Channel Mix */}
          <div className="lg:col-span-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Multi-Channel Revenue Mix (Today)
                </h4>
                <p className="text-xs text-slate-500">
                  Real-time settlement breakdown
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                Total: {formatCurrency(channelTotal)}
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Dine-In */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Dine-In Tables
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    0% Commission • {formatCurrency(channelRevenue["Dine-in"])}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{
                      width: `${
                        (channelRevenue["Dine-in"] / channelTotal) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Direct WebStore */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Direct WebStore (.in)
                  </span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                    0% Commission • {formatCurrency(channelRevenue.WebStore)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full"
                    style={{
                      width: `${
                        (channelRevenue.WebStore / channelTotal) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Swiggy */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Swiggy Orders
                  </span>
                  <span className="text-orange-500 font-bold">
                    23% Aggregator Cut • {formatCurrency(channelRevenue.Swiggy)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full"
                    style={{
                      width: `${(channelRevenue.Swiggy / channelTotal) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Zomato */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">
                    Zomato Orders
                  </span>
                  <span className="text-red-500 font-bold">
                    24% Aggregator Cut • {formatCurrency(channelRevenue.Zomato)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full"
                    style={{
                      width: `${(channelRevenue.Zomato / channelTotal) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Test Live Scenarios Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl p-6 flex flex-col justify-between space-y-4 border border-indigo-900/50">
            <div>
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Test Scenarios
                </span>
              </div>
              <h4 className="text-lg font-bold text-white leading-tight">
                Simulate Peak Kitchen Rush
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Interact with live orders across multi-channel streams in
                real-time.
              </p>
            </div>

            <div className="space-y-2.5">
              <Button
                onClick={() => simulateOrder("Dine-in")}
                className="w-full justify-start text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10 shadow-md shadow-indigo-600/30"
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-2" />+ Punch 1-Click
                Dine-In KOT
              </Button>

              <Button
                onClick={() => setActiveTab("kitchen")}
                variant="outline"
                className="w-full justify-start text-xs font-semibold border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl h-10"
              >
                <ChefHat className="h-3.5 w-3.5 mr-2 text-amber-400" />
                Switch to Kitchen KDS Queue ({activeOrders.length})
              </Button>

              <Button
                onClick={() => toggleItemStock(menuItems[0].id)}
                variant="outline"
                className="w-full justify-start text-xs font-semibold border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl h-10"
              >
                <Zap className="h-3.5 w-3.5 mr-2 text-orange-400" />
                Test 86-Stock Multi-Channel Kill
              </Button>
            </div>
          </div>
        </div>

        {/* Live Consolidated Kitchen Stream Table */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-amber-500" />
                Live Consolidated Kitchen Stream
              </h4>
              <p className="text-xs text-slate-500">
                Single screen replaces 4 separate delivery tablets & POS
                terminals
              </p>
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
              {activeOrders.length} Active in Queue
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">Source Channel</th>
                  <th className="py-3 px-3">Table / Rider Details</th>
                  <th className="py-3 px-3">Items Summary</th>
                  <th className="py-3 px-3 text-right">Total Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order) => {
                  const channelColors = {
                    Swiggy:
                      "bg-orange-500/10 text-orange-600 border-orange-500/20",
                    Zomato: "bg-red-500/10 text-red-600 border-red-500/20",
                    "Dine-in":
                      "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    WebStore: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
                    "Room Service":
                      "bg-purple-500/10 text-purple-600 border-purple-500/20",
                  };

                  const statusColors = {
                    NEW: "bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse",
                    COOKING: "bg-blue-500/10 text-blue-600 border-blue-500/30",
                    READY:
                      "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
                    SERVED: "bg-slate-100 dark:bg-slate-800 text-slate-500",
                  };

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white font-mono">
                        {order.id}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge
                          variant="outline"
                          className={`font-semibold ${
                            channelColors[order.channel]
                          }`}
                        >
                          {order.channel}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-600 dark:text-slate-300">
                        {order.tableOrRef}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {order.items
                          .map((i) => `${i.qty}x ${i.name}`)
                          .join(", ")}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant="outline"
                          className={`font-bold text-[10px] ${
                            statusColors[order.status]
                          }`}
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPrintedKOT(order)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Print KOT Slip"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          {order.status !== "SERVED" ? (
                            <Button
                              size="sm"
                              onClick={() => advanceOrderStatus(order.id)}
                              className="h-7 px-2.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                            >
                              {order.status === "NEW"
                                ? "Cook"
                                : order.status === "COOKING"
                                ? "Ready"
                                : "Dispatch"}
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold px-2 py-1">
                              Settled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
