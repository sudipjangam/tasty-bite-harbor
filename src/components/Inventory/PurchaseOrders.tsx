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
import { Plus, Package, Eye, Check, X, Truck, Edit, ChevronDown } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { EnhancedSkeleton } from "@/components/ui/enhanced-skeleton";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

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

const statusFlow = {
  draft: ["pending", "cancelled"],
  pending: ["approved", "cancelled"],
  approved: ["ordered", "cancelled"],
  ordered: ["partially_received", "completed", "cancelled"],
  partially_received: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

const statusLabels = {
  draft: "Draft",
  pending: "Pending Approval",
  approved: "Approved",
  ordered: "Ordered",
  partially_received: "Partially Received",
  completed: "Completed",
  cancelled: "Cancelled"
};

const PurchaseOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [isReceivingDialogOpen, setIsReceivingDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedOrders,
    goToPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({
    data: purchaseOrders,
    itemsPerPage,
    initialPage: 1
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ 
          status,
          ...(status === 'approved' && { approved_at: new Date().toISOString() })
        })
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setIsStatusUpdateDialogOpen(false);
      setNewStatus("");
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

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleStatusUpdate = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setNewStatus("");
    setIsStatusUpdateDialogOpen(true);
  };

  const handleStatusChange = () => {
    if (!selectedOrder || !newStatus) return;
    updateOrderStatusMutation.mutate({ orderId: selectedOrder.id, status: newStatus });
  };

  const getAvailableStatuses = (currentStatus: string) => {
    return statusFlow[currentStatus as keyof typeof statusFlow] || [];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <EnhancedSkeleton 
          type="purchase-orders" 
          count={itemsPerPage} 
          showHeader={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Purchase Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your purchase orders and supplier relationships
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      {purchaseOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders yet</h3>
          <p className="text-gray-500 mb-4">Create your first purchase order to get started</p>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Order
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {paginatedOrders.map((order) => (
              <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold">{order.order_number}</h3>
                      <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                        {statusLabels[order.status as keyof typeof statusLabels]}
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewOrder(order)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {getAvailableStatuses(order.status).length > 0 && (
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={() => handleStatusUpdate(order)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Update Status
                      </Button>
                    )}
                    
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
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={goToPage}
              onItemsPerPageChange={setItemsPerPage}
              showItemsPerPage={true}
            />
          )}
        </>
      )}

      {/* Status Update Dialog */}
      <Dialog open={isStatusUpdateDialogOpen} onOpenChange={setIsStatusUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Order: <strong>{selectedOrder.order_number}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Current Status: <Badge className={statusColors[selectedOrder.status as keyof typeof statusColors]}>
                    {statusLabels[selectedOrder.status as keyof typeof statusLabels]}
                  </Badge>
                </p>
              </div>
              
              <div>
                <Label htmlFor="new-status">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStatuses(selectedOrder.status).map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status as keyof typeof statusLabels]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsStatusUpdateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleStatusChange}
                  disabled={!newStatus || updateOrderStatusMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateOrderStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              Purchase Order Details - {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Order Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Order Number:</strong> {selectedOrder.order_number}</p>
                    <p><strong>Status:</strong> 
                      <Badge className={`ml-2 ${statusColors[selectedOrder.status as keyof typeof statusColors]}`}>
                        {statusLabels[selectedOrder.status as keyof typeof statusLabels]}
                      </Badge>
                    </p>
                    <p><strong>Order Date:</strong> {new Date(selectedOrder.order_date).toLocaleDateString()}</p>
                    {selectedOrder.expected_delivery_date && (
                      <p><strong>Expected Delivery:</strong> {new Date(selectedOrder.expected_delivery_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Supplier Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Supplier:</strong> {selectedOrder.supplier.name}</p>
                    <p><strong>Total Amount:</strong> ₹{selectedOrder.total_amount.toFixed(2)}</p>
                    <p><strong>Total Items:</strong> {selectedOrder.purchase_order_items.length}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.purchase_order_items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.inventory_item.name}</h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Ordered:</span>
                              <p>{item.quantity} {item.inventory_item.unit}</p>
                            </div>
                            <div>
                              <span className="font-medium">Unit Cost:</span>
                              <p>₹{item.unit_cost.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="font-medium">Total Cost:</span>
                              <p>₹{(item.quantity * item.unit_cost).toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="font-medium">Received:</span>
                              <p className={item.received_quantity > 0 ? "text-green-600" : "text-gray-400"}>
                                {item.received_quantity || 0} {item.inventory_item.unit}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {item.received_quantity >= item.quantity ? (
                            <Badge className="bg-green-100 text-green-800">Fully Received</Badge>
                          ) : item.received_quantity > 0 ? (
                            <Badge className="bg-orange-100 text-orange-800">Partially Received</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  {getAvailableStatuses(selectedOrder.status).length > 0 && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleStatusUpdate(selectedOrder);
                      }}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Update Status
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  {selectedOrder.status === 'ordered' && (
                    <Button 
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        setIsReceivingDialogOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      Receive Items
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
