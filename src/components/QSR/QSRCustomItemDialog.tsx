import React, { useState } from "react";
import { X, Plus, Minus, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { QSRCustomItem } from "@/types/qsr";

interface QSRCustomItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: QSRCustomItem) => void;
}

export const QSRCustomItemDialog: React.FC<QSRCustomItemDialogProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = () => {
    if (!name.trim() || !price) return;

    onAddItem({
      name: name.trim(),
      price: parseFloat(price),
      quantity,
    });

    // Reset form
    setName("");
    setPrice("");
    setQuantity(1);
    onClose();
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-indigo-500" />
            Add Custom Item
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">Item Name</Label>
            <Input
              id="item-name"
              placeholder="e.g., Extra Cheese, Special Sauce"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-lg"
              autoFocus
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="item-price">Price (₹)</Label>
            <Input
              id="item-price"
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-12 text-lg"
              min="0"
              step="0.01"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50 transition-colors touch-manipulation"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-2xl font-bold w-16 text-center">
                {quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(1)}
                className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors touch-manipulation"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview */}
          {name && price && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {quantity}x {name}
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  ₹{(parseFloat(price) * quantity).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !price}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
