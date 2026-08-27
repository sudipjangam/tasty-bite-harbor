import React, { useState } from "react";
import { Plus, Minus, Trash2, Sparkles, Flame } from "lucide-react";
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

interface MenuItemCardProps {
  item: CustomerMenuItem;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const [imageError, setImageError] = useState(false);

  const cartItem = items.find((i) => i.menuItemId === item.id);
  const quantity = cartItem?.quantity || 0;

  // Detect Veg/Non-Veg
  const isVeg =
    item.dietary === "veg" ||
    (!item.dietary &&
      !item.name.toLowerCase().includes("chicken") &&
      !item.name.toLowerCase().includes("mutton") &&
      !item.name.toLowerCase().includes("fish") &&
      !item.name.toLowerCase().includes("prawn") &&
      !item.name.toLowerCase().includes("egg") &&
      !item.name.toLowerCase().includes("pork") &&
      !item.name.toLowerCase().includes("beef"));

  const isBestseller = item.is_bestseller || item.price > 250;

  const handleAdd = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      modifiers: [],
    });
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
    <Card className="overflow-hidden group rounded-3xl border border-gray-200/70 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
      {/* Image & Badges Section */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-orange-50/50 via-purple-50/30 to-slate-100 dark:from-gray-800 dark:to-gray-900">
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
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {item.category}
            </span>
          </div>
        )}

        {/* Dietary Marker Top-Left */}
        <div className="absolute top-3 left-3 z-10">
          <div
            className={`w-5 h-5 rounded-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center border-2 shadow-sm ${
              isVeg ? "border-emerald-600" : "border-rose-600"
            }`}
            title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isVeg ? "bg-emerald-600" : "bg-rose-600"
              }`}
            />
          </div>
        </div>

        {/* Bestseller Badge Top-Right */}
        {isBestseller && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 shadow-md flex items-center gap-1 border-0">
            <Flame className="w-3 h-3 text-yellow-200" /> Bestseller
          </Badge>
        )}
      </div>

      {/* Item Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between space-y-3">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-1">
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white leading-snug line-clamp-1">
              {item.name}
            </h3>
            <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
              ₹{item.price}
            </span>
          </div>

          {item.description && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight">
              {item.description}
            </p>
          )}
        </div>

        {/* Add Button or Stepper */}
        {quantity === 0 ? (
          <Button
            onClick={handleAdd}
            size="sm"
            className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            ADD TO ORDER
          </Button>
        ) : (
          <div className="flex items-center justify-between p-1 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800">
            <Button
              onClick={handleDecrement}
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-xl hover:bg-purple-200/50 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300"
            >
              {quantity === 1 ? (
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
            </Button>

            <span className="font-black text-sm text-purple-900 dark:text-purple-100">
              {quantity}
            </span>

            <Button
              onClick={handleIncrement}
              size="icon"
              className="h-7 w-7 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
