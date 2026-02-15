import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Clock, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { startOfDay, endOfDay, format } from "date-fns";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface QSOrderHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QSOrderHistory: React.FC<QSOrderHistoryProps> = ({
  isOpen,
  onClose,
}) => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();

  const { data: todaysOrders = [], isLoading } = useQuery({
    queryKey: ["quickserve-order-history", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const today = new Date();
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, customer_name, items, total, status, payment_status, created_at",
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
            todaysOrders.map((order) => (
              <div
                key={order.id}
                className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {order.customer_name || "Walk-in"}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-white/40">
                    {format(new Date(order.created_at), "hh:mm a")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-white/50">
                    {Array.isArray(order.items) ? order.items.length : 0} items
                  </span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-bold text-orange-500">
                      {currencySymbol}
                      {Number(order.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
