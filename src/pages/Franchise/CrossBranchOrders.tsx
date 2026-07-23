import React, { useState } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import {
  MockOrder,
} from "@/data/franchiseMockData";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, Filter, Eye } from "lucide-react";

const statusConfig: Record<
  MockOrder["status"],
  { label: string; className: string }
> = {
  completed: {
    label: "Completed",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  preparing: {
    label: "Preparing",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  pending: {
    label: "Pending",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  ready: {
    label: "Ready",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  },
};

const CrossBranchOrders: React.FC = () => {
  const { currentBranch, allBranches, orders, formatCurrency } = useFranchise();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MockOrder["status"] | "all">("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const filtered = orders.filter((o) => {
    const matchBranch = currentBranch
      ? o.branchId === currentBranch.id
      : branchFilter === "all" || o.branchId === branchFilter;
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch =
      !search ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase());
    return matchBranch && matchStatus && matchSearch;
  });

  // Mini stats
  const total = filtered.length;
  const pending = filtered.filter((o) => o.status === "pending").length;
  const completed = filtered.filter((o) => o.status === "completed").length;
  const revenue = filtered.reduce((s, o) => s + o.amount, 0);

  const statCards = [
    { label: "Total Orders", value: total, color: "text-gray-900 dark:text-white" },
    { label: "Pending", value: pending, color: "text-red-600 dark:text-red-400" },
    { label: "Completed", value: completed, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Revenue", value: formatCurrency(revenue), color: "text-violet-600 dark:text-violet-400" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cross-Branch Orders</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Today · All branches</p>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 shadow-sm"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={cn("text-xl font-bold mt-0.5", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Branch filter (only when "All Branches" selected) */}
        {!currentBranch && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Branches</option>
            {allBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Branch</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Items</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Time</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((order) => {
                const sc = statusConfig[order.status];
                return (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: order.branchColor }}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[80px] lg:max-w-none">
                          {order.branchName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                      {order.customer}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs max-w-[180px] truncate hidden md:table-cell">
                      {order.items}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-800 dark:text-white">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", sc.className)}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-gray-400">
                      {order.time}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button className="text-gray-400 hover:text-violet-600 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No orders found</p>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
          Showing {filtered.length} of {orders.length} orders
        </div>
      </div>
    </div>
  );
};

export default CrossBranchOrders;
