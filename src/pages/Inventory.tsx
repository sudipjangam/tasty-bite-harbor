import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Package, AlertTriangle, Carrot, Apple, ShoppingBag, Bell, ShoppingCart, BarChart3, History, Sparkles, Search, Filter } from "lucide-react";
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
  expiry_date?: string | null;
}

const Inventory = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const { toast } = useToast();

  const { data: items = [], refetch, isLoading } = useQuery({
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
      case 'meat & seafood':
        return <Package className="h-6 w-6 text-red-500" />;
      case 'dairy':
        return <Package className="h-6 w-6 text-yellow-500" />;
      case 'beverages':
        return <Package className="h-6 w-6 text-cyan-500" />;
      case 'spices':
        return <Package className="h-6 w-6 text-amber-600" />;
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

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      const { error } = await supabase.from("inventory_items").delete().eq("id", itemToDelete.id);
      if (error) throw error;
      toast({ title: "Inventory item deleted successfully" });
      refetch();
      setItemToDelete(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setItemToDelete(null);
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

  // Filter items based on search, category and low stock status
  const filteredItems = items.filter(item => {
    const searchMatch = searchQuery === "" || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const categoryMatch = filterCategory === "all" || item.category === filterCategory;
    const stockMatch = !showLowStockOnly || (item.reorder_level !== null && item.quantity <= item.reorder_level);
    return searchMatch && categoryMatch && stockMatch;
  });

  // Calculate stats
  const lowStockCount = items.filter(
    item => item.reorder_level !== null && item.quantity <= item.reorder_level
  ).length;
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.cost_per_unit || 0)), 0);
  const totalItems = items.length;

  const commonUnits = ["kg", "g", "l", "ml", "units", "pieces", "boxes", "packs", "dozen"];
  const categories = ["Vegetables", "Fruits", "Groceries", "Meat & Seafood", "Dairy", "Beverages", "Spices", "Other"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-100 dark:from-gray-900 dark:via-slate-900 dark:to-emerald-950 p-4 md:p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl shadow-lg">
              <Package className="h-6 md:h-8 w-6 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                Enhanced Inventory
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-lg mt-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Complete inventory control with alerts
              </p>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setEditingItem(null)}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold px-4 md:px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingItem?.name}
                    required
                    placeholder="Enter item name"
                    className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                  <Select name="category" defaultValue={editingItem?.category || "Other"}>
                    <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity *</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.01"
                      defaultValue={editingItem?.quantity}
                      required
                      placeholder="0"
                      className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit" className="text-sm font-medium text-gray-700 dark:text-gray-300">Unit</Label>
                    <Select name="unit" defaultValue={editingItem?.unit || commonUnits[0]}>
                      <SelectTrigger className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reorderLevel" className="text-sm font-medium text-gray-700 dark:text-gray-300">Reorder Level</Label>
                    <Input
                      id="reorderLevel"
                      name="reorderLevel"
                      type="number"
                      step="0.01"
                      defaultValue={editingItem?.reorder_level || ""}
                      placeholder="Low stock alert"
                      className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="costPerUnit" className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost/Unit (₹)</Label>
                    <Input
                      id="costPerUnit"
                      name="costPerUnit"
                      type="number"
                      step="0.01"
                      defaultValue={editingItem?.cost_per_unit || ""}
                      placeholder="0.00"
                      className="bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold py-3 rounded-xl shadow-lg">
                  {editingItem ? "Update" : "Add"} Item
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl shadow-md">
              <Package className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{totalItems}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl shadow-md">
              <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{lowStockCount}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-md">
              <ShoppingBag className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Categories</p>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(groupedItems).length}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl shadow-md">
              <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <h3 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">₹{totalValue.toLocaleString()}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Modern Tabs with Glass Effect */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="overview" className="w-full">
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 dark:from-emerald-900/20 dark:to-green-900/20 p-2 overflow-x-auto">
            <TabsList className="grid w-full min-w-[600px] md:min-w-0 grid-cols-5 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl">
              <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-lg font-medium text-sm">
                <Package className="h-4 w-4" />
                <span className="hidden md:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-lg font-medium text-sm">
                <Bell className="h-4 w-4" />
                <span className="hidden md:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="purchase-orders" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-lg font-medium text-sm">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden md:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-lg font-medium text-sm">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden md:inline">Suggestions</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-lg font-medium text-sm">
                <History className="h-4 w-4" />
                <span className="hidden md:inline">History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-4 md:p-6 space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items by name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-[180px] bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl">
                  <Filter className="h-4 w-4 mr-2" />
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
                  ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl" 
                  : "bg-white/80 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30"
                }
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Low Stock ({lowStockCount})
              </Button>
              <ReportExport 
                items={showLowStockOnly || filterCategory !== "all" || searchQuery ? filteredItems : items} 
                title={
                  showLowStockOnly 
                    ? "Low Stock Items Report" 
                    : filterCategory !== "all" 
                      ? `${filterCategory} Inventory Report` 
                      : "Complete Inventory Report"
                }
              />
            </div>

            {/* Category Quick Filters */}
            <div className="flex flex-wrap gap-3">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <Card 
                  key={category} 
                  className={`flex items-center gap-3 p-3 border-none shadow-md cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                    filterCategory === category 
                      ? "bg-gradient-to-br from-emerald-100 via-green-50 to-emerald-100 dark:from-emerald-900/40 dark:via-green-900/40 dark:to-emerald-900/40 ring-2 ring-emerald-500" 
                      : "bg-white/80 dark:bg-gray-700/80"
                  }`}
                  onClick={() => setFilterCategory(category === filterCategory ? "all" : category)}
                >
                  {getCategoryIcon(category)}
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm">{category}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {categoryItems.length} items
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            )}

            {/* Items Grid */}
            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredItems.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No items found</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchQuery || filterCategory !== "all" || showLowStockOnly 
                        ? "Try adjusting your filters" 
                        : "Add your first inventory item to get started"}
                    </p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-none ${
                        item.reorder_level && item.quantity <= item.reorder_level
                          ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 ring-1 ring-red-200 dark:ring-red-800"
                          : "bg-white/90 dark:bg-gray-800/90"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-3 rounded-xl shadow-md ${
                            item.reorder_level && item.quantity <= item.reorder_level
                              ? "bg-red-100 dark:bg-red-900/50"
                              : "bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50"
                          }`}>
                            {getCategoryIcon(item.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg truncate">{item.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <span className="font-semibold text-lg">{item.quantity}</span> {item.unit}
                            </p>
                            {item.reorder_level && item.quantity <= item.reorder_level && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="destructive" className="text-xs font-semibold">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Low Stock
                                </Badge>
                              </div>
                            )}
                            {item.cost_per_unit && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                ₹{item.cost_per_unit}/{item.unit}
                              </p>
                            )}
                            {item.reorder_level && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Reorder at: {item.reorder_level} {item.unit}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingItem(item);
                              setIsAddDialogOpen(true);
                            }}
                            className="hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg"
                          >
                            <Edit className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setItemToDelete(item)}
                            className="hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="p-4 md:p-6">
            <InventoryAlerts />
          </TabsContent>

          <TabsContent value="purchase-orders" className="p-4 md:p-6">
            <PurchaseOrders />
          </TabsContent>

          <TabsContent value="suggestions" className="p-4 md:p-6">
            <PurchaseOrderSuggestions />
          </TabsContent>

          <TabsContent value="transactions" className="p-4 md:p-6">
            <InventoryTransactions />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Delete Inventory Item?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">"{itemToDelete?.name}"</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl"
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
