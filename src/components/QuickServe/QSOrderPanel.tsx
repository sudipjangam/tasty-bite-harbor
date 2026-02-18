import React, { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, Percent, Tag } from "lucide-react";
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
  discountAmount?: number;
  discountPercentage?: number;
  onDiscountChange?: (amount: number, percentage: number) => void;
  onAddCustomItem?: () => void;
}

export const QSOrderPanel: React.FC<QSOrderPanelProps> = ({
  items,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onProceedToPayment,
  discountAmount = 0,
  discountPercentage = 0,
  onDiscountChange,
  onAddCustomItem,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  const [discountMode, setDiscountMode] = useState<"flat" | "percent">("flat");
  const [showDiscount, setShowDiscount] = useState(false);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Calculate discount
  const discountValue =
    discountPercentage > 0
      ? (subtotal * discountPercentage) / 100
      : discountAmount;
  const finalTotal = Math.max(0, subtotal - discountValue);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-white/30 px-4">
        <ShoppingBag className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">No items yet</p>
        <p className="text-xs mt-1">Tap items to add to order</p>
        {onAddCustomItem && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddCustomItem}
            className="mt-4 text-xs border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Custom Item
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Order ({itemCount})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onAddCustomItem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddCustomItem}
              className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 h-7 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-0.5" />
              Custom
            </Button>
          )}
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
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border",
              item.isCustom
                ? "bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20"
                : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5",
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                {item.isCustom && (
                  <span className="text-purple-500 mr-1">✦</span>
                )}
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

      {/* Footer: Discount + Total + Pay */}
      <div className="p-3 border-t border-gray-200 dark:border-white/10 space-y-2 shrink-0">
        {/* Discount toggle */}
        {onDiscountChange && (
          <>
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
            >
              <Tag className="w-3 h-3" />
              {showDiscount
                ? "Hide Discount"
                : discountValue > 0
                  ? `Discount: -${currencySymbol}${discountValue.toFixed(0)}`
                  : "Add Discount"}
            </button>
            {showDiscount && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                <div className="flex bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                  <button
                    onClick={() => {
                      setDiscountMode("flat");
                      onDiscountChange(discountAmount, 0);
                    }}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold transition-colors",
                      discountMode === "flat"
                        ? "bg-orange-500 text-white"
                        : "text-gray-600 dark:text-gray-300",
                    )}
                  >
                    {currencySymbol}
                  </button>
                  <button
                    onClick={() => {
                      setDiscountMode("percent");
                      onDiscountChange(0, discountPercentage);
                    }}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold transition-colors",
                      discountMode === "percent"
                        ? "bg-orange-500 text-white"
                        : "text-gray-600 dark:text-gray-300",
                    )}
                  >
                    <Percent className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="number"
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-400 w-20"
                  placeholder={discountMode === "flat" ? "Amount" : "%"}
                  min="0"
                  value={
                    discountMode === "flat"
                      ? discountAmount || ""
                      : discountPercentage || ""
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (discountMode === "flat") {
                      onDiscountChange(val, 0);
                    } else {
                      onDiscountChange(0, Math.min(val, 100));
                    }
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Subtotal + discount summary */}
        {discountValue > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 dark:text-white/40">Subtotal</span>
              <span className="text-gray-500 dark:text-white/50">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-green-600 dark:text-green-400">
                Discount
                {discountPercentage > 0 ? ` (${discountPercentage}%)` : ""}
              </span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                -{currencySymbol}
                {discountValue.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-white/60">
            Total
          </span>
          <span className="text-xl font-extrabold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
            {currencySymbol}
            {finalTotal.toFixed(2)}
          </span>
        </div>
        <Button
          onClick={onProceedToPayment}
          className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-base rounded-xl shadow-lg shadow-orange-500/25 transition-all active:scale-95"
        >
          Pay {currencySymbol}
          {finalTotal.toFixed(2)}
        </Button>
      </div>
    </div>
  );
};
