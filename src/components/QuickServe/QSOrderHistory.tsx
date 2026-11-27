import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  User,
  Phone,
  Printer,
  WifiOff,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import { startOfDay, endOfDay, format } from "date-fns";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  formatOrderItemString,
  sanitizeOrderItemDisplay,
} from "@/lib/order-utils";
import {
  getCachedPaymentSettings,
  getCachedRestaurant,
  getLocalOrdersByRestaurant,
  LOCAL_ORDERS_EVENT,
  OfflineQsrOrder,
  SYNC_COMPLETED_EVENT,
} from "@/utils/offlineDB";
import { thermalPrinterService } from "@/services/thermalPrinterService";
import { cn } from "@/lib/utils";

export interface RecalledOrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface QSOrderHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onRecallOrder?: (
    items: RecalledOrderItem[],
    customerName: string,
    customerPhone: string,
  ) => void;
}

export const QSOrderHistory: React.FC<QSOrderHistoryProps> = ({
  isOpen,
  onClose,
  onRecallOrder,
}) => {
  const { restaurantId, restaurantName } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { user, isRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canViewRevenue = Boolean(
    user?.role_has_full_access ||
      (typeof isRole === "function" &&
        (isRole("admin") || isRole("manager") || isRole("owner"))),
  );
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId || !isOpen) return;
    const handleRefresh = () => {
      queryClient.invalidateQueries({
        queryKey: ["quickserve-order-history", restaurantId],
      });
    };
    window.addEventListener(LOCAL_ORDERS_EVENT, handleRefresh);
    window.addEventListener(SYNC_COMPLETED_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(LOCAL_ORDERS_EVENT, handleRefresh);
      window.removeEventListener(SYNC_COMPLETED_EVENT, handleRefresh);
    };
  }, [restaurantId, isOpen, queryClient]);

  // M-7: Refresh history on reconnect
  const prevOnlineRef = React.useRef(isOnline);
  useEffect(() => {
    if (isOnline && !prevOnlineRef.current && restaurantId && isOpen) {
      queryClient.invalidateQueries({
        queryKey: ["quickserve-order-history", restaurantId],
      });
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, restaurantId, isOpen, queryClient]);

  const { data: todaysOrders = [], isLoading } = useQuery({
    queryKey: ["quickserve-order-history", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return [];
      const today = new Date();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);
      const cacheKey = `qs_past_orders_snapshot_${restaurantId}`;

      const mapLocalToHistory = (lo: OfflineQsrOrder) => ({
        id: lo.orderId || lo.id,
        customer_name: lo.customerName || "Walk-in Customer",
        customer_phone: lo.customerPhone || null,
        items:
          lo.formattedItems ||
          (lo.items || []).map((i) =>
            formatOrderItemString(
              i.quantity,
              i.name,
              i.price,
              Array.isArray(i.notes) ? i.notes.join(", ") : i.notes,
            ),
          ),
        total: lo.total,
        status: lo.status,
        payment_status: lo.paymentStatus || "paid",
        created_at: lo.createdAt,
        order_number: lo.orderNumber || null,
        isOfflinePending: !lo.synced,
      });

      const dayStartMs = dayStart.getTime();
      const dayEndMs = dayEnd.getTime();

      let localOrders: OfflineQsrOrder[] = [];
      try {
        localOrders = (await getLocalOrdersByRestaurant(restaurantId)).filter(
          (lo) => {
            const src = (lo.source || "").toLowerCase();
            if (src && src !== "quickserve" && src !== "pos") return false;
            const ts = new Date(lo.createdAt).getTime();
            if (ts < dayStartMs || ts > dayEndMs) return false;
            return true;
          },
        );
      } catch {
        localOrders = [];
      }

      const loadSnapshot = () => {
        try {
          const raw = localStorage.getItem(cacheKey);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      };

      const mergeOrders = (baseRows: any[], serverSucceeded = false) => {
        const mergedMap = new Map<string, any>();
        for (const r of baseRows) {
          const rTs = new Date(r.created_at).getTime();
          if (rTs < dayStartMs || rTs > dayEndMs) continue;
          mergedMap.set(r.id, r);
        }
        for (const lo of localOrders) {
          if (serverSucceeded && lo.synced === true) {
            continue;
          }
          if (
            lo.status === "deleted" ||
            !["paid", "nc"].includes(lo.paymentStatus || "")
          ) {
            if (!serverSucceeded || !lo.synced || lo.status !== "deleted") {
              mergedMap.delete(lo.orderId || lo.id);
              mergedMap.delete(lo.id);
            }
            continue;
          }
          const mapped = mapLocalToHistory(lo);
          const existing = mergedMap.get(mapped.id);
          if (
            existing &&
            lo.synced === true &&
            existing.updated_at &&
            lo.updatedAt &&
            new Date(existing.updated_at).getTime() >
              new Date(lo.updatedAt).getTime()
          ) {
            continue;
          }
          mergedMap.set(
            mapped.id,
            existing ? { ...existing, ...mapped } : mapped,
          );
        }
        return Array.from(mergedMap.values()).sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      };

      const offlineNow =
        !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);
      if (offlineNow) {
        return mergeOrders(loadSnapshot(), false);
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, customer_name, customer_phone, items, total, discount_amount, payment_method, status, payment_status, created_at, updated_at, order_number",
          )
          .eq("restaurant_id", restaurantId)
          .in("source", ["quickserve", "pos"])
          .in("payment_status", ["paid", "nc"])
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString())
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw error;
        const rows = data || [];
        try {
          localStorage.setItem(cacheKey, JSON.stringify(rows));
        } catch {
          /* ignore storage quota */
        }
        return mergeOrders(rows, true);
      } catch (err) {
        const snap = loadSnapshot();
        if (snap.length > 0 || localOrders.some((lo) => lo.status !== "deleted")) {
          return mergeOrders(snap, false);
        }
        throw err;
      }
    },
    enabled: !!restaurantId && isOpen,
    refetchInterval: isOpen ? 60000 : false,
  });

  const handlePrintHistoryOrder = async (order: any, parsedItems: RecalledOrderItem[]) => {
    try {
      const [cachedRestaurant, cachedPayment] = restaurantId
        ? await Promise.all([
            getCachedRestaurant(restaurantId),
            getCachedPaymentSettings(restaurantId),
          ])
        : [undefined, undefined];

      const billNum = order.order_number
        ? `#${String(order.order_number).padStart(3, "0")}`
        : `#${String(order.id || Date.now()).slice(-6)}`;
      const created = new Date(order.created_at || Date.now());
      const itemsSubtotal = parsedItems.reduce(
        (s, item) => s + item.price * item.quantity,
        0,
      );
      const net = Number(order.total) || 0;
      const recordedDiscount = Number(order.discount_amount) || 0;
      const computedSubtotal =
        itemsSubtotal > 0 ? itemsSubtotal : net + recordedDiscount;
      const computedDiscount =
        recordedDiscount > 0
          ? recordedDiscount
          : Math.max(0, computedSubtotal - net);
      await thermalPrinterService.printReceipt({
        restaurantName:
          cachedRestaurant?.name || restaurantName || "Restaurant",
        address: cachedRestaurant?.address,
        phone: cachedRestaurant?.phone,
        gstin: cachedRestaurant?.gstin || undefined,
        billNumber: billNum,
        date: created.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: created.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        customerName: order.customer_name || undefined,
        customerMobile: order.customer_phone || undefined,
        items: parsedItems,
        subtotal: computedSubtotal,
        cgst: 0,
        sgst: 0,
        discount: computedDiscount,
        netAmount: net,
        currencySymbol,
        upiId:
          cachedPayment?.upi_id || cachedRestaurant?.upi_id || undefined,
      });
      toast({ title: "Receipt sent to printer ✓" });
    } catch (err: any) {
      toast({
        title: "Print Failed",
        description: err?.message || "Could not print receipt",
        variant: "destructive",
      });
    }
  };

  const totalRevenue = todaysOrders.reduce(
    (sum, o) => sum + (Number(o.total) || 0),
    0,
  );

  // Parse item strings like "2x Veg Manchurian @179"
  const parseOrderItems = (items: any): RecalledOrderItem[] => {
    if (!Array.isArray(items)) return [];
    return items
      .map((itemStr: string) => {
        const match = itemStr.match(/^(\d+)x\s+(.+)\s+@(\d+(?:\.\d+)?)$/);
        if (match) {
          return {
            quantity: parseInt(match[1], 10),
            name: sanitizeOrderItemDisplay(match[2]),
            price: parseFloat(match[3]),
          };
        }
        // Fallback — just show the raw string
        return { quantity: 1, name: String(itemStr), price: 0 };
      })
      .filter(Boolean);
  };

  const handleRecallOrder = (order: any) => {
    if (!onRecallOrder) return;
    const parsedItems = parseOrderItems(order.items);
    onRecallOrder(
      parsedItems,
      order.customer_name || "",
      order.customer_phone || "",
    );
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:w-[400px] bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white p-0"
      >
        <SheetHeader className="px-4 py-4 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-orange-500/5 to-pink-500/5 dark:from-orange-500/10 dark:to-pink-500/10">
          <SheetTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Today's Orders
          </SheetTitle>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-500 dark:text-white/50">
              {todaysOrders.length} orders
            </span>
            {canViewRevenue && (
              <span className="text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                {currencySymbol}
                {totalRevenue.toFixed(2)}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400 dark:text-white/40">
              Loading...
            </div>
          ) : todaysOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-white/40">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No orders yet today</p>
            </div>
          ) : (
            todaysOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              const parsedItems = parseOrderItems(order.items);

              return (
                <div
                  key={order.id}
                  className={cn(
                    "rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 overflow-hidden transition-all",
                    isExpanded && "ring-1 ring-orange-500/30",
                  )}
                >
                  {/* Order Summary — Clickable */}
                  <button
                    onClick={() =>
                      setExpandedOrderId(isExpanded ? null : order.id)
                    }
                    className="w-full p-3 text-left space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {order.customer_name || "Walk-in"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-white/40">
                          {format(new Date(order.created_at), "hh:mm a")}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-gray-400 dark:text-white/40" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-white/40" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-white/50">
                        {parsedItems.length} items
                      </span>
                      <div className="flex items-center gap-1.5">
                        {order.isOfflinePending && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            <WifiOff className="h-2.5 w-2.5" />
                            Pending Sync
                          </span>
                        )}
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-sm font-bold text-orange-500">
                          {currencySymbol}
                          {Number(order.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-white/10">
                      {/* Customer Info */}
                      {(order.customer_name || order.customer_phone) && (
                        <div className="px-3 pt-2 pb-1 flex items-center gap-3 text-xs text-gray-500 dark:text-white/50">
                          {order.customer_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {order.customer_name}
                            </span>
                          )}
                          {order.customer_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {order.customer_phone}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Item List */}
                      <div className="px-3 py-2 space-y-1">
                        {parsedItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-[10px] font-bold text-orange-600 dark:text-orange-400">
                                {item.quantity}
                              </span>
                              <span className="text-xs text-gray-700 dark:text-white/80">
                                {item.name}
                              </span>
                            </div>
                            {item.price > 0 && (
                              <span className="text-xs font-medium text-gray-500 dark:text-white/50">
                                {currencySymbol}
                                {(item.price * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Total row */}
                      <div className="px-3 py-2 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500 dark:text-white/50">
                          Total
                        </span>
                        <span className="text-sm font-bold text-orange-500">
                          {currencySymbol}
                          {Number(order.total).toFixed(2)}
                        </span>
                      </div>

                      {/* Actions: Print Bill + Repeat Order */}
                      {parsedItems.length > 0 && (
                        <div className="px-3 pb-3 flex gap-2">
                          <Button
                            onClick={() => handlePrintHistoryOrder(order, parsedItems)}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-indigo-300 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 h-9"
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Print Bill
                          </Button>
                          {onRecallOrder && (
                            <Button
                              onClick={() => handleRecallOrder(order)}
                              variant="outline"
                              size="sm"
                              className="flex-1 border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 h-9"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Repeat This Order
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
