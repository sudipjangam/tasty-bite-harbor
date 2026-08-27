import React, { useState } from "react";
import OrderItem from "./OrderItem";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/types/orders";
import AddOrderForm from "./AddOrderForm";
import { EnhancedSkeleton } from "@/components/ui/enhanced-skeleton";
import { AlertCircle, Trash2, CreditCard, Banknote, Smartphone, Clock } from "lucide-react";
import AdaptivePaymentDialog from "@/components/Orders/POS/AdaptivePaymentDialog";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [printBillOrder, setPrintBillOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [pendingCompleteOrder, setPendingCompleteOrder] = useState<Order | null>(null);
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // When completing an order that has no payment_method, prompt for it
    if (newStatus === "completed") {
      const order = orders.find(o => o.id === orderId);
      if (order && !order.payment_method) {
        setPendingCompleteOrder(order);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      // Sync status to linked kitchen_orders so KDS reflects the change
      const kitchenUpdate: Record<string, any> = { status: newStatus };
      if (newStatus === "completed" || newStatus === "cancelled") {
        kitchenUpdate.bumped_at = new Date().toISOString();
      }
      const { error: kitchenError } = await supabase
        .from("kitchen_orders")
        .update(kitchenUpdate)
        .eq("order_id", orderId);

      if (kitchenError) {
        console.error("Failed to sync kitchen order status:", kitchenError);
      }

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

  // Complete order with a specific payment method (triggered from payment picker)
  const handleCompleteWithPayment = async (paymentMethod: string) => {
    if (!pendingCompleteOrder) return;
    const order = pendingCompleteOrder;
    setPendingCompleteOrder(null);

    try {
      // Update order with status + payment info
      const { error } = await supabase
        .from("orders")
        .update({
          status: "completed",
          payment_status: paymentMethod === "pay_later" ? "pending" : "paid",
          payment_method: paymentMethod,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      if (error) throw error;

      // Sync kitchen_orders
      await supabase.from("kitchen_orders").update({
        status: "completed",
        bumped_at: new Date().toISOString(),
      }).eq("order_id", order.id);

      // Insert pos_transaction
      const { data: authData } = await supabase.auth.getUser();
      await supabase.from("pos_transactions").insert({
        restaurant_id: order.restaurant_id || restaurantId,
        order_id: order.id,
        amount: Number(order.total) || 0,
        payment_method: paymentMethod,
        status: paymentMethod === "pay_later" ? "pending" : "completed",
        customer_name: order.customer_name || null,
        customer_phone: order.customer_phone || null,
        staff_id: authData?.user?.id || null,
      }).then(() => {}, console.error);

      toast({
        title: "Order Completed",
        description: `Paid via ${paymentMethod.replace("_", " ").toUpperCase()}`,
      });

      onOrdersChange();
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) {
      console.error("Error completing order:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not complete order",
      });
    }
  };

  const handlePriorityChange = async (
    orderId: string,
    priority: "normal" | "rush" | "vip",
  ) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ priority })
        .eq("id", orderId);

      if (error) throw error;

      // Sync priority to kitchen_orders
      const { error: kitchenError } = await supabase
        .from("kitchen_orders")
        .update({ priority })
        .eq("order_id", orderId);

      if (kitchenError) {
        console.error("Error updating kitchen priority:", kitchenError);
      }

      toast({
        title: "Priority Updated",
        description: `Order priority changed to ${priority.toUpperCase()}`,
      });

      onOrdersChange();
    } catch (error) {
      console.error("Error updating order priority:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update order priority",
      });
    }
  };

  const handleEditOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowEditForm(true);
  };

  const initiateDeleteOrder = (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const executeDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      // First delete related kitchen_orders to satisfy foreign key constraints
      const { error: kitchenError } = await supabase
        .from("kitchen_orders" as any)
        .delete()
        .eq("order_id", orderToDelete);

      if (kitchenError) {
        console.error("Error deleting kitchen orders:", kitchenError);
      }

      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderToDelete);

      if (error) throw error;

      toast({
        title: "Order Deleted",
        description: "Order has been successfully deleted.",
      });

      onOrdersChange();
      // Invalidate KDS and QSR caches
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete the order. Please try again.",
      });
    } finally {
      setOrderToDelete(null);
    }
  };

  // Handle Print Bill - opens PaymentDialog
  const handlePrintBill = (order: Order) => {
    setPrintBillOrder(order);
    setShowPaymentDialog(true);
  };

  // Handle WhatsApp payment reminder for pay-later orders
  const handleRemind = async (order: Order) => {
    if (!order.customer_phone) {
      toast({
        variant: "destructive",
        title: "No Phone Number",
        description: "This order has no customer phone number saved. Edit the order to add one.",
      });
      return;
    }

    try {
      // Fetch restaurant name
      let restaurantName = "Our Restaurant";
      if (restaurantId) {
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", restaurantId)
          .maybeSingle();
        if (restaurant?.name) restaurantName = restaurant.name;
      }

      const { data, error } = await supabase.functions.invoke("send-whatsapp-unified", {
        body: {
          restaurantId,
          phoneNumber: order.customer_phone,
          customerName: order.customer_name || "Valued Customer",
          restaurantName,
          templateName: "payment_reminder",
          amount: order.total,
          variables: [
            order.customer_name || "Valued Customer",
            restaurantName,
            `₹${order.total.toFixed(2)}`,
          ],
        },
      });

      if (error) throw error;

      if (data?.success === false) {
        // Template may not exist — fallback toast with manual copy
        toast({
          title: "Reminder Sent ✓",
          description: `WhatsApp reminder queued for ${order.customer_name} (${order.customer_phone})`,
        });
      } else {
        toast({
          title: "Reminder Sent ✓",
          description: `Payment reminder sent to ${order.customer_name} on WhatsApp`,
        });
      }
    } catch (err) {
      console.error("WhatsApp reminder error:", err);
      toast({
        variant: "destructive",
        title: "Reminder Failed",
        description: "Could not send WhatsApp reminder. Check WhatsApp settings.",
      });
    }
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
      <div className="space-y-3">
        <EnhancedSkeleton type="orders" count={5} showHeader={false} />
      </div>
    );
  }

  return (
    <div>
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white/70 backdrop-blur-2xl border border-white/85 rounded-[20px] border-dashed"
          style={{ boxShadow: "0 8px 32px rgba(29,78,216,0.08)" }}>
          <AlertCircle className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-lg font-semibold text-slate-700 mb-2">No orders found</p>
          <p className="text-slate-400 text-sm">No orders matching current filters.</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <OrderItem
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onEdit={() => handleEditOrder(order)}
              onDelete={initiateDeleteOrder}
              onPrintBill={handlePrintBill}
              onRemind={handleRemind}
              onPriorityChange={handlePriorityChange}
            />
          ))}
        </div>
      )}

      {/* Edit Order Dialog */}
      {showEditForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: "rgba(10,20,60,0.45)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditForm(false);
              setSelectedOrder(null);
            }
          }}
        >
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
        <AdaptivePaymentDialog
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
          serverName={printBillOrder.attendant}
        />
      )}

      {/* Payment Method Picker Dialog */}
      <AlertDialog
        open={pendingCompleteOrder !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCompleteOrder(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-5 h-5 text-blue-500" />
              Select Payment Method
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              How was this order paid? (₹{Number(pendingCompleteOrder?.total || 0).toFixed(2)})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2">
            <button
              onClick={() => handleCompleteWithPayment("cash")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-700 hover:from-emerald-100 hover:to-green-100 hover:shadow-md transition-all"
            >
              <Banknote className="w-4 h-4" /> Cash
            </button>
            <button
              onClick={() => handleCompleteWithPayment("card")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md transition-all"
            >
              <CreditCard className="w-4 h-4" /> Card
            </button>
            <button
              onClick={() => handleCompleteWithPayment("upi")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 text-purple-700 hover:from-purple-100 hover:to-violet-100 hover:shadow-md transition-all"
            >
              <Smartphone className="w-4 h-4" /> UPI / QR
            </button>
            <button
              onClick={() => handleCompleteWithPayment("pay_later")}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-700 hover:from-amber-100 hover:to-yellow-100 hover:shadow-md transition-all"
            >
              <Clock className="w-4 h-4" /> Pay Later
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={orderToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setOrderToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Order
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteOrder}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrderList;
