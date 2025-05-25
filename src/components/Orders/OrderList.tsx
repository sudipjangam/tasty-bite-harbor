
import React, { useState } from "react";
import OrderFilters from "./OrderFilters";
import OrderItem from "./OrderItem";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/types/orders";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import AddOrderForm from "./AddOrderForm";

interface OrderListProps {
  orders: Order[];
  onOrdersChange: () => void;
  onEditOrder?: (order: Order) => void;
}

const OrderList: React.FC<OrderListProps> = ({ 
  orders, 
  onOrdersChange,
  onEditOrder 
}) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const filteredOrders = orders.filter(order => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });

      onOrdersChange();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update order status",
      });
    }
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditForm(true);
  };

  return (
    <div className="space-y-4">
      <OrderFilters statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
      
      {filteredOrders.length === 0 ? (
        <div className="text-center py-10 bg-secondary/20 rounded-lg">
          <p className="text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="grid gap-4 h-[calc(100vh-220px)] overflow-auto">
          {filteredOrders.map((order) => (
            <OrderItem 
              key={order.id} 
              order={order} 
              onStatusChange={handleStatusChange}
              onEdit={() => handleEditOrder(order)}
            />
          ))}
        </div>
      )}

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className={`${isMobile ? 'w-[95%] max-w-lg' : 'max-w-4xl'} max-h-[90vh] overflow-y-auto`}>
          <AddOrderForm
            onSuccess={() => {
              setShowEditForm(false);
              setSelectedOrder(null);
              onOrdersChange();
            }}
            onCancel={() => {
              setShowEditForm(false);
              setSelectedOrder(null);
            }}
            editingOrder={selectedOrder}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderList;
