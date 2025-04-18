
import { Clock } from "lucide-react";
import OrderTicket from "./OrderTicket";
import type { KitchenOrder } from "./KitchenDisplay";

interface OrdersColumnProps {
  title: string;
  orders: KitchenOrder[];
  onStatusUpdate: (orderId: string, status: KitchenOrder["status"]) => void;
  variant: "new" | "preparing" | "ready";
}

const OrdersColumn = ({ title, orders, onStatusUpdate, variant }: OrdersColumnProps) => {
  const getBgColor = () => {
    switch (variant) {
      case "new":
        return "bg-yellow-50 dark:bg-yellow-900/20";
      case "preparing":
        return "bg-blue-50 dark:bg-blue-900/20";
      case "ready":
        return "bg-green-50 dark:bg-green-900/20";
      default:
        return "bg-gray-50 dark:bg-gray-800";
    }
  };

  return (
    <div className={`rounded-lg p-4 ${getBgColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center text-muted-foreground">
          <Clock className="w-4 h-4 mr-1" />
          <span>{orders.length}</span>
        </div>
      </div>
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderTicket
            key={order.id}
            order={order}
            onStatusUpdate={onStatusUpdate}
          />
        ))}
      </div>
    </div>
  );
};

export default OrdersColumn;
