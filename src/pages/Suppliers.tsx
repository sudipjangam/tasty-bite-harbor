
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Phone, Mail, MapPin, Truck, Store, Package2, Search, Calendar, Eye, Check, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  restaurant_id: string;
  is_active?: boolean;
}

interface SupplierOrder {
  id: string;
  supplier_id: string;
  restaurant_id: string;
  order_date: string;
  status: string;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
  supplier?: {
    name: string;
  };
}

interface OrderLineItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  inventory_item_id?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number | null;
  quantity: number;
}

const Suppliers = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isViewOrderDialogOpen, setIsViewOrderDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingOrder, setEditingOrder] = useState<SupplierOrder | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<SupplierOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderLineItems, setOrderLineItems] = useState<OrderLineItem[]>([]);
  const [viewingOrder, setViewingOrder] = useState<SupplierOrder | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: restaurantId } = useQuery({
    queryKey: ["restaurant-id"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      return userProfile?.restaurant_id;
    },
  });

  const { data: suppliers = [], refetch, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ["suppliers", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data as Supplier[];
    },
  });

  const { data: orders = [], refetch: refetchOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["supplier-orders", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_orders")
        .select(`
          *,
          supplier:supplier_id (
            name
          )
        `)
        .eq("restaurant_id", restaurantId)
        .order("order_date", { ascending: false });

      if (error) throw error;
      return data as SupplierOrder[];
    },
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, unit, cost_per_unit, quantity")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.supplier?.name?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.notes?.toLowerCase().includes(orderSearchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === "all" || order.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supplierData = {
      name: formData.get("name") as string,
      contact_person: formData.get("contactPerson") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
    };

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from("suppliers")
          .update(supplierData)
          .eq("id", editingSupplier.id);

        if (error) throw error;
        toast({ title: "Supplier updated successfully" });
      } else {
        if (!restaurantId) throw new Error("No restaurant found");

        const { error } = await supabase
          .from("suppliers")
          .insert([{ ...supplierData, restaurant_id: restaurantId }]);

        if (error) throw error;
        toast({ title: "Supplier added successfully" });
      }

      refetch();
      setIsAddDialogOpen(false);
      setEditingSupplier(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", supplierToDelete.id);
      if (error) throw error;
      toast({ title: "Supplier deleted successfully" });
      refetch();
      setSupplierToDelete(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete supplier. It may have associated orders.",
        variant: "destructive",
      });
      setSupplierToDelete(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      const { error } = await supabase.from("supplier_orders").delete().eq("id", orderToDelete.id);
      if (error) throw error;
      toast({ title: "Order deleted successfully" });
      refetchOrders();
      setOrderToDelete(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete order.",
        variant: "destructive",
      });
      setOrderToDelete(null);
    }
  };

  const addLineItem = () => {
    setOrderLineItems([
      ...orderLineItems,
      {
        id: crypto.randomUUID(),
        item_name: "",
        quantity: 1,
        unit: "units",
        unit_price: 0,
      },
    ]);
  };

  const updateLineItem = (id: string, field: keyof OrderLineItem, value: any) => {
    setOrderLineItems(
      orderLineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLineItem = (id: string) => {
    setOrderLineItems(orderLineItems.filter((item) => item.id !== id));
  };

  const selectInventoryItem = (lineItemId: string, inventoryItemId: string) => {
    const inventoryItem = inventoryItems.find((item) => item.id === inventoryItemId);
    if (inventoryItem) {
      setOrderLineItems(
        orderLineItems.map((item) =>
          item.id === lineItemId
            ? {
                ...item,
                item_name: inventoryItem.name,
                unit: inventoryItem.unit,
                unit_price: inventoryItem.cost_per_unit || 0,
                inventory_item_id: inventoryItemId,
              }
            : item
        )
      );
    }
  };

  const calculateOrderTotal = () => {
    return orderLineItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
  };

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      if (!restaurantId || !selectedSupplierId) {
        throw new Error("Missing required information");
      }

      const totalAmount = orderLineItems.length > 0 
        ? calculateOrderTotal() 
        : parseFloat(formData.get("totalAmount") as string) || 0;

      const orderData = {
        supplier_id: selectedSupplierId,
        restaurant_id: restaurantId,
        order_date: formData.get("orderDate") as string,
        notes: formData.get("notes") as string,
        total_amount: totalAmount,
        status: "pending",
      };

      if (editingOrder) {
        const { error } = await supabase
          .from("supplier_orders")
          .update(orderData)
          .eq("id", editingOrder.id);

        if (error) throw error;
        toast({ title: "Order updated successfully" });
      } else {
        const { data: newOrder, error } = await supabase
          .from("supplier_orders")
          .insert([orderData])
          .select()
          .single();

        if (error) throw error;

        // Insert order line items if any
        if (orderLineItems.length > 0 && newOrder) {
          const lineItemsData = orderLineItems.map((item) => ({
            order_id: newOrder.id,
            item_name: item.item_name,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price,
            inventory_item_id: item.inventory_item_id || null,
          }));

          const { error: lineItemsError } = await supabase
            .from("supplier_order_items")
            .insert(lineItemsData);

          if (lineItemsError) {
            console.error("Error inserting line items:", lineItemsError);
          }
        }

        toast({ title: "Order created successfully" });
      }

      setIsOrderDialogOpen(false);
      setSelectedSupplierId(null);
      setEditingOrder(null);
      setOrderLineItems([]);
      refetchOrders();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("supplier_orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // If completed, update inventory quantities
      if (newStatus === "completed") {
        const order = orders.find((o) => o.id === orderId);
        if (order) {
          // Get line items for this order
          const { data: lineItems } = await supabase
            .from("supplier_order_items")
            .select("*")
            .eq("order_id", orderId);

          // Update inventory quantities
          if (lineItems && lineItems.length > 0) {
            for (const item of lineItems) {
              if (item.inventory_item_id) {
                // Get current quantity
                const { data: currentItem } = await supabase
                  .from("inventory_items")
                  .select("quantity")
                  .eq("id", item.inventory_item_id)
                  .single();

                if (currentItem) {
                  // Update with new quantity
                  const { error: updateError } = await supabase
                    .from("inventory_items")
                    .update({ quantity: currentItem.quantity + item.quantity })
                    .eq("id", item.inventory_item_id);

                  if (updateError) {
                    console.error("Error updating inventory:", updateError);
                  }
                }
              }
            }
            
            toast({ 
              title: "Order completed", 
              description: "Inventory quantities have been updated." 
            });
          } else {
            toast({ title: "Order marked as completed" });
          }
        }
      } else {
        toast({ title: `Order ${newStatus}` });
      }

      refetchOrders();
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    }
  };

  const openEditOrder = (order: SupplierOrder) => {
    setEditingOrder(order);
    setSelectedSupplierId(order.supplier_id);
    setOrderLineItems([]);
    setIsOrderDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0">Cancelled</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">Pending</Badge>;
    }
  };

  // Stats
  const totalSuppliers = suppliers.length;
  const activeOrders = orders.filter((order) => order.status === "pending").length;
  const completedOrders = orders.filter((order) => order.status === "completed").length;
  const totalOrderValue = orders.reduce((sum, order) => sum + order.total_amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-gray-900 dark:via-purple-950 dark:to-gray-900 p-4 md:p-6">
      {/* Modern Header */}
      <div className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl shadow-lg">
              <Truck className="h-6 md:h-8 w-6 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Supplier Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg mt-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Manage suppliers, orders, and inventory
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setEditingSupplier(null)}
                  className="flex-1 md:flex-none bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold px-4 md:px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                    {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingSupplier?.name}
                      required
                      placeholder="Enter supplier name"
                      className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson" className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      defaultValue={editingSupplier?.contact_person}
                      placeholder="Primary contact name"
                      className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={editingSupplier?.email}
                        placeholder="email@supplier.com"
                        className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={editingSupplier?.phone}
                        placeholder="+91 98765 43210"
                        className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      defaultValue={editingSupplier?.address}
                      placeholder="Full address"
                      rows={3}
                      className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold py-3 rounded-xl shadow-lg">
                    {editingSupplier ? "Update" : "Add"} Supplier
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isOrderDialogOpen} onOpenChange={(open) => {
              setIsOrderDialogOpen(open);
              if (!open) {
                setEditingOrder(null);
                setOrderLineItems([]);
                setSelectedSupplierId(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  className="flex-1 md:flex-none bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold px-4 md:px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  disabled={suppliers.length === 0}
                  onClick={() => {
                    setEditingOrder(null);
                    setOrderLineItems([]);
                  }}
                >
                  <Package2 className="mr-2 h-4 w-4" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    {editingOrder ? "Edit Order" : "Create New Order"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateOrder} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier" className="text-sm font-medium text-gray-700 dark:text-gray-300">Supplier *</Label>
                      <Select
                        value={selectedSupplierId || ""}
                        onValueChange={setSelectedSupplierId}
                        required
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
                      <Label htmlFor="orderDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Date *</Label>
                      <Input
                        id="orderDate"
                        name="orderDate"
                        type="date"
                        defaultValue={editingOrder?.order_date || new Date().toISOString().split("T")[0]}
                        required
                        className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Order Line Items */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Items</Label>
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

                    {orderLineItems.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {orderLineItems.map((item) => (
                          <div key={item.id} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <div className="flex-1">
                              <Select
                                value={item.inventory_item_id || "custom"}
                                onValueChange={(value) => {
                                  if (value === "custom") {
                                    updateLineItem(item.id, "inventory_item_id", undefined);
                                  } else {
                                    selectInventoryItem(item.id, value);
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-white dark:bg-gray-700 rounded-lg text-sm">
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="custom">Custom Item</SelectItem>
                                  {inventoryItems.map((inv) => (
                                    <SelectItem key={inv.id} value={inv.id}>
                                      {inv.name} ({inv.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!item.inventory_item_id && (
                                <Input
                                  placeholder="Item name"
                                  value={item.item_name}
                                  onChange={(e) => updateLineItem(item.id, "item_name", e.target.value)}
                                  className="mt-2 bg-white dark:bg-gray-700 rounded-lg text-sm"
                                />
                              )}
                            </div>
                            <div className="w-20">
                              <Input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-700 rounded-lg text-sm"
                              />
                            </div>
                            <div className="w-20">
                              <Input
                                value={item.unit}
                                onChange={(e) => updateLineItem(item.id, "unit", e.target.value)}
                                placeholder="Unit"
                                className="bg-white dark:bg-gray-700 rounded-lg text-sm"
                              />
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Price"
                                value={item.unit_price}
                                onChange={(e) => updateLineItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                                className="bg-white dark:bg-gray-700 rounded-lg text-sm"
                              />
                            </div>
                            <div className="w-20 text-right font-medium text-sm pt-2">
                              ₹{(item.quantity * item.unit_price).toFixed(2)}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <Package2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No items added. Add items or enter total below.</p>
                      </div>
                    )}

                    {orderLineItems.length > 0 && (
                      <div className="flex justify-end items-center gap-2 pt-2 border-t">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold text-emerald-600">₹{calculateOrderTotal().toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {orderLineItems.length === 0 && (
                    <div>
                      <Label htmlFor="totalAmount" className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Amount (₹)</Label>
                      <Input
                        id="totalAmount"
                        name="totalAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingOrder?.total_amount || ""}
                        placeholder="0.00"
                        className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingOrder?.notes || ""}
                      placeholder="Any additional notes..."
                      rows={2}
                      className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-lg">
                    {editingOrder ? "Update" : "Create"} Order
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl shadow-md">
              <Store className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Suppliers</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{totalSuppliers}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md">
              <Truck className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Pending Orders</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{activeOrders}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-md">
              <Check className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{completedOrders}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md">
              <Package2 className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">₹{totalOrderValue.toLocaleString()}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Modern Tabs */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="suppliers" className="w-full">
          <div className="bg-gradient-to-r from-purple-500/10 to-violet-500/10 dark:from-purple-900/20 dark:to-violet-900/20 p-2">
            <TabsList className="grid w-full grid-cols-2 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl">
              <TabsTrigger value="suppliers" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-lg font-medium">
                <Store className="h-4 w-4" />
                Suppliers ({filteredSuppliers.length})
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white rounded-lg font-medium">
                <Package2 className="h-4 w-4" />
                Orders ({filteredOrders.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="suppliers" className="p-4 md:p-6">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                />
              </div>
            </div>

            {isLoadingSuppliers ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <Card className="bg-white dark:bg-gray-800 shadow-md overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700/50">
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Contact</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Email / Phone</TableHead>
                        <TableHead className="font-semibold hidden lg:table-cell">Address</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSuppliers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <Store className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No suppliers found</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                              {searchQuery ? "Try a different search term" : "Add your first supplier to get started"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSuppliers.map((supplier) => (
                          <TableRow key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell>{supplier.contact_person || "—"}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="space-y-1">
                                {supplier.email && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Mail className="h-3 w-3 text-gray-400" />
                                    <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline truncate max-w-[150px]">
                                      {supplier.email}
                                    </a>
                                  </div>
                                )}
                                {supplier.phone && (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <a href={`tel:${supplier.phone}`} className="text-blue-600 hover:underline">
                                      {supplier.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {supplier.address ? (
                                <div className="flex items-start gap-1 max-w-[200px]">
                                  <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm truncate">{supplier.address}</span>
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingSupplier(supplier);
                                    setIsAddDialogOpen(true);
                                  }}
                                  className="hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg"
                                >
                                  <Edit className="h-4 w-4 text-purple-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSupplierToDelete(supplier)}
                                  className="hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedSupplierId(supplier.id);
                                    setEditingOrder(null);
                                    setOrderLineItems([]);
                                    setIsOrderDialogOpen(true);
                                  }}
                                  className="hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                                >
                                  <Package2 className="h-4 w-4 text-green-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="p-4 md:p-6">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                />
              </div>
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <Card className="bg-white dark:bg-gray-800 shadow-md overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-700/50">
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Supplier</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Notes</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <Package2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No orders found</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                              {orderSearchQuery || orderStatusFilter !== "all" 
                                ? "Try adjusting your filters" 
                                : "Create your first order to get started"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {new Date(order.order_date).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{order.supplier?.name || "Unknown"}</TableCell>
                            <TableCell className="font-semibold text-emerald-600">₹{order.total_amount.toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="max-w-[200px] truncate text-gray-500" title={order.notes || ""}>
                                {order.notes || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {order.status === "pending" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                      className="hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                                      title="Mark Complete"
                                    >
                                      <Check className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                      className="hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                      title="Cancel Order"
                                    >
                                      <X className="h-4 w-4 text-red-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditOrder(order)}
                                      className="hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg"
                                      title="Edit Order"
                                    >
                                      <Edit className="h-4 w-4 text-purple-600" />
                                    </Button>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setOrderToDelete(order)}
                                  className="hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                  title="Delete Order"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Supplier Confirmation Dialog */}
      <AlertDialog open={!!supplierToDelete} onOpenChange={() => setSupplierToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">"{supplierToDelete?.name}"</span>? 
              This action cannot be undone. Any associated orders may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSupplier}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl"
            >
              Delete Supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Order Confirmation Dialog */}
      <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete Order?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this order from <span className="font-semibold text-gray-900 dark:text-white">"{orderToDelete?.supplier?.name}"</span> 
              dated {orderToDelete ? new Date(orderToDelete.order_date).toLocaleDateString() : ""}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Suppliers;
