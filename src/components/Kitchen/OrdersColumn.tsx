import {
  Clock,
  ChefHat,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import OrderTicket from "./OrderTicket";
import type { KitchenOrder } from "./KitchenDisplay";

interface OrdersColumnProps {
  title: string;
  orders: KitchenOrder[];
  onStatusUpdate: (orderId: string, status: KitchenOrder["status"]) => void;
  onBumpOrder: (orderId: string) => void;
  onItemComplete: (
    orderId: string,
    itemIndex: number,
    completed: boolean
  ) => void;
  variant: "new" | "preparing" | "ready";
  isOrderLate: (order: KitchenOrder) => boolean;
  isCompact?: boolean;
  expandedOrders?: Set<string>;
  onToggleExpand?: (orderId: string) => void;
}

const OrdersColumn = ({
  title,
  orders,
  onStatusUpdate,
  onBumpOrder,
  onItemComplete,
  variant,
  isOrderLate,
  isCompact = false,
  expandedOrders = new Set(),
  onToggleExpand,
}: OrdersColumnProps) => {
  const lateOrdersCount = orders.filter(isOrderLate).length;

  const getColumnStyles = () => {
    switch (variant) {
      case "new":
        return {
          container:
            "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-700/50",
          header:
            "text-amber-800 dark:text-amber-100 bg-gradient-to-r from-amber-500 to-orange-500",
          badge: "bg-amber-500 text-white shadow-lg",
          icon: <AlertCircle className="w-5 h-5" />,
        };
      case "preparing":
        return {
          container:
            "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-900/20 border-blue-200/50 dark:border-blue-700/50",
          header:
            "text-blue-800 dark:text-blue-100 bg-gradient-to-r from-blue-500 to-indigo-600",
          badge: "bg-blue-500 text-white shadow-lg",
          icon: <ChefHat className="w-5 h-5" />,
        };
      case "ready":
        return {
          container:
            "bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-green-900/20 border-green-200/50 dark:border-green-700/50",
          header:
            "text-green-800 dark:text-green-100 bg-gradient-to-r from-green-500 to-emerald-500",
          badge: "bg-green-500 text-white shadow-lg",
          icon: <CheckCircle className="w-5 h-5" />,
        };
      default:
        return {
          container:
            "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
          header: "text-gray-800 dark:text-gray-100 bg-gray-500",
          badge: "bg-gray-500 text-white",
          icon: <Clock className="w-5 h-5" />,
        };
    }
  };

  const styles = getColumnStyles();

  return (
    <div
      className={`rounded-3xl border-2 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${styles.container}`}
    >
      {/* Modern Header with Gradient */}
      <div
        className={`${styles.header} text-white p-6 rounded-t-3xl shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {styles.icon}
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {lateOrdersCount > 0 && (
              <div className="flex items-center rounded-full px-3 py-1 bg-red-500 text-white shadow-lg animate-pulse">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span className="font-bold text-sm">{lateOrdersCount}</span>
              </div>
            )}
            <div
              className={`flex items-center rounded-full px-4 py-2 ${styles.badge}`}
            >
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-bold text-lg">{orders.length}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 bg-white/20 rounded-full h-2">
          <div
            className="bg-white/80 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min((orders.length / 10) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Orders Content */}
      <div className="p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              {styles.icon}
            </div>
            <p className="text-lg font-medium">No orders found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Orders will appear here when received
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
            {orders.map((order) => (
              <OrderTicket
                key={order.id}
                order={order}
                onStatusUpdate={onStatusUpdate}
                onBumpOrder={onBumpOrder}
                onItemComplete={onItemComplete}
                isLate={isOrderLate(order)}
                isCompact={isCompact}
                isExpanded={!isCompact || expandedOrders.has(order.id)}
                onToggleExpand={onToggleExpand}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersColumn;
