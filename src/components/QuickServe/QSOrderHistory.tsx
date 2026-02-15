import React, { useState } from "react";
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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { startOfDay, endOfDay, format } from "date-fns";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
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
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const { data: todaysOrders = [], isLoading } = useQuery({
    queryKey: ["quickserve-order-history", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const today = new Date();
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, customer_name, customer_phone, items, total, status, payment_status, created_at",
        )
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId && isOpen,
    refetchInterval: isOpen ? 10000 : false,
  });

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
            name: match[2].trim(),
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
            <span className="text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              {currencySymbol}
              {totalRevenue.toFixed(2)}
            </span>
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

                      {/* Recall Order Button */}
                      {onRecallOrder && parsedItems.length > 0 && (
                        <div className="px-3 pb-3">
                          <Button
                            onClick={() => handleRecallOrder(order)}
                            variant="outline"
                            size="sm"
                            className="w-full border-orange-300 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 h-9"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Repeat This Order
                          </Button>
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
