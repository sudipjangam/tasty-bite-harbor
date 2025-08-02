import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface CreatePurchaseOrderProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrderItem {
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
}

const CreatePurchaseOrder = ({ isOpen, onClose }: CreatePurchaseOrderProps) => {
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, unit, cost_per_unit")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // First create the purchase order
      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .insert([{
          restaurant_id: restaurantId,
          supplier_id: orderData.supplier_id,
          expected_delivery_date: orderData.expected_delivery_date,
          notes: orderData.notes,
          total_amount: orderData.total_amount,
          order_number: `PO-${Date.now()}`, // Simple order number for now
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Then create the order items
      const items = orderData.items.map((item: OrderItem) => ({
        purchase_order_id: order.id,
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.quantity * item.unit_cost,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(items);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onClose();
      resetForm();
      toast({ title: "Purchase order created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error creating purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addOrderItem = () => {
    setOrderItems([...orderItems, { inventory_item_id: "", quantity: 0, unit_cost: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => total + (item.quantity * item.unit_cost), 0);
  };

  const resetForm = () => {
    setSelectedSupplier("");
    setOrderItems([]);
    setExpectedDeliveryDate("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier || orderItems.length === 0) {
      toast({
        title: "Please select a supplier and add at least one item",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      supplier_id: selectedSupplier,
      expected_delivery_date: expectedDeliveryDate || null,
      notes,
      total_amount: calculateTotal(),
      items: orderItems,
    };

    createPurchaseOrderMutation.mutate(orderData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expected_delivery_date">Expected Delivery Date</Label>
              <Input
                id="expected_delivery_date"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Order Items</Label>
              <StandardizedButton type="button" onClick={addOrderItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </StandardizedButton>
            </div>
            
            <div className="space-y-3">
              {orderItems.map((item, index) => (
                <div key={index} className="grid grid-cols-5 gap-3 items-end">
                  <div>
                    <Label>Item</Label>
                    <Select
                      value={item.inventory_item_id}
                      onValueChange={(value) => updateOrderItem(index, "inventory_item_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((inventoryItem) => (
                          <SelectItem key={inventoryItem.id} value={inventoryItem.id}>
                            {inventoryItem.name} ({inventoryItem.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Unit Cost (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_cost}
                      onChange={(e) => updateOrderItem(index, "unit_cost", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input
                      value={`₹${(item.quantity * item.unit_cost).toFixed(2)}`}
                      disabled
                    />
                  </div>
                  <StandardizedButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => removeOrderItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </StandardizedButton>
                </div>
              ))}
            </div>

            {orderItems.length > 0 && (
              <div className="mt-4 text-right">
                <strong>Total Amount: ₹{calculateTotal().toFixed(2)}</strong>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or instructions"
            />
          </div>

          <div className="flex justify-end gap-2">
            <StandardizedButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </StandardizedButton>
            <StandardizedButton type="submit" disabled={createPurchaseOrderMutation.isPending}>
              Create Purchase Order
            </StandardizedButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePurchaseOrder;
