import React, { useState } from "react";
import { Plus, Minus, Trash2, Sparkles, Flame, SlidersHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";

export interface CustomerMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  is_available: boolean;
  dietary?: "veg" | "non_veg" | "egg";
  is_bestseller?: boolean;
}

export const isEggItem = (item: {
  dietary?: "veg" | "non_veg" | "egg";
  name: string;
}): boolean => {
  if (item.dietary === "egg") return true;
  if (item.dietary === "veg" || item.dietary === "non_veg") return false;
  const lower = item.name.toLowerCase();
  return lower.includes("egg") || lower.includes("omelette");
};

export const isVegItem = (item: {
  dietary?: "veg" | "non_veg" | "egg";
  name: string;
}): boolean => {
  if (item.dietary === "veg") return true;
  if (item.dietary === "non_veg" || item.dietary === "egg") return false;
  if (isEggItem(item)) return false;
  const lower = item.name.toLowerCase();
  return (
    !lower.includes("chicken") &&
    !lower.includes("mutton") &&
    !lower.includes("fish") &&
    !lower.includes("prawn") &&
    !lower.includes("pork") &&
    !lower.includes("beef")
  );
};

interface MenuItemCardProps {
  item: CustomerMenuItem;
  onCustomize?: (item: CustomerMenuItem) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onCustomize }) => {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const [imageError, setImageError] = useState(false);

  const cartItem = items.find((i) => i.menuItemId === item.id);
  const quantity = cartItem?.quantity || 0;

  // Detect Veg/Non-Veg/Egg using shared resolver
  const isVeg = isVegItem(item);

  const isBestseller = item.is_bestseller || item.price > 250;

  const handleAdd = () => {
    if (onCustomize) {
      onCustomize(item);
    } else {
      addItem({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        modifiers: [],
      });
    }
  };

  const handleIncrement = () => {
    if (cartItem) {
      updateQuantity(cartItem.id, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      if (quantity === 1) {
        removeItem(cartItem.id);
      } else {
        updateQuantity(cartItem.id, quantity - 1);
      }
    }
  };

  const hasImage = item.image && !imageError;

  return (
    <Card className="overflow-hidden group rounded-3xl border border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      {/* Image & Badges Section */}
      <div
        className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-stone-100 dark:from-stone-800 dark:to-stone-900 cursor-pointer"
        onClick={() => onCustomize && onCustomize(item)}
      >
        {hasImage ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
            <span className="text-3xl filter drop-shadow-sm mb-1">
              {isVeg ? "🥗" : "🍗"}
            </span>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
              {item.category}
            </span>
          </div>
        )}

        {/* Dietary Marker Top-Left */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <div
            className={`w-4.5 h-4.5 rounded-md bg-white/95 dark:bg-stone-900/95 backdrop-blur-md flex items-center justify-center border-2 shadow-sm ${
              isVeg ? "border-emerald-600" : "border-rose-600"
            }`}
            title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isVeg ? "bg-emerald-600" : "bg-rose-600"
              }`}
            />
          </div>
        </div>

        {/* Bestseller Badge Top-Right */}
        {isBestseller && (
          <Badge className="absolute top-2.5 right-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 shadow-md flex items-center gap-1 border-0">
            <Flame className="w-3 h-3 text-yellow-200" /> Bestseller
          </Badge>
        )}
      </div>

      {/* Item Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between space-y-3">
        <div
          className="space-y-1 cursor-pointer"
          onClick={() => onCustomize && onCustomize(item)}
        >
          <div className="flex items-baseline justify-between gap-1">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-white leading-snug line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {item.name}
            </h3>
            <span className="font-black text-sm text-stone-900 dark:text-white shrink-0">
              ₹{item.price}
            </span>
          </div>

          {item.description && (
            <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-tight">
              {item.description}
            </p>
          )}
        </div>

        {/* Add Button or Stepper */}
        <div>
          {quantity === 0 ? (
            <div className="space-y-1">
              <Button
                onClick={handleAdd}
                size="sm"
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-900/20 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                ADD
              </Button>
              <button
                type="button"
                onClick={() => onCustomize && onCustomize(item)}
                className="w-full text-center text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center justify-center gap-1"
              >
                <SlidersHorizontal className="w-2.5 h-2.5" />
                Customisable
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between p-1 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
                <Button
                  onClick={handleDecrement}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-xl hover:bg-amber-200/50 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200"
                >
                  {quantity === 1 ? (
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Minus className="w-3.5 h-3.5" />
                  )}
                </Button>

                <span className="font-black text-sm text-amber-950 dark:text-amber-100">
                  {quantity}
                </span>

                <Button
                  onClick={handleIncrement}
                  size="icon"
                  className="h-7 w-7 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              <button
                type="button"
                onClick={() => onCustomize && onCustomize(item)}
                className="w-full text-center text-[10px] text-stone-500 font-semibold hover:underline"
              >
                Edit options
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
