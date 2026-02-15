import React from "react";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

export interface QSOrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isCustom?: boolean;
}

interface QSOrderPanelProps {
  items: QSOrderItem[];
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onProceedToPayment: () => void;
}

export const QSOrderPanel: React.FC<QSOrderPanelProps> = ({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onProceedToPayment,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-white/30 px-4">
        <ShoppingBag className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">No items yet</p>
        <p className="text-xs mt-1">Tap items to add to order</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Order ({itemCount})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 h-7 px-2 text-xs"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                {item.name}
              </p>
              <p className="text-xs text-orange-500 dark:text-orange-400 font-semibold">
                {currencySymbol}
                {(item.price * item.quantity).toFixed(2)}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() =>
                  item.quantity === 1 ? onRemove(item.id) : onDecrement(item.id)
                }
                className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center justify-center text-gray-600 dark:text-white/70 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                {item.quantity === 1 ? (
                  <Trash2 className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
              </button>
              <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">
                {item.quantity}
              </span>
              <button
                onClick={() => onIncrement(item.id)}
                className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/30 flex items-center justify-center text-orange-500 dark:text-orange-400 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Total + Pay */}
      <div className="p-3 border-t border-gray-200 dark:border-white/10 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-white/60">
            Total
          </span>
          <span className="text-xl font-extrabold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            {currencySymbol}
            {subtotal.toFixed(2)}
          </span>
        </div>
        <Button
          onClick={onProceedToPayment}
          className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-base rounded-xl shadow-lg shadow-orange-500/25 transition-all active:scale-95"
        >
          Pay {currencySymbol}
          {subtotal.toFixed(2)}
        </Button>
      </div>
    </div>
  );
};
