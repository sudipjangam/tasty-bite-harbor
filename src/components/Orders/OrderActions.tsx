
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Check, Clock } from "lucide-react";
import type { Order } from "@/types/orders";

interface OrderActionsProps {
  order: Order;
  loading: boolean;
  onEdit?: (order: Order) => void;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onDelete: (orderId: string) => void;
}

const OrderActions: React.FC<OrderActionsProps> = ({
  order,
  loading,
  onEdit,
  onStatusUpdate,
  onDelete,
}) => {
  return (
    <div className="flex gap-2 mt-2">
      {onEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(order)}
          disabled={loading}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100"
        >
          <Edit className="w-4 h-4" />
          <span className="ml-1 hidden sm:inline">Edit</span>
        </Button>
      )}
      
      {order.status === "pending" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStatusUpdate(order.id, "completed")}
          disabled={loading}
          className="bg-green-50 text-green-600 hover:bg-green-100"
        >
          <Check className="w-4 h-4" />
          <span className="ml-1 hidden sm:inline">Complete</span>
        </Button>
      ) : order.status === "completed" ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStatusUpdate(order.id, "pending")}
          disabled={loading}
          className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
        >
          <Clock className="w-4 h-4" />
          <span className="ml-1 hidden sm:inline">Pending</span>
        </Button>
      ) : null}
      
      <Button
        variant="destructive"
        size="sm"
        onClick={() => onDelete(order.id)}
        disabled={loading}
      >
        <Trash className="w-4 h-4" />
        <span className="ml-1 hidden sm:inline">Delete</span>
      </Button>
    </div>
  );
};

export default OrderActions;
