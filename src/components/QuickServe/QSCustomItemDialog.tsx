import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface QSCustomItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, price: number) => void;
}

export const QSCustomItemDialog: React.FC<QSCustomItemDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const { symbol: currencySymbol } = useCurrencyContext();

  const handleAdd = () => {
    const parsedPrice = parseFloat(price);
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice < 0) return;
    onAdd(name.trim(), parsedPrice);
    setName("");
    setPrice("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="w-4 h-4 text-orange-500" />
            Add Custom Item
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
              Item Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Extra Cheese, Special Combo"
              className="h-10"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
              Price ({currencySymbol})
            </label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0"
              min="0"
              step="1"
              className="h-10"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !price || parseFloat(price) < 0}
            className="w-full h-10 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add to Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
