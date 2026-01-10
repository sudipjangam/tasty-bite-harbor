import React, { useState } from "react";
import {
  X,
  Search,
  Clock,
  RotateCcw,
  Filter,
  Check,
  Download,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActiveKitchenOrder } from "@/types/qsr";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";
import { DateFilter, StatusFilter } from "@/hooks/useActiveKitchenOrders";
import { exportToExcel } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface QSRActiveOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: ActiveKitchenOrder[];
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onRecallOrder: (order: ActiveKitchenOrder) => void;
  onProceedToPayment?: (order: ActiveKitchenOrder) => void;
  onToggleItemCompletion?: (
    orderId: string,
    itemIndex: number,
    currentStatus: boolean[]
  ) => Promise<boolean>;
  onDeleteOrder?: (order: ActiveKitchenOrder) => void;
  restaurantName?: string;
}

const dateFilters: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "thisMonth", label: "This Month" },
];

const statusFilters: { value: StatusFilter; label: string; color: string }[] = [
  { value: "all", label: "All Orders", color: "bg-gray-500" },
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "preparing", label: "Preparing", color: "bg-orange-500" },
  { value: "ready", label: "Ready", color: "bg-green-500" },
  { value: "held", label: "Held", color: "bg-amber-500" },
];

// Status badge colors now handled inline with gradient styling

// Check if all items in order are delivered
const isAllItemsDelivered = (order: ActiveKitchenOrder): boolean => {
  const items = order.items || [];
  const completionStatus = order.itemCompletionStatus || [];
  return (
    items.length > 0 &&
    completionStatus.length >= items.length &&
    completionStatus.slice(0, items.length).every((status) => status === true)
  );
};

