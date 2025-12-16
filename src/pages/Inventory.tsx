import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Package, AlertTriangle, Carrot, Apple, ShoppingBag, Bell, ShoppingCart, BarChart3, History, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportExport from "@/components/Inventory/ReportExport";
import InventoryAlerts from "@/components/Inventory/InventoryAlerts";
import PurchaseOrders from "@/components/Inventory/PurchaseOrders";
import PurchaseOrderSuggestions from "@/components/Inventory/PurchaseOrderSuggestions";
import InventoryTransactions from "@/components/Inventory/InventoryTransactions";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  reorder_level: number | null;
  cost_per_unit: number | null;
  restaurant_id: string;
  category: string;
  notification_sent?: boolean;
}

const Inventory = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const { toast } = useToast();

  const { data: items = [], refetch } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("name");

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  // Check for low stock items and notify
  useEffect(() => {
    const checkLowStock = async () => {
      if (!items || items.length === 0) return;
      
      const lowStockItems = items.filter(
        item => item.reorder_level !== null && item.quantity <= item.reorder_level
      );
      
      if (lowStockItems.length > 0) {
        try {
          const { data: profile } = await supabase.auth.getUser();
          if (!profile.user) return;
  
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", profile.user.id)
            .single();
  
          if (!userProfile?.restaurant_id) return;
          
          // Call the edge function to check and notify about low stock
          await supabase.functions.invoke('check-low-stock', {
            body: { restaurant_id: userProfile.restaurant_id }
          });
        } catch (error) {
          console.error("Failed to check low stock:", error);
        }
      }
    };
    
    checkLowStock();
  }, [items]);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'vegetables':
        return <Carrot className="h-6 w-6 text-green-500" />;
      case 'fruits':
        return <Apple className="h-6 w-6 text-orange-500" />;
      case 'groceries':
        return <ShoppingBag className="h-6 w-6 text-blue-500" />;
      default:
        return <Package className="h-6 w-6 text-primary" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemData = {
      name: formData.get("name") as string,
      quantity: parseFloat(formData.get("quantity") as string),
      unit: formData.get("unit") as string,
      reorder_level: formData.get("reorderLevel") ? parseFloat(formData.get("reorderLevel") as string) : null,
      cost_per_unit: formData.get("costPerUnit") ? parseFloat(formData.get("costPerUnit") as string) : null,
      category: formData.get("category") as string || "Other",
    };

    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      if (editingItem) {
        const { error } = await supabase
          .from("inventory_items")
          .update({ ...itemData })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({ title: "Inventory item updated successfully" });
      } else {
        const { error } = await supabase
          .from("inventory_items")
          .insert([{ ...itemData, restaurant_id: userProfile.restaurant_id }]);

        if (error) throw error;
        toast({ title: "Inventory item added successfully" });
      }

      refetch();
      setIsAddDialogOpen(false);
      setEditingItem(null);
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
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Inventory item deleted successfully" });
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

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Filter items based on category and low stock status
  const filteredItems = items.filter(item => {
    const categoryMatch = filterCategory === "all" || item.category === filterCategory;
    const stockMatch = !showLowStockOnly || (item.reorder_level !== null && item.quantity <= item.reorder_level);
    return categoryMatch && stockMatch;
  });

  // Calculate low stock count
  const lowStockCount = items.filter(
    item => item.reorder_level !== null && item.quantity <= item.reorder_level
  ).length;

  const commonUnits = ["kg", "g", "l", "ml", "units", "pieces", "boxes", "packs"];
  const categories = ["Vegetables", "Fruits", "Groceries", "Other"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 dark:from-gray-900 dark:via-slate-900 dark:to-emerald-950 p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl shadow-lg">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                Enhanced Inventory Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mt-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Complete inventory control with automated alerts and purchase orders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs with Glass Effect */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="overview" className="w-full">
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 dark:from-emerald-900/20 dark:to-green-900/20 p-2">
            <TabsList className="grid w-full grid-cols-5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm rounded-2xl">
              <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-xl font-medium">
                <Package className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-xl font-medium">
                <Bell className="h-4 w-4" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-xl font-medium">
                <ShoppingCart className="h-4 w-4" />
                Purchase Orders
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-xl font-medium">
                <BarChart3 className="h-4 w-4" />
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-xl font-medium">
                <History className="h-4 w-4" />
                Transactions
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setEditingItem(null)}
                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                      {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingItem?.name}
                        required
                        placeholder="Enter item name"
                        className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                      <Select name="category" defaultValue={editingItem?.category || "Other"}>
                        <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl text-gray-900 dark:text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        step="0.01"
                        defaultValue={editingItem?.quantity}
                        required
                        placeholder="Enter quantity"
                        className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit" className="text-sm font-medium text-gray-700 dark:text-gray-300">Unit</Label>
                      <Select name="unit" defaultValue={editingItem?.unit || commonUnits[0]}>
                        <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl text-gray-900 dark:text-white">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {commonUnits.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reorderLevel" className="text-sm font-medium text-gray-700 dark:text-gray-300">Reorder Level</Label>
                      <Input
                        id="reorderLevel"
                        name="reorderLevel"
                        type="number"
                        step="0.01"
                        defaultValue={editingItem?.reorder_level || ""}
                        placeholder="Enter reorder level"
                        className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="costPerUnit" className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost per Unit (₹)</Label>
                      <Input
                        id="costPerUnit"
                        name="costPerUnit"
                        type="number"
                        step="0.01"
                        defaultValue={editingItem?.cost_per_unit || ""}
                        placeholder="Enter cost per unit"
                        className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-lg">
                      {editingItem ? "Update" : "Add"} Item
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex flex-wrap gap-4">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[150px] bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl text-gray-900 dark:text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.keys(groupedItems).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant={showLowStockOnly ? "default" : "outline"} 
                  onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                  className={showLowStockOnly 
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl" 
                    : "bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-900 dark:text-white"
                  }
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Low Stock ({lowStockCount})
                </Button>
              </div>
              
              <ReportExport 
                items={showLowStockOnly || filterCategory !== "all" ? filteredItems : items} 
                title={
                  showLowStockOnly 
                    ? "Low Stock Items Report" 
                    : filterCategory !== "all" 
                      ? `${filterCategory} Inventory Report` 
                      : "Complete Inventory Report"
                }
              />
            </div>

            <div className="flex flex-wrap gap-4">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <Card 
                  key={category} 
                  className={`flex items-center gap-3 p-4 border-none shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    filterCategory === category 
                      ? "bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-100 dark:from-emerald-900/40 dark:via-green-900/40 dark:to-emerald-900/40 border-emerald-300 dark:border-emerald-700" 
                      : "bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/30"
                  }`}
                  onClick={() => setFilterCategory(category === filterCategory ? "all" : category)}
                >
                  {getCategoryIcon(category)}
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{category}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {categoryItems.length} items
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <Card 
                  key={item.id} 
                  className={`p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-none ${
                    item.reorder_level && item.quantity <= item.reorder_level
                      ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200"
                      : "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-3 rounded-2xl shadow-lg ${
                        item.reorder_level && item.quantity <= item.reorder_level
                          ? "bg-red-100"
                          : "bg-gradient-to-br from-emerald-100 to-green-100"
                      }`}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{item.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.quantity} {item.unit}
                        </p>
                        {item.reorder_level && item.quantity <= item.reorder_level && (
                          <div className="flex items-center gap-2 mt-3">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <Badge variant="destructive" className="text-xs font-semibold">
                              Low Stock
                            </Badge>
                            {item.notification_sent && (
                              <div className="flex items-center">
                                <Bell className="h-4 w-4 text-amber-500 ml-1" />
                                <span className="text-xs text-amber-600 ml-1 font-medium">Notified</span>
                              </div>
                            )}
                          </div>
                        )}
                        {item.cost_per_unit && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                            Cost: ₹{item.cost_per_unit}/{item.unit}
                          </p>
                        )}
                        {item.reorder_level && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Reorder at: {item.reorder_level} {item.unit}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setIsAddDialogOpen(true);
                        }}
                        className="hover:bg-emerald-100 rounded-xl"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="hover:bg-red-100 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="p-8">
            <InventoryAlerts />
          </TabsContent>

          <TabsContent value="purchase-orders" className="p-8">
            <PurchaseOrders />
          </TabsContent>

          <TabsContent value="suggestions" className="p-8">
            <PurchaseOrderSuggestions />
          </TabsContent>

          <TabsContent value="transactions" className="p-8">
            <InventoryTransactions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Inventory;
