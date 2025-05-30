
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Package, TrendingUp } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface PurchaseOrderSuggestion {
  supplier_id: string;
  supplier_name: string;
  items_count: number;
  estimated_total: number;
}

const PurchaseOrderSuggestions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["purchase-order-suggestions", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .rpc("suggest_purchase_orders", { restaurant_id_param: restaurantId });

      if (error) throw error;
      return data as PurchaseOrderSuggestion[];
    },
    enabled: !!restaurantId,
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      // Generate order number
      const { data: orderNumber, error: numberError } = await supabase
        .rpc("generate_purchase_order_number", { restaurant_id_param: restaurantId });

      if (numberError) throw numberError;

      // Get low stock items for this supplier - fetch all items and filter in memory
      const { data: allItems, error: itemsError } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .not("reorder_level", "is", null);

      if (itemsError) throw itemsError;

      // Filter low stock items in memory
      const lowStockItems = allItems.filter(item => 
        item.quantity <= (item.reorder_level || 0)
      );

      // Create purchase order
      const { data: purchaseOrder, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          restaurant_id: restaurantId,
          supplier_id: supplierId,
          order_number: orderNumber,
          status: "draft",
          created_by: profile.user.id,
          total_amount: 0 // Will be calculated after adding items
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Add items to purchase order
      const orderItems = lowStockItems.map(item => ({
        purchase_order_id: purchaseOrder.id,
        inventory_item_id: item.id,
        quantity: (item.reorder_level * 2) - item.quantity, // Suggested quantity
        unit_cost: item.cost_per_unit || 0,
        total_cost: ((item.reorder_level * 2) - item.quantity) * (item.cost_per_unit || 0)
      }));

      const { error: itemsInsertError } = await supabase
        .from("purchase_order_items")
        .insert(orderItems);

      if (itemsInsertError) throw itemsInsertError;

      // Update total amount
      const totalAmount = orderItems.reduce((sum, item) => sum + item.total_cost, 0);
      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({ total_amount: totalAmount })
        .eq("id", purchaseOrder.id);

      if (updateError) throw updateError;

      return purchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order-suggestions"] });
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

  if (isLoading) {
    return <div>Loading suggestions...</div>;
  }

  if (suggestions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Purchase Orders Needed</h3>
        <p className="text-gray-500">All items are well-stocked above reorder levels.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <h2 className="text-xl font-bold">Suggested Purchase Orders</h2>
        <Badge variant="outline">{suggestions.length} suppliers</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.supplier_id} className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{suggestion.supplier_name}</h3>
                <p className="text-sm text-gray-600">
                  {suggestion.items_count} items need restocking
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                ₹{suggestion.estimated_total.toFixed(2)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Estimated total cost for reordering
              </div>
              <Button 
                size="sm"
                onClick={() => createPurchaseOrderMutation.mutate(suggestion.supplier_id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Create Order
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PurchaseOrderSuggestions;
