
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Package, TrendingUp, AlertTriangle, Eye, X } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PurchaseOrderSuggestion {
  supplier_id: string;
  supplier_name: string;
  items_count: number;
  estimated_total: number;
  low_stock_items?: Array<{
    id: string;
    name: string;
    quantity: number;
    reorder_level: number;
    unit: string;
    cost_per_unit: number;
    suggested_quantity: number;
  }>;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  reorder_level: number;
  unit: string;
  cost_per_unit: number;
  supplier_name?: string;
}

const PurchaseOrderSuggestions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  const [selectedSupplier, setSelectedSupplier] = useState<PurchaseOrderSuggestion | null>(null);
  const [showItemsDialog, setShowItemsDialog] = useState(false);

  // Fetch low stock items
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ["low-stock-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .not("reorder_level", "is", null);

      if (error) throw error;

      // Filter low stock items in memory
      const lowStock = data.filter(item => 
        item.quantity <= (item.reorder_level || 0)
      );

      return lowStock as LowStockItem[];
    },
    enabled: !!restaurantId,
  });

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["purchase-order-suggestions", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .rpc("suggest_purchase_orders", { restaurant_id_param: restaurantId });

      if (error) throw error;

      // Enhance suggestions with actual item details
      const enhancedSuggestions = await Promise.all((data as PurchaseOrderSuggestion[]).map(async (suggestion) => {
        // Get low stock items for this supplier
        const supplierLowStockItems = lowStockItems.filter(item => {
          // For now, we'll assume all items can be ordered from any supplier
          // In a real scenario, you'd have a supplier-item relationship table
          return true;
        }).map(item => ({
          ...item,
          suggested_quantity: Math.max(1, (item.reorder_level * 2) - item.quantity)
        }));

        return {
          ...suggestion,
          low_stock_items: supplierLowStockItems
        };
      }));

      return enhancedSuggestions;
    },
    enabled: !!restaurantId && lowStockItems.length > 0,
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (supplierId: string) => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      // Generate order number
      const { data: orderNumber, error: numberError } = await supabase
        .rpc("generate_purchase_order_number", { restaurant_id_param: restaurantId });

      if (numberError) throw numberError;

      // Get low stock items for this supplier
      const supplierItems = lowStockItems.map(item => ({
        ...item,
        suggested_quantity: Math.max(1, (item.reorder_level * 2) - item.quantity)
      }));

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
      const orderItems = supplierItems.map(item => ({
        purchase_order_id: purchaseOrder.id,
        inventory_item_id: item.id,
        quantity: item.suggested_quantity,
        unit_cost: item.cost_per_unit || 0,
        total_cost: item.suggested_quantity * (item.cost_per_unit || 0)
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

  const handleViewItems = (suggestion: PurchaseOrderSuggestion) => {
    setSelectedSupplier(suggestion);
    setShowItemsDialog(true);
  };

  if (isLoading) {
    return <div>Loading suggestions...</div>;
  }

  if (lowStockItems.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Low Stock Items</h3>
        <p className="text-gray-500">All items are well-stocked above reorder levels.</p>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-semibold text-red-700">Low Stock Items Found</h3>
            <Badge variant="destructive">{lowStockItems.length} items</Badge>
          </div>
          
          <div className="space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-600">
                    Current: {item.quantity} {item.unit} | Reorder Level: {item.reorder_level} {item.unit}
                  </p>
                  {item.cost_per_unit && (
                    <p className="text-sm text-gray-500">Cost: ₹{item.cost_per_unit}/{item.unit}</p>
                  )}
                </div>
                <Badge variant="destructive" className="ml-3">
                  Need {Math.max(1, (item.reorder_level * 2) - item.quantity)} {item.unit}
                </Badge>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> No purchase order suggestions available. This might be because supplier information is not configured for these items. You can still create purchase orders manually from the Purchase Orders tab.
            </p>
          </div>
        </Card>
      </div>
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
                  {suggestion.low_stock_items?.length || suggestion.items_count} items need restocking
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">
                ₹{suggestion.estimated_total.toFixed(2)}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewItems(suggestion)}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-1" />
                View Items ({suggestion.low_stock_items?.length || 0})
              </Button>
              
              <Button 
                size="sm"
                onClick={() => createPurchaseOrderMutation.mutate(suggestion.supplier_id)}
                className="bg-green-600 hover:bg-green-700 w-full"
                disabled={createPurchaseOrderMutation.isPending}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                {createPurchaseOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Items Dialog */}
      <Dialog open={showItemsDialog} onOpenChange={setShowItemsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                Items for {selectedSupplier?.supplier_name}
              </DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowItemsDialog(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedSupplier?.low_stock_items?.map((item) => (
              <div key={item.id} className="p-3 border rounded-lg bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <div className="text-sm text-gray-600 space-y-1 mt-1">
                      <p>Current Stock: <span className="text-red-600 font-medium">{item.quantity} {item.unit}</span></p>
                      <p>Reorder Level: {item.reorder_level} {item.unit}</p>
                      <p>Suggested Quantity: <span className="text-green-600 font-medium">{item.suggested_quantity} {item.unit}</span></p>
                      {item.cost_per_unit && (
                        <p>Unit Cost: ₹{item.cost_per_unit}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="mb-2">
                      Low Stock
                    </Badge>
                    {item.cost_per_unit && (
                      <p className="text-sm font-medium text-green-600">
                        Est. Cost: ₹{(item.suggested_quantity * item.cost_per_unit).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Total Estimated Cost:</strong> ₹{selectedSupplier?.estimated_total.toFixed(2)}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrderSuggestions;
