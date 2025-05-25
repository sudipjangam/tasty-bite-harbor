
import React, { useState } from "react";
import OrderFilters from "./OrderFilters";
import OrderItem from "./OrderItem";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/types/orders";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import AddOrderForm from "./AddOrderForm";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface OrderListProps {
  orders: Order[];
  onOrdersChange: () => void;
  onEditOrder?: (order: Order) => void;
  isLoading?: boolean;
}

const OrderList: React.FC<OrderListProps> = ({ 
  orders, 
  onOrdersChange,
  onEditOrder,
  isLoading = false
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <OrderFilters statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-white rounded-lg border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Orders ({filteredOrders.length})
        </h3>
        <OrderFilters statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">No orders found</p>
          <p className="text-gray-500">
            {statusFilter === "all" 
              ? "No orders have been placed yet." 
              : `No ${statusFilter} orders found.`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
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
        <DialogContent className={`${isMobile ? 'w-[95%] max-w-lg' : 'max-w-5xl'} max-h-[95vh] overflow-y-auto p-0`}>
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
