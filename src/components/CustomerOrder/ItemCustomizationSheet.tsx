import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Minus,
  Sparkles,
  Flame,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import { CustomerMenuItem, isVegItem } from "./MenuItemCard";

interface ItemCustomizationSheetProps {
  item: CustomerMenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customizedItem: {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    modifiers: string[];
    specialInstructions?: string;
  }) => void;
}

export const ItemCustomizationSheet: React.FC<ItemCustomizationSheetProps> = ({
  item,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  // Hooks must be called before any early return (Rules of Hooks)
  const [quantity, setQuantity] = useState(1);
  const [portion, setPortion] = useState<string>("Regular");
  const [spiceLevel, setSpiceLevel] = useState<string>("Medium");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [kitchenNote, setKitchenNote] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setPortion("Regular");
      setSpiceLevel("Medium");
      setSelectedAddons([]);
      setKitchenNote("");
    }
  }, [isOpen, item]);

  if (!item) return null;

  const isVeg = isVegItem(item);

  // Determine if item category supports portion options or add-ons
  const isBeverageOrDessert =
    item.category?.toLowerCase().includes("beverage") ||
    item.category?.toLowerCase().includes("drink") ||
    item.category?.toLowerCase().includes("dessert") ||
    item.category?.toLowerCase().includes("sweet");

  // Portion options
  const portionOptions = isBeverageOrDessert
    ? [{ label: "Regular", extraPrice: 0 }]
    : [
        { label: "Regular", extraPrice: 0 },
        { label: "Full / Large", extraPrice: Math.round(item.price * 0.4) },
      ];

  // Spice level options
  const spiceOptions = [
    { label: "Mild", icon: "🌱" },
    { label: "Medium", icon: "🌶️" },
    { label: "Spicy", icon: "🔥" },
  ];

  // Common Add-on extras
  const addonOptions = [
    { label: "Extra Cheese", price: 40 },
    { label: "Extra Garlic Dip", price: 25 },
    { label: "Peri Peri Seasoning", price: 20 },
    { label: "Extra Butter", price: 20 },
  ];

  const currentPortionExtra =
    portionOptions.find((p) => p.label === portion)?.extraPrice || 0;

  const addonsTotal = selectedAddons.reduce((sum, addonLabel) => {
    const found = addonOptions.find((a) => a.label === addonLabel);
    return sum + (found?.price || 0);
  }, 0);

  const unitPrice = item.price + currentPortionExtra + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const toggleAddon = (addonLabel: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonLabel)
        ? prev.filter((a) => a !== addonLabel)
        : [...prev, addonLabel],
    );
  };

  const handleConfirm = () => {
    const modifiers: string[] = [];
    if (portion !== "Regular") modifiers.push(`Portion: ${portion}`);
    if (spiceLevel) modifiers.push(`Spice: ${spiceLevel}`);
    selectedAddons.forEach((a) => modifiers.push(`+ ${a}`));

    onAddToCart({
      menuItemId: item.id,
      name: `${item.name}${portion !== "Regular" ? ` (${portion})` : ""}`,
      price: unitPrice,
      quantity,
      modifiers,
      specialInstructions: kitchenNote.trim() || undefined,
    });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t p-0 bg-white dark:bg-stone-900"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        {/* Item Header Banner */}
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center ${
                    isVeg ? "border-emerald-600" : "border-rose-600"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isVeg ? "bg-emerald-600" : "bg-rose-600"
                    }`}
                  />
                </span>
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  {item.category}
                </span>
              </div>
              <h3 className="text-lg font-black text-stone-900 dark:text-white">
                {item.name}
              </h3>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                ₹{unitPrice}
              </p>
            </div>

            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 rounded-2xl object-cover border border-stone-200 dark:border-stone-800 shadow-sm"
              />
            )}
          </div>

          {item.description && (
            <p className="text-xs text-stone-500 mt-2 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <Separator />

        <div className="p-5 space-y-5">
          {/* Portion Size */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
              Choose Portion
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {portionOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPortion(opt.label)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                    portion === opt.label
                      ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                      : "border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.extraPrice > 0 ? (
                    <span className="text-[11px] font-semibold text-stone-500">
                      +₹{opt.extraPrice}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Base
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Spice Level */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
              Spice Level
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {spiceOptions.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSpiceLevel(opt.label)}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    spiceLevel === opt.label
                      ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                      : "border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Addons */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
              Add-ons / Extras
            </h4>
            <div className="space-y-2">
              {addonOptions.map((addon) => {
                const isChecked = selectedAddons.includes(addon.label);
                return (
                  <button
                    key={addon.label}
                    type="button"
                    onClick={() => toggleAddon(addon.label)}
                    className={`w-full p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all ${
                      isChecked
                        ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                        : "border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "border-stone-300 dark:border-stone-700"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{addon.label}</span>
                    </div>
                    <span className="text-stone-500 font-bold">
                      +₹{addon.price}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cooking Instructions */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-stone-500 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              <span>Cooking Note for Chef</span>
            </div>
            <Input
              type="text"
              placeholder="e.g. Less oil, extra crispy, no garlic, etc."
              value={kitchenNote}
              onChange={(e) => setKitchenNote(e.target.value)}
              className="rounded-2xl text-xs bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-800 h-10"
              maxLength={80}
            />
          </div>
        </div>

        {/* Sticky Bottom Actions */}
        <div className="p-4 bg-stone-50 dark:bg-stone-900/90 border-t flex items-center justify-between gap-4 sticky bottom-0">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-3 bg-white dark:bg-stone-800 border rounded-2xl p-1 shadow-sm">
            <Button
              size="icon"
              variant="ghost"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded-xl"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="font-black text-sm w-4 text-center">
              {quantity}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-8 w-8 rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Add to Cart CTA */}
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-5 rounded-2xl shadow-lg shadow-orange-900/20 text-xs flex items-center justify-between px-5"
          >
            <span>Add Item</span>
            <span>₹{totalPrice}</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
