import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Carrot,
  Apple,
  ShoppingBag,
  Bell,
  ShoppingCart,
  BarChart3,
  History,
  Sparkles,
  Search,
  Filter,
  Upload,
  MoreVertical,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingDown,
  Tag,
  Layers,
  IndianRupee,
  Box,
  Weight,
  Zap,
  Warehouse,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import ReportExport from "@/components/Inventory/ReportExport";
import InventoryAlerts from "@/components/Inventory/InventoryAlerts";
import PurchaseOrders from "@/components/Inventory/PurchaseOrders";
import PurchaseOrderSuggestions from "@/components/Inventory/PurchaseOrderSuggestions";
import InventoryTransactions from "@/components/Inventory/InventoryTransactions";
import InventoryLots from "@/components/Inventory/InventoryLots";
import Stocktake from "@/components/Inventory/Stocktake";
import InventoryKPIs from "@/components/Inventory/InventoryKPIs";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { BillUploadDialog } from "@/components/Inventory/BillUploadDialog";
import { BillExtractedDataDialog } from "@/components/Inventory/BillExtractedDataDialog";
import InventoryForecasting from "@/components/Inventory/InventoryForecasting";
import StorageLocations from "@/components/Inventory/StorageLocations";
import InventoryItemDetail from "@/components/Inventory/InventoryItemDetail";
import WastageReport from "@/components/Inventory/WastageReport";
import { ExtractedBillData } from "@/utils/billUtils";
import { INVENTORY_UNIT_VALUES } from "@/constants/units";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { FeatureLock } from "@/components/Auth/FeatureLock";

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

const ITEMS_PER_PAGE = 20;

