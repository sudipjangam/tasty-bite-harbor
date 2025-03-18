
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import OrderStatus from "./OrderStatus";
import OrderActions from "./OrderActions";
import type { Order } from "@/types/orders";

interface OrderItemProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: string) => Promise<void>;
  onEdit?: () => void;
}

const OrderItem: React.FC<OrderItemProps> = ({ order, onStatusChange, onEdit }) => {
  const formattedDate = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
  });

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="space-y-1">
            <div className="flex flex-wrap gap-2 items-center">
              <h3 className="font-medium">{order.customer_name}</h3>
              <OrderStatus status={order.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Ordered {formattedDate}
            </p>
            <div className="mt-2">
              <p className="text-sm font-medium">Items:</p>
              <ul className="text-sm text-muted-foreground">
                {order.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-right md:text-center">
            <span className="text-2xl font-bold">${order.total.toFixed(2)}</span>
          </div>

          <div className="flex justify-end">
            <OrderActions 
              order={order}
              onStatusUpdate={onStatusChange}
              onEdit={onEdit ? () => onEdit() : undefined}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderItem;
