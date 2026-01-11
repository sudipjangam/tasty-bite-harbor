import React, { useState } from "react";
import OrderFilters from "./OrderFilters";
import OrderItem from "./OrderItem";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/types/orders";
import AddOrderForm from "./AddOrderForm";
import { EnhancedSkeleton } from "@/components/ui/enhanced-skeleton";
import { AlertCircle } from "lucide-react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import PaymentDialog from "@/components/Orders/POS/PaymentDialog";

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
  isLoading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [printBillOrder, setPrintBillOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders_unified")
        .update({
          payment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
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

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) {
      return;
    }

    try {
      // Delete directly from orders_unified (no FK cascade needed)
      const { error } = await supabase
        .from("orders_unified")
        .delete()
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Order Deleted",
        description: "Order has been successfully deleted.",
      });

      onOrdersChange();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete the order. Please try again.",
      });
    }
  };

  // Handle Print Bill - opens PaymentDialog
  const handlePrintBill = (order: Order) => {
    setPrintBillOrder(order);
    setShowPaymentDialog(true);
  };

  // Parse order items for PaymentDialog format
  const parseOrderItemsForDialog = (order: Order) => {
    return order.items.map((itemStr, idx) => {
      // Parse item string format: "2x ItemName @price" or "2x ItemName"
      const match = itemStr.match(/^(\d+)x\s+(.+?)(?:\s+@(\d+(?:\.\d+)?))?$/);
      if (match) {
        return {
          id: `${order.id}-${idx}`,
          name: match[2],
          price: match[3] ? parseFloat(match[3]) : 0,
          quantity: parseInt(match[1], 10),
        };
      }
      // Fallback for simple strings
      return {
        id: `${order.id}-${idx}`,
        name: itemStr,
        price: 0,
        quantity: 1,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <OrderFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
        <EnhancedSkeleton type="orders" count={5} showHeader={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Orders ({filteredOrders.length})
        </h3>
        <OrderFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      </div>

      {filteredOrders.length === 0 ? (
        <StandardizedCard padding="lg" className="text-center border-dashed">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            No orders found
          </p>
          <p className="text-gray-500">
            {statusFilter === "all"
              ? "No orders have been placed yet."
              : `No ${statusFilter} orders found.`}
          </p>
        </StandardizedCard>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <OrderItem
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onEdit={() => handleEditOrder(order)}
              onDelete={handleDeleteOrder}
              onPrintBill={handlePrintBill}
            />
          ))}
        </div>
      )}

      {/* Edit Order Dialog - Uses transparent wrapper, form is styled */}
      {showEditForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditForm(false);
              setSelectedOrder(null);
            }
          }}
        >
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
          </div>
        </div>
      )}

      {/* PaymentDialog for Print Bill */}
      {printBillOrder && (
        <PaymentDialog
          isOpen={showPaymentDialog}
          onClose={() => {
            setShowPaymentDialog(false);
            setPrintBillOrder(null);
          }}
          orderItems={parseOrderItemsForDialog(printBillOrder)}
          onSuccess={() => {
            setShowPaymentDialog(false);
            setPrintBillOrder(null);
            onOrdersChange();
          }}
          tableNumber={printBillOrder.customer_name || "Order"}
          orderId={printBillOrder.id}
        />
      )}
    </div>
  );
};

export default OrderList;
