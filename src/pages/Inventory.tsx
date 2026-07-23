import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Home,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import HomemadeIngredientPicker, { RawMaterial } from "@/components/Inventory/HomemadeIngredientPicker";
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
import { useRestaurantId } from "@/hooks/useRestaurantId";
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
  is_produced?: boolean;
  storage_location_id?: string | null;
}

const ITEMS_PER_PAGE = 20;

const Inventory = () => {
  const { restaurantName } = useRestaurantId();
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
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [pendingDuplicateData, setPendingDuplicateData] = useState<{
    existingItem: InventoryItem;
    formData: any;
    restaurantId: string;
  } | null>(null);
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();

  // Homemade production state
  const [isHomemade, setIsHomemade] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isSubmittingHomemade, setIsSubmittingHomemade] = useState(false);

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
        // === HOMEMADE PRODUCTION FLOW ===
        if (isHomemade && rawMaterials.length > 0) {
          setIsSubmittingHomemade(true);
          try {
            // Validate all materials have sufficient stock (re-check live)
            for (const material of rawMaterials) {
              const { data: liveItem } = await supabase
                .from("inventory_items")
                .select("quantity")
                .eq("id", material.inventory_item_id)
                .single();
              if (!liveItem || liveItem.quantity < material.quantity) {
                throw new Error(
                  `Insufficient stock for ${material.name}. Need ${material.quantity} ${material.unit}, have ${liveItem?.quantity || 0}`
                );
              }
            }

            // Calculate total production cost
            const totalProductionCost = rawMaterials.reduce(
              (sum, m) => sum + m.quantity * m.cost_per_unit, 0
            );
            const autoCostPerUnit = itemData.quantity > 0
              ? totalProductionCost / itemData.quantity
              : 0;
            const finalCostPerUnit = itemData.cost_per_unit || autoCostPerUnit;

            // 1. Create the output inventory item
            const { expiryDate, ...insertData } = itemData;
            const { data: newItem, error: createError } = await supabase
              .from("inventory_items")
              .insert([{
                ...insertData,
                cost_per_unit: finalCostPerUnit,
                is_produced: true,
                restaurant_id: userProfile.restaurant_id,
              }])
              .select()
              .single();
            if (createError) throw createError;

            // 2. Create output lot + production_output transaction
            if (itemData.quantity > 0) {
              const { data: outputLot } = await supabase
                .from("inventory_lots")
                .insert({
                  restaurant_id: userProfile.restaurant_id,
                  inventory_item_id: newItem.id,
                  quantity_purchased: itemData.quantity,
                  quantity_remaining: itemData.quantity,
                  unit_cost: finalCostPerUnit,
                  lot_number: "PROD-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
                  notes: `Homemade production from: ${rawMaterials.map(m => m.name).join(", ")}`,
                })
                .select()
                .single();

              await supabase.from("inventory_transactions").insert({
                restaurant_id: userProfile.restaurant_id,
                inventory_item_id: newItem.id,
                transaction_type: "production_output",
                quantity_change: itemData.quantity,
                unit_cost_at_time: finalCostPerUnit,
                total_cost: totalProductionCost,
                lot_id: outputLot?.id || null,
                notes: `Homemade from: ${rawMaterials.map(m => m.name).join(", ")}`,
              });
            }

            // 3. Deduct each raw material
            for (const material of rawMaterials) {
              // Update inventory quantity
              const { data: currentItem } = await supabase
                .from("inventory_items")
                .select("quantity")
                .eq("id", material.inventory_item_id)
                .single();

              if (currentItem) {
                await supabase
                  .from("inventory_items")
                  .update({ quantity: Math.max(0, currentItem.quantity - material.quantity) })
                  .eq("id", material.inventory_item_id);
              }

              // Create production_consumed transaction
              await supabase.from("inventory_transactions").insert({
                restaurant_id: userProfile.restaurant_id,
                inventory_item_id: material.inventory_item_id,
                transaction_type: "production_consumed",
                quantity_change: -material.quantity,
                unit_cost_at_time: material.cost_per_unit,
                total_cost: material.quantity * material.cost_per_unit,
                notes: `Homemade: ${itemData.name}`,
              });
            }

            // 4. Calculate wastage (when same unit group)
            // Sum input quantities that share the same unit as the output
            const sameUnitInputTotal = rawMaterials
              .filter((m) => m.unit === itemData.unit)
              .reduce((sum, m) => sum + m.quantity, 0);
            const wastageQty = sameUnitInputTotal > 0
              ? Math.max(0, sameUnitInputTotal - itemData.quantity)
              : 0;

            // 5. Log wastage transaction if any
            if (wastageQty > 0) {
              // Create a waste transaction against the output item
              await supabase.from("inventory_transactions").insert({
                restaurant_id: userProfile.restaurant_id,
                inventory_item_id: newItem.id,
                transaction_type: "waste",
                quantity_change: -wastageQty,
                unit_cost_at_time: finalCostPerUnit,
                total_cost: wastageQty * finalCostPerUnit,
                notes: `Production wastage: ${wastageQty} ${itemData.unit} lost during homemade production of ${itemData.name}`,
              });
            }

            // 6. Create production audit log (with wastage)
            const { data: productionLog } = await supabase
              .from("homemade_production_logs")
              .insert({
                restaurant_id: userProfile.restaurant_id,
                output_inventory_item_id: newItem.id,
                output_quantity: itemData.quantity,
                output_unit: itemData.unit,
                total_cost: totalProductionCost,
                cost_per_unit: finalCostPerUnit,
                wastage_quantity: wastageQty,
                wastage_unit: wastageQty > 0 ? itemData.unit : null,
                notes: `Produced ${itemData.name} from ${rawMaterials.length} ingredients${wastageQty > 0 ? ` (wastage: ${wastageQty} ${itemData.unit})` : ""}`,
              })
              .select()
              .single();

            if (productionLog) {
              await supabase.from("homemade_production_log_items").insert(
                rawMaterials.map((m) => ({
                  production_log_id: productionLog.id,
                  inventory_item_id: m.inventory_item_id,
                  quantity_consumed: m.quantity,
                  unit: m.unit,
                  cost_per_unit: m.cost_per_unit,
                  total_cost: m.quantity * m.cost_per_unit,
                }))
              );
            }

            // 7. Save production recipe for re-production ("Produce More")
            try {
              const { data: prodRecipe } = await supabase
                .from("recipes")
                .insert({
                  restaurant_id: userProfile.restaurant_id,
                  recipe_type: "production",
                  name: `Production: ${itemData.name}`,
                  category: "side_dish" as any,
                  output_inventory_item_id: newItem.id,
                  output_quantity: itemData.quantity,
                  output_unit: itemData.unit,
                  total_cost: totalProductionCost,
                  selling_price: 0,
                  serving_size: 1,
                  serving_unit: itemData.unit,
                  is_active: true,
                  description: `Production recipe for homemade ${itemData.name}`,
                })
                .select()
                .single();

              if (prodRecipe) {
                await supabase.from("recipe_ingredients").insert(
                  rawMaterials.map((m) => ({
                    recipe_id: prodRecipe.id,
                    inventory_item_id: m.inventory_item_id,
                    quantity: m.quantity,
                    unit: m.unit,
                    cost_per_unit: m.cost_per_unit,
                    total_cost: m.quantity * m.cost_per_unit,
                  }))
                );
              }
            } catch (recipeErr) {
              console.warn("Failed to save production recipe (non-critical):", recipeErr);
            }

            toast({
              title: "🏠 Homemade item produced!",
              description: wastageQty > 0
                ? `"${itemData.name}" created. ${rawMaterials.length} ingredient(s) deducted. ⚠️ Wastage: ${wastageQty} ${itemData.unit}`
                : `"${itemData.name}" created. ${rawMaterials.length} ingredient(s) deducted. Production recipe saved for re-use.`,
            });
          } finally {
            setIsSubmittingHomemade(false);
            setIsHomemade(false);
            setRawMaterials([]);
          }
        } else {
          // === REGULAR ADD ITEM FLOW (unchanged) ===
          // Check for existing item with same name (case-insensitive)
          const existingItem = items.find(
            (i) =>
              i.name.toLowerCase().trim() === itemData.name.toLowerCase().trim(),
          );

          if (existingItem) {
            if (existingItem.category === itemData.category && existingItem.unit === itemData.unit) {
               setDuplicateWarning(true);
               return;
            }
            
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent),radial-gradient(ellipse_60%_40%_at_80%_50%,rgba(139,92,246,0.08),transparent)] bg-gradient-to-br from-slate-50 via-emerald-50/30 to-violet-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/40 p-3 md:p-6">
      {/* Header — Glassmorphic Floating Card */}
      <div className="mb-6 relative overflow-hidden bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/40 dark:border-white/[0.06] rounded-2xl md:rounded-3xl shadow-xl shadow-black/[0.03] p-4 md:p-8">
        {/* Gradient mesh decoration */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-emerald-400/20 via-teal-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-violet-400/15 via-purple-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div
              className="p-3 md:p-4 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/40 group-hover:shadow-xl transition-all duration-500"
              style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), 0 8px 24px -4px rgba(16,185,129,0.35)' }}
            >
              <Package className="h-6 md:h-8 w-6 md:w-8 text-white drop-shadow-sm" />
            </div>
            <div>
              {restaurantName && (
                <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-emerald-300 mb-0.5">
                  {restaurantName}
                </p>
              )}
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
              if (!open) {
                setEditingItem(null);
                setIsHomemade(false);
                setRawMaterials([]);
              }
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
                className="bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 hover:from-emerald-500 hover:via-green-600 hover:to-teal-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300"
                style={{ boxShadow: '0 8px 32px -4px rgba(16,185,129,0.35)' }}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl border border-white/40 dark:border-white/[0.06] rounded-3xl shadow-2xl shadow-black/10 p-0 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Dialog Header — Vibrant gradient with glass overlay */}
              <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 px-6 py-5">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_70%)]" />
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                <DialogHeader className="relative">
                  <DialogTitle className="text-xl font-black text-white flex items-center gap-3 drop-shadow-sm">
                    {editingItem ? (
                      <>
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                          <Edit className="h-5 w-5" />
                        </div>
                        Edit Item
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                          <Plus className="h-5 w-5" />
                        </div>
                        Add New Item
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-white/80 text-sm font-medium">
                    {editingItem
                      ? "Update the details below"
                      : "Fill in the details to add a new inventory item"}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <form
                key={editingItem?.id || "new"}
                onSubmit={handleSubmit}
                className="p-6 space-y-5 overflow-y-auto flex-1 bg-white/50 dark:bg-gray-900/50"
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
                    className="bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700/50 rounded-xl h-12 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400/60 transition-all backdrop-blur-sm shadow-sm"
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
                    <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-700/50 rounded-xl h-12 focus:ring-2 focus:ring-emerald-500/30 backdrop-blur-sm shadow-sm">
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

                {/* Homemade Toggle — only in Add mode */}
                {!editingItem && (
                  <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isHomemade
                      ? "bg-amber-50/80 dark:bg-amber-900/15 border-amber-200/60 dark:border-amber-800/40"
                      : "bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700"
                  }`}>
                    <div className="flex items-center gap-2">
                      <Home className={`h-4 w-4 ${isHomemade ? "text-amber-600" : "text-gray-400"}`} />
                      <div>
                        <p className={`text-sm font-semibold ${isHomemade ? "text-amber-700 dark:text-amber-300" : "text-gray-700 dark:text-gray-300"}`}>
                          Homemade Item
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">
                          Create by consuming existing inventory
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isHomemade}
                      onCheckedChange={(checked) => {
                        setIsHomemade(checked);
                        if (!checked) setRawMaterials([]);
                      }}
                    />
                  </div>
                )}

                {/* Raw Materials Section — when homemade toggle is ON */}
                {isHomemade && !editingItem && (
                  <div className="border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-3 bg-amber-50/30 dark:bg-amber-900/10">
                    <HomemadeIngredientPicker
                      materials={rawMaterials}
                      onMaterialsChange={setRawMaterials}
                      inventoryItems={items}
                      currencySymbol={currencySymbol}
                    />
                  </div>
                )}

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
                  disabled={
                    isSubmittingHomemade ||
                    (isHomemade && (
                      rawMaterials.length === 0 ||
                      rawMaterials.some(m => !m.inventory_item_id || m.quantity <= 0) ||
                      rawMaterials.some(m => m.quantity > m.available_stock)
                    ))
                  }
                  className={`w-full font-black py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 h-13 text-base transform hover:-translate-y-0.5 ${
                    isHomemade && !editingItem
                      ? "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 hover:from-amber-500 hover:via-orange-600 hover:to-rose-700 text-white shadow-amber-500/30"
                      : "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 hover:from-emerald-500 hover:via-green-600 hover:to-teal-700 text-white shadow-emerald-500/30"
                  }`}
                  style={{ boxShadow: isHomemade && !editingItem ? '0 8px 32px -4px rgba(245,158,11,0.35)' : '0 8px 32px -4px rgba(16,185,129,0.35)' }}
                >
                  {isSubmittingHomemade ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                      Producing...
                    </>
                  ) : editingItem ? (
                    <>
                      <Edit className="mr-2 h-4 w-4" /> Update Item
                    </>
                  ) : isHomemade ? (
                    <>
                      <Home className="mr-2 h-4 w-4" /> 🏠 Produce & Add to Inventory
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

      {/* Main Content with Tabs — Glassmorphic Container */}
      <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/40 dark:border-white/[0.06] rounded-2xl md:rounded-3xl shadow-xl shadow-black/[0.03] overflow-hidden">
        <Tabs defaultValue="overview" className="w-full">
          <div className="px-3 md:px-5 pt-4 pb-2">
            <TabsList className="flex w-full justify-start md:justify-center overflow-x-auto scrollbar-hide gap-1.5 bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl rounded-2xl p-1.5 border border-white/30 dark:border-white/[0.06]">
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
                  className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs md:text-sm transition-all duration-300 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-400 data-[state=active]:via-green-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 data-[state=active]:scale-[1.02]"
                >
                  <tab.icon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-6" />
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
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl border border-white/40 dark:border-white/[0.08] rounded-2xl h-11 shadow-sm focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400/50 transition-all"
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
                  <SelectTrigger className="flex-1 min-w-[120px] md:w-[180px] md:flex-none bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl border border-white/40 dark:border-white/[0.08] rounded-2xl h-10 text-sm shadow-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
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
                      ? "bg-gradient-to-r from-red-400 via-rose-500 to-pink-600 text-white rounded-2xl h-10 shadow-lg shadow-rose-500/25 font-semibold"
                      : "bg-white/60 dark:bg-white/[0.06] backdrop-blur-xl border border-white/40 dark:border-white/[0.08] rounded-2xl hover:bg-red-50/60 dark:hover:bg-red-950/20 h-10 font-semibold"
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shrink-0 border transition-all duration-300 text-sm font-semibold ${
                    filterCategory === category
                      ? "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-300/60 dark:border-emerald-600/40 text-emerald-700 dark:text-emerald-300 shadow-md shadow-emerald-500/10 scale-[1.02]"
                      : "bg-white/50 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-white/[0.08] hover:scale-[1.01]"
                  }`}
                  onClick={() =>
                    setFilterCategory(
                      category === filterCategory ? "all" : category,
                    )
                  }
                >
                  {getCategoryIcon(category)}
                  <span>{category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                    filterCategory === category
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-gray-100/80 dark:bg-gray-600/50 text-gray-500 dark:text-gray-400"
                  }`}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
                    {paginatedItems.map((item) => {
                      const stock = getStockLevel(item);
                      const isLow =
                        item.reorder_level != null &&
                        item.quantity <= item.reorder_level;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedDetailItem(item)}
                          className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer ${
                            isLow
                              ? "bg-gradient-to-br from-red-50/60 to-rose-50/40 dark:from-red-950/20 dark:to-rose-950/15 border-red-300/40 dark:border-red-700/30 shadow-lg shadow-red-500/[0.08] hover:shadow-red-500/20"
                              : "bg-white/50 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] hover:border-emerald-300/50 dark:hover:border-emerald-600/30 hover:shadow-emerald-500/10"
                          }`}
                        >
                          {/* Top accent bar — gradient with glow */}
                          <div
                            className={`h-1 w-full bg-gradient-to-r ${
                              isLow
                                ? "from-red-400 via-rose-500 to-pink-500"
                                : "from-emerald-400 via-green-400 to-teal-400"
                            }`}
                          />
                          {/* Subtle gradient overlay */}
                          <div className={`absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 bg-gradient-to-br ${
                            isLow ? "from-rose-500 to-pink-500" : "from-emerald-500 to-teal-500"
                          }`} />

                          <div className="relative p-4 md:p-5">
                            {/* Header: 3D Icon + Name + Actions */}
                            <div className="flex items-start justify-between gap-2 mb-4">
                              <div className="flex items-center gap-3 min-w-0">
                                {/* 3D Icon Sphere */}
                                <div
                                  className={`p-2.5 rounded-2xl shrink-0 shadow-md transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                                    isLow
                                      ? "bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/30"
                                      : "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30"
                                  }`}
                                  style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.1)' }}
                                >
                                  {React.cloneElement(getCategoryIcon(item.category), { className: 'h-5 w-5 text-white drop-shadow-sm' })}
                                </div>
                                <div className="min-w-0">
                                  <h3
                                    className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight truncate"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </h3>
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                                    {item.category}
                                    {(item as any).is_produced && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-bold shadow-sm">
                                        🏠 Made
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Desktop actions */}
                              <div className="hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item);
                                    setIsAddDialogOpen(true);
                                  }}
                                  className="h-8 w-8 rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-sm border border-white/40 dark:border-white/[0.08] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shadow-sm"
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
                                  className="h-8 w-8 rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-sm border border-white/40 dark:border-white/[0.08] hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm"
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
                                    className="md:hidden h-8 w-8 rounded-xl bg-white/40 dark:bg-white/[0.04] shrink-0"
                                  >
                                    <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-36 rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/40 dark:border-white/[0.06]"
                                >
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItem(item);
                                      setIsAddDialogOpen(true);
                                    }}
                                    className="rounded-xl"
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-2 text-emerald-600" />{" "}
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setItemToDelete(item);
                                    }}
                                    className="text-red-600 focus:text-red-600 rounded-xl"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />{" "}
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Quantity Display — Large + Bold */}
                            <div className="mb-4">
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
                                  {Number(item.quantity).toFixed(
                                    item.quantity % 1 === 0 ? 0 : 2,
                                  )}
                                </span>
                                <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                  {item.unit}
                                </span>
                              </div>

                              {/* Animated stock level progress bar */}
                              {item.reorder_level != null &&
                                item.reorder_level > 0 && (
                                  <div className="mt-3">
                                    <div className="h-2 w-full bg-gray-100/80 dark:bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                                      <div
                                        className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                                          stock.color === "red"
                                            ? "from-red-400 via-rose-500 to-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                                            : stock.color === "amber"
                                              ? "from-amber-400 via-orange-500 to-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                                              : "from-emerald-400 via-green-400 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                        }`}
                                        style={{ width: `${stock.pct}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                            </div>

                            {/* Low Stock Badge — Vibrant with glow */}
                            {isLow && (
                              <Badge
                                className="text-[10px] font-bold px-2.5 py-1 rounded-xl mb-3 bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-md shadow-red-500/25 animate-pulse"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" /> Low
                                Stock
                              </Badge>
                            )}

                            {/* Footer: Price + Reorder — Glassmorphic */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/20 dark:border-white/[0.04]">
                              <span className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                {item.cost_per_unit
                                  ? `${currencySymbol}${item.cost_per_unit}/${item.unit}`
                                  : "—"}
                              </span>
                              {item.reorder_level != null && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                  Reorder: {item.reorder_level} {item.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {filteredItems.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between pt-5 border-t border-white/20 dark:border-white/[0.04]">
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
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm border-white/40 dark:border-white/[0.06]"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm border-white/40 dark:border-white/[0.06]"
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
                                className={`h-8 w-8 rounded-xl text-xs font-bold transition-all ${
                                  currentPage === page
                                    ? "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-105"
                                    : "bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm border-white/40 dark:border-white/[0.06]"
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
                        className="h-8 w-8 rounded-xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm border-white/40 dark:border-white/[0.06]"
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
                        className="h-8 w-8 rounded-xl bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm border-white/40 dark:border-white/[0.06]"
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
        <AlertDialogContent className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl rounded-3xl border border-white/40 dark:border-white/[0.06] shadow-2xl shadow-black/10 overflow-hidden p-0">
          <div className="relative overflow-hidden bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 px-6 py-5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_70%)]" />
            <AlertDialogHeader className="relative">
              <AlertDialogTitle className="text-xl font-black text-white flex items-center gap-3 drop-shadow-sm">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Trash2 className="h-5 w-5" />
                </div>
                Delete Item?
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
              className="bg-gradient-to-r from-red-400 via-rose-500 to-pink-600 hover:from-red-500 hover:via-rose-600 hover:to-pink-700 text-white rounded-2xl shadow-lg shadow-red-500/25 font-bold"
              style={{ boxShadow: '0 8px 24px -4px rgba(244,63,94,0.35)' }}
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

      {/* Strict Duplicate Warning Dialog */}
      <AlertDialog
        open={duplicateWarning}
        onOpenChange={setDuplicateWarning}
      >
        <AlertDialogContent className="bg-white/98 dark:bg-gray-800/98 backdrop-blur-2xl rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-2xl overflow-hidden p-0">
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Duplicate Entry
              </AlertDialogTitle>
            </AlertDialogHeader>
          </div>
          <div className="p-6">
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
              An item with the exact same name, category, and unit already exists in your inventory. 
              Duplicate entries with the same details are not allowed. Please edit the existing item or add stock to it instead.
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="px-6 pb-6 pt-0">
            <AlertDialogAction
              onClick={() => setDuplicateWarning(false)}
              className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl shadow-lg w-full sm:w-auto"
            >
              Continue
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
