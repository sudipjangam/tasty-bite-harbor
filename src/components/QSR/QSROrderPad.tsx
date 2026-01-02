import React, { useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  MessageSquare,
  PackagePlus,
  Utensils,
  Package,
  Truck,
  Gift,
  ChevronRight,
  Edit2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QSROrderItem, QSROrderMode, QSRTable } from "@/types/qsr";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QSROrderPadProps {
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
  itemCompletionStatus?: boolean[];
  onToggleItemCompletion?: (index: number) => void;
  isRecalledOrder?: boolean;
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

export const QSROrderPad: React.FC<QSROrderPadProps> = ({
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
  itemCompletionStatus = [],
  onToggleItemCompletion,
  isRecalledOrder = false,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const ModeIcon = modeIcons[mode];

  const handleSaveNote = (id: string) => {
    onAddNote(id, noteText);
    setEditingNoteId(null);
    setNoteText("");
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-gradient-to-r from-indigo-500 to-purple-600">
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

      {/* Items List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                Order is empty
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Add items from the menu
              </p>
            </div>
          ) : (
            items.map((item, index) => {
              const isCompleted = itemCompletionStatus[index] === true;
              const canToggle = isRecalledOrder && onToggleItemCompletion;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border transition-all",
                    isCompleted
                      ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-100 dark:border-gray-700"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Completion indicator for recalled orders */}
                    {isRecalledOrder && (
                      <button
                        onClick={() => onToggleItemCompletion?.(index)}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                          isCompleted
                            ? "bg-green-500 text-white"
                            : "border-2 border-gray-300 dark:border-gray-500 hover:border-green-400"
                        )}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Item Info - Full width for name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              "font-medium text-sm leading-tight block",
                              isCompleted
                                ? "line-through text-gray-400 dark:text-gray-500"
                                : "text-gray-800 dark:text-gray-200"
                            )}
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          {item.isCustom && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                              Custom
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-block mt-0.5 ml-1 text-xs text-green-600 dark:text-green-400 font-medium">
                              ✓ Ready
                            </span>
                          )}
                        </div>
                        {/* Item Total - Top right */}
                        <div className="text-right shrink-0">
                          <CurrencyDisplay
                            amount={item.price * item.quantity}
                            showTooltip={false}
                            className={cn(
                              "font-bold",
                              isCompleted
                                ? "line-through text-gray-400 dark:text-gray-500"
                                : "text-gray-800 dark:text-gray-200"
                            )}
                          />
                        </div>
                      </div>

                      {/* Price per unit */}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        @{" "}
                        <CurrencyDisplay
                          amount={item.price}
                          showTooltip={false}
                        />
                      </div>

                      {item.notes && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.notes}</span>
                        </div>
                      )}

                      {/* Controls Row - Quantity, Actions */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onDecrement(item.id)}
                            className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors touch-manipulation"
                            disabled={isLoading}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-semibold text-gray-800 dark:text-gray-200 text-sm">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onIncrement(item.id)}
                            className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors touch-manipulation"
                            disabled={isLoading}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const splitTag = "1/2";
                              const currentNotes = item.notes || "";
                              const newNotes = currentNotes.includes(splitTag)
                                ? currentNotes.replace(splitTag, "").trim()
                                : currentNotes
                                ? `${currentNotes}, ${splitTag}`
                                : splitTag;
                              onAddNote(item.id, newNotes);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors touch-manipulation font-medium text-xs w-7 h-7 flex items-center justify-center border",
                              item.notes?.includes("1/2")
                                ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700"
                                : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 border-transparent"
                            )}
                            title="Toggle 1/2"
                          >
                            1/2
                          </button>
                          <button
                            onClick={() => {
                              setEditingNoteId(item.id);
                              setNoteText(item.notes || "");
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors touch-manipulation"
                            title="Add note"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRemove(item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 transition-colors touch-manipulation"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
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
                        className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Calculations & Actions */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
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

        {/* Custom Item Button */}
        <button
          onClick={onAddCustomItem}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors touch-manipulation"
        >
          <PackagePlus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Custom Item</span>
        </button>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onSendToKitchen}
            disabled={items.length === 0 || isLoading}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-orange-500/30 transition-all touch-manipulation"
          >
            Send to Kitchen
          </Button>
          <Button
            onClick={onHoldOrder}
            disabled={items.length === 0 || isLoading}
            variant="outline"
            className="border-2 border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-semibold py-3 rounded-xl transition-all touch-manipulation"
          >
            Hold Order
          </Button>
        </div>

        <Button
          onClick={onProceedToPayment}
          disabled={items.length === 0 || isLoading}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 text-lg transition-all touch-manipulation"
        >
          💳 Proceed to Payment
        </Button>

        <button
          onClick={onClearOrder}
          disabled={items.length === 0 || isLoading}
          className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 py-2 transition-colors disabled:opacity-50"
        >
          Clear Order
        </button>
      </div>
    </div>
  );
};
