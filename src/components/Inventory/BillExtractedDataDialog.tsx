import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Building2,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  FileText,
  Calendar,
  Sparkles,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  ExtractedBillData,
  ExtractedItem,
  findBestSupplierMatch,
  findBestInventoryMatch,
  normalizeExtractedItem,
  normalizeUnitString,
} from "@/utils/billUtils";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQueryClient } from "@tanstack/react-query";

const INVENTORY_CATEGORIES = [
  "Vegetables",
  "Dairy & Eggs",
  "Meat & Poultry",
  "Seafood",
  "Spices & Seasonings",
  "Grains & Flour",
  "Oils & Fats",
  "Bakery",
  "Beverages",
  "Sauces & Condiments",
  "Packaging",
  "Cleaning & Hygiene",
  "Other",
];

const STANDARD_UNITS = [
  "kg",
  "g",
  "ltr",
  "ml",
  "pcs",
  "box",
  "pkt",
  "bundle",
  "can",
  "dozen",
];

interface BillExtractedDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: ExtractedBillData | null;
}

interface EditableItem extends ExtractedItem {
  addToInventory: boolean;
  category?: string;
  existingItemId?: string;
  matchConfidence?: number;
  matchedName?: string;
  expiryDate?: string;
}

export const BillExtractedDataDialog: React.FC<BillExtractedDataDialogProps> = ({
  open,
  onOpenChange,
  extractedData,
}) => {
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  // Vendor state
  const [vendorName, setVendorName] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorMobile, setVendorMobile] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [existingSupplierId, setExistingSupplierId] = useState<string | null>(
    null
  );

  // Invoice state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  // Items state
  const [items, setItems] = useState<EditableItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  // Processing state
  const [isSaving, setIsSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    []
  );

  // Load suppliers and inventory items for matching
  const [inventoryItems, setInventoryItems] = useState<
    {
      id: string;
      name: string;
      unit: string;
      quantity: number;
      cost_per_unit: number | null;
      category?: string;
    }[]
  >([]);

  useEffect(() => {
    if (open && extractedData && restaurantId) {
      loadSuppliers();
      loadInventoryItems();
    }
  }, [open, extractedData, restaurantId]);

  // Populate from extracted data once inventory items are loaded
  useEffect(() => {
    if (open && extractedData && inventoryItems.length >= 0) {
      populateFromExtractedData();
    }
  }, [open, extractedData, inventoryItems]);

  const loadSuppliers = async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("restaurant_id", restaurantId);
    if (data) setSuppliers(data);
  };

  const loadInventoryItems = async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("inventory_items")
      .select("id, name, unit, quantity, cost_per_unit, category")
      .eq("restaurant_id", restaurantId);
    if (data) setInventoryItems(data);
  };

  const populateFromExtractedData = () => {
    if (!extractedData) return;

    // Vendor
    setVendorName(extractedData.vendor?.name || "");
    setVendorAddress(extractedData.vendor?.address || "");
    setVendorMobile(extractedData.vendor?.mobile || "");
    setVendorEmail(extractedData.vendor?.email || "");

    // Check if supplier exists
    const matched = findBestSupplierMatch(
      extractedData.vendor?.name,
      suppliers
    );
    setExistingSupplierId(matched?.id || null);

    // Invoice
    setInvoiceNumber(extractedData.invoice?.number || "");
    setInvoiceDate(
      extractedData.invoice?.date || new Date().toISOString().split("T")[0]
    );

    // Items — normalize for actual quantities and match to existing inventory
    const editableItems: EditableItem[] = (extractedData.items || []).map(
      (rawItem) => {
        const normalized = normalizeExtractedItem(rawItem);
        const invMatch = findBestInventoryMatch(
          normalized.item_name,
          inventoryItems
        );

        // Auto-guess category if matched or default
        const matchedItemObj = invMatch
          ? inventoryItems.find((i) => i.id === invMatch.id)
          : null;
        const guessedCategory = matchedItemObj?.category || "Other";

        return {
          ...normalized,
          quantity: normalized.actual_quantity ?? normalized.quantity,
          unit: normalizeUnitString(normalized.actual_unit ?? normalized.unit),
          category: guessedCategory,
          addToInventory: true,
          existingItemId: invMatch?.id || undefined,
          matchConfidence: invMatch?.confidence || 0,
          matchedName: invMatch?.name || undefined,
        };
      }
    );
    setItems(editableItems);

    // Total
    const calculatedTotal = editableItems.reduce(
      (acc, item) => acc + (item.amount || 0),
      0
    );
    setGrandTotal(extractedData.grand_total || calculatedTotal);
  };

  const updateItem = (index: number, field: keyof EditableItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;

    // Recalculate amount if quantity or rate changed
    if (field === "quantity" || field === "rate") {
      const q = parseFloat(updated[index].quantity as any) || 0;
      const r = parseFloat(updated[index].rate as any) || 0;
      updated[index].amount = Math.round(q * r * 100) / 100;
    }

    setItems(updated);

    // Update grand total
    const total = updated.reduce((sum, item) => sum + (item.amount || 0), 0);
    setGrandTotal(Math.round(total * 100) / 100);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const total = updated.reduce((sum, item) => sum + (item.amount || 0), 0);
    setGrandTotal(Math.round(total * 100) / 100);
  };

  const addNewItem = () => {
    setItems([
      ...items,
      {
        item_name: "",
        brand: null,
        quantity: 1,
        unit: "kg",
        category: "Other",
        rate: 0,
        amount: 0,
        package_size: null,
        package_unit: null,
        actual_quantity: 1,
        actual_unit: "kg",
        addToInventory: true,
      },
    ]);
  };

  const handleSave = async () => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant context not found",
        variant: "destructive",
      });
      return;
    }

    const itemsToAdd = items.filter(
      (item) => item.addToInventory && item.item_name.trim()
    );

    if (itemsToAdd.length === 0) {
      toast({
        title: "No items selected",
        description: "Please check at least one item with a valid name to save.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let supplierId = existingSupplierId;

      // Create supplier if new and name provided
      if (!supplierId && vendorName.trim()) {
        const { data: newSupplier, error: supplierError } = await supabase
          .from("suppliers")
          .insert([
            {
              restaurant_id: restaurantId,
              name: vendorName.trim(),
              address: vendorAddress.trim() || null,
              phone: vendorMobile.trim() || null,
              email: vendorEmail.trim() || null,
            },
          ])
          .select()
          .single();

        if (supplierError) throw supplierError;
        supplierId = newSupplier.id;

        toast({
          title: "Supplier Created",
          description: `Added "${vendorName}" to suppliers catalog`,
        });
      }

      const billDate = invoiceDate
        ? new Date(invoiceDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      // Add or update inventory items
      for (const item of itemsToAdd) {
        const storeQty = item.actual_quantity ?? item.quantity;
        const storeUnit = normalizeUnitString(item.actual_unit ?? item.unit);
        const ratePerActualUnit =
          storeQty > 0
            ? Math.round((item.amount / storeQty) * 100) / 100
            : item.rate;

        let targetItemId: string;

        // Check for existing inventory item
        let existing: {
          id: string;
          quantity: number;
          cost_per_unit?: number | null;
        } | null = null;

        if (item.existingItemId) {
          const { data } = await supabase
            .from("inventory_items")
            .select("id, quantity, cost_per_unit")
            .eq("id", item.existingItemId)
            .single();
          existing = data;
        }

        if (!existing) {
          const { data } = await supabase
            .from("inventory_items")
            .select("id, quantity, cost_per_unit")
            .eq("restaurant_id", restaurantId)
            .ilike("name", item.item_name.trim())
            .maybeSingle();
          existing = data;
        }

        if (existing) {
          targetItemId = existing.id;
          const existingQty = existing.quantity || 0;
          const existingCost = existing.cost_per_unit || 0;
          const newQuantity = existingQty + storeQty;

          // Weighted average cost
          const weightedAvgCost =
            newQuantity > 0
              ? Math.round(
                  ((existingQty * existingCost +
                    storeQty * ratePerActualUnit) /
                    newQuantity) *
                    100
                ) / 100
              : ratePerActualUnit;

          await supabase
            .from("inventory_items")
            .update({
              quantity: newQuantity,
              cost_per_unit: weightedAvgCost,
              ...(item.category && item.category !== "Other"
                ? { category: item.category }
                : {}),
            })
            .eq("id", existing.id);
        } else {
          // Create new item
          const { data: newItem, error: itemError } = await supabase
            .from("inventory_items")
            .insert([
              {
                restaurant_id: restaurantId,
                name: item.item_name.trim(),
                quantity: storeQty,
                unit: storeUnit,
                cost_per_unit: ratePerActualUnit,
                category: item.category || "Other",
              },
            ])
            .select()
            .single();

          if (itemError) throw itemError;
          targetItemId = newItem.id;
        }

        // Record purchase transaction
        await supabase.from("inventory_transactions").insert([
          {
            restaurant_id: restaurantId,
            inventory_item_id: targetItemId,
            transaction_type: "purchase",
            quantity_change: storeQty,
            notes: `Bill #${invoiceNumber || "N/A"} from ${
              vendorName || "Supplier"
            }${item.brand ? ` (${item.brand})` : ""}`,
          },
        ]);

        // Record FIFO batch lot
        try {
          const lotNumber = `BILL-${
            invoiceNumber ? invoiceNumber.replace(/[^a-zA-Z0-9-]/g, "") : ""
          }-${Date.now().toString().slice(-4)}`;

          await supabase.from("inventory_lots").insert([
            {
              restaurant_id: restaurantId,
              inventory_item_id: targetItemId,
              lot_number: lotNumber,
              purchase_date: billDate,
              quantity_purchased: storeQty,
              quantity_remaining: storeQty,
              unit_cost: ratePerActualUnit,
              supplier_id: supplierId,
              expiry_date: item.expiryDate || null,
              notes: `Bill #${invoiceNumber || "N/A"}`,
            },
          ]);
        } catch (lotErr) {
          console.warn("FIFO lot creation skipped:", lotErr);
        }
      }

      // Invalidate queries to refresh inventory UI
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-lots"] });

      toast({
        title: "Inventory Updated!",
        description: `Successfully added ${itemsToAdd.length} items to your inventory.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving bill data:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save bill data to inventory",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-emerald-500/20 shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="p-4 sm:p-6 pb-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
              Review Extracted Bill Details
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
            Verify or edit extracted items, prices, and supplier before saving to
            inventory.
          </DialogDescription>
        </div>

        {/* Scrollable Form Content */}
        <ScrollArea className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto">
          <div className="space-y-4 sm:space-y-5 pb-4">
            {/* Supplier Information Card */}
            <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    Supplier & Vendor Info
                  </h4>
                </div>
                {existingSupplierId ? (
                  <Badge className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border-0">
                    Existing Supplier
                  </Badge>
                ) : vendorName ? (
                  <Badge className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold border-0">
                    New Supplier
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    Supplier Name
                  </Label>
                  <Input
                    value={vendorName}
                    onChange={(e) => {
                      setVendorName(e.target.value);
                      const matched = findBestSupplierMatch(
                        e.target.value,
                        suppliers
                      );
                      setExistingSupplierId(matched?.id || null);
                    }}
                    placeholder="e.g. Metro Wholesale / Fresh Farm"
                    className="h-9 text-xs rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    Phone / Mobile
                  </Label>
                  <Input
                    value={vendorMobile}
                    onChange={(e) => setVendorMobile(e.target.value)}
                    placeholder="Supplier contact number"
                    className="h-9 text-xs rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                    Address
                  </Label>
                  <Input
                    value={vendorAddress}
                    onChange={(e) => setVendorAddress(e.target.value)}
                    placeholder="Supplier location or market address"
                    className="h-9 text-xs rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Meta Card */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                  Invoice / Bill #
                </Label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-00123"
                    className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-gray-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1 block">
                  Bill Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Extracted Line Items Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Line Items ({items.length})
                  </h4>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewItem}
                  className="h-8 rounded-xl text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Missing Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed rounded-2xl border-gray-200 dark:border-gray-700 text-gray-400 text-xs">
                  No line items found. Click &quot;Add Missing Item&quot; to manually enter.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-2xl border transition-all duration-200 ${
                        item.addToInventory
                          ? item.existingItemId
                            ? "bg-white dark:bg-gray-800/90 border-emerald-300/70 dark:border-emerald-800/60 shadow-xs"
                            : "bg-white dark:bg-gray-800/90 border-blue-300/70 dark:border-blue-800/60 shadow-xs"
                          : "bg-gray-50/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-60"
                      }`}
                    >
                      {/* Row 1: Checkbox + Name + Match Badge + Delete */}
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={item.addToInventory}
                          onCheckedChange={(checked) =>
                            updateItem(index, "addToInventory", !!checked)
                          }
                          className="h-4.5 w-4.5 rounded-md"
                        />
                        <div className="flex-1 min-w-0">
                          <Input
                            value={item.item_name}
                            onChange={(e) =>
                              updateItem(index, "item_name", e.target.value)
                            }
                            placeholder="Item name (e.g., Amul Butter 500g)"
                            className="h-8 text-xs font-bold rounded-lg bg-gray-50/50 dark:bg-gray-900/50"
                          />
                        </div>
                        {item.existingItemId ? (
                          <Badge className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" />
                            Matched
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0">
                            <Plus className="h-3 w-3 mr-0.5" />
                            New Item
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg shrink-0"
                          title="Delete line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Row 2: Category, Qty, Unit, Rate, Amount */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {/* Category Dropdown */}
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                            Category
                          </Label>
                          <Select
                            value={item.category || "Other"}
                            onValueChange={(val) =>
                              updateItem(index, "category", val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {INVENTORY_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quantity & Unit in one flex box */}
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                            Quantity & Unit
                          </Label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              step="any"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 text-xs rounded-lg text-center px-1 bg-gray-50/50 dark:bg-gray-900/50 w-16"
                            />
                            <Input
                              value={item.unit}
                              onChange={(e) =>
                                updateItem(index, "unit", e.target.value)
                              }
                              placeholder="unit"
                              className="h-8 text-xs rounded-lg text-center px-1 bg-gray-50/50 dark:bg-gray-900/50 flex-1"
                            />
                          </div>
                        </div>

                        {/* Rate / Price per Unit */}
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                            Rate / Unit ({currencySymbol})
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            value={item.rate}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "rate",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 text-xs rounded-lg text-center px-2 bg-gray-50/50 dark:bg-gray-900/50"
                          />
                        </div>

                        {/* Amount */}
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                            Line Total ({currencySymbol})
                          </Label>
                          <div className="h-8 flex items-center justify-center px-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-xs font-black text-emerald-700 dark:text-emerald-300">
                            {currencySymbol}
                            {(Number(item.amount) || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Summary & Save */}
        <div className="p-4 sm:p-5 bg-gray-50/90 dark:bg-gray-900/90 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Selected:{" "}
              <strong className="text-gray-900 dark:text-white">
                {items.filter((i) => i.addToInventory).length} of {items.length}{" "}
                items
              </strong>
            </span>
            <div className="text-right sm:text-left">
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-1.5">
                Total:
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                {currencySymbol}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="flex-1 sm:flex-none rounded-xl text-xs h-10 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                isSaving || items.filter((i) => i.addToInventory).length === 0
              }
              className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold h-10 px-5 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Inventory...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Save to Inventory
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
