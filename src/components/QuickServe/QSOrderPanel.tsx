import React, { useState } from "react";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Percent,
  Tag,
  Sparkles,
} from "lucide-react";
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
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-white/25 px-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-500/10 dark:to-pink-500/10 flex items-center justify-center mb-4 shadow-inner">
          <ShoppingBag className="h-7 w-7 text-orange-300 dark:text-orange-500/40" />
        </div>
        <p className="text-sm font-semibold text-gray-500 dark:text-white/40">
          No items yet
        </p>
        <p className="text-xs mt-1 text-gray-400 dark:text-white/25">
          Tap items to add to order
        </p>
        {onAddCustomItem && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddCustomItem}
            className="mt-4 text-xs border-orange-200/60 dark:border-orange-700/40 text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl"
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
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200/50 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <ShoppingBag className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            Order
          </span>
          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-[10px] font-black text-white">
            {itemCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onAddCustomItem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddCustomItem}
              className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 h-7 px-2 text-xs rounded-xl"
            >
              <Plus className="h-3 w-3 mr-0.5" />
              Custom
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-red-400 hover:text-red-500 dark:text-red-400/80 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 h-7 px-2 text-xs rounded-xl"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* ─── Items List ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all",
              item.isCustom
                ? "bg-gradient-to-r from-violet-50/80 to-purple-50/60 dark:from-violet-500/10 dark:to-purple-500/5 border-violet-200/50 dark:border-violet-500/15"
                : "bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm border-gray-100/60 dark:border-white/[0.06]",
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                {item.isCustom && (
                  <span className="text-violet-500 mr-1">✦</span>
                )}
                {item.name}
              </p>
              <p className="text-xs font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                {currencySymbol}
                {(item.price * item.quantity).toFixed(2)}
              </p>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() =>
                  item.quantity === 1 ? onRemove(item.id) : onDecrement(item.id)
                }
                className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-500/20 flex items-center justify-center text-gray-500 dark:text-white/60 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-90"
              >
                {item.quantity === 1 ? (
                  <Trash2 className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
              </button>
              <span className="w-6 text-center text-sm font-black text-gray-900 dark:text-white">
                {item.quantity}
              </span>
              <button
                onClick={() => onIncrement(item.id)}
                className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-500/20 dark:to-pink-500/20 hover:from-orange-200 hover:to-pink-200 dark:hover:from-orange-500/30 dark:hover:to-pink-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-all active:scale-90"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Footer: Discount + Total + Pay ─── */}
      <div className="p-3 border-t border-gray-200/50 dark:border-white/5 space-y-2.5 shrink-0 bg-white/40 dark:bg-white/[0.02] backdrop-blur-lg">
        {/* Discount toggle */}
        {onDiscountChange && (
          <>
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
            >
              <Tag className="w-3 h-3" />
              {showDiscount
                ? "Hide Discount"
                : discountValue > 0
                  ? `Discount: -${currencySymbol}${discountValue.toFixed(0)}`
                  : "Add Discount"}
            </button>
            {showDiscount && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-2.5 border border-gray-100/60 dark:border-white/[0.06]">
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => {
                      setDiscountMode("flat");
                      onDiscountChange(discountAmount, 0);
                    }}
                    className={cn(
                      "px-2.5 py-1.5 text-[10px] font-bold transition-all rounded-l-xl",
                      discountMode === "flat"
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md"
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
                      "px-2.5 py-1.5 text-[10px] font-bold transition-all rounded-r-xl",
                      discountMode === "percent"
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md"
                        : "text-gray-600 dark:text-gray-300",
                    )}
                  >
                    <Percent className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="number"
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400/50 w-20 transition-all"
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
              <span className="text-gray-400 dark:text-white/30">Subtotal</span>
              <span className="text-gray-500 dark:text-white/40 font-medium">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Discount
                {discountPercentage > 0 ? ` (${discountPercentage}%)` : ""}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                -{currencySymbol}
                {discountValue.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center py-1">
          <span className="text-sm font-medium text-gray-500 dark:text-white/50">
            Total
          </span>
          <span className="text-2xl font-black bg-gradient-to-r from-orange-600 via-rose-500 to-pink-500 bg-clip-text text-transparent">
            {currencySymbol}
            {finalTotal.toFixed(2)}
          </span>
        </div>

        {/* Pay Button */}
        <Button
          onClick={onProceedToPayment}
          className="w-full h-13 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600 hover:from-orange-600 hover:via-rose-600 hover:to-pink-700 text-white font-bold text-base rounded-2xl transition-all active:scale-[0.97] border border-white/10"
          style={{
            boxShadow:
              "0 6px 24px rgba(249, 115, 22, 0.35), 0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Pay {currencySymbol}
          {finalTotal.toFixed(2)}
        </Button>
      </div>
    </div>
  );
};