const Inventory = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState<string>("Other");
  const [selectedDetailItem, setSelectedDetailItem] =
    useState<InventoryItem | null>(null);
  const [pendingDuplicateData, setPendingDuplicateData] = useState<{
    existingItem: InventoryItem;
    formData: any;
    restaurantId: string;
  } | null>(null);
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();

  // Bill upload state
  const [isBillUploadOpen, setIsBillUploadOpen] = useState(false);
  const [extractedBillData, setExtractedBillData] =
    useState<ExtractedBillData | null>(null);
  const [isExtractedDataDialogOpen, setIsExtractedDataDialogOpen] =
    useState(false);

  const handleBillDataExtracted = (data: ExtractedBillData) => {
    setExtractedBillData(data);
    setIsExtractedDataDialogOpen(true);
  };

  const {
    data: items = [],
    refetch,
    isLoading,
  } = useQuery({
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

  const { data: storageLocations = [] } = useQuery({
    queryKey: ["inventory-storage-locations"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return [];
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();
      if (!userProfile?.restaurant_id) return [];
      const { data, error } = await supabase
        .from("storage_locations")
        .select("id, name")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Keep inventory data synced in real-time
  useRealtimeSubscription({
    table: "inventory_items",
    queryKey: ["inventory"],
  });

  // Check for low stock items and notify
  useEffect(() => {
    const checkLowStock = async () => {
      if (!items || items.length === 0) return;

      const lowStockItems = items.filter(
        (item) =>
          item.reorder_level !== null && item.quantity <= item.reorder_level,
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

          await supabase.functions.invoke("check-low-stock", {
            body: { restaurant_id: userProfile.restaurant_id },
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
      case "vegetables":
        return <Carrot className="h-5 w-5 text-green-500" />;
      case "fruits":
        return <Apple className="h-5 w-5 text-orange-500" />;
      case "groceries":
        return <ShoppingBag className="h-5 w-5 text-blue-500" />;
      case "meat & seafood":
        return <Package className="h-5 w-5 text-red-500" />;
      case "dairy":
        return <Package className="h-5 w-5 text-yellow-500" />;
      case "beverages":
        return <Package className="h-5 w-5 text-cyan-500" />;
      case "spices":
        return <Package className="h-5 w-5 text-amber-600" />;
      default:
        return <Package className="h-5 w-5 text-primary" />;
    }
  };

  // Helper to add stock as a new lot to an existing item
  const addStockToExistingItem = async (
    existingItem: InventoryItem,
    formData: any,
    restaurantId: string,
  ) => {
    try {
      const addQty = formData.quantity;
      const addCost = formData.cost_per_unit || 0;
      const transactionCost = addCost * addQty;
      const expiryDateStr = formData.expiryDate || null;

      // Update item total quantity
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity: existingItem.quantity + addQty,
          cost_per_unit: addCost > 0 ? addCost : existingItem.cost_per_unit,
        })
        .eq("id", existingItem.id);
      if (updateError) throw updateError;

      // Create new lot
      if (addQty > 0) {
        const { data: newLot, error: lotError } = await supabase
          .from("inventory_lots")
          .insert({
            restaurant_id: restaurantId,
            inventory_item_id: existingItem.id,
            quantity_purchased: addQty,
            quantity_remaining: addQty,
            unit_cost: addCost,
            lot_number:
              "LOT-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
            expiry_date: expiryDateStr
              ? new Date(expiryDateStr).toISOString()
              : null,
            notes: "Added stock to existing item",
          })
          .select()
          .single();

        if (!lotError && newLot) {
          await supabase.from("inventory_transactions").insert({
            restaurant_id: restaurantId,
            inventory_item_id: existingItem.id,
            transaction_type: "purchase",
            quantity_change: addQty,
            unit_cost_at_time: addCost,
            total_cost: transactionCost,
            lot_id: newLot.id,
            notes: "New stock batch added",
          });
        }
      }

      toast({
        title: "Stock added successfully",
        description: `New batch added to "${existingItem.name}".`,
      });
      refetch();
      setIsAddDialogOpen(false);
      setEditingItem(null);
      setPendingDuplicateData(null);
    } catch (error) {
      console.error("Error adding stock:", error);
      toast({
        title: "Operation Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemData = {
      name: formData.get("name") as string,
      quantity: Math.max(
        0,
        parseFloat(formData.get("quantity") as string) || 0,
      ),
      unit: formData.get("unit") as string,
      reorder_level: formData.get("reorderLevel")
        ? Math.max(0, parseFloat(formData.get("reorderLevel") as string))
        : null,
      cost_per_unit: formData.get("costPerUnit")
        ? Math.max(0, parseFloat(formData.get("costPerUnit") as string))
        : null,
      category: (formData.get("category") as string) || "Other",
      storage_location_id:
        (formData.get("storageLocation") as string) &&
        formData.get("storageLocation") !== "none"
          ? (formData.get("storageLocation") as string)
          : null,
      expiryDate: (formData.get("expiryDate") as string) || null,
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
        // Editing — update fields (not quantity-related, that's done via lots)
        const { expiryDate, ...updateData } = itemData;
        const { error } = await supabase
          .from("inventory_items")
          .update({ ...updateData })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({
          title: "Item updated successfully",
          description: `"${itemData.name}" has been updated.`,
        });
      } else {
        // Check for existing item with same name (case-insensitive)
        const existingItem = items.find(
          (i) =>
            i.name.toLowerCase().trim() === itemData.name.toLowerCase().trim(),
        );

        if (existingItem) {
          // Show confirmation dialog instead of silently creating a duplicate
          setPendingDuplicateData({
            existingItem,
            formData: itemData,
            restaurantId: userProfile.restaurant_id,
          });
          return;
        }

        // No duplicate — create new item
        const { expiryDate, ...insertData } = itemData;
        const { data: newItem, error } = await supabase
          .from("inventory_items")
          .insert([{ ...insertData, restaurant_id: userProfile.restaurant_id }])
          .select()
          .single();

        if (error) throw error;

        // If an initial quantity is provided, we should track it as an initial lot and transaction
        if (itemData.quantity > 0) {
          const transactionCost = itemData.cost_per_unit
            ? itemData.cost_per_unit * itemData.quantity
            : 0;

          const { data: newLot, error: lotError } = await supabase
            .from("inventory_lots")
            .insert({
              restaurant_id: userProfile.restaurant_id,
              inventory_item_id: newItem.id,
              quantity_purchased: itemData.quantity,
              quantity_remaining: itemData.quantity,
              unit_cost: itemData.cost_per_unit || 0,
              lot_number: "INITIAL-" + Math.random().toString(36).slice(2, 10),
              expiry_date: itemData.expiryDate
                ? new Date(itemData.expiryDate).toISOString()
                : null,
              notes: "Initial inventory setup",
            })
            .select()
            .single();

          if (!lotError && newLot) {
            await supabase.from("inventory_transactions").insert({
              restaurant_id: userProfile.restaurant_id,
              inventory_item_id: newItem.id,
              transaction_type: "purchase",
              quantity_change: itemData.quantity,
              unit_cost_at_time: itemData.cost_per_unit || 0,
              total_cost: transactionCost,
              lot_id: newLot.id,
              notes: "Initial stock entry",
            });
          }
        }

        toast({
          title: "Item added successfully",
          description: `"${itemData.name}" has been added to inventory.`,
        });
      }

      refetch();
      setIsAddDialogOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Operation Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      // Delete child records in correct order (transactions reference lots via lot_id FK)
      const { error: alertErr } = await supabase
        .from("inventory_alerts")
        .delete()
        .eq("inventory_item_id", itemToDelete.id);
      if (alertErr) console.warn("Alert cleanup:", alertErr);

      // Transactions MUST be deleted before lots (lot_id FK constraint)
      const { error: txnErr } = await supabase
        .from("inventory_transactions")
        .delete()
        .eq("inventory_item_id", itemToDelete.id);
      if (txnErr) throw txnErr;

      const { error: lotErr } = await supabase
        .from("inventory_lots")
        .delete()
        .eq("inventory_item_id", itemToDelete.id);
      if (lotErr) throw lotErr;

      const { error: poErr } = await supabase
        .from("purchase_order_items")
        .delete()
        .eq("inventory_item_id", itemToDelete.id);
      if (poErr) console.warn("PO cleanup:", poErr);

      const { error: recipeErr } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("inventory_item_id", itemToDelete.id);
      if (recipeErr) console.warn("Recipe cleanup:", recipeErr);

      const { error: soErr } = await supabase
        .from("supplier_order_items")
        .delete()
        .eq("inventory_item_id", itemToDelete.id);
      if (soErr) console.warn("Supplier order cleanup:", soErr);

      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", itemToDelete.id);
      if (error) throw error;
      toast({
        title: "Item deleted",
        description: `"${itemToDelete.name}" has been removed.`,
      });
      refetch();
      setItemToDelete(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Delete Failed",
        description:
          "Failed to delete item. It may be linked to other records.",
        variant: "destructive",
      });
      setItemToDelete(null);
    }
  };

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, InventoryItem[]>,
  );

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const searchMatch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryMatch =
        filterCategory === "all" || item.category === filterCategory;
      const stockMatch =
        !showLowStockOnly ||
        (item.reorder_level !== null && item.quantity <= item.reorder_level);
      return searchMatch && categoryMatch && stockMatch;
    });
  }, [items, searchQuery, filterCategory, showLowStockOnly]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, showLowStockOnly]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ITEMS_PER_PAGE),
  );
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Stats
  const lowStockCount = items.filter(
    (item) =>
      item.reorder_level !== null && item.quantity <= item.reorder_level,
  ).length;
  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * (item.cost_per_unit || 0),
    0,
  );
  const totalItems = items.length;

  const commonUnits = INVENTORY_UNIT_VALUES;
  const categories = [
    "Vegetables",
    "Fruits",
    "Groceries",
    "Meat & Seafood",
    "Dairy",
    "Bakery",
    "Beverages",
    "Spices",
    "Other",
  ];

  // Stock level helper
  const getStockLevel = (item: InventoryItem) => {
    if (!item.reorder_level || item.reorder_level === 0)
      return { pct: 100, color: "emerald" };
    const pct = Math.min(100, (item.quantity / (item.reorder_level * 3)) * 100);
    if (item.quantity <= item.reorder_level) return { pct, color: "red" };
    if (pct < 40) return { pct, color: "amber" };
    return { pct, color: "emerald" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/40 to-emerald-50/60 dark:from-gray-900 dark:via-slate-900 dark:to-emerald-950 p-3 md:p-6">
      {/* Header */}
      <div className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl border border-white/30 dark:border-gray-700/30 rounded-2xl md:rounded-3xl shadow-xl shadow-emerald-500/5 p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg shadow-emerald-500/30">
              <Package className="h-6 md:h-8 w-6 md:w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
                Inventory Management
              </h1>
              <p className="hidden sm:flex text-gray-500 dark:text-gray-400 text-sm mt-0.5 items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                Track stock, manage costs, and optimize reorders
              </p>
            </div>
          </div>

          {/* Add Item Dialog */}
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) setEditingItem(null);
              if (open && !editingItem) setNewItemCategory("Other");
              if (open && editingItem)
                setNewItemCategory(editingItem.category || "Other");
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setNewItemCategory("Other");
                }}
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 transition-all duration-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px] bg-background text-foreground backdrop-blur-2xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-0 overflow-hidden">
              {/* Dialog Header with gradient accent */}
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                    {editingItem ? (
                      <>
                        <Edit className="h-5 w-5" /> Edit Inventory Item
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5" /> Add New Item
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-emerald-100 text-sm">
                    {editingItem
                      ? "Update the details below"
                      : "Fill in the details to add a new inventory item"}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form
                key={editingItem?.id || "new"}
                onSubmit={handleSubmit}
                className="p-6 space-y-5"
              >
                {/* Item Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="name"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Tag className="h-3.5 w-3.5 text-emerald-500" />
                    Item Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingItem?.name}
                    required
                    placeholder="e.g., Olive Oil, Basmati Rice"
                    className="bg-transparent border-gray-300 dark:border-gray-700 rounded-xl h-11 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="category"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Layers className="h-3.5 w-3.5 text-blue-500" />
                    Category
                  </Label>
                  <Select
                    name="category"
                    value={newItemCategory}
                    onValueChange={setNewItemCategory}
                  >
                    <SelectTrigger className="bg-transparent border-gray-300 dark:border-gray-700 rounded-xl h-11 focus:ring-2 focus:ring-emerald-500/30">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-1" />

                {/* Quantity + Unit row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="quantity"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                    >
                      <Box className="h-3.5 w-3.5 text-violet-500" />
                      Quantity <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingItem?.quantity}
                      required
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="unit">Unit *</Label>
                    <Select
                      name="unit"
                      defaultValue={editingItem?.unit || "kg"}
                    >
                      <SelectTrigger>
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

                {/* Reorder Level + Cost row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reorderLevel">Reorder Level</Label>
                    <Input
                      id="reorderLevel"
                      name="reorderLevel"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingItem?.reorder_level || ""}
                      placeholder="Low stock alert threshold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="costPerUnit">
                      Cost/Unit ({currencySymbol})
                    </Label>
                    <Input
                      id="costPerUnit"
                      name="costPerUnit"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingItem?.cost_per_unit || ""}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Storage Location */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="storageLocation"
                    className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                    Storage Location
                  </Label>
                  <Select
                    name="storageLocation"
                    defaultValue={editingItem?.storage_location_id || "none"}
                  >
                    <SelectTrigger className="bg-gray-50/80 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600 rounded-xl h-11 focus:ring-2 focus:ring-emerald-500/20 transition-all">
                      <SelectValue placeholder="Select storage location" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">Unassigned / None</SelectItem>
                      {storageLocations.map((loc: any) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiry Date for Dairy and Bakery */}
                {(newItemCategory === "Dairy" ||
                  newItemCategory === "Bakery") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" name="expiryDate" type="date" />
                    <p className="text-xs text-slate-500">
                      Only applicable for the initial lot added during item
                      creation.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all duration-300 h-12 text-base"
                >
                  {editingItem ? (
                    <>
                      <Edit className="mr-2 h-4 w-4" /> Update Item
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" /> Add to Inventory
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Premium Stats Cards */}
      <InventoryKPIs
        totalItems={totalItems}
        lowStockCount={lowStockCount}
        categoriesCount={Object.keys(groupedItems).length}
        totalValue={totalValue}
        currencySymbol={currencySymbol}
      />

      {/* Main Content with Tabs */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="overview" className="w-full">
          <div className="bg-gradient-to-r from-emerald-500/5 to-green-500/5 dark:from-emerald-900/10 dark:to-green-900/10 px-3 pt-3 pb-1">
            <TabsList className="flex w-full justify-start md:justify-center overflow-x-auto scrollbar-hide gap-1 bg-white/60 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl p-1">
              {[
                { value: "overview", icon: Package, label: "Overview" },
                { value: "alerts", icon: Bell, label: "Alerts" },
                { value: "stocktake", icon: FileText, label: "Stocktake" },
                {
                  value: "purchase-orders",
                  icon: ShoppingCart,
                  label: "Orders",
                },
                { value: "suggestions", icon: BarChart3, label: "Suggest" },
                { value: "forecast", icon: Zap, label: "Forecast" },
                // { value: "locations", icon: Warehouse, label: "Locations" },
                { value: "transactions", icon: History, label: "History" },
                { value: "lots", icon: Layers, label: "Lots" },
                { value: "wastage", icon: TrendingDown, label: "Wastage" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg font-medium text-xs md:text-sm transition-all"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-4 md:p-6 space-y-5">
            {/* Search and Filter Bar */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-50/80 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600 rounded-xl h-10"
                  />
                </div>

                <Button
                  onClick={() => setIsBillUploadOpen(true)}
                  size="icon"
                  className="md:hidden h-10 w-10 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl shadow-md shrink-0"
                  title="Scan Bill"
                >
                  <Upload className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="md:hidden h-10 w-10 rounded-xl shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                    <DropdownMenuItem
                      onClick={() => {
                        const b = document.querySelector(
                          "[data-export-excel]",
                        ) as HTMLButtonElement;
                        b?.click();
                      }}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />{" "}
                      Export Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const b = document.querySelector(
                          "[data-export-pdf]",
                        ) as HTMLButtonElement;
                        b?.click();
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2 text-red-600" /> Export
                      PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-2">
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                >
                  <SelectTrigger className="flex-1 min-w-[120px] md:w-[180px] md:flex-none bg-gray-50/80 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600 rounded-xl h-9 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
                  size="sm"
                  className={
                    showLowStockOnly
                      ? "bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl h-9"
                      : "bg-gray-50/80 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-red-50 h-9"
                  }
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Low Stock</span>
                  <span className="sm:hidden">Low</span>
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 px-1.5 text-xs"
                  >
                    {lowStockCount}
                  </Badge>
                </Button>

                <div className="hidden md:flex gap-2 ml-auto">
                  <ReportExport
                    items={
                      showLowStockOnly ||
                      filterCategory !== "all" ||
                      searchQuery
                        ? filteredItems
                        : items
                    }
                    title={
                      showLowStockOnly
                        ? "Low Stock Items"
                        : filterCategory !== "all"
                          ? `${filterCategory} Inventory`
                          : "Complete Inventory"
                    }
                  />
                  <Button
                    onClick={() => setIsBillUploadOpen(true)}
                    variant="outline"
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 rounded-xl shadow-md"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Scan Bill
                  </Button>
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {Object.entries(groupedItems).map(([category, categoryItems]) => (
                <button
                  key={category}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl shrink-0 border transition-all duration-200 text-sm font-medium ${
                    filterCategory === category
                      ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-sm"
                      : "bg-white/80 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600/50"
                  }`}
                  onClick={() =>
                    setFilterCategory(
                      category === filterCategory ? "all" : category,
                    )
                  }
                >
                  {getCategoryIcon(category)}
                  <span>{category}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded-md font-semibold">
                    {categoryItems.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="relative">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-200 border-t-emerald-500" />
                </div>
                <p className="text-gray-500 text-sm">Loading inventory...</p>
              </div>
            )}

            {/* Items Grid */}
            {!isLoading && (
              <>
                {filteredItems.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-4">
                      <Package className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      No items found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {searchQuery ||
                      filterCategory !== "all" ||
                      showLowStockOnly
                        ? "Try adjusting your filters"
                        : "Add your first inventory item to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {paginatedItems.map((item) => {
                      const stock = getStockLevel(item);
                      const isLow =
                        item.reorder_level != null &&
                        item.quantity <= item.reorder_level;
                      return (
                        <Card
                          key={item.id}
                          onClick={() => setSelectedDetailItem(item)}
                          className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer ${
                            isLow
                              ? "bg-gradient-to-br from-red-50/80 to-rose-50/80 dark:from-red-900/15 dark:to-rose-900/15 border-red-200/60 dark:border-red-800/40"
                              : "bg-white/95 dark:bg-gray-800/95 border-gray-100 dark:border-gray-700/40 hover:border-emerald-200 dark:hover:border-emerald-700/50"
                          }`}
                        >
                          {/* Top color accent bar */}
                          <div
                            className={`h-1 w-full bg-gradient-to-r ${
                              isLow
                                ? "from-red-400 to-rose-400"
                                : "from-emerald-400 to-green-400"
                            }`}
                          />

                          <div className="p-4">
                            {/* Header: Icon + Name + Actions */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`p-2 rounded-xl shrink-0 ${
                                    isLow
                                      ? "bg-red-100 dark:bg-red-900/40"
                                      : "bg-emerald-50 dark:bg-emerald-900/30"
                                  }`}
                                >
                                  {getCategoryIcon(item.category)}
                                </div>
                                <div className="min-w-0">
                                  <h3
                                    className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight truncate"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </h3>
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                                    {item.category}
                                  </p>
                                </div>
                              </div>

                              {/* Desktop actions */}
                              <div className="hidden md:flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item);
                                    setIsAddDialogOpen(true);
                                  }}
                                  className="h-7 w-7 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                >
                                  <Edit className="h-3.5 w-3.5 text-emerald-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemToDelete(item);
                                  }}
                                  className="h-7 w-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>

                              {/* Mobile menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden h-7 w-7 rounded-lg shrink-0"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-32 rounded-xl"
                                >
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItem(item);
                                      setIsAddDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-2 text-emerald-600" />{" "}
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setItemToDelete(item);
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />{" "}
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Quantity Display */}
                            <div className="mb-3">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                  {Number(item.quantity).toFixed(
                                    item.quantity % 1 === 0 ? 0 : 2,
                                  )}
                                </span>
                                <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                                  {item.unit}
                                </span>
                              </div>

                              {/* Stock level progress bar */}
                              {item.reorder_level != null &&
                                item.reorder_level > 0 && (
                                  <div className="mt-2">
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                                          stock.color === "red"
                                            ? "from-red-400 to-rose-500"
                                            : stock.color === "amber"
                                              ? "from-amber-400 to-orange-500"
                                              : "from-emerald-400 to-green-500"
                                        }`}
                                        style={{ width: `${stock.pct}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                            </div>

                            {/* Low Stock Badge */}
                            {isLow && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] font-bold px-2 py-0.5 rounded-lg mb-2"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" /> Low
                                Stock
                              </Badge>
                            )}

                            {/* Footer: Price + Reorder */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {item.cost_per_unit
                                  ? `${currencySymbol}${item.cost_per_unit}/${item.unit}`
                                  : "—"}
                              </span>
                              {item.reorder_level != null && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  Reorder: {item.reorder_level} {item.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {filteredItems.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Showing{" "}
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                        {Math.min(
                          currentPage * ITEMS_PER_PAGE,
                          filteredItems.length,
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {filteredItems.length}
                      </span>{" "}
                      items
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(
                            (p) =>
                              p === 1 ||
                              p === totalPages ||
                              Math.abs(p - currentPage) <= 1,
                          )
                          .map((page, idx, arr) => (
                            <span key={page} className="contents">
                              {idx > 0 && arr[idx - 1] !== page - 1 && (
                                <span className="text-gray-400 text-xs px-1">
                                  …
                                </span>
                              )}
                              <Button
                                variant={
                                  currentPage === page ? "default" : "outline"
                                }
                                size="icon"
                                className={`h-8 w-8 rounded-lg text-xs font-bold ${
                                  currentPage === page
                                    ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                                    : ""
                                }`}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            </span>
                          ))}
                      </div>
                      <span className="sm:hidden text-xs font-bold text-gray-600 dark:text-gray-300 px-2">
                        {currentPage}/{totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="p-4 md:p-6">
            <FeatureLock feature="inventory.alerts" interceptClicks={true}>
              <InventoryAlerts />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="purchase-orders" className="p-4 md:p-6">
            <FeatureLock
              feature="inventory.purchase_orders"
              interceptClicks={true}
            >
              <PurchaseOrders />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="suggestions" className="p-4 md:p-6">
            <FeatureLock feature="inventory.suggestions" interceptClicks={true}>
              <PurchaseOrderSuggestions />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="transactions" className="p-4 md:p-6">
            <FeatureLock
              feature="inventory.transactions"
              interceptClicks={true}
            >
              <InventoryTransactions />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="lots" className="p-4 md:p-6">
            <FeatureLock feature="inventory.lots" interceptClicks={true}>
              <InventoryLots />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="wastage" className="p-4 md:p-6">
            <FeatureLock feature="inventory.lots" interceptClicks={true}>
              <WastageReport />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="stocktake" className="p-4 md:p-6 space-y-5">
            <FeatureLock feature="inventory.stocktake" interceptClicks={true}>
              <Stocktake />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="forecast" className="p-4 md:p-6">
            <FeatureLock feature="inventory.forecasting" interceptClicks={true}>
              <InventoryForecasting />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="locations" className="p-4 md:p-6">
            <StorageLocations />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={() => setItemToDelete(null)}
      >
        <AlertDialogContent className="bg-white/98 dark:bg-gray-800/98 backdrop-blur-2xl rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-2xl overflow-hidden p-0">
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Delete Item?
              </AlertDialogTitle>
            </AlertDialogHeader>
          </div>
          <div className="p-6">
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
              Are you sure you want to delete{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                "{itemToDelete?.name}"
              </span>
              ? This will also remove all related transactions, alerts, and
              recipe links. This action cannot be undone.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="px-6 pb-6 pt-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl shadow-lg shadow-red-500/25"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bill Upload Dialogs */}
      <BillUploadDialog
        open={isBillUploadOpen}
        onOpenChange={setIsBillUploadOpen}
        onDataExtracted={handleBillDataExtracted}
      />
      {/* FIFO Item Detail Dialog */}
      <InventoryItemDetail
        item={selectedDetailItem}
        open={!!selectedDetailItem}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailItem(null);
        }}
        onEdit={(item) => {
          setEditingItem(item);
          setIsAddDialogOpen(true);
        }}
        onDelete={(item) => setItemToDelete(item)}
        onAddStock={(item) => {
          setEditingItem(null);
          setIsAddDialogOpen(true);
        }}
      />

      {/* Duplicate Item Confirmation Dialog */}
      <AlertDialog
        open={!!pendingDuplicateData}
        onOpenChange={() => setPendingDuplicateData(null)}
      >
        <AlertDialogContent className="bg-white/98 dark:bg-gray-800/98 backdrop-blur-2xl rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-2xl overflow-hidden p-0">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Item Already Exists
              </AlertDialogTitle>
            </AlertDialogHeader>
          </div>
          <div className="p-6">
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 text-sm space-y-3">
              <p>
                An item named{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  "{pendingDuplicateData?.existingItem.name}"
                </span>{" "}
                already exists in your inventory with{" "}
                <span className="font-semibold">
                  {pendingDuplicateData?.existingItem.quantity.toFixed(2)}{" "}
                  {pendingDuplicateData?.existingItem.unit}
                </span>{" "}
                in stock.
              </p>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                Would you like to add this as a new batch/lot to the existing
                item?
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-400">
                <strong>New batch:</strong>{" "}
                {pendingDuplicateData?.formData.quantity}{" "}
                {pendingDuplicateData?.existingItem.unit} @ {currencySymbol}
                {pendingDuplicateData?.formData.cost_per_unit || 0}/
                {pendingDuplicateData?.existingItem.unit}
              </div>
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="px-6 pb-6 pt-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDuplicateData) {
                  addStockToExistingItem(
                    pendingDuplicateData.existingItem,
                    pendingDuplicateData.formData,
                    pendingDuplicateData.restaurantId,
                  );
                }
              }}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-lg shadow-emerald-500/25"
            >
              <Plus className="mr-2 h-4 w-4" /> Add as New Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BillExtractedDataDialog
        open={isExtractedDataDialogOpen}
        onOpenChange={setIsExtractedDataDialogOpen}
        extractedData={extractedBillData}
      />
    </div>
  );
};

export default Inventory;
