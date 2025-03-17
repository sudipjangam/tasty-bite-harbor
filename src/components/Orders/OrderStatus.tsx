
import React from "react";
import { Badge } from "@/components/ui/badge";

interface OrderStatusProps {
  status: string;
}

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-500";
    case "completed":
      return "bg-green-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const OrderStatus: React.FC<OrderStatusProps> = ({ status }) => {
  return (
    <Badge className={getStatusColor(status)}>
      {status}
    </Badge>
  );
};

export default OrderStatus;
