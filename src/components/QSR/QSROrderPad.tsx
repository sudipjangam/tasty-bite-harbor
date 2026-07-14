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
  GripVertical,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
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
  onSetItemPriority?: (id: string, priority: 'first' | 'normal' | 'last') => void;
  onReorderItems?: (startIndex: number, endIndex: number) => void;
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
  nc: "Non-Chargeable",
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
  onSetItemPriority,
  onReorderItems,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const ModeIcon = modeIcons[mode];

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    
    if (onReorderItems) {
      onReorderItems(result.source.index, result.destination.index);
    }
  };

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
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="qsr-order-pad-items">
            {(provided) => (
              <div 
                className="p-4 space-y-2"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
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

                    return (
                      <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={isLoading}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "rounded-xl border transition-all",
                              isCompleted
                                ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                                : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800",
                              snapshot.isDragging ? "shadow-xl ring-2 ring-indigo-500/50 rotate-1 z-50" : ""
                            )}
                          >
                            {/* ─── LINE 1: drag · [✓] · name · qty stepper ─── */}
                            <div className="flex items-center gap-2 px-2 pt-2.5 pb-1">
                              {/* Drag handle */}
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing opacity-30 hover:opacity-80 transition-opacity shrink-0"
                              >
                                <GripVertical className="w-4 h-4 text-gray-500" />
                              </div>

                              {/* Completion circle (recalled orders only) */}
                              {isRecalledOrder && (
                                <button
                                  onClick={() => onToggleItemCompletion?.(index)}
                                  className={cn(
                                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                    isCompleted
                                      ? "bg-green-500 text-white"
                                      : "border-2 border-gray-300 dark:border-gray-500 hover:border-green-400",
                                  )}
                                >
                                  {isCompleted && <Check className="w-3 h-3" />}
                                </button>
                              )}

                              {/* Item name — takes all available space, wraps to 2 lines max */}
                              <div className="flex-1 min-w-0">
                                <span
                                  className={cn(
                                    "font-semibold text-sm leading-snug line-clamp-2 block",
                                    isCompleted
                                      ? "line-through text-gray-400 dark:text-gray-500"
                                      : "text-gray-800 dark:text-gray-100",
                                  )}
                                  title={item.name}
                                >
                                  {item.name}
                                </span>
                                {/* Inline badges */}
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {item.isCustom && (
                                    <span className="px-1.5 py-px text-[9px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                                      Custom
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                      ✓ Ready
                                    </span>
                                  )}
                                  {item.notes && (
                                    <span className="flex items-center gap-0.5 text-[10px] text-indigo-500 dark:text-indigo-400 truncate max-w-[120px]">
                                      <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                      {item.notes}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Quantity stepper — compact, right-aligned */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => onDecrement(item.id)}
                                  disabled={isLoading}
                                  className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors touch-manipulation disabled:opacity-40"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-6 text-center font-bold text-gray-800 dark:text-gray-100 text-sm tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => onIncrement(item.id)}
                                  disabled={isLoading}
                                  className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors touch-manipulation disabled:opacity-40"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* ─── LINE 2: unit price · total · priority · ½ · note · delete ─── */}
                            <div className="flex items-center gap-1.5 px-2 pb-2.5 border-t border-gray-100 dark:border-gray-700/60 mt-1 pt-1.5">
                              {/* Unit price */}
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                                @<CurrencyDisplay amount={item.price} showTooltip={false} className="text-[11px]" />
                              </span>

                              {/* Separator dot */}
                              <span className="text-gray-300 dark:text-gray-600 text-xs">·</span>

                              {/* Total price */}
                              <CurrencyDisplay
                                amount={item.price * item.quantity}
                                showTooltip={false}
                                className={cn(
                                  "font-bold text-sm shrink-0",
                                  isCompleted
                                    ? "line-through text-gray-400 dark:text-gray-500"
                                    : "text-gray-800 dark:text-gray-200",
                                )}
                              />

                              {/* Spacer */}
                              <div className="flex-1" />

                              {/* Priority cycle button */}
                              {onSetItemPriority && (
                                <button
                                  onClick={() => {
                                    const priorities: ('first' | 'normal' | 'last')[] = ['normal', 'first', 'last'];
                                    const current = item.priority || 'normal';
                                    const next = priorities[(priorities.indexOf(current) + 1) % priorities.length];
                                    onSetItemPriority(item.id, next);
                                  }}
                                  className={cn(
                                    "h-6 px-1.5 rounded-md text-[10px] font-bold border flex items-center touch-manipulation transition-colors",
                                    item.priority === 'first'
                                      ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-700"
                                      : item.priority === 'last'
                                        ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700"
                                        : "bg-transparent text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400",
                                  )}
                                  title="Cycle priority"
                                >
                                  {item.priority === 'first' ? '🔴 1st' : item.priority === 'last' ? '🔵 Lst' : '⚪'}
                                </button>
                              )}

                              {/* ½ tag */}
                              <button
                                onClick={() => {
                                  const tag = "1/2";
                                  const cur = item.notes || "";
                                  onAddNote(item.id, cur.includes(tag)
                                    ? cur.replace(tag, "").trim().replace(/,\s*$/, "")
                                    : cur ? `${cur}, ${tag}` : tag);
                                }}
                                className={cn(
                                  "h-6 w-7 rounded-md text-[11px] font-bold border flex items-center justify-center touch-manipulation transition-colors",
                                  item.notes?.includes("1/2")
                                    ? "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700"
                                    : "bg-transparent text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400",
                                )}
                                title="Toggle ½"
                              >
                                ½
                              </button>

                              {/* Edit note */}
                              <button
                                onClick={() => { setEditingNoteId(item.id); setNoteText(item.notes || ""); }}
                                className={cn(
                                  "h-6 w-6 rounded-md flex items-center justify-center touch-manipulation transition-colors border",
                                  item.notes && !item.notes.match(/^1\/2$/)
                                    ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700"
                                    : "text-gray-400 border-gray-200 dark:border-gray-600 hover:text-gray-600 hover:border-gray-400",
                                )}
                                title="Add note"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => onRemove(item.id)}
                                className="h-6 w-6 rounded-md flex items-center justify-center text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 touch-manipulation transition-colors border border-transparent hover:border-red-200"
                                title="Remove"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* ─── Note inline editor ─── */}
                            {editingNoteId === item.id && (
                              <div className="mx-2 mb-2 flex gap-1.5">
                                <input
                                  type="text"
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(item.id); if (e.key === 'Escape') setEditingNoteId(null); }}
                                  placeholder="Add a note…"
                                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveNote(item.id)}
                                  className="px-2.5 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ScrollArea>

      {/* Calculations & Actions */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
        {/* Calculations */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Subtotal:</span>
            {mode === "nc" ? (
              <span className="line-through opacity-60">
                <CurrencyDisplay amount={subtotal} showTooltip={false} />
              </span>
            ) : (
              <CurrencyDisplay amount={subtotal} showTooltip={false} />
            )}
          </div>
          {/* No tax in QSR POS */}
          <div className="flex justify-between text-xl font-bold text-gray-800 dark:text-gray-200 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>{mode === "nc" ? "Non-Chargeable Total:" : "Total:"}</span>
            {mode === "nc" ? (
              <div className="flex items-center gap-2">
                <span className="line-through opacity-50 text-base">
                  <CurrencyDisplay amount={total} showTooltip={false} />
                </span>
                <span className="text-purple-600 dark:text-purple-400">
                  <CurrencyDisplay amount={0} showTooltip={false} />
                </span>
              </div>
            ) : (
              <CurrencyDisplay amount={total} showTooltip={false} />
            )}
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
