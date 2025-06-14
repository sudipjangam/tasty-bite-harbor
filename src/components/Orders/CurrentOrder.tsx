
import { Plus, Minus, Trash2 } from "lucide-react";
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
    <Card className="h-full flex flex-col bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Current Order {tableNumber && `(Table ${tableNumber})`}
        </h2>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
            <div className="text-lg font-medium mb-2">No items in order</div>
            <div className="text-sm">Select menu items to add.</div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="h-8 w-8 rounded-lg border-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-600"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="w-24 text-right font-bold text-indigo-600">
                ₹{(item.price * item.quantity).toFixed(2)}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveItem(item.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-100 p-6 space-y-4 bg-gradient-to-br from-gray-50 to-white">
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

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onSendToKitchen}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            Send to Kitchen
          </Button>
          <Button
            onClick={onHoldOrder}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            Hold Order
          </Button>
        </div>
        
        <Button
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          onClick={onProceedToPayment}
        >
          Proceed to Payment
        </Button>
        
        <Button
          variant="outline"
          className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
          onClick={onClearOrder}
        >
          Clear Order
        </Button>
      </div>
    </Card>
  );
};

export default CurrentOrder;
