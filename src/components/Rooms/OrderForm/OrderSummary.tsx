
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from 'lucide-react';
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
  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  if (orderItems.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No items added to order</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-center">Quantity</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orderItems.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>
              <div className="flex items-center justify-center">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-7 w-7"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-10 text-center">{item.quantity}</span>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-7 w-7"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </TableCell>
            <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
            <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
            <TableCell>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
          <TableCell className="text-right font-bold">₹{calculateTotal().toFixed(2)}</TableCell>
          <TableCell></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default OrderSummary;
