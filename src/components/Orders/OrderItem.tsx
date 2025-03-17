
import React from "react";
import { Card } from "@/components/ui/card";
import { User, Clock } from "lucide-react";
import OrderStatus from "./OrderStatus";
import OrderActions from "./OrderActions";
import type { Order } from "@/types/orders";

interface OrderItemProps {
  order: Order;
  loading: boolean;
  onEdit?: (order: Order) => void;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onDelete: (orderId: string) => void;
}

const OrderItem: React.FC<OrderItemProps> = ({
  order,
  loading,
  onEdit,
  onStatusUpdate,
  onDelete,
}) => {
  return (
    <Card key={order.id} className="p-4 hover:shadow-lg transition-shadow bg-card/50 backdrop-blur-xl border border-border/5">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-foreground">Order #{order.id.slice(0, 8)}</h3>
            <OrderStatus status={order.status} />
          </div>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <User className="w-4 h-4 mr-1" />
            {order.customer_name}
          </div>
          <div className="mt-2">
            {order.items.map((item, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                • {item}
              </p>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-foreground">₹{order.total.toFixed(2)}</p>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Clock className="w-4 h-4 mr-1" />
            {new Date(order.created_at).toLocaleString()}
          </div>
          <OrderActions 
            order={order}
            loading={loading}
            onEdit={onEdit}
            onStatusUpdate={onStatusUpdate}
            onDelete={onDelete}
          />
        </div>
      </div>
    </Card>
  );
};

export default OrderItem;