export const QSRActiveOrdersDrawer: React.FC<QSRActiveOrdersDrawerProps> = ({
  isOpen,
  onClose,
  orders,
  isLoading = false,
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  statusFilter,
  onStatusFilterChange,
  onRecallOrder,
  onProceedToPayment,
  onToggleItemCompletion,
  onDeleteOrder,
  restaurantName = "Restaurant",
}) => {
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();
  const { symbol: currencySymbol } = useCurrencyContext();

  // Maximum items to show before "Show more"
  const MAX_VISIBLE_ITEMS = 3;

  // Toggle order expansion
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Check if user has admin/manager/owner role for export
  const canViewSensitiveData =
    user?.role?.toLowerCase() === "admin" ||
    user?.role?.toLowerCase() === "manager" ||
    user?.role?.toLowerCase() === "owner";

  // Export orders to Excel
  const handleExportOrders = () => {
    if (!orders || orders.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data to Export",
        description: "There are no orders to export for the selected filters.",
      });
      return;
    }

    try {
      // Calculate totals
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

      // Prepare data for export
      const exportData = orders.map((order) => ({
        "Order ID": order.id.slice(0, 8) + "...",
        Source: order.source,
        Items: order.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
        [`Total (${currencySymbol})`]: parseFloat(order.total.toFixed(2)),
        Status: order.status as string,
        "Created Date": format(new Date(order.createdAt), "yyyy-MM-dd"),
        "Created Time": format(new Date(order.createdAt), "HH:mm:ss"),
      }));

      // Add empty row as separator
      exportData.push({
        "Order ID": "",
        Source: "",
        Items: "",
        [`Total (${currencySymbol})`]: "" as any,
        Status: "-",
        "Created Date": "",
        "Created Time": "",
      });

      // Add summary row
      exportData.push({
        "Order ID": "SUMMARY",
        Source: `Total Orders: ${orders.length}`,
        Items: "",
        [`Total (${currencySymbol})`]: parseFloat(totalRevenue.toFixed(2)),
        Status: "-",
        "Created Date": format(new Date(), "yyyy-MM-dd"),
        "Created Time": "",
      });

      // Generate filename: RestaurantName_QSR_Orders_YYYY-MM-DD
      const sanitizedRestaurantName = restaurantName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const filename = `${sanitizedRestaurantName}_QSR_Orders_${dateStr}`;

      // Use shared export utility
      const success = exportToExcel(exportData, filename, "QSR Orders");

      if (success) {
        toast({
          title: "Export Successful",
          description: `Orders exported to ${filename}.xlsx`,
        });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "An error occurred while exporting orders.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer - Full width for grid layout */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[95vw] lg:max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Active Kitchen Orders
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-10 rounded-lg"
            />
          </div>

          {/* Date Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {dateFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onDateFilterChange(filter.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all touch-manipulation",
                  dateFilter === filter.value
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Status Filter Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusFilter(!showStatusFilter)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {statusFilters.find((f) => f.value === statusFilter)?.label ||
                  "All"}
              </Button>
              {/* Export button - Only visible to admin/manager/owner */}
              {canViewSensitiveData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportOrders}
                  className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:border-green-700"
                  title="Export to Excel"
                >
                  <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-green-600 dark:text-green-400 text-xs font-medium">
                    Export
                  </span>
                </Button>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {orders.length} order{orders.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Status Filter Dropdown */}
          {showStatusFilter && (
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    onStatusFilterChange(filter.value);
                    setShowStatusFilter(false);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all",
                    statusFilter === filter.value
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", filter.color)} />
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Orders List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
                <p className="text-gray-500 font-medium">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-600 dark:text-gray-300">
                  No orders found
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {orders.map((order) => {
                  const allDelivered = isAllItemsDelivered(order);
                  const completedCount = (
                    order.itemCompletionStatus || []
                  ).filter(Boolean).length;
                  const totalItems = order.items.length;

                  // Vibrant status-based styling
                  const getCardStyle = () => {
                    if (allDelivered && order.status !== "completed") {
                      return {
                        card: "bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-100 dark:from-purple-900/40 dark:via-violet-900/30 dark:to-indigo-900/40 border-2 border-purple-300 dark:border-purple-600 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30",
                        accent: "from-purple-500 to-indigo-600",
                        badge:
                          "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-300/50",
                      };
                    }
                    switch (order.status) {
                      case "preparing":
                        return {
                          card: "bg-gradient-to-br from-orange-50 via-red-50 to-rose-100 dark:from-orange-900/40 dark:via-red-900/30 dark:to-rose-900/40 border-2 border-orange-300 dark:border-orange-600 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30",
                          accent: "from-orange-500 to-red-500",
                          badge:
                            "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-300/50 animate-pulse",
                        };
                      case "ready":
                        return {
                          card: "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 dark:from-emerald-900/40 dark:via-green-900/30 dark:to-teal-900/40 border-2 border-emerald-300 dark:border-emerald-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30",
                          accent: "from-emerald-500 to-teal-500",
                          badge:
                            "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-300/50",
                        };
                      case "held":
                        return {
                          card: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 dark:from-amber-900/40 dark:via-yellow-900/30 dark:to-orange-900/40 border-2 border-amber-300 dark:border-amber-600 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30",
                          accent: "from-amber-500 to-orange-500",
                          badge:
                            "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-300/50",
                        };
                      case "completed":
                        return {
                          card: "bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-100 dark:from-blue-900/40 dark:via-sky-900/30 dark:to-cyan-900/40 border-2 border-blue-300 dark:border-blue-600 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30",
                          accent: "from-blue-500 to-cyan-500",
                          badge:
                            "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-300/50",
                        };
                      default: // new
                        return {
                          card: "bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900/60 dark:via-gray-800/60 dark:to-blue-900/40 border-2 border-indigo-200 dark:border-indigo-700 shadow-lg shadow-indigo-100/50 dark:shadow-indigo-900/30",
                          accent: "from-indigo-500 to-blue-500",
                          badge:
                            "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-300/50",
                        };
                    }
                  };

                  const style = getCardStyle();

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        "rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-xl flex flex-col h-[360px]",
                        style.card
                      )}
                    >
                      {/* Gradient Top Bar */}
                      <div
                        className={cn(
                          "h-1.5 bg-gradient-to-r shrink-0",
                          style.accent
                        )}
                      ></div>

                      {/* Order Content - Flex grow to fill space */}
                      <div className="p-3 flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            {/* Source & Status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base truncate">
                                {order.source.replace("QSR-", "")}
                              </h3>
                              <span
                                className={cn(
                                  "px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide",
                                  style.badge
                                )}
                              >
                                {allDelivered && order.status !== "completed"
                                  ? "✓ Served"
                                  : order.status}
                              </span>
                            </div>
                            {/* Time & Progress */}
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {formatDistanceToNow(
                                    new Date(order.createdAt),
                                    { addSuffix: true }
                                  )}
                                </span>
                              </div>
                              {totalItems > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                                        style.accent
                                      )}
                                      style={{
                                        width: `${
                                          (completedCount / totalItems) * 100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {completedCount}/{totalItems}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Total Amount */}
                          <div className="text-right shrink-0 ml-3">
                            <div
                              className={cn(
                                "text-xl font-extrabold bg-gradient-to-r bg-clip-text text-transparent",
                                style.accent
                              )}
                            >
                              <CurrencyDisplay
                                amount={order.total}
                                showTooltip={false}
                              />
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {totalItems} item{totalItems !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>

                        {/* Items List - Show limited items with expand option */}
                        {(() => {
                          const isExpanded = expandedOrders.has(order.id);
                          const visibleItems = isExpanded
                            ? order.items
                            : order.items.slice(0, MAX_VISIBLE_ITEMS);
                          const hiddenCount =
                            order.items.length - MAX_VISIBLE_ITEMS;
                          const hasMoreItems =
                            order.items.length > MAX_VISIBLE_ITEMS;

                          return (
                            <div className="mt-2 flex-1 flex flex-col overflow-hidden">
                              {/* Scrollable items container */}
                              <div
                                className={cn(
                                  "space-y-1.5 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                                )}
                              >
                                {visibleItems.map((item, idx) => {
                                  const actualIdx = isExpanded ? idx : idx;
                                  const isCompleted =
                                    order.itemCompletionStatus?.[actualIdx] ===
                                    true;
                                  return (
                                    <div
                                      key={actualIdx}
                                      onClick={() =>
                                        onToggleItemCompletion?.(
                                          order.id,
                                          actualIdx,
                                          order.itemCompletionStatus || []
                                        )
                                      }
                                      className={cn(
                                        "flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer group",
                                        isCompleted
                                          ? "bg-gradient-to-r from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border border-green-200 dark:border-green-700"
                                          : "bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-600 hover:shadow-md"
                                      )}
                                    >
                                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        {/* Checkbox Circle */}
                                        <div
                                          className={cn(
                                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                                            isCompleted
                                              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-300/50"
                                              : "border-2 border-gray-300 dark:border-gray-500 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 group-hover:scale-110"
                                          )}
                                        >
                                          {isCompleted && (
                                            <Check
                                              className="w-3 h-3"
                                              strokeWidth={3}
                                            />
                                          )}
                                        </div>
                                        {/* Item Name */}
                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                          <span
                                            className={cn(
                                              "inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-bold shrink-0",
                                              isCompleted
                                                ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                                                : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                                            )}
                                          >
                                            {item.quantity}x
                                          </span>
                                          <span
                                            className={cn(
                                              "font-medium truncate text-sm transition-all",
                                              isCompleted
                                                ? "line-through text-gray-400 dark:text-gray-500"
                                                : "text-gray-700 dark:text-gray-200"
                                            )}
                                          >
                                            {item.name}
                                          </span>
                                        </div>
                                      </div>
                                      {/* Item Price */}
                                      <div
                                        className={cn(
                                          "font-semibold text-sm shrink-0 ml-2 transition-all",
                                          isCompleted
                                            ? "line-through text-gray-400 dark:text-gray-500"
                                            : "text-gray-600 dark:text-gray-300"
                                        )}
                                      >
                                        <CurrencyDisplay
                                          amount={item.price * item.quantity}
                                          showTooltip={false}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Show More/Less Toggle */}
                              {hasMoreItems && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOrderExpansion(order.id);
                                  }}
                                  className={cn(
                                    "w-full mt-2 py-2 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200",
                                    "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700",
                                    "hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30",
                                    "border border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-600",
                                    "text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                                  )}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      Show {hiddenCount} more item
                                      {hiddenCount !== 1 ? "s" : ""}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Action Buttons - Pinned at bottom */}
                        <div className="flex gap-2 mt-auto shrink-0">
                          {onDeleteOrder && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteOrder(order);
                              }}
                              size="sm"
                              variant="outline"
                              className="flex items-center justify-center gap-1.5 font-medium transition-all duration-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                              title="Delete Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            onClick={() => onRecallOrder(order)}
                            size="sm"
                            variant="outline"
                            className="flex-1 flex items-center justify-center gap-1.5 font-medium transition-all duration-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Recall
                          </Button>
                          {onProceedToPayment && (
                            <Button
                              onClick={() => onProceedToPayment(order)}
                              size="sm"
                              className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 font-semibold transition-all duration-300",
                                "bg-gradient-to-r hover:shadow-lg from-emerald-500 to-green-600",
                                "text-white border-0"
                              )}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};
