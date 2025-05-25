
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
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">
          Current Order {tableNumber && `(Table ${tableNumber})`}
        </h2>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items in order. Select menu items to add.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                {item.modifiers && item.modifiers.length > 0 && (
                  <p className="text-sm text-muted-foreground">{item.modifiers.join(', ')}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="w-24 text-right font-medium">
                ₹{(item.price * item.quantity).toFixed(2)}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveItem(item.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (10%):</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-indigo-600">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={onSendToKitchen}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            Send to Kitchen
          </Button>
          <Button
            variant="secondary"
            onClick={onHoldOrder}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Hold Order
          </Button>
        </div>
        
        <Button
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={onProceedToPayment}
        >
          Proceed to Payment
        </Button>
        
        <Button
          variant="outline"
          className="w-full"
          onClick={onClearOrder}
        >
          Clear Order
        </Button>
      </div>
    </Card>
  );
};

export default CurrentOrder;
