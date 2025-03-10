
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Package, AlertTriangle, Carrot, Apple, ShoppingBag, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReportExport from "@/components/Inventory/ReportExport";

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
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your restaurant's inventory items
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setEditingItem(null)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingItem?.name}
                  required
                  placeholder="Enter item name"
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={editingItem?.category || "Other"}>
                  <SelectTrigger className="bg-gray-50">
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
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  defaultValue={editingItem?.quantity}
                  required
                  placeholder="Enter quantity"
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" defaultValue={editingItem?.unit || commonUnits[0]}>
                  <SelectTrigger className="bg-gray-50">
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
                <Label htmlFor="reorderLevel">Reorder Level</Label>
                <Input
                  id="reorderLevel"
                  name="reorderLevel"
                  type="number"
                  step="0.01"
                  defaultValue={editingItem?.reorder_level || ""}
                  placeholder="Enter reorder level"
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="costPerUnit">Cost per Unit (₹)</Label>
                <Input
                  id="costPerUnit"
                  name="costPerUnit"
                  type="number"
                  step="0.01"
                  defaultValue={editingItem?.cost_per_unit || ""}
                  placeholder="Enter cost per unit"
                  className="bg-gray-50"
                />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                {editingItem ? "Update" : "Add"} Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px] bg-white">
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
            className={showLowStockOnly ? "bg-red-600 hover:bg-red-700" : ""}
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
            className={`flex items-center gap-3 p-4 border-none shadow-md cursor-pointer ${
              filterCategory === category 
                ? "bg-gradient-to-br from-purple-100 to-purple-50 border-purple-200" 
                : "bg-gradient-to-br from-white to-gray-50"
            }`}
            onClick={() => setFilterCategory(category === filterCategory ? "all" : category)}
          >
            {getCategoryIcon(category)}
            <div>
              <h3 className="font-medium text-gray-700">{category}</h3>
              <p className="text-sm text-muted-foreground">
                {categoryItems.length} items
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map((item) => (
          <Card 
            key={item.id} 
            className={`p-4 shadow-md hover:shadow-lg transition-shadow ${
              item.reorder_level && item.quantity <= item.reorder_level
                ? "bg-red-50 dark:bg-red-900/20 border-red-200"
                : "bg-white dark:bg-gray-800"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  item.reorder_level && item.quantity <= item.reorder_level
                    ? "bg-red-100"
                    : "bg-primary/10"
                }`}>
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} {item.unit}
                  </p>
                  {item.reorder_level && item.quantity <= item.reorder_level && (
                    <div className="flex items-center gap-1 mt-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <Badge variant="destructive" className="text-xs">
                        Low Stock
                      </Badge>
                      {item.notification_sent && (
                        <div className="flex items-center">
                          <Bell className="h-4 w-4 text-amber-500 ml-1" />
                          <span className="text-xs text-amber-500 ml-1">Notification sent</span>
                        </div>
                      )}
                    </div>
                  )}
                  {item.cost_per_unit && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Cost: ₹{item.cost_per_unit}/{item.unit}
                    </p>
                  )}
                  {item.reorder_level && (
                    <p className="text-sm text-muted-foreground">
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
                  className="hover:bg-purple-100"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                  className="hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Inventory;
