import React, { useState } from "react";
import {
  Search,
  Filter,
  ShoppingCart,
  Printer,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  RotateCcw,
  RefreshCw,
  Download,
  Wrench,
  Check,
  Edit2,
  Trash2,
  ChevronDown,
  Calendar,
  CreditCard,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

interface SandboxDetailedOrder {
  id: string;
  source: string;
  tableOrRef: string;
  customerName?: string;
  customerPhone?: string;
  attendant?: string;
  timeAgo: string;
  timeExact: string;
  status: "pending" | "preparing" | "ready" | "completed" | "held" | "cancelled" | "pay_later";
  paymentMethod?: string;
  priority: "normal" | "rush" | "vip";
  total: number;
  items: Array<{ name: string; qty: number; price: number }>;
}

const INITIAL_ORDERS_FEED: SandboxDetailedOrder[] = [
  {
    id: "#960788F7",
    source: "Dine-In",
    tableOrRef: "Table 6",
    customerName: "Rohan Kulkarni",
    customerPhone: "8308903224",
    timeAgo: "about 7 hours ago",
    timeExact: "02:08 AM",
    status: "pending",
    priority: "normal",
    total: 327,
    items: [
      { name: "Paneer Tikka", qty: 1, price: 199 },
      { name: "Samosa", qty: 1, price: 49 },
      { name: "Lassi", qty: 1, price: 79 },
    ],
  },
  {
    id: "#5DF88417",
    source: "Dine-In",
    tableOrRef: "Table T3",
    attendant: "Samarth Mali",
    timeAgo: "1 day ago",
    timeExact: "01:03 AM",
    status: "completed",
    paymentMethod: "UPI",
    priority: "normal",
    total: 466,
    items: [
      { name: "Cutlet", qty: 1, price: 89 },
      { name: "Paneer Tikka", qty: 1, price: 199 },
      { name: "Samosa", qty: 1, price: 49 },
      { name: "Spring Rolls", qty: 1, price: 129 },
    ],
  },
  {
    id: "#ED097654",
    source: "Dine-In",
    tableOrRef: "Table 2",
    attendant: "Parth Shelar",
    timeAgo: "1 day ago",
    timeExact: "11:45 PM",
    status: "completed",
    paymentMethod: "Cash",
    priority: "normal",
    total: 620,
    items: [
      { name: "Special Hyderabadi Dum Biryani", qty: 1, price: 340 },
      { name: "Paneer Butter Masala", qty: 1, price: 280 },
    ],
  },
  {
    id: "#4A0189B2",
    source: "Swiggy",
    tableOrRef: "Rider: Suresh (OTP 88)",
    customerName: "Ananya Sharma",
    timeAgo: "2 days ago",
    timeExact: "08:15 PM",
    status: "completed",
    paymentMethod: "Prepaid",
    priority: "normal",
    total: 770,
    items: [
      { name: "Special Hyderabadi Dum Biryani", qty: 2, price: 340 },
      { name: "Gulab Jamun (2 pcs)", qty: 1, price: 90 },
    ],
  },
];

export const SandboxOrdersView: React.FC = () => {
  const { setPrintedKOT, triggerToast } = useSandbox();
  const [ordersList, setOrdersList] = useState<SandboxDetailedOrder[]>(INITIAL_ORDERS_FEED);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("All Sources");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingOrder, setEditingOrder] = useState<SandboxDetailedOrder | null>(null);

  const activeCount = ordersList.filter((o) => o.status === "pending" || o.status === "preparing").length;
  const completedCount = 24 + ordersList.filter((o) => o.status === "completed").length;
  const totalOrdersCount = 25 + ordersList.length - INITIAL_ORDERS_FEED.length;
  const revenueTotal = 12555 + ordersList.reduce((s, o) => s + o.total, 0);

  const filterTabs = [
    { id: "all", label: "All Orders", count: 25 },
    { id: "pending", label: "New", count: 1 },
    { id: "preparing", label: "Preparing", count: 0 },
    { id: "ready", label: "Ready", count: 0 },
    { id: "completed", label: "Completed", count: 24 },
    { id: "held", label: "Held", count: 0 },
    { id: "cancelled", label: "Cancelled", count: 0 },
    { id: "pay_later", label: "💰 Pay Later", count: 2 },
  ];

  const filteredOrders = ordersList.filter((order) => {
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    const matchesSource =
      sourceFilter === "All Sources" || order.source === sourceFilter;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.tableOrRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName &&
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSource && matchesSearch;
  });

  const toggleOrderStatus = (orderId: string) => {
    setOrdersList((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const nextStatus = o.status === "completed" ? "pending" : "completed";
          triggerToast(
            nextStatus === "completed"
              ? `✅ Order ${o.id} marked as Completed!`
              : `↺ Order ${o.id} reverted to Pending.`
          );
          return { ...o, status: nextStatus };
        }
        return o;
      })
    );
  };

  const deleteOrder = (orderId: string) => {
    setOrdersList((prev) => prev.filter((o) => o.id !== orderId));
    triggerToast(`🗑️ Order ${orderId} deleted.`);
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff] pb-20 space-y-6">
      {/* Top Banner (Matches Real Orders Image) */}
      <div className="bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1700px] mx-auto">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block">
              KIWI
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              Orders Management
              <span className="text-amber-400">✦</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live - Last 7 Days</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerToast("🔄 Orders refreshed")}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-semibold h-9"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/30 rounded-xl text-xs font-semibold h-9"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>

            <Button
              size="sm"
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl h-9 shadow-sm"
            >
              <Wrench className="h-3.5 w-3.5 mr-1" />
              Fix Data Sync
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 space-y-5">
        {/* 4 Summary Gradient Cards (Matches Real Orders Image) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Orders */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 space-y-1 relative overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100 block">
              ACTIVE ORDERS
            </span>
            <p className="text-3xl font-extrabold font-mono">{activeCount}</p>
            <span className="text-xs text-amber-100/90 font-medium block">
              In preparation now
            </span>
          </div>

          {/* Completed */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 space-y-1 relative overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 block">
              COMPLETED
            </span>
            <p className="text-3xl font-extrabold font-mono">{completedCount}</p>
            <span className="text-xs text-emerald-100/90 font-medium block">
              Today so far
            </span>
          </div>

          {/* Total Orders */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 space-y-1 relative overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100 block">
              TOTAL ORDERS
            </span>
            <p className="text-3xl font-extrabold font-mono">{totalOrdersCount}</p>
            <span className="text-xs text-blue-100/90 font-medium block">
              Last 7 Days
            </span>
          </div>

          {/* Revenue */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 text-white shadow-lg shadow-amber-600/20 space-y-1 relative overflow-hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100 block">
              REVENUE
            </span>
            <p className="text-3xl font-extrabold font-mono">{formatCurrency(revenueTotal)}</p>
            <span className="text-xs text-amber-100/90 font-medium block">
              Pending collection
            </span>
          </div>
        </div>

        {/* Search & Dropdown Filters (Matches Real Orders Image) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders, customers, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-medium"
              >
                <option value="All Sources">All Sources</option>
                <option value="Dine-In">Dine-In</option>
                <option value="Swiggy">Swiggy</option>
                <option value="Zomato">Zomato</option>
                <option value="QuickServe">QuickServe</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Last 7 Days</span>
            </div>
          </div>
        </div>

        {/* Status Filter Badges (Matches Real Orders Image) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold">Showing {filteredOrders.length} orders</span>
          <div className="flex items-center gap-1">
            <span>Sort:</span>
            <select className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer">
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Highest amount</option>
            </select>
          </div>
        </div>

        {/* Orders Card Feed (Matches Real Orders Image) */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isCompleted = order.status === "completed";
            const isPending = order.status === "pending";

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/80 dark:border-slate-800 shadow-md hover:shadow-lg transition-all overflow-hidden"
              >
                {/* Top Accent Pill Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold text-xs font-mono">
                      {order.id}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold text-xs">
                      {order.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs font-bold px-3 py-1 ${
                        isCompleted
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : isPending
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mr-1.5 ${
                          isCompleted
                            ? "bg-blue-500"
                            : isPending
                            ? "bg-amber-500 animate-pulse"
                            : "bg-emerald-500"
                        }`}
                      />
                      {isCompleted ? "Completed" : "Pending"}
                    </Badge>
                  </div>
                </div>

                {/* Card Body: Customer/Table Details + Total on Right */}
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      {order.customerName ? order.customerName : order.tableOrRef}
                      {order.customerPhone && (
                        <span className="text-xs font-normal text-slate-500 flex items-center gap-1">
                          📞 {order.customerPhone}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {order.attendant ? `Attendant: ${order.attendant} · ` : ""}
                      {order.timeAgo} · {order.timeExact}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      TOTAL AMOUNT
                    </span>
                    <div className="flex items-center sm:justify-end gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {formatCurrency(order.total)}
                      </span>
                      {order.paymentMethod && (
                        <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                          💳 {order.paymentMethod}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ordered Items (Pill Tags) */}
                <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                    >
                      <span className="text-indigo-600 font-bold">{item.qty}x</span>
                      <span>{item.name}</span>
                      <span className="font-mono text-slate-500">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Card Footer: Timestamp + Action Buttons (Matches Real Orders Image) */}
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Ordered {order.timeAgo}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 font-semibold cursor-pointer">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Normal</span>
                      <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingOrder(order)}
                      className="h-8 rounded-xl text-xs font-semibold gap-1 text-slate-700 dark:text-slate-200 border-slate-200"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>

                    {isCompleted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleOrderStatus(order.id)}
                        className="h-8 rounded-xl text-xs font-semibold gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Revert
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => toggleOrderStatus(order.id)}
                        className="h-8 rounded-xl text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Complete
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPrintedKOT({
                          id: order.id,
                          channel: order.source as any,
                          tableOrRef: order.tableOrRef,
                          time: order.timeAgo,
                          total: order.total,
                          status: "READY",
                          elapsedSec: 120,
                          items: order.items.map((i) => ({ ...i, station: "Curry" })),
                        })
                      }
                      className="h-8 rounded-xl text-xs font-semibold gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Bill
                    </Button>

                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Order Dialog Simulation */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Edit Order {editingOrder.id}
                </h3>
                <p className="text-xs text-slate-400">{editingOrder.tableOrRef}</p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-400 uppercase">Items In Order</span>
              {editingOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800"
                >
                  <span className="font-semibold">{item.qty}x {item.name}</span>
                  <span className="font-mono">{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => {
                triggerToast("Order updated successfully");
                setEditingOrder(null);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl h-10"
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
