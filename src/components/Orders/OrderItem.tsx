import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import OrderActions from "./OrderActions";
import type { Order } from "@/types/orders";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { ShoppingBag, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface OrderItemProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: string) => Promise<void>;
  onEdit?: () => void;
  onDelete?: (orderId: string) => void;
}

const OrderItem: React.FC<OrderItemProps> = ({ order, onStatusChange, onEdit, onDelete }) => {
  const formattedDate = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle2,
          label: 'Completed',
          variant: 'default' as const,
          className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400'
        };
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          variant: 'secondary' as const,
          className: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400'
        };
      case 'preparing':
        return {
          icon: Loader2,
          label: 'Preparing',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelled',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
        };
      default:
        return {
          icon: ShoppingBag,
          label: status,
          variant: 'outline' as const,
          className: ''
        };
    }
  };

  const getSourceLabel = (source?: string, orderType?: string) => {
    if (!source) return null;
    
    const sourceLabels: Record<string, string> = {
      'pos': 'POS',
      'table': 'Table Order',
      'manual': 'Manual',
      'room_service': 'Room Service',
      'qsr': 'QSR'
    };

    const orderTypeLabels: Record<string, string> = {
      'dine-in': 'Dine-In',
      'takeaway': 'Takeaway',
      'delivery': 'Delivery'
    };

    const sourceText = sourceLabels[source] || source;
    const typeText = orderType ? ` - ${orderTypeLabels[orderType] || orderType}` : '';
    
    return `${sourceText}${typeText}`;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const sourceLabel = getSourceLabel(order.source, order.order_type);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left Section - Order Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-foreground">{order.customer_name}</h3>
                <Badge className={statusConfig.className}>
                  <StatusIcon className="w-3 h-3 mr-1.5" />
                  {statusConfig.label}
                </Badge>
                {sourceLabel && (
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                    {sourceLabel}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Ordered {formattedDate}</span>
              </div>

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
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <CurrencyDisplay 
                  amount={order.total} 
                  className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" 
                />
              </div>

              <OrderActions 
                order={order}
                onStatusUpdate={onStatusChange}
                onEdit={onEdit ? () => onEdit() : undefined}
                onDelete={onDelete}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderItem;
