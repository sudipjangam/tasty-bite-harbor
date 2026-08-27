import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Sparkles,
  ShoppingBag,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { AggregatorProvider } from "@/types/aggregators";

interface AggregatorSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (params: {
    provider: AggregatorProvider;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
  }) => void;
}

const PRESET_ITEMS = [
  { name: "Butter Chicken", price: 340 },
  { name: "Paneer Butter Masala", price: 280 },
  { name: "Chicken Dum Biryani", price: 320 },
  { name: "Garlic Naan", price: 60 },
  { name: "Veg Hakka Noodles", price: 220 },
  { name: "Mango Lassi", price: 90 },
];

export const AggregatorSimulatorModal: React.FC<AggregatorSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<AggregatorProvider>("swiggy");
  const [customerName, setCustomerName] = useState("Aarav Sharma");
  const [selectedItems, setSelectedItems] = useState([
    { name: "Chicken Dum Biryani", quantity: 2, price: 320 },
    { name: "Mango Lassi", quantity: 2, price: 90 },
  ]);

  const addItem = (item: { name: string; price: number }) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) =>
          i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { name: item.name, quantity: 1, price: item.price }];
    });
  };

  const removeItem = (name: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.name !== name));
  };

  const totalAmount = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleFireOrder = () => {
    onSimulate({
      provider: selectedProvider,
      customerName,
      items: selectedItems,
      total: totalAmount,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span>Live Order Test Simulator</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-gray-700 dark:text-gray-300">
              Select Aggregator Platform
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={selectedProvider === "swiggy" ? "default" : "outline"}
                onClick={() => setSelectedProvider("swiggy")}
                className={`rounded-xl text-xs h-9 font-bold ${
                  selectedProvider === "swiggy"
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : ""
                }`}
              >
                Swiggy
              </Button>

              <Button
                type="button"
                variant={selectedProvider === "zomato" ? "default" : "outline"}
                onClick={() => setSelectedProvider("zomato")}
                className={`rounded-xl text-xs h-9 font-bold ${
                  selectedProvider === "zomato"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : ""
                }`}
              >
                Zomato
              </Button>

              <Button
                type="button"
                variant={selectedProvider === "magicpin" ? "default" : "outline"}
                onClick={() => setSelectedProvider("magicpin")}
                className={`rounded-xl text-xs h-9 font-bold ${
                  selectedProvider === "magicpin"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : ""
                }`}
              >
                magicpin
              </Button>
            </div>
          </div>

          {/* Customer Name */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-700 dark:text-gray-300">
              Customer Name
            </label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="rounded-xl text-xs h-9"
            />
          </div>

          {/* Quick Add Items */}
          <div className="space-y-1.5">
            <label className="font-semibold text-gray-700 dark:text-gray-300">
              Quick Add Sample Dishes
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ITEMS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => addItem(item)}
                  className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {item.name} (₹{item.price})
                </button>
              ))}
            </div>
          </div>

          {/* Current Order Items */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl space-y-2 border border-gray-100 dark:border-gray-800 max-h-40 overflow-y-auto">
            {selectedItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {item.quantity}x {item.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">₹{item.price * item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.name)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center px-1 font-bold text-sm">
            <span>Total Bill:</span>
            <span className="text-emerald-600 text-base">₹{totalAmount}</span>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleFireOrder}
            disabled={selectedItems.length === 0}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-semibold text-xs gap-1.5 shadow-md"
          >
            <Volume2 className="h-4 w-4" />
            Fire Live Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
