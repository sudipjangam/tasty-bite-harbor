import React, { useState, useMemo } from "react";
import {
  X,
  ShoppingCart,
  ChevronUp,
  Plus,
  Minus,
  Trash2,
  Edit2,
  Search,
  PackagePlus,
  Utensils,
  Package,
  Truck,
  Gift,
  ChevronRight,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QSROrderItem, QSROrderMode, QSRTable } from "@/types/qsr";
import { QSRMenuItem } from "@/hooks/useQSRMenuItems";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QSRCartBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: QSROrderItem[];
  mode: QSROrderMode;
  selectedTable: QSRTable | null;
  subtotal: number;
  tax: number;
  total: number;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  onSendToKitchen: () => void;
  onHoldOrder: () => void;
  onProceedToPayment: () => void;
  onClearOrder: () => void;
  onAddCustomItem: () => void;
  onChangeTable?: () => void;
  isLoading?: boolean;
  // New props for menu search
  menuItems?: QSRMenuItem[];
  onAddMenuItem?: (item: QSRMenuItem) => void;
}

const modeIcons: Record<
  QSROrderMode,
  React.ComponentType<{ className?: string }>
> = {
  dine_in: Utensils,
  takeaway: Package,
  delivery: Truck,
  nc: Gift,
};

const modeLabels: Record<QSROrderMode, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
  nc: "NC",
};

