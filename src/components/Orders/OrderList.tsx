
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, Edit, Trash } from "lucide-react";
import type { Order } from "@/types/orders";

interface OrderListProps {
  orders: Order[];
  onOrdersChange: () => void;
}

const OrderList = ({ orders, onOrdersChange }: OrderListProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
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

  const handleDelete = async (orderId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      onOrdersChange();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      onOrdersChange();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="p-4 hover:shadow-lg transition-shadow bg-card/50 backdrop-blur-xl border border-border/5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-foreground">Order #{order.id.slice(0, 8)}</h3>
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
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
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleStatusUpdate(
                      order.id,
                      order.status === "pending" ? "completed" : "pending"
                    )
                  }
                  disabled={loading}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(order.id)}
                  disabled={loading}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default OrderList;
