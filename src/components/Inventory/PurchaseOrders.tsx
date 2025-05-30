
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Eye, Check, X, Truck } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  order_date: string;
  expected_delivery_date: string;
  supplier: {
    name: string;
  };
  purchase_order_items: Array<{
    id: string;
    quantity: number;
    unit_cost: number;
    received_quantity: number;
    inventory_item: {
      name: string;
      unit: string;
    };
  }>;
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  ordered: "bg-purple-100 text-purple-800",
  partially_received: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const PurchaseOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isReceivingDialogOpen, setIsReceivingDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          supplier:suppliers(name),
          purchase_order_items(
            id,
            quantity,
            unit_cost,
            received_quantity,
            inventory_item:inventory_items(name, unit)
          )
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!restaurantId,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Order status updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating order status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const receiveItemsMutation = useMutation({
    mutationFn: async (items: Array<{ id: string; receivedQuantity: number }>) => {
      for (const item of items) {
        const { error } = await supabase
          .from("purchase_order_items")
          .update({ received_quantity: item.receivedQuantity })
          .eq("id", item.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setIsReceivingDialogOpen(false);
      toast({ title: "Items received successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error receiving items",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReceiveItems = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const formData = new FormData(e.currentTarget);
    const items = selectedOrder.purchase_order_items.map(item => ({
      id: item.id,
      receivedQuantity: parseFloat(formData.get(`received_${item.id}`) as string) || 0,
    }));

    receiveItemsMutation.mutate(items);
  };

  if (isLoading) {
    return <div>Loading purchase orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Purchase Orders</h2>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {purchaseOrders.map((order) => (
          <Card key={order.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">{order.order_number}</h3>
                  <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Supplier:</strong> {order.supplier.name}</p>
                  <p><strong>Order Date:</strong> {new Date(order.order_date).toLocaleDateString()}</p>
                  {order.expected_delivery_date && (
                    <p><strong>Expected Delivery:</strong> {new Date(order.expected_delivery_date).toLocaleDateString()}</p>
                  )}
                  <p><strong>Total Amount:</strong> ₹{order.total_amount.toFixed(2)}</p>
                  <p><strong>Items:</strong> {order.purchase_order_items.length}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                {order.status === 'ordered' && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsReceivingDialogOpen(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Receive
                  </Button>
                )}
                {order.status === 'draft' && (
                  <Button 
                    size="sm" 
                    onClick={() => updateOrderStatusMutation.mutate({ orderId: order.id, status: 'pending' })}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Submit
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Receiving Dialog */}
      <Dialog open={isReceivingDialogOpen} onOpenChange={setIsReceivingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receive Items - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReceiveItems} className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-3">
              {selectedOrder?.purchase_order_items.map((item) => (
                <div key={item.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{item.inventory_item.name}</h4>
                    <span className="text-sm text-gray-500">
                      Ordered: {item.quantity} {item.inventory_item.unit}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`received_${item.id}`}>Received Quantity</Label>
                      <Input
                        id={`received_${item.id}`}
                        name={`received_${item.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.quantity}
                        defaultValue={item.received_quantity}
                        placeholder="Enter received quantity"
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input value={item.inventory_item.unit} disabled />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsReceivingDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Receive Items
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;
