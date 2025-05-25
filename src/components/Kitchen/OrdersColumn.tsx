
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
        return "bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-300 dark:border-amber-700";
      case "preparing":
        return "bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-300 dark:border-blue-700";
      case "ready":
        return "bg-gradient-to-b from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border-green-300 dark:border-green-700";
      default:
        return "bg-gray-50 dark:bg-gray-800";
    }
  };
  
  const getHeaderColor = () => {
    switch (variant) {
      case "new":
        return "text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50";
      case "preparing":
        return "text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700/50";
      case "ready":
        return "text-green-700 dark:text-green-400 border-green-300 dark:border-green-700/50";
      default:
        return "text-gray-700 dark:text-gray-300";
    }
  };
  
  const getCountBadgeColor = () => {
    switch (variant) {
      case "new":
        return "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200";
      case "preparing":
        return "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200";
      case "ready":
        return "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200";
      default:
        return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <div className={`rounded-lg p-4 border-2 shadow-lg ${getBgColor()}`}>
      <div className={`flex items-center justify-between mb-4 pb-2 border-b ${getHeaderColor()}`}>
        <h2 className="text-lg font-bold">{title}</h2>
        <div className={`flex items-center rounded-full px-2 py-1 ${getCountBadgeColor()}`}>
          <Clock className="w-4 h-4 mr-1" />
          <span className="font-bold">{orders.length}</span>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
          No orders found
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {orders.map((order) => (
            <OrderTicket
              key={order.id}
              order={order}
              onStatusUpdate={onStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersColumn;
