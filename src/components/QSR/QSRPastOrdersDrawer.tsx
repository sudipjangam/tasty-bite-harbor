import React, { useState } from "react";
import {
  X,
  Search,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  Printer,
  Receipt,
  Calendar,
  Trash2,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PastOrder } from "@/hooks/usePastOrders";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";
import { DateFilter } from "@/hooks/usePastOrders";
import { exportToExcel } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import PaymentDialog from "@/components/Orders/POS/PaymentDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QSRPastOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PastOrder[];
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  onDeleteOrder?: (order: PastOrder) => void;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
  onCustomStartDateChange?: (date: Date | null) => void;
  onCustomEndDateChange?: (date: Date | null) => void;
  restaurantName?: string;
}

const dateFilters: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

export const QSRPastOrdersDrawer: React.FC<QSRPastOrdersDrawerProps> = ({
  isOpen,
  onClose,
  orders,
  isLoading = false,
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  onDeleteOrder,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  restaurantName = "Restaurant",
}) => {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [selectedOrderForPayment, setSelectedOrderForPayment] =
    useState<PastOrder | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
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

  // Open PaymentDialog for an order (for print bill or view details)
  const handleOpenPaymentDialog = (order: PastOrder) => {
    setSelectedOrderForPayment(order);
    setShowPaymentDialog(true);
  };

  // Handle payment dialog close
  const handlePaymentDialogClose = () => {
    setShowPaymentDialog(false);
    setSelectedOrderForPayment(null);
  };

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
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

      const exportData = orders.map((order) => ({
        "Order ID": order.id.slice(0, 8) + "...",
        Source: order.source,
        Items: order.items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
        [`Total (${currencySymbol})`]: parseFloat(order.total.toFixed(2)),
        Status: order.status,
        "Created Date": format(new Date(order.createdAt), "yyyy-MM-dd"),
        "Completed Time": order.completedAt
          ? format(new Date(order.completedAt), "HH:mm:ss")
          : "-",
        Attendant: order.attendant || "-",
      }));

      exportData.push({
        "Order ID": "",
        Source: "",
        Items: "",
        [`Total (${currencySymbol})`]: "" as any,
        Status: "-",
        "Created Date": "",
        "Completed Time": "",
        Attendant: "",
      });

      exportData.push({
        "Order ID": "SUMMARY",
        Source: `Total Orders: ${orders.length}`,
        Items: "",
        [`Total (${currencySymbol})`]: parseFloat(totalRevenue.toFixed(2)),
        Status: "-",
        "Created Date": format(new Date(), "yyyy-MM-dd"),
        "Completed Time": "",
        Attendant: "",
      });

      const sanitizedRestaurantName = restaurantName.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const filename = `${sanitizedRestaurantName}_Past_Orders_${dateStr}`;

      const success = exportToExcel(exportData, filename, "Past Orders");

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

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  // Map selected order items for PaymentDialog
  const paymentDialogOrderItems = selectedOrderForPayment
    ? selectedOrderForPayment.items.map((item, idx) => ({
        id: `${selectedOrderForPayment.id}-${idx}`,
        menuItemId: `item-${idx}`,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes?.join(", "),
      }))
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[95vw] lg:max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="w-6 h-6 text-white" />
              <h2 className="text-lg font-bold text-white">
                Past Orders / Bill History
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          {/* Summary Stats */}
          <div className="flex items-center gap-4 mt-3">
            <div className="px-3 py-1.5 bg-white/20 rounded-lg">
              <span className="text-white/80 text-xs">Total Orders</span>
              <div className="text-white font-bold">{orders.length}</div>
            </div>
            <div className="px-3 py-1.5 bg-white/20 rounded-lg">
              <span className="text-white/80 text-xs">Total Revenue</span>
              <div className="text-white font-bold">
                <CurrencyDisplay amount={totalRevenue} showTooltip={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search past orders..."
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
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all touch-manipulation flex items-center gap-1.5",
                  dateFilter === filter.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                )}
              >
                {filter.value === "custom" ? (
                  <CalendarRange className="w-3.5 h-3.5" />
                ) : (
                  <Calendar className="w-3.5 h-3.5" />
                )}
                {filter.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          {dateFilter === "custom" && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  From:
                </label>
                <input
                  type="date"
                  value={
                    customStartDate ? format(customStartDate, "yyyy-MM-dd") : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value)
                      : null;
                    onCustomStartDateChange?.(date);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  max={
                    customEndDate
                      ? format(customEndDate, "yyyy-MM-dd")
                      : format(new Date(), "yyyy-MM-dd")
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  To:
                </label>
                <input
                  type="date"
                  value={
                    customEndDate ? format(customEndDate, "yyyy-MM-dd") : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value)
                      : null;
                    onCustomEndDateChange?.(date);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  min={
                    customStartDate
                      ? format(customStartDate, "yyyy-MM-dd")
                      : undefined
                  }
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              {customStartDate && customEndDate && (
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-full">
                  {format(customStartDate, "MMM d")} -{" "}
                  {format(customEndDate, "MMM d, yyyy")}
                </span>
              )}
            </div>
          )}

          {/* Actions Row */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {orders.length} completed order{orders.length !== 1 ? "s" : ""}
            </span>
            {/* Export button */}
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
        </div>

        {/* Orders List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"></div>
                <p className="text-gray-500 font-medium">
                  Loading past orders...
                </p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                  <Receipt className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-600 dark:text-gray-300">
                  No past orders found
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Try adjusting your date filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {orders.map((order) => {
                  const totalItems = order.items.length;

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-300 hover:shadow-xl flex flex-col h-[340px] bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900/60 dark:via-gray-800/60 dark:to-blue-900/40 border-2 border-blue-200 dark:border-blue-700 shadow-lg"
                    >
                      {/* Gradient Top Bar */}
                      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 shrink-0"></div>

                      {/* Order Content */}
                      <div className="p-3 flex-1 flex flex-col overflow-hidden">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            {/* Source & Status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base truncate">
                                {order.source.replace("QSR-", "")}
                              </h3>
                              <span className="px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg">
                                ✓ Paid
                              </span>
                            </div>
                            {/* Time Info */}
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {order.completedAt
                                    ? formatDistanceToNow(
                                        new Date(order.completedAt),
                                        { addSuffix: true }
                                      )
                                    : format(
                                        new Date(order.createdAt),
                                        "h:mm a"
                                      )}
                                </span>
                              </div>
                              {order.attendant && (
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  by {order.attendant}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Total Amount */}
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-xl font-extrabold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
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

                        {/* Items List */}
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
                              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                                {visibleItems.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700"
                                  >
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                                        {item.quantity}x
                                      </span>
                                      <span className="font-medium truncate text-sm text-gray-700 dark:text-gray-200">
                                        {item.name}
                                      </span>
                                    </div>
                                    <div className="font-semibold text-sm shrink-0 ml-2 text-gray-600 dark:text-gray-300">
                                      <CurrencyDisplay
                                        amount={item.price * item.quantity}
                                        showTooltip={false}
                                      />
                                    </div>
                                  </div>
                                ))}
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
                                    "hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30",
                                    "border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600",
                                    "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
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

                        {/* Action Buttons - Print Bill and Delete */}
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
                            onClick={() => handleOpenPaymentDialog(order)}
                            size="sm"
                            className="flex-1 flex items-center justify-center gap-1.5 font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print Bill
                          </Button>
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

      {/* Reusable PaymentDialog for Print Bill - Already paid orders */}
      {selectedOrderForPayment && (
        <PaymentDialog
          isOpen={showPaymentDialog}
          onClose={handlePaymentDialogClose}
          orderItems={paymentDialogOrderItems}
          onSuccess={handlePaymentDialogClose}
          tableNumber={selectedOrderForPayment.source
            .replace("QSR-", "")
            .replace("Table ", "")}
          onEditOrder={handlePaymentDialogClose}
          orderId={selectedOrderForPayment.id}
        />
      )}
    </>
  );
};
