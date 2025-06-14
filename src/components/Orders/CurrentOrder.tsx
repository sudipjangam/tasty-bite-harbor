
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderItem } from "@/types/orders";

interface CurrentOrderProps {
  items: OrderItem[];
  tableNumber?: string;
  onUpdateQuantity: (id: string, newQuantity: number) => void;
  onRemoveItem: (id: string) => void;
  onHoldOrder: () => void;
  onSendToKitchen: () => void;
  onProceedToPayment: () => void;
  onClearOrder: () => void;
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
}: CurrentOrderProps) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.10; // 10% tax
  const total = subtotal + tax;

  return (
    <div className="h-full flex flex-col bg-white/90 backdrop-blur-xl border border-white/30 rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 border-b border-white/20 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Current Order
            </h2>
            {tableNumber && (
              <p className="text-sm text-gray-600 mt-1">Table {tableNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-lg font-medium mb-2">No items in order</div>
              <div className="text-sm">Select menu items to add.</div>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">{item.modifiers.join(', ')}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 bg-white/80 rounded-xl p-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="h-8 w-8 rounded-lg border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold text-indigo-600">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="h-8 w-8 rounded-lg border-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="w-20 text-right font-bold text-indigo-600">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Summary & Actions */}
      <div className="bg-gradient-to-br from-gray-50/80 to-white/80 backdrop-blur-sm border-t border-white/30 p-6 space-y-4">
        {/* Totals */}
        <div className="space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax (10%):</span>
            <span className="font-semibold">₹{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold border-t pt-3">
            <span>Total:</span>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">₹{total.toFixed(2)}</span>
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
            className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
            onClick={onClearOrder}
            disabled={items.length === 0}
          >
            Clear Order
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CurrentOrder;
