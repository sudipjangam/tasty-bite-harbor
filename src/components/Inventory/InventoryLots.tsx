import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  Search,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { format, differenceInDays, isPast, addDays } from "date-fns";

interface InventoryLot {
  id: string;
  inventory_item_id: string;
  purchase_date: string;
  quantity_purchased: number;
  quantity_remaining: number;
  unit_cost: number;
  lot_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  supplier_id: string | null;
  purchase_order_id: string | null;
  created_at: string;
  inventory_items: {
    name: string;
    unit: string;
    category: string | null;
  };
}

const InventoryLots = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();

  const { data: lots = [], isLoading } = useQuery({
    queryKey: ["inventory-lots", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_lots")
        .select(
          `
          *,
          inventory_items!inner(name, unit, category)
        `,
        )
        .eq("restaurant_id", restaurantId)
        .order("purchase_date", { ascending: false });

      if (error) throw error;
      return data as InventoryLot[];
    },
    enabled: !!restaurantId,
  });

  // Filter lots
  const filteredLots = useMemo(() => {
    let result = lots;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (lot) =>
          lot.inventory_items?.name?.toLowerCase().includes(q) ||
          lot.lot_number?.toLowerCase().includes(q) ||
          lot.notes?.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((lot) => lot.quantity_remaining > 0);
    } else if (statusFilter === "depleted") {
      result = result.filter((lot) => lot.quantity_remaining <= 0);
    } else if (statusFilter === "expiring") {
      result = result.filter(
        (lot) =>
          lot.expiry_date &&
          !isPast(new Date(lot.expiry_date)) &&
          differenceInDays(new Date(lot.expiry_date), new Date()) <= 7,
      );
    } else if (statusFilter === "expired") {
      result = result.filter(
        (lot) => lot.expiry_date && isPast(new Date(lot.expiry_date)),
      );
    }

    return result;
  }, [lots, searchQuery, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const active = lots.filter((l) => l.quantity_remaining > 0);
    const totalValue = active.reduce(
      (sum, l) => sum + l.quantity_remaining * l.unit_cost,
      0,
    );
    const expiringSoon = lots.filter(
      (l) =>
        l.expiry_date &&
        l.quantity_remaining > 0 &&
        !isPast(new Date(l.expiry_date)) &&
        differenceInDays(new Date(l.expiry_date), new Date()) <= 7,
    );
    return {
      totalLots: lots.length,
      activeLots: active.length,
      totalValue,
      expiringSoon: expiringSoon.length,
    };
  }, [lots]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedLots,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination({
    data: filteredLots,
    itemsPerPage,
    initialPage: 1,
  });

  const getStatusBadge = (lot: InventoryLot) => {
    if (lot.quantity_remaining <= 0) {
      return (
        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs">
          Depleted
        </Badge>
      );
    }
    if (lot.expiry_date && isPast(new Date(lot.expiry_date))) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 text-xs">
          Expired
        </Badge>
      );
    }
    if (
      lot.expiry_date &&
      differenceInDays(new Date(lot.expiry_date), new Date()) <= 7
    ) {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-xs">
          Expiring Soon
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs">
        Active
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <Layers className="h-5 w-5 text-purple-600" />
          Inventory Lots (FIFO)
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
          <p className="text-purple-100 text-xs font-medium">Total Lots</p>
          <p className="text-2xl font-bold mt-1">{stats.totalLots}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <p className="text-green-100 text-xs font-medium">Active Lots</p>
          <p className="text-2xl font-bold mt-1">{stats.activeLots}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-cyan-100 text-xs font-medium">
            Total Stock Value
          </p>
          <p className="text-2xl font-bold mt-1">
            {currencySymbol}
            {Math.round(stats.totalValue).toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
          <p className="text-amber-100 text-xs font-medium">Expiring Soon</p>
          <p className="text-2xl font-bold mt-1">{stats.expiringSoon}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by item name or lot number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[200px] bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lots</SelectItem>
            <SelectItem value="active">Active (In Stock)</SelectItem>
            <SelectItem value="depleted">Depleted</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lots List */}
      <div className="space-y-3">
        {filteredLots.length === 0 ? (
          <Card className="p-8 text-center bg-white/90 dark:bg-gray-800/90 rounded-xl">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No Lots Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Purchase inventory to create your first lot"}
            </p>
          </Card>
        ) : (
          paginatedLots.map((lot) => {
            const consumedPercentage =
              lot.quantity_purchased > 0
                ? ((lot.quantity_purchased - lot.quantity_remaining) /
                    lot.quantity_purchased) *
                  100
                : 100;
            const lotValue = lot.quantity_remaining * lot.unit_cost;

            return (
              <Card
                key={lot.id}
                className={`p-4 bg-white/90 dark:bg-gray-800/90 rounded-xl hover:shadow-md transition-all ${
                  lot.quantity_remaining <= 0 ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Left: Item info */}
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/50">
                      <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {lot.inventory_items?.name || "Unknown Item"}
                        </h3>
                        {getStatusBadge(lot)}
                        {lot.lot_number && (
                          <span className="text-xs text-gray-400 font-mono">
                            #{lot.lot_number}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2 mb-2">
                        <Progress
                          value={consumedPercentage}
                          className="h-2 flex-1"
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {lot.quantity_remaining.toFixed(2)} /{" "}
                          {lot.quantity_purchased.toFixed(2)}{" "}
                          {lot.inventory_items?.unit}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(
                            new Date(lot.purchase_date),
                            "MMM dd, yyyy",
                          )}
                        </span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {currencySymbol}
                          {lot.unit_cost.toFixed(2)}/
                          {lot.inventory_items?.unit}
                        </span>
                        {lotValue > 0 && (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            Value: {currencySymbol}
                            {lotValue.toFixed(2)}
                          </span>
                        )}
                        {lot.expiry_date && (
                          <span
                            className={`flex items-center gap-1 ${
                              isPast(new Date(lot.expiry_date))
                                ? "text-red-500"
                                : differenceInDays(
                                      new Date(lot.expiry_date),
                                      new Date(),
                                    ) <= 7
                                  ? "text-amber-500"
                                  : "text-gray-500"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            Exp:{" "}
                            {format(new Date(lot.expiry_date), "MMM dd, yyyy")}
                          </span>
                        )}
                      </div>
                      {lot.notes && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {lot.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
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

export default InventoryLots;