export const QSRCartBottomSheet: React.FC<QSRCartBottomSheetProps> = ({
  isOpen,
  onClose,
  items,
  mode,
  selectedTable,
  subtotal,
  tax,
  total,
  onIncrement,
  onDecrement,
  onRemove,
  onAddNote,
  onSendToKitchen,
  onHoldOrder,
  onProceedToPayment,
  onClearOrder,
  onAddCustomItem,
  onChangeTable,
  isLoading = false,
  menuItems = [],
  onAddMenuItem,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showAddItems, setShowAddItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const ModeIcon = modeIcons[mode];

  // Filter menu items by search
  const filteredMenuItems = useMemo(() => {
    if (!searchQuery) return menuItems.slice(0, 20); // Show first 20 if no search
    const query = searchQuery.toLowerCase();
    return menuItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [menuItems, searchQuery]);

  const handleSaveNote = (id: string) => {
    onAddNote(id, noteText);
    setEditingNoteId(null);
    setNoteText("");
  };

  const handleAddItem = (item: QSRMenuItem) => {
    if (onAddMenuItem) {
      onAddMenuItem(item);
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 md:hidden",
          "bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl",
          "transition-transform duration-300 ease-out",
          "h-[90vh] flex flex-col",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-2 flex-shrink-0">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              Order ({items.length} items)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Mode Header */}
        <div className="flex-shrink-0 mx-4 mb-2 p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ModeIcon className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">
                MODE <span className="opacity-80 ml-1">{modeLabels[mode]}</span>
              </span>
            </div>
            {mode === "dine_in" && selectedTable && (
              <button
                onClick={onChangeTable}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm transition-colors"
              >
                <span>{selectedTable.name}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-4">
          {/* Cart Items */}
          <div className="space-y-2 pb-4">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Order is empty
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Add items below or from the menu
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {item.name}
                        </span>
                        {item.isCustom && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        @{" "}
                        <CurrencyDisplay
                          amount={item.price}
                          showTooltip={false}
                        />
                      </div>
                      {item.notes && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                          <MessageSquare className="w-3 h-3" />
                          <span className="truncate">{item.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onDecrement(item.id)}
                        className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center touch-manipulation"
                        disabled={isLoading}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-gray-800 dark:text-gray-200">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onIncrement(item.id)}
                        className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center touch-manipulation"
                        disabled={isLoading}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right min-w-[60px]">
                      <CurrencyDisplay
                        amount={item.price * item.quantity}
                        showTooltip={false}
                        className="font-semibold text-gray-800 dark:text-gray-200"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingNoteId(item.id);
                          setNoteText(item.notes || "");
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 touch-manipulation"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemove(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 touch-manipulation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Note Input */}
                  {editingNoteId === item.id && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note..."
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveNote(item.id)}
                        className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add More Items Section */}
          <div className="pb-4">
            <button
              onClick={() => setShowAddItems(!showAddItems)}
              className="w-full flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 touch-manipulation"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add More Items</span>
              </div>
              {showAddItems ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>

            {showAddItems && menuItems.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                {/* Search Input */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-lg"
                    autoFocus
                  />
                </div>

                {/* Menu Items Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {filteredMenuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      className="p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-left hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors touch-manipulation active:scale-95"
                    >
                      <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                        {item.name}
                      </div>
                      <CurrencyDisplay
                        amount={item.price}
                        showTooltip={false}
                        className="text-xs text-indigo-600 dark:text-indigo-400"
                      />
                    </button>
                  ))}
                </div>

                {filteredMenuItems.length === 0 && (
                  <p className="text-center py-4 text-gray-500 text-sm">
                    No items found
                  </p>
                )}

                {/* Custom Item Button */}
                <button
                  onClick={onAddCustomItem}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors touch-manipulation"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Custom Item</span>
                </button>
              </div>
            )}

            {showAddItems && menuItems.length === 0 && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
                <p className="text-gray-500 text-sm mb-2">
                  Menu items loading...
                </p>
                <button
                  onClick={onAddCustomItem}
                  className="flex items-center justify-center gap-2 py-2 px-4 mx-auto border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 touch-manipulation"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Custom Item</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer - Totals & Actions */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 pb-24 space-y-3">
          {/* Calculations */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Subtotal:</span>
              <CurrencyDisplay amount={subtotal} showTooltip={false} />
            </div>
            {/* No tax in QSR POS */}
            <div className="flex justify-between text-xl font-bold text-gray-800 dark:text-gray-200 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Total:</span>
              <CurrencyDisplay amount={total} showTooltip={false} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                onSendToKitchen();
                onClose();
              }}
              disabled={items.length === 0 || isLoading}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-500/30 touch-manipulation"
            >
              Send to Kitchen
            </Button>
            <Button
              onClick={() => {
                onHoldOrder();
                onClose();
              }}
              disabled={items.length === 0 || isLoading}
              variant="outline"
              className="border-2 border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-semibold py-3 rounded-xl touch-manipulation"
            >
              Hold Order
            </Button>
          </div>

          <Button
            onClick={() => {
              onProceedToPayment();
              onClose();
            }}
            disabled={items.length === 0 || isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 text-lg touch-manipulation"
          >
            💳 Proceed to Payment
          </Button>

          <button
            onClick={onClearOrder}
            disabled={items.length === 0 || isLoading}
            className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 py-1 transition-colors disabled:opacity-50"
          >
            Clear Order
          </button>
        </div>
      </div>
    </>
  );
};

// Floating Cart Button for Mobile
interface QSRCartFABProps {
  itemCount: number;
  total: number;
  onClick: () => void;
}

export const QSRCartFAB: React.FC<QSRCartFABProps> = ({
  itemCount,
  total,
  onClick,
}) => {
  if (itemCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-20 left-4 right-4 z-30 md:hidden",
        "bg-gradient-to-r from-indigo-500 to-purple-600 text-white",
        "rounded-2xl shadow-2xl shadow-indigo-500/30",
        "flex items-center justify-between p-4",
        "transition-all duration-300 active:scale-95"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingCart className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-indigo-600 text-xs font-bold rounded-full flex items-center justify-center">
            {itemCount}
          </span>
        </div>
        <span className="font-medium">
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <CurrencyDisplay
          amount={total}
          showTooltip={false}
          className="text-white font-bold text-lg"
        />
        <ChevronUp className="w-5 h-5" />
      </div>
    </button>
  );
};
