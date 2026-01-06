import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import OrderActions from "./OrderActions";
import type { Order } from "@/types/orders";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Ban,
} from "lucide-react";

interface OrderItemProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: string) => Promise<void>;
  onEdit?: () => void;
  onDelete?: (orderId: string) => void;
  onPrintBill?: (order: Order) => void;
}

const OrderItem: React.FC<OrderItemProps> = ({
  order,
  onStatusChange,
  onEdit,
  onDelete,
  onPrintBill,
}) => {
  const formattedDate = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          label: "Completed",
          variant: "default" as const,
          className:
            "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm",
        };
      case "pending":
        return {
          icon: Clock,
          label: "Pending",
          variant: "secondary" as const,
          className:
            "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm",
        };
      case "preparing":
        return {
          icon: Loader2,
          label: "Preparing",
          variant: "secondary" as const,
          className:
            "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm",
        };
      case "ready":
        return {
          icon: CheckCircle2,
          label: "Ready",
          variant: "secondary" as const,
          className:
            "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm",
        };
      case "cancelled":
        return {
          icon: XCircle,
          label: "Cancelled",
          variant: "destructive" as const,
          className:
            "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm",
        };
      default:
        return {
          icon: ShoppingBag,
          label: status,
          variant: "outline" as const,
          className: "bg-gray-100 text-gray-700",
        };
    }
  };

  // Get card background gradient based on order status
  const getCardBackground = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-gradient-to-br from-blue-50 via-sky-100 to-cyan-100 border-l-4 border-blue-500 shadow-lg shadow-blue-100/50 hover:shadow-blue-200/60";
      case "pending":
        return "bg-gradient-to-br from-amber-50 via-yellow-100 to-orange-100 border-l-4 border-amber-500 shadow-lg shadow-amber-100/50 hover:shadow-amber-200/60";
      case "preparing":
        return "bg-gradient-to-br from-red-50 via-orange-100 to-amber-100 border-l-4 border-red-500 shadow-lg shadow-red-100/50 hover:shadow-red-200/60";
      case "ready":
        return "bg-gradient-to-br from-green-50 via-emerald-100 to-teal-100 border-l-4 border-green-500 shadow-lg shadow-green-100/50 hover:shadow-green-200/60";
      case "held":
        return "bg-gradient-to-br from-purple-50 via-violet-100 to-indigo-100 border-l-4 border-purple-500 shadow-lg shadow-purple-100/50 hover:shadow-purple-200/60";
      case "cancelled":
        return "bg-gradient-to-br from-red-50 via-rose-100 to-pink-100 border-l-4 border-red-600 shadow-lg shadow-red-100/50 hover:shadow-red-200/60";
      default:
        return "bg-gradient-to-br from-gray-50 via-slate-100 to-gray-100 border-l-4 border-gray-400 shadow-md";
    }
  };

  const getSourceLabel = (source?: string, orderType?: string) => {
    if (!source) return null;

    const sourceLabels: Record<string, string> = {
      pos: "POS",
      table: "Table Order",
      manual: "Manual",
      room_service: "Room Service",
      qsr: "QSR",
    };

    const orderTypeLabels: Record<string, string> = {
      "dine-in": "Dine-In",
      takeaway: "Takeaway",
      delivery: "Delivery",
      "non-chargeable": "Non-Chargeable",
    };

    const sourceText = sourceLabels[source] || source;
    const typeText = orderType
      ? ` - ${orderTypeLabels[orderType] || orderType}`
      : "";

    return `${sourceText}${typeText}`;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const sourceLabel = getSourceLabel(order.source, order.order_type);

  return (
    <Card
      className={`overflow-hidden hover:scale-[1.01] transition-all duration-200 rounded-xl ${getCardBackground(
        order.status
      )}`}
    >
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left Section - Order Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-foreground">
                  {order.customer_name}
                </h3>
                <Badge className={statusConfig.className}>
                  <StatusIcon className="w-3 h-3 mr-1.5" />
                  {statusConfig.label}
                </Badge>
                {sourceLabel && (
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    {sourceLabel}
                  </Badge>
                )}
                {order.order_type === "non-chargeable" && (
                  <Badge
                    variant="destructive"
                    className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1"
                  >
                    <Ban className="w-3 h-3" />
                    Non-Chargeable
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Ordered {formattedDate}</span>
              </div>

              {order.attendant && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full">
                    Attendant: {order.attendant}
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Items:</span>
                </div>
                <ul className="pl-6 space-y-1">
                  {order.items.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Section - Price & Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 lg:gap-3 min-w-fit">
              <div className="text-left sm:text-right lg:text-right">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Amount
                </p>
                <CurrencyDisplay
                  amount={order.total}
                  className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
                />
                {order.discount_amount &&
                order.discount_amount > 0 &&
                order.discount_percentage &&
                order.discount_percentage > 0 ? (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    {order.discount_percentage}% discount applied
                  </p>
                ) : null}
              </div>

              <OrderActions
                order={order}
                onStatusUpdate={onStatusChange}
                onEdit={onEdit ? () => onEdit() : undefined}
                onDelete={onDelete}
                onPrintBill={onPrintBill}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderItem;
