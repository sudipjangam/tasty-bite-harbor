import { Plus, Minus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  is_available: boolean;
}

interface MenuItemCardProps {
  item: MenuItem;
}

export const MenuItemCard = ({ item }: MenuItemCardProps) => {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const [imageError, setImageError] = useState(false);

  const cartItem = items.find((i) => i.menuItemId === item.id);
  const quantity = cartItem?.quantity || 0;

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
      updateQuantity(cartItem.menuItemId, quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (cartItem) {
      if (quantity === 1) {
        removeItem(cartItem.menuItemId);
      } else {
        updateQuantity(cartItem.menuItemId, quantity - 1);
      }
    }
  };

  const hasImage = item.image && !imageError;

  return (
    <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-white">
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100">
        {hasImage ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="text-xs text-gray-500 font-medium">
                {item.category}
              </p>
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Quantity Badge */}
        {quantity > 0 && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-3 py-1.5 text-sm font-bold shadow-lg">
            {quantity}x Added
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Name & Price */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-snug">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex-shrink-0">
            <p className="text-lg font-bold text-purple-600">₹{item.price}</p>
          </div>
        </div>

        {/* Add to Cart Button / Quantity Controls */}
        {quantity === 0 ? (
          <Button
            onClick={handleAdd}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add to Cart
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDecrement}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
            >
              {quantity === 1 ? (
                <Trash2 className="w-4 h-4 text-red-500" />
              ) : (
                <Minus className="w-4 h-4 text-purple-600" />
              )}
            </Button>

            <div className="flex-1 text-center">
              <span className="text-lg font-bold text-gray-900">
                {quantity}
              </span>
            </div>

            <Button
              onClick={handleIncrement}
              size="icon"
              className="h-9 w-9 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
