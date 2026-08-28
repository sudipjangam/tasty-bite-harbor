import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatIndianCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { Filter, ShoppingBag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeuomorphicTable, ColumnDef } from "@/components/ui/skeuomorphic";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  order_number?: string;
  customer_name: string | null;
  status: string;
  total: number;
  created_at: string;
  order_type: string | null;
  attendant?: string | null;
}

interface RecentOrdersTableProps {
  restaurantId?: string | null;
}

const STATUS_CONFIGS: Record<
  string,
  { label: string; bg: string; text: string; dot: string; glow: string }
> = {
  completed: {
    label: "completed",
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/50 dark:border-emerald-700/50",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.5)]",
  },
  paid: {
    label: "paid",
    bg: "bg-purple-50 dark:bg-purple-950/40 border border-purple-300/50 dark:border-purple-700/50",
    text: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
    glow: "shadow-[0_0_8px_rgba(168,85,247,0.5)]",
  },
  ready: {
    label: "ready",
    bg: "bg-teal-50 dark:bg-teal-950/40 border border-teal-300/50 dark:border-teal-700/50",
    text: "text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
    glow: "shadow-[0_0_8px_rgba(20,184,166,0.5)]",
  },
  preparing: {
    label: "preparing",
    bg: "bg-blue-50 dark:bg-blue-950/40 border border-blue-300/50 dark:border-blue-700/50",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.5)]",
  },
  pending: {
    label: "pending",
    bg: "bg-amber-50 dark:bg-amber-950/40 border border-amber-300/50 dark:border-amber-700/50",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.5)]",
  },
  held: {
    label: "held",
    bg: "bg-orange-50 dark:bg-orange-950/40 border border-orange-300/50 dark:border-orange-700/50",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
    glow: "shadow-[0_0_8px_rgba(249,115,22,0.5)]",
  },
  cancelled: {
    label: "cancelled",
    bg: "bg-rose-50 dark:bg-rose-950/40 border border-rose-300/50 dark:border-rose-700/50",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    glow: "shadow-[0_0_8px_rgba(244,63,94,0.5)]",
  },
};

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  restaurantId,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 5;

  const { data, isLoading } = useQuery({
    queryKey: ["top-orders-today", restaurantId, statusFilter, page],
    queryFn: async () => {
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

      let query = supabase
        .from("orders")
        .select(
          "id, customer_name, status, total, created_at, order_type, attendant",
          { count: "exact" }
        )
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .order("created_at", { ascending: false });

      if (restaurantId) {
        query = query.eq("restaurant_id", restaurantId);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: orders, error, count } = await query;

      if (error) {
        console.error("Orders query failed:", error);
        return { orders: [], total: 0 };
      }

      const mappedOrders: Order[] = (orders || []).map((o) => ({
        id: o.id,
        order_number: `#${o.id.slice(0, 8).toUpperCase()}`,
        customer_name: o.customer_name || "Walk-in Guest",
        status: o.status,
        total: parseFloat(o.total) || 0,
        created_at: o.created_at,
        order_type: o.order_type || "Dine-In",
      }));

      const sortedOrders = mappedOrders
        .sort((a, b) => b.total - a.total)
        .slice(page * pageSize, (page + 1) * pageSize);

      return { orders: sortedOrders, total: count || 0 };
    },
    staleTime: 30 * 1000,
  });

  const orders = data?.orders || [];
  const totalOrders = data?.total || 0;
  const totalPages = Math.max(Math.ceil(totalOrders / pageSize), 1);

  const columns: ColumnDef<Order>[] = [
    {
      key: "order",
      header: "Order",
      render: (item) => (
        <div>
          <div className="font-black text-gray-900 dark:text-white tracking-tight">
            {item.order_number}
          </div>
          <div className="text-[10px] text-gray-400 font-semibold">
            {item.order_type}
          </div>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (item) => (
        <div className="font-bold text-gray-800 dark:text-gray-200">
          {item.customer_name}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const config = STATUS_CONFIGS[item.status.toLowerCase()] || STATUS_CONFIGS.completed;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize",
              config.bg,
              config.text
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot, config.glow)} />
            {item.status}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (item) => (
        <span className="font-black text-gray-900 dark:text-white text-sm">
          {formatIndianCurrency(item.total).formatted}
        </span>
      ),
    },
    {
      key: "time",
      header: "Time",
      align: "right",
      render: (item) => (
        <div className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
          {format(new Date(item.created_at), "MMM d, h:mm a")}
        </div>
      ),
    },
  ];

  const filterControl = (
    <div className="flex items-center gap-2">
      <div className="flex items-center p-1 rounded-xl skeuo-inset">
        <Filter className="h-3.5 w-3.5 text-gray-400 ml-2" />
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(0);
          }}
        >
          <SelectTrigger className="border-0 bg-transparent h-7 text-xs font-bold focus:ring-0 w-[130px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="skeuo-card border-0">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="held">Held</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <span className="text-[11px] text-gray-400 font-bold px-2">
        {totalOrders} orders
      </span>
    </div>
  );

  return (
    <SkeuomorphicTable
      title="Top Orders Today"
      subtitle="Highest value orders placed today"
      icon={<ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
      columns={columns}
      data={orders}
      keyExtractor={(item) => item.id}
      filterControl={filterControl}
      isLoading={isLoading}
      pagination={{
        currentPage: page,
        totalPages,
        onPageChange: (newPage) => setPage(newPage),
        totalItems: totalOrders,
      }}
    />
  );
};

export default RecentOrdersTable;
