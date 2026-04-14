import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Search,
  Package,
  IndianRupee,
  TrendingDown,
  Calendar,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

interface WastageTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  quantity_change: number;
  unit_cost_at_time: number | null;
  total_cost: number | null;
  lot_id: string | null;
  notes: string;
  created_at: string;
  inventory_item: {
    name: string;
    unit: string;
    category: string | null;
  };
}

const WastageReport = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [monthOffset, setMonthOffset] = useState("0");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();

  const dateRange = useMemo(() => {
    const offset = parseInt(monthOffset);
    const targetMonth = subMonths(new Date(), offset);
    return {
      start: startOfMonth(targetMonth),
      end: endOfMonth(targetMonth),
      label: format(targetMonth, "MMMM yyyy"),
    };
  }, [monthOffset]);

  const { data: wastageTransactions = [], isLoading } = useQuery({
    queryKey: ["wastage-report", restaurantId, monthOffset],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          *,
          inventory_item:inventory_items(name, unit, category)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("transaction_type", "waste")
        .gte("created_at", format(dateRange.start, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.end, "yyyy-MM-dd'T'23:59:59"))
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WastageTransaction[];
    },
    enabled: !!restaurantId,
  });

  // Filter
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return wastageTransactions;
    const q = searchQuery.toLowerCase();
    return wastageTransactions.filter(
      (t) =>
        t.inventory_item?.name?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.inventory_item?.category?.toLowerCase().includes(q)
    );
  }, [wastageTransactions, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const totalCost = wastageTransactions.reduce(
      (sum, t) => sum + Math.abs(t.total_cost || 0),
      0
    );
    const totalQty = wastageTransactions.reduce(
      (sum, t) => sum + Math.abs(t.quantity_change || 0),
      0
    );
    const uniqueItems = new Set(
      wastageTransactions.map((t) => t.inventory_item_id)
    ).size;

    // Group by item for top wasted
    const itemCosts: Record<string, { name: string; cost: number }> = {};
    for (const t of wastageTransactions) {
      const name = t.inventory_item?.name || "Unknown";
      if (!itemCosts[t.inventory_item_id]) {
        itemCosts[t.inventory_item_id] = { name, cost: 0 };
      }
      itemCosts[t.inventory_item_id].cost += Math.abs(t.total_cost || 0);
    }
    const topWasted = Object.values(itemCosts).sort(
      (a, b) => b.cost - a.cost
    )[0];

    return { totalCost, totalQty, uniqueItems, topWasted, count: wastageTransactions.length };
  }, [wastageTransactions]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedTransactions,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination({
    data: filteredTransactions,
    itemsPerPage,
    initialPage: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <Trash2 className="h-5 w-5 text-red-600" />
          Wastage Report
        </h2>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Select value={monthOffset} onValueChange={setMonthOffset}>
            <SelectTrigger className="w-44 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Current Month</SelectItem>
              <SelectItem value="1">Last Month</SelectItem>
              <SelectItem value="2">2 Months Ago</SelectItem>
              <SelectItem value="3">3 Months Ago</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {dateRange.label}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-4 text-white">
          <p className="text-red-100 text-xs font-medium">Total Wastage Cost</p>
          <p className="text-2xl font-bold mt-1">
            {currencySymbol}
            {Math.round(stats.totalCost).toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 text-white">
          <p className="text-orange-100 text-xs font-medium">Waste Entries</p>
          <p className="text-2xl font-bold mt-1">{stats.count}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
          <p className="text-purple-100 text-xs font-medium">Items Affected</p>
          <p className="text-2xl font-bold mt-1">{stats.uniqueItems}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-fuchsia-600 rounded-xl p-4 text-white">
          <p className="text-pink-100 text-xs font-medium">Top Wasted</p>
          <p className="text-lg font-bold mt-1 truncate">
            {stats.topWasted?.name || "—"}
          </p>
          {stats.topWasted && (
            <p className="text-pink-200 text-xs">
              {currencySymbol}
              {Math.round(stats.topWasted.cost).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Alert if high wastage */}
      {stats.totalCost > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center gap-3 shadow-sm">
          <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-400">
              Wastage Alert: {currencySymbol}
              {Math.round(stats.totalCost).toLocaleString()} lost this month
            </p>
            <p className="text-xs text-red-700 dark:text-red-500">
              {stats.uniqueItems} different items wasted across {stats.count}{" "}
              entries. Review inventory handling to reduce losses.
            </p>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by item name or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
        />
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center bg-white/90 dark:bg-gray-800/90 rounded-xl">
            <Trash2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No Wastage Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "Try adjusting your search"
                : `No waste entries recorded for ${dateRange.label}`}
            </p>
          </Card>
        ) : (
          paginatedTransactions.map((transaction) => (
            <Card
              key={transaction.id}
              className="p-4 bg-white/90 dark:bg-gray-800/90 rounded-xl hover:shadow-md transition-all border-l-4 border-l-red-400"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50">
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {transaction.inventory_item?.name || "Unknown Item"}
                      </h3>
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 text-xs">
                        waste
                      </Badge>
                      {transaction.inventory_item?.category && (
                        <Badge
                          variant="outline"
                          className="text-xs text-gray-500"
                        >
                          {transaction.inventory_item.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        <span className="font-semibold text-red-600">
                          {transaction.quantity_change}
                        </span>{" "}
                        {transaction.inventory_item?.unit || "units"}
                        {transaction.unit_cost_at_time != null &&
                          transaction.unit_cost_at_time > 0 && (
                            <span className="ml-2 text-gray-500">
                              @ {currencySymbol}
                              {Number(transaction.unit_cost_at_time).toFixed(2)}/
                              {transaction.inventory_item?.unit || "unit"}
                            </span>
                          )}
                        {transaction.total_cost != null &&
                          transaction.total_cost > 0 && (
                            <span className="ml-1 font-semibold text-red-600 dark:text-red-400">
                              = {currencySymbol}
                              {Number(transaction.total_cost).toFixed(2)}
                            </span>
                          )}
                      </p>
                      {transaction.notes && (
                        <p className="text-gray-500">{transaction.notes}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
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
      )}
    </div>
  );
};

export default WastageReport;
