
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, Edit, Trash, Check, X, ShoppingCart } from "lucide-react";
import type { Order } from "@/types/orders";

interface OrderListProps {
  orders: Order[];
  onOrdersChange: () => void;
  onEditOrder?: (order: Order) => void;
}

const OrderList = ({ orders, onOrdersChange, onEditOrder }: OrderListProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
        description: `Order ${newStatus === "completed" ? "completed" : "marked as pending"}`,
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

  // Filter orders based on status
  const filteredOrders = orders.filter(order => {
    if (statusFilter === "all") return true;
    return order.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="space-y-4">
      <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            All Orders
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2 text-yellow-600">
            <Clock className="h-4 w-4" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2 text-green-600">
            <Check className="h-4 w-4" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-2 text-red-600">
            <X className="h-4 w-4" />
            Cancelled
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No {statusFilter !== "all" ? statusFilter : ""} orders found</p>
        </Card>
      ) : (
        filteredOrders.map((order) => (
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
                  {onEditOrder && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditOrder(order)}
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
                      onClick={() => handleStatusUpdate(order.id, "completed")}
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
                      onClick={() => handleStatusUpdate(order.id, "pending")}
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
                    onClick={() => handleDelete(order.id)}
                    disabled={loading}
                  >
                    <Trash className="w-4 h-4" />
                    <span className="ml-1 hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default OrderList;
