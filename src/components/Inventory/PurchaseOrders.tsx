import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Package,
  Eye,
  Check,
  X,
  Truck,
  Edit,
  Trash2,
  Search,
} from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { EnhancedSkeleton } from "@/components/ui/enhanced-skeleton";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { BillUploadDialog } from "./BillUploadDialog";
import { ExtractedBillData, findBestSupplierMatch } from "@/utils/billUtils";
import { Upload } from "lucide-react";

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
    total_cost: number;
    received_quantity: number;
    inventory_item_id: string;
    inventory_item: {
      name: string;
      unit: string;
    } | null;
  }>;
}

interface Supplier {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number | null;
}

interface OrderLineItem {
  inventory_item_id: string;
  name: string;
  unit: string;
  quantity: number;
  unit_cost: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  ordered:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  partially_received:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};

const statusFlow: Record<string, string[]> = {
  draft: ["pending", "cancelled"],
  pending: ["approved", "cancelled"],
  approved: ["ordered", "cancelled"],
  ordered: ["partially_received", "completed", "cancelled"],
  partially_received: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Approval",
  approved: "Approved",
  ordered: "Ordered",
  partially_received: "Partially Received",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PurchaseOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null
  );
  const [isReceivingDialogOpen, setIsReceivingDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] =
    useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBillUploadOpen, setIsBillUploadOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  // Create order form state
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          `
          *,
          supplier:suppliers(name),
          purchase_order_items(
            id,
            quantity,
            unit_cost,
            total_cost,
            received_quantity,
            inventory_item_id,
            inventory_item:inventory_items(name, unit)
          )
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!restaurantId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .order("name");
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!restaurantId,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items-for-po", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, unit, cost_per_unit")
        .eq("restaurant_id", restaurantId)
        .order("name");
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!restaurantId,
  });

  // Filter orders by search
  const filteredOrders = purchaseOrders.filter(
    (order) =>
      searchQuery === "" ||
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedOrders,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination({
    data: filteredOrders,
    itemsPerPage,
    initialPage: 1,
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId || !selectedSupplierId || orderItems.length === 0) {
        throw new Error("Missing required fields");
      }

      const totalAmount = orderItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_cost,
        0
      );
      const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

      // Create purchase order
      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .insert([
          {
            restaurant_id: restaurantId,
            supplier_id: selectedSupplierId,
            order_number: orderNumber,
            status: "draft",
            total_amount: totalAmount,
            order_date: new Date().toISOString().split("T")[0],
            expected_delivery_date: expectedDeliveryDate || null,
            notes: notes || null,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create line items
      const itemsToInsert = orderItems.map((item) => ({
        purchase_order_id: order.id,
        inventory_item_id: item.inventory_item_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.quantity * item.unit_cost,
        received_quantity: 0,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order created successfully" });
      resetCreateForm();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating purchase order",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({
          status,
          ...(status === "approved" && {
            approved_at: new Date().toISOString(),
          }),
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
    mutationFn: async (
      items: Array<{
        id: string;
        receivedQuantity: number;
        inventory_item_id: string;
        previousReceivedQuantity: number;
      }>
    ) => {
      for (const item of items) {
        // Update the received_quantity in purchase_order_items
        const { error: poError } = await supabase
          .from("purchase_order_items")
          .update({ received_quantity: item.receivedQuantity })
          .eq("id", item.id);

        if (poError) throw poError;

        // Calculate the difference in received quantity (only add the new quantity received)
        const quantityToAdd =
          item.receivedQuantity - item.previousReceivedQuantity;

        if (quantityToAdd > 0) {
          // Get current inventory item quantity
          const { data: inventoryItem, error: fetchError } = await supabase
            .from("inventory_items")
            .select("quantity")
            .eq("id", item.inventory_item_id)
            .single();

          if (fetchError) throw fetchError;

          // Update the inventory item quantity
          const newQuantity = (inventoryItem?.quantity || 0) + quantityToAdd;
          const { error: updateError } = await supabase
            .from("inventory_items")
            .update({ quantity: newQuantity })
            .eq("id", item.inventory_item_id);

          if (updateError) throw updateError;

          // Create a transaction record for the received items
          const { error: transactionError } = await supabase
            .from("inventory_transactions")
            .insert([
              {
                restaurant_id: restaurantId,
                inventory_item_id: item.inventory_item_id,
                transaction_type: "purchase",
                quantity_change: quantityToAdd,
                notes: `Received from PO: ${selectedOrder?.order_number}`,
              },
            ]);

          if (transactionError) {
            console.error("Error creating transaction:", transactionError);
            // Continue anyway - transaction record is not critical
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      setIsReceivingDialogOpen(false);
      toast({ title: "Items received successfully and inventory updated" });
    },
    onError: (error) => {
      toast({
        title: "Error receiving items",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetCreateForm = () => {
    setSelectedSupplierId("");
    setExpectedDeliveryDate("");
    setNotes("");
    setOrderItems([]);
  };

  const addLineItem = () => {
    setOrderItems([
      ...orderItems,
      {
        inventory_item_id: "",
        name: "",
        unit: "",
        quantity: 1,
        unit_cost: 0,
      },
    ]);
  };

  const updateLineItem = (
    index: number,
    field: keyof OrderLineItem,
    value: string | number
  ) => {
    const updated = [...orderItems];

    if (field === "inventory_item_id") {
      const item = inventoryItems.find((i) => i.id === value);
      if (item) {
        updated[index] = {
          ...updated[index],
          inventory_item_id: item.id,
          name: item.name,
          unit: item.unit,
          unit_cost: item.cost_per_unit || 0,
        };
      }
    } else {
      (updated[index] as any)[field] = value;
    }

    setOrderItems(updated);
  };

  const removeLineItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleReceiveItems = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const formData = new FormData(e.currentTarget);
    const items = selectedOrder.purchase_order_items.map((item) => ({
      id: item.id,
      receivedQuantity:
        parseFloat(formData.get(`received_${item.id}`) as string) || 0,
      inventory_item_id: item.inventory_item_id,
      previousReceivedQuantity: item.received_quantity || 0,
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
    updateOrderStatusMutation.mutate({
      orderId: selectedOrder.id,
      status: newStatus,
    });
  };

  const handleBillDataExtracted = (data: ExtractedBillData) => {
    // 1. Find or set supplier
    const matchedSupplier = findBestSupplierMatch(
      data.supplier_name,
      suppliers
    );
    if (matchedSupplier) {
      setSelectedSupplierId(matchedSupplier.id);
      toast({
        title: "Supplier Matched",
        description: `Matched to ${matchedSupplier.name}`,
      });
    } else if (data.supplier_name) {
      toast({
        title: "Supplier Not Found",
        description: `Could not find supplier "${data.supplier_name}". Please select manually.`,
        variant: "destructive",
      });
    }

    // 2. Set date
    if (data.invoice_date) {
      setExpectedDeliveryDate(data.invoice_date); // Or separate field if we want to track Invoice Date distinct from Delivery
    }

    // 3. Map items
    if (data.items && data.items.length > 0) {
      const mappedItems: OrderLineItem[] = data.items.map((item) => {
        // Try to match inventory item by name
        // This is a naive partial match, real world might need smarter util
        const matchedInventoryItem = inventoryItems.find(
          (inv) =>
            inv.name.toLowerCase().includes(item.description.toLowerCase()) ||
            item.description.toLowerCase().includes(inv.name.toLowerCase())
        );

        return {
          inventory_item_id: matchedInventoryItem?.id || "",
          name: matchedInventoryItem?.name || item.description, // Use extracted desc if no match
          unit: matchedInventoryItem?.unit || item.unit || "unit",
          quantity: item.quantity || 1,
          unit_cost: item.unit_price || 0,
        };
      });
      setOrderItems(mappedItems);
    }

    // 4. Open create dialog
    setIsCreateDialogOpen(true);
  };

  const getAvailableStatuses = (currentStatus: string) => {
    return statusFlow[currentStatus] || [];
  };

  const totalOrderAmount = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  );

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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Purchase Orders
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your purchase orders and supplier relationships
          </p>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase Order
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsBillUploadOpen(true)}
          className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm rounded-xl ml-2"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Bill (AI)
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by order number or supplier..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
        />
      </div>

      {filteredOrders.length === 0 ? (
        <Card className="p-8 text-center bg-white/90 dark:bg-gray-800/90 rounded-xl">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery ? "No orders found" : "No purchase orders yet"}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery
              ? "Try adjusting your search"
              : "Create your first purchase order to get started"}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {paginatedOrders.map((order) => (
              <Card
                key={order.id}
                className="p-4 hover:shadow-md transition-shadow bg-white/90 dark:bg-gray-800/90 rounded-xl"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {order.order_number}
                      </h3>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        <strong>Supplier:</strong>{" "}
                        {order.supplier?.name || "Unknown"}
                      </p>
                      <p>
                        <strong>Order Date:</strong>{" "}
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                      {order.expected_delivery_date && (
                        <p>
                          <strong>Expected Delivery:</strong>{" "}
                          {new Date(
                            order.expected_delivery_date
                          ).toLocaleDateString()}
                        </p>
                      )}
                      <p>
                        <strong>Total Amount:</strong> {currencySymbol}
                        {order.total_amount?.toFixed(2) || "0.00"}
                      </p>
                      <p>
                        <strong>Items:</strong>{" "}
                        {order.purchase_order_items?.length || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrder(order)}
                      className="rounded-lg"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {getAvailableStatuses(order.status).length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(order)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Update
                      </Button>
                    )}

                    {order.status === "ordered" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsReceivingDialogOpen(true);
                        }}
                        className="bg-green-600 hover:bg-green-700 rounded-lg"
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

      {/* Create Purchase Order Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              Create Purchase Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Supplier Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Supplier *
                </Label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={setSelectedSupplierId}
                >
                  <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
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
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Expected Delivery Date
                </Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                />
              </div>
            </div>

            {/* Order Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Order Items
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  className="rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {orderItems.length === 0 ? (
                <Card className="p-6 text-center border-dashed bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No items added. Click "Add Item" to start.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <Card
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                    >
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-12 md:col-span-4">
                          <Label className="text-xs">Item</Label>
                          <Select
                            value={item.inventory_item_id}
                            onValueChange={(val) =>
                              updateLineItem(index, "inventory_item_id", val)
                            }
                          >
                            <SelectTrigger className="bg-white dark:bg-gray-600 rounded-lg">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.map((invItem) => (
                                <SelectItem key={invItem.id} value={invItem.id}>
                                  {invItem.name} ({invItem.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="bg-white dark:bg-gray-600 rounded-lg"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">Unit</Label>
                          <Input
                            value={item.unit}
                            disabled
                            className="bg-gray-100 dark:bg-gray-700 rounded-lg"
                          />
                        </div>
                        <div className="col-span-4 md:col-span-2">
                          <Label className="text-xs">
                            Unit Cost ({currencySymbol})
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "unit_cost",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="bg-white dark:bg-gray-600 rounded-lg"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-2 flex items-end gap-2">
                          <div className="flex-1 text-right">
                            <Label className="text-xs">Total</Label>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {currencySymbol}
                              {(item.quantity * item.unit_cost).toFixed(2)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {/* Total */}
                  <div className="flex justify-end pt-2 border-t">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Order Total
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {currencySymbol}
                        {totalOrderAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
                className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  resetCreateForm();
                  setIsCreateDialogOpen(false);
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createOrderMutation.mutate()}
                disabled={
                  !selectedSupplierId ||
                  orderItems.length === 0 ||
                  createOrderMutation.isPending
                }
                className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white rounded-xl"
              >
                {createOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={isStatusUpdateDialogOpen}
        onOpenChange={setIsStatusUpdateDialogOpen}
      >
        <DialogContent className="max-w-md bg-white/95 dark:bg-gray-800/95 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Update Order Status
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Order:{" "}
                  <strong className="text-gray-900 dark:text-white">
                    {selectedOrder.order_number}
                  </strong>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current Status:{" "}
                  <Badge className={statusColors[selectedOrder.status]}>
                    {statusLabels[selectedOrder.status]}
                  </Badge>
                </p>
              </div>

              <div>
                <Label
                  htmlFor="new-status"
                  className="text-gray-700 dark:text-gray-300"
                >
                  New Status
                </Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 rounded-xl">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableStatuses(selectedOrder.status).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabels[status]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsStatusUpdateDialogOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStatusChange}
                  disabled={!newStatus || updateOrderStatusMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {updateOrderStatusMutation.isPending
                    ? "Updating..."
                    : "Update Status"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-800/95 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Package className="h-5 w-5 text-purple-600" />
              Purchase Order Details - {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Order Information
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      <strong>Order Number:</strong>{" "}
                      {selectedOrder.order_number}
                    </p>
                    <p>
                      <strong>Status:</strong>
                      <Badge
                        className={`ml-2 ${statusColors[selectedOrder.status]}`}
                      >
                        {statusLabels[selectedOrder.status]}
                      </Badge>
                    </p>
                    <p>
                      <strong>Order Date:</strong>{" "}
                      {new Date(selectedOrder.order_date).toLocaleDateString()}
                    </p>
                    {selectedOrder.expected_delivery_date && (
                      <p>
                        <strong>Expected Delivery:</strong>{" "}
                        {new Date(
                          selectedOrder.expected_delivery_date
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Supplier Information
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      <strong>Supplier:</strong>{" "}
                      {selectedOrder.supplier?.name || "Unknown"}
                    </p>
                    <p>
                      <strong>Total Amount:</strong> {currencySymbol}
                      {selectedOrder.total_amount?.toFixed(2) || "0.00"}
                    </p>
                    <p>
                      <strong>Total Items:</strong>{" "}
                      {selectedOrder.purchase_order_items?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Order Items
                </h4>
                <div className="space-y-3">
                  {selectedOrder.purchase_order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-xl p-4 bg-white dark:bg-gray-700/50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-white">
                            {item.inventory_item?.name || "Unknown Item"}
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <div>
                              <span className="font-medium">Ordered:</span>
                              <p>
                                {item.quantity}{" "}
                                {item.inventory_item?.unit || "units"}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">Unit Cost:</span>
                              <p>
                                {currencySymbol}
                                {item.unit_cost?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">Total Cost:</span>
                              <p>
                                {currencySymbol}
                                {(
                                  (item.quantity || 0) * (item.unit_cost || 0)
                                ).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">Received:</span>
                              <p
                                className={
                                  item.received_quantity > 0
                                    ? "text-green-600"
                                    : "text-gray-400"
                                }
                              >
                                {item.received_quantity || 0}{" "}
                                {item.inventory_item?.unit || "units"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {item.received_quantity >= item.quantity ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                              Fully Received
                            </Badge>
                          ) : item.received_quantity > 0 ? (
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                              Partially Received
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Pending
                            </Badge>
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
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Update Status
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                    className="rounded-xl"
                  >
                    Close
                  </Button>
                  {selectedOrder.status === "ordered" && (
                    <Button
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        setIsReceivingDialogOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 rounded-xl"
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
      <Dialog
        open={isReceivingDialogOpen}
        onOpenChange={setIsReceivingDialogOpen}
      >
        <DialogContent className="max-w-2xl bg-white/95 dark:bg-gray-800/95 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Receive Items - {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReceiveItems} className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-3">
              {selectedOrder?.purchase_order_items?.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-xl p-3 bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {item.inventory_item?.name || "Unknown Item"}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Ordered: {item.quantity}{" "}
                      {item.inventory_item?.unit || "units"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`received_${item.id}`}>
                        Received Quantity
                      </Label>
                      <Input
                        id={`received_${item.id}`}
                        name={`received_${item.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.quantity}
                        defaultValue={item.received_quantity}
                        placeholder="Enter received quantity"
                        className="bg-white dark:bg-gray-600 rounded-lg"
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input
                        value={item.inventory_item?.unit || "units"}
                        disabled
                        className="bg-gray-100 dark:bg-gray-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReceivingDialogOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 rounded-xl"
              >
                Receive Items
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Bill Upload Dialog */}
      <BillUploadDialog
        open={isBillUploadOpen}
        onOpenChange={setIsBillUploadOpen}
        onDataExtracted={handleBillDataExtracted}
      />
    </div>
  );
};

export default PurchaseOrders;
