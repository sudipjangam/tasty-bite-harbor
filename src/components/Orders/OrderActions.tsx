
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Check, Clock } from "lucide-react";
import type { Order } from "@/types/orders";

interface OrderActionsProps {
  order: Order;
  loading?: boolean;
  onEdit?: (order: Order) => void;
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
  onDelete?: (orderId: string) => void;
}

const OrderActions: React.FC<OrderActionsProps> = ({
  order,
  loading = false,
  onEdit,
  onStatusUpdate,
  onDelete,
}) => {
  // Return early if order is undefined or null
  if (!order) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(order)}
          disabled={loading}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900"
        >
          <Edit className="w-4 h-4" />
          <span className="ml-1">Edit</span>
        </Button>
      )}
      
      {onStatusUpdate && (order.status === "pending" || order.status === "preparing") ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStatusUpdate(order.id, "completed")}
          disabled={loading}
          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
        >
          <Check className="w-4 h-4" />
          <span className="ml-1">Complete</span>
        </Button>
      ) : onStatusUpdate && order.status === "completed" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStatusUpdate(order.id, "pending")}
          disabled={loading}
          className="bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900"
        >
          <Clock className="w-4 h-4" />
          <span className="ml-1">Pending</span>
        </Button>
      ) : null}
      
      {onDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(order.id)}
          disabled={loading}
          className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
        >
          <Trash className="w-4 h-4" />
          <span className="ml-1">Delete</span>
        </Button>
      )}
    </div>
  );
};

export default OrderActions;
