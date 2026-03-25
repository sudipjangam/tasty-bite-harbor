import React from "react";
import {
  X,
  PauseCircle,
  Play,
  Trash2,
  Clock,
  ShoppingBag,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { HeldOrder } from "@/hooks/useHeldOrders";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface QSHeldOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export const QSHeldOrdersDrawer: React.FC<QSHeldOrdersDrawerProps> = ({
  isOpen,
  onClose,
  heldOrders,
  onResume,
  onDelete,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-500 to-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <PauseCircle className="w-5 h-5" />
                Held Orders
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {heldOrders.length} order{heldOrders.length !== 1 ? "s" : ""}{" "}
                on hold
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Orders List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {heldOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <PauseCircle className="w-8 h-8 text-amber-400" />
                </div>
                <p className="font-semibold text-gray-600 dark:text-gray-300">
                  No held orders
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Use the "Hold" button to park an order
                </p>
              </div>
            ) : (
              heldOrders.map((order) => {
                const itemCount = order.items.reduce(
                  (sum, i) => sum + i.quantity,
                  0,
                );
                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border-2 border-amber-200 dark:border-amber-700/40 bg-gradient-to-br from-amber-50/80 to-yellow-50/60 dark:from-amber-900/20 dark:to-yellow-900/10 overflow-hidden transition-all"
                  >
                    {/* Card Header */}
                    <div className="px-4 pt-3 pb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-md">
                          <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-1.5">
                            <User className="w-3 h-3 text-gray-400" />
                            {order.customerName || "Walk-in Customer"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              Held{" "}
                              {formatDistanceToNow(new Date(order.heldAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                          {currencySymbol}
                          {order.subtotal.toFixed(0)}
                        </span>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="px-4 py-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {order.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-white/70 dark:bg-white/10 rounded-lg px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300 border border-amber-100 dark:border-amber-800/30"
                          >
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              {item.quantity}×
                            </span>
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-3 pt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => onResume(order.id)}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-xs font-bold rounded-xl h-9 transition-all active:scale-[0.97]"
                      >
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                        Resume Order
                      </Button>
                      <button
                        onClick={() => onDelete(order.id)}
                        className="h-9 w-9 shrink-0 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center text-red-400 hover:text-red-500 transition-all active:scale-90 border border-red-200/50 dark:border-red-800/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
