import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderItem } from "@/types/orders";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";

interface CurrentOrderProps {
  items: OrderItem[];
  tableNumber?: string;
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onRemoveItem: (id: string) => void;
  onHoldOrder: () => void;
  onSendToKitchen: () => void;
  onProceedToPayment: () => void;
  onClearOrder: () => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

const CurrentOrder = ({
  items,
  tableNumber,
  onUpdateQuantity,
  onRemoveItem,
  onHoldOrder,
  onSendToKitchen,
  onProceedToPayment,
  onClearOrder,
  onUpdateNotes,
}: CurrentOrderProps) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  const [editingNoteItem, setEditingNoteItem] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const handleOpenNoteDialog = (item: OrderItem) => {
    setEditingNoteItem(item.id);
    setNoteText(item.notes || "");
  };

  const handleSaveNote = () => {
    if (editingNoteItem) {
      onUpdateNotes(editingNoteItem, noteText);
      setEditingNoteItem(null);
      setNoteText("");
    }
  };

  // Calculate subtotal considering weight-based pricing
  const subtotal = items.reduce((sum, item) => {
    // Use calculatedPrice for weight-based items, otherwise price * quantity
    if (item.calculatedPrice !== undefined) {
      return sum + item.calculatedPrice;
    }
    return sum + item.price * item.quantity;
  }, 0);

  const total = subtotal;

  return (
    <>
      {/* Main Order Card - with max height and internal scroll */}
      <div className="h-full max-h-[calc(100vh-280px)] lg:max-h-[calc(100vh-200px)] flex flex-col bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-b border-white/20 dark:border-gray-700/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Current Order
              </h2>
              {tableNumber && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Table {tableNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-2xl p-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-lg font-medium mb-2">
                  No items in order
                </div>
                <div className="text-sm">Select menu items to add.</div>
              </div>
            </div>
          ) : (
            items.map((item) => {
              // Determine if this is a weight-based item
              const isWeightBased =
                item.pricingType && item.pricingType !== "fixed";
              const itemTotal =
                item.calculatedPrice ?? item.price * item.quantity;

              return (
                <div
                  key={item.id}
                  className="bg-gradient-to-r from-white/80 to-white/60 dark:from-gray-700/80 dark:to-gray-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-gray-600/30 shadow-md hover:shadow-lg transition-all duration-200 p-3"
                >
                  {/* Row 1: Name and Delete Button */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="flex-1 font-semibold text-sm text-gray-800 dark:text-white leading-tight min-w-0">
                      <span className="break-words line-clamp-2">
                        {item.name}
                      </span>
                      {item.isCustomExtra && (
                        <span className="ml-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded-full inline-block">
                          Custom
                        </span>
                      )}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                      className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg h-7 w-7"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Weight info for weight-based items */}
                  {isWeightBased && item.actualQuantity && item.unit && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">
                      ⚖️ {item.actualQuantity} {item.unit} @ {currencySymbol}
                      {item.price}/{item.unit}
                    </p>
                  )}

                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {item.modifiers.join(", ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 italic">
                      Note: {item.notes}
                    </p>
                  )}

                  {/* Row 2: Quantity controls and Price */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Quantity controls for fixed-price items */}
                    {!isWeightBased ? (
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-600/50 rounded-lg p-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity - 1)
                          }
                          className="h-7 w-7 rounded-md hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity + 1)
                          }
                          className="h-7 w-7 rounded-md hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Variable qty
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const splitTag = "1/2";
                        const currentNotes = item.notes || "";
                        const newNotes = currentNotes.includes(splitTag)
                          ? currentNotes.replace(splitTag, "").trim()
                          : currentNotes
                          ? `${currentNotes}, ${splitTag}`
                          : splitTag;
                        onUpdateNotes(item.id, newNotes);
                      }}
                      className={`h-7 w-7 rounded-lg transition-colors border ${
                        item.notes?.includes("1/2")
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700"
                          : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-transparent"
                      }`}
                      title="Toggle 1/2"
                    >
                      <span className="text-[10px] font-bold">1/2</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenNoteDialog(item)}
                      className="h-7 w-7 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                      title="Add Note"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                    </Button>

                    {/* Price */}
                    <div className="font-bold text-sm text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {currencySymbol}
                      {itemTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order Summary & Actions */}
        <div className="bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm border-t border-white/30 dark:border-gray-700/30 p-6 space-y-4">
          {/* Totals */}
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal:</span>
              <span className="font-semibold">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-gray-200 dark:border-gray-600 pt-3">
              <span className="text-gray-800 dark:text-white">Total:</span>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {currencySymbol}
                {total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={onSendToKitchen}
                disabled={items.length === 0}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Send to Kitchen
              </Button>
              <Button
                onClick={onHoldOrder}
                disabled={items.length === 0}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Hold Order
              </Button>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              onClick={onProceedToPayment}
              disabled={items.length === 0}
            >
              Proceed to Payment
            </Button>

            <Button
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl"
              onClick={onClearOrder}
              disabled={items.length === 0}
            >
              Clear Order
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Bar - Fixed at bottom on mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 p-4 shadow-2xl z-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {items.length} item{items.length !== 1 ? "s" : ""} •{" "}
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {currencySymbol}
                {total.toFixed(2)}
              </span>
            </p>
          </div>
          <Button
            onClick={onSendToKitchen}
            disabled={items.length === 0}
            size="sm"
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg"
          >
            Send to Kitchen
          </Button>
          <Button
            onClick={onProceedToPayment}
            disabled={items.length === 0}
            size="sm"
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg"
          >
            Pay
          </Button>
        </div>
      </div>

      <Dialog
        open={!!editingNoteItem}
        onOpenChange={(open) => !open && setEditingNoteItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="note" className="mb-2 block">
              Note / Special Instructions
            </Label>
            <Input
              id="note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. No onion, Extra spicy..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveNote();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNoteItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CurrentOrder;
