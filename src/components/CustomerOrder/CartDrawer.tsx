import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Sparkles,
  PercentCircle,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export const CartDrawer = ({
  isOpen,
  onClose,
  onCheckout,
}: CartDrawerProps) => {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    serviceCharge,
    total,
    itemCount,
  } = useCart();

  const handleCheckout = () => {
    onClose();
    onCheckout();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="h-[90vh] flex flex-col rounded-t-3xl border-t-4 border-purple-500 p-0"
      >
        {/* Pull Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <SheetHeader className="flex-shrink-0 px-6 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3 text-2xl">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <span>Your Cart</span>
              {itemCount > 0 && (
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </Badge>
              )}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <div className="text-7xl mb-4">🛒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 mb-6">
                Add some delicious items from our menu!
              </p>
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Browse Menu
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Cart Items - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 hover:shadow-md transition-shadow"
                >
                  {/* Item Image */}
                  {item.image ? (
                    <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-white shadow-sm">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center shadow-sm">
                      <span className="text-2xl">🍽️</span>
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-purple-600 font-bold text-base">
                      ₹{item.price} × {item.quantity}
                    </p>
                    <p className="text-xs text-gray-600 font-medium mt-0.5">
                      = ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col items-end justify-between gap-2">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5 bg-white border-2 border-purple-200 rounded-full shadow-sm">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full hover:bg-purple-50"
                        onClick={() =>
                          updateQuantity(item.menuItemId, item.quantity - 1)
                        }
                      >
                        <Minus className="w-4 h-4 text-purple-600" />
                      </Button>
                      <span className="text-sm font-bold w-7 text-center text-gray-900">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full hover:bg-purple-50"
                        onClick={() =>
                          updateQuantity(item.menuItemId, item.quantity + 1)
                        }
                      >
                        <Plus className="w-4 h-4 text-purple-600" />
                      </Button>
                    </div>

                    {/* Remove Button */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                      onClick={() => removeItem(item.menuItemId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Clear Cart Button */}
              {items.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl font-semibold"
                  onClick={clearCart}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Items
                </Button>
              )}
            </div>

            {/* Cart Summary - Sticky Footer */}
            <div className="flex-shrink-0 space-y-4 px-6 py-5 bg-gradient-to-t from-white via-purple-50/50 to-transparent border-t-2 border-purple-100">
              <div className="space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between text-base">
                  <span className="text-gray-700 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gray-400" />
                    Subtotal
                  </span>
                  <span className="font-semibold text-gray-900">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>

                {/* Service Charge */}
                {serviceCharge > 0 && (
                  <div className="flex justify-between text-base">
                    <span className="text-gray-700 font-medium flex items-center gap-2">
                      <PercentCircle className="w-4 h-4 text-purple-500" />
                      Service Charge
                    </span>
                    <span className="font-semibold text-gray-900">
                      ₹{serviceCharge.toFixed(2)}
                    </span>
                  </div>
                )}

                <Separator className="bg-purple-200" />

                {/* Total */}
                <div className="flex justify-between text-xl">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Button
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-bold py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl"
                onClick={handleCheckout}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
