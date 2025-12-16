
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Minus, Trash2, Package } from 'lucide-react';
import { OrderItem } from "@/integrations/supabase/client";

interface OrderSummaryProps {
  orderItems: OrderItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ 
  orderItems, 
  onUpdateQuantity, 
  onRemoveItem 
}) => {
  if (orderItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No items in order</p>
        <p className="text-sm text-muted-foreground mt-1">Add items from the menu to start</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orderItems.map((item) => (
        <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-sm line-clamp-1">{item.name}</h4>
                <p className="text-xs text-muted-foreground">₹{item.price.toFixed(2)} each</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-8 w-8"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-primary">₹{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default OrderSummary;
