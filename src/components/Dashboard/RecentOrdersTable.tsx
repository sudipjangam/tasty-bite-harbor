import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SwadeshiLoader from "@/styles/Loader/SwadeshiLoader";
import { format, parseISO, subHours } from "date-fns";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Order {
  id: string;
  order_number?: string;
  customer_name: string | null;
  status: string;
  total: number;
  created_at: string;
  order_type: string | null;
}

const RecentOrdersTable = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 5;

  const { data, isLoading } = useQuery({
    queryKey: ["top-orders-today", statusFilter, page],
    queryFn: async () => {
      // Get today's date range in UTC
      const now = new Date();
      const todayStart = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      ).toISOString();
      const todayEnd = new Date(
        Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        )
      ).toISOString();

      // Fetch from orders table - today's orders
      let query = supabase
        .from("orders")
        .select(
          "id, customer_name, status, total, created_at, order_type, attendant",
          { count: "exact" }
        )
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: orders, error, count } = await query;

      if (error) {
        console.error("Orders query failed:", error);
        return { orders: [], total: 0 };
      }

      // Map orders fields to our interface and parse total as number
      const mappedOrders: Order[] = (orders || []).map((o) => ({
        id: o.id,
        order_number: o.id.slice(0, 8).toUpperCase(), // Use first 8 chars of ID as order number
        customer_name: o.customer_name,
        status: o.status,
        total: parseFloat(o.total) || 0, // Parse string to number
        created_at: o.created_at,
        order_type: o.order_type,
      }));

      // Sort by total amount descending (highest first) and take top results
      const sortedOrders = mappedOrders
        .sort((a, b) => b.total - a.total)
        .slice(page * pageSize, (page + 1) * pageSize);

      return { orders: sortedOrders, total: count || 0 };
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const orders = data?.orders || [];
  const totalOrders = data?.total || 0;
  const totalPages = Math.ceil(totalOrders / pageSize);

  const statusColors: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    preparing:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    ready:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    completed:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    paid: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    held: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <SwadeshiLoader
          loadingText="loading"
          words={["orders", "data", "table"]}
          size={100}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {totalOrders} orders
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">
                      #{order.order_number || order.id.slice(0, 6)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {order.order_type || "dine-in"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {order.customer_name || "Walk-in"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`text-xs font-medium ${
                        statusColors[order.status] || statusColors.pending
                      }`}
                    >
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(order.total || 0)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {format(parseISO(order.created_at), "MMM d, h:mm a")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentOrdersTable;
