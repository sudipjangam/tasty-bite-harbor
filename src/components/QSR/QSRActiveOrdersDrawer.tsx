import React, { useState } from "react";
import {
  X,
  Search,
  Clock,
  ChevronRight,
  RotateCcw,
  Filter,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActiveKitchenOrder } from "@/types/qsr";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { DateFilter, StatusFilter } from "@/hooks/useActiveKitchenOrders";

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
  onToggleItemCompletion?: (
    orderId: string,
    itemIndex: number,
    currentStatus: boolean[]
  ) => Promise<boolean>;
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

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "new":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400";
    case "preparing":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400";
    case "ready":
      return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400";
    case "held":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400";
    case "completed":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400";
    case "served":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400";
  }
};

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
  onToggleItemCompletion,
}) => {
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
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
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No orders found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              orders.map((order) => {
                const allDelivered = isAllItemsDelivered(order);

                // Determine card background based on status
                const getCardBackground = () => {
                  // All served takes priority (purple)
                  if (allDelivered && order.status !== "completed") {
                    return "bg-gradient-to-br from-purple-50 to-indigo-100 border-purple-300 dark:from-purple-900/30 dark:to-indigo-900/30 dark:border-purple-700";
                  }
                  switch (order.status) {
                    case "preparing":
                      return "bg-gradient-to-br from-red-50 to-orange-100 border-red-300 dark:from-red-900/30 dark:to-orange-900/30 dark:border-red-700";
                    case "ready":
                      return "bg-gradient-to-br from-green-50 to-emerald-100 border-green-300 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-green-700";
                    case "completed":
                      return "bg-gradient-to-br from-blue-50 to-sky-100 border-blue-300 dark:from-blue-900/30 dark:to-sky-900/30 dark:border-blue-700";
                    case "held":
                      return "bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-300 dark:from-amber-900/30 dark:to-yellow-900/30 dark:border-amber-700";
                    default: // new
                      return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";
                  }
                };

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "rounded-xl border overflow-hidden",
                      getCardBackground()
                    )}
                  >
                    {/* Order Header */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {order.source}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded-full",
                              getStatusBadgeColor(
                                allDelivered && order.status !== "completed"
                                  ? "served"
                                  : order.status
                              )
                            )}
                          >
                            {allDelivered && order.status !== "completed"
                              ? "served"
                              : order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(order.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          <CurrencyDisplay
                            amount={order.total}
                            showTooltip={false}
                          />
                        </div>
                        <button
                          onClick={() =>
                            setExpandedOrderId(
                              expandedOrderId === order.id ? null : order.id
                            )
                          }
                          className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-1"
                        >
                          Details
                          <ChevronRight
                            className={cn(
                              "w-3 h-3 transition-transform",
                              expandedOrderId === order.id && "rotate-90"
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Order Items (Expanded) */}
                    {expandedOrderId === order.id && (
                      <div className="px-3 pb-3 pt-0 border-t border-gray-200 dark:border-gray-700 mt-2">
                        <div className="mt-2 space-y-1.5">
                          {order.items.map((item, idx) => {
                            const isCompleted =
                              order.itemCompletionStatus?.[idx] === true;
                            return (
                              <div
                                key={idx}
                                onClick={() =>
                                  onToggleItemCompletion?.(
                                    order.id,
                                    idx,
                                    order.itemCompletionStatus || []
                                  )
                                }
                                className={cn(
                                  "flex items-center justify-between text-sm p-2 rounded-lg transition-all cursor-pointer",
                                  isCompleted
                                    ? "bg-green-50 dark:bg-green-900/20"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                      isCompleted
                                        ? "bg-green-500 text-white"
                                        : "border-2 border-gray-300 dark:border-gray-500"
                                    )}
                                  >
                                    {isCompleted && (
                                      <Check className="w-3 h-3" />
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      isCompleted
                                        ? "line-through text-gray-400 dark:text-gray-500"
                                        : "text-gray-700 dark:text-gray-300"
                                    )}
                                  >
                                    {item.quantity}x {item.name}
                                  </span>
                                </div>
                                <CurrencyDisplay
                                  amount={item.price * item.quantity}
                                  showTooltip={false}
                                  className={cn(
                                    isCompleted
                                      ? "line-through text-gray-400 dark:text-gray-500"
                                      : "text-gray-600 dark:text-gray-400"
                                  )}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recall Button */}
                    <div className="px-3 pb-3">
                      <Button
                        onClick={() => onRecallOrder(order)}
                        variant="outline"
                        size="sm"
                        className="w-full flex items-center justify-center gap-2 border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Recall Order
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};
