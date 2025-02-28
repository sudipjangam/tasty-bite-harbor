
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Phone, Mail, MapPin, Truck, Store, Package2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ReportExport from "@/components/Inventory/ReportExport";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  restaurant_id: string;
}

// Update the SupplierOrder interface to match the data structure returned by Supabase
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

const Suppliers = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const { toast } = useToast();

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

  const { data: suppliers = [], refetch } = useQuery({
    queryKey: ["suppliers", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data as Supplier[];
    },
  });

  const { data: orders = [], refetch: refetchOrders } = useQuery({
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
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      // Cast to the updated SupplierOrder interface
      return data as SupplierOrder[];
    },
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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Supplier deleted successfully" });
      refetch();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      if (!restaurantId || !selectedSupplierId) {
        throw new Error("Missing required information");
      }

      const orderData = {
        supplier_id: selectedSupplierId,
        restaurant_id: restaurantId,
        order_date: formData.get("orderDate") as string,
        notes: formData.get("notes") as string,
        total_amount: parseFloat(formData.get("totalAmount") as string) || 0,
        status: "pending"
      };

      const { error } = await supabase
        .from("supplier_orders")
        .insert([orderData]);

      if (error) throw error;
      
      toast({ title: "Order created successfully" });
      setIsOrderDialogOpen(false);
      setSelectedSupplierId(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  // Convert suppliers to the format expected by ReportExport
  const suppliersForReport = suppliers.map(supplier => ({
    id: supplier.id,
    name: supplier.name,
    quantity: 0, // Placeholder
    unit: "", // Placeholder
    reorder_level: null, // Placeholder
    cost_per_unit: null, // Placeholder
    restaurant_id: supplier.restaurant_id,
    category: "Supplier" // Placeholder
  }));

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Supplier Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your restaurant's suppliers and orders
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditingSupplier(null)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Supplier Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingSupplier?.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    defaultValue={editingSupplier?.contact_person}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingSupplier?.email}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={editingSupplier?.phone}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    defaultValue={editingSupplier?.address}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                  {editingSupplier ? "Update" : "Add"} Supplier
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={suppliers.length === 0}
              >
                <Package2 className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <select
                    id="supplier"
                    name="supplier"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedSupplierId || ""}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date</Label>
                  <Input
                    id="orderDate"
                    name="orderDate"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                  <Input
                    id="totalAmount"
                    name="totalAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Enter any notes about this order"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  Create Order
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Card className="p-4 bg-white flex items-center gap-3">
            <Store className="h-6 w-6 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Suppliers</p>
              <h3 className="text-2xl font-bold">{suppliers.length}</h3>
            </div>
          </Card>
          
          <Card className="p-4 bg-white flex items-center gap-3">
            <Truck className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Orders</p>
              <h3 className="text-2xl font-bold">
                {orders.filter(order => order.status === 'pending').length}
              </h3>
            </div>
          </Card>
        </div>
        
        <ReportExport 
          items={suppliersForReport}
          title="Suppliers Directory"
        />
      </div>
      
      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="suppliers">
          <Card className="bg-white dark:bg-gray-800 shadow-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Store className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <h3 className="text-lg font-medium">No suppliers</h3>
                      <p className="text-muted-foreground">
                        Add your first supplier to get started.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.contact_person || "N/A"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`mailto:${supplier.email}`}
                                className="text-blue-600 hover:underline"
                              >
                                {supplier.email}
                              </a>
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`tel:${supplier.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {supplier.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.address ? (
                          <div className="flex items-start gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                            <span className="max-w-xs">{supplier.address}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setIsAddDialogOpen(true);
                            }}
                            className="hover:bg-purple-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(supplier.id)}
                            className="hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedSupplierId(supplier.id);
                              setIsOrderDialogOpen(true);
                            }}
                            className="hover:bg-green-100 text-green-600"
                          >
                            <Package2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders">
          <Card className="bg-white dark:bg-gray-800 shadow-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <h3 className="text-lg font-medium">No orders</h3>
                      <p className="text-muted-foreground">
                        Create your first order to get started.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {new Date(order.order_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{order.supplier?.name || "Unknown Supplier"}</TableCell>
                      <TableCell>₹{order.total_amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={order.notes || ""}>
                          {order.notes || "No notes"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {order.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-500 text-green-700 hover:bg-green-50"
                                onClick={async () => {
                                  await supabase
                                    .from("supplier_orders")
                                    .update({ status: 'completed' })
                                    .eq("id", order.id);
                                  refetchOrders();
                                  toast({ title: "Order marked as completed" });
                                }}
                              >
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500 text-red-700 hover:bg-red-50"
                                onClick={async () => {
                                  await supabase
                                    .from("supplier_orders")
                                    .update({ status: 'cancelled' })
                                    .eq("id", order.id);
                                  refetchOrders();
                                  toast({ title: "Order cancelled" });
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Suppliers;
