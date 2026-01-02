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
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Building2,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  ExtractedBillData,
  ExtractedItem,
  findBestSupplierMatch,
} from "@/utils/billUtils";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQueryClient } from "@tanstack/react-query";

interface BillExtractedDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: ExtractedBillData | null;
}

interface EditableItem extends ExtractedItem {
  addToInventory: boolean;
  existingItemId?: string;
}

export const BillExtractedDataDialog: React.FC<
  BillExtractedDataDialogProps
> = ({ open, onOpenChange, extractedData }) => {
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

  // Load suppliers and set initial data
  useEffect(() => {
    if (open && extractedData && restaurantId) {
      loadSuppliers();
      populateFromExtractedData();
    }
  }, [open, extractedData, restaurantId]);

  const loadSuppliers = async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("restaurant_id", restaurantId);
    if (data) setSuppliers(data);
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
    setInvoiceDate(extractedData.invoice?.date || "");

    // Items
    const editableItems: EditableItem[] = (extractedData.items || []).map(
      (item) => ({
        ...item,
        addToInventory: true,
      })
    );
    setItems(editableItems);

    // Total
    setGrandTotal(extractedData.grand_total || 0);
  };

  const updateItem = (index: number, field: keyof EditableItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;

    // Recalculate amount if quantity or rate changed
    if (field === "quantity" || field === "rate") {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }

    setItems(updated);

    // Update grand total
    const total = updated.reduce((sum, item) => sum + item.amount, 0);
    setGrandTotal(total);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const total = updated.reduce((sum, item) => sum + item.amount, 0);
    setGrandTotal(total);
  };

  const addNewItem = () => {
    setItems([
      ...items,
      {
        item_name: "",
        quantity: 1,
        unit: "kg",
        rate: 0,
        amount: 0,
        addToInventory: true,
      },
    ]);
  };

  const handleSave = async () => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "Restaurant not found",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let supplierId = existingSupplierId;

      // Create supplier if new
      if (!supplierId && vendorName) {
        const { data: newSupplier, error: supplierError } = await supabase
          .from("suppliers")
          .insert([
            {
              restaurant_id: restaurantId,
              name: vendorName,
              address: vendorAddress || null,
              phone: vendorMobile || null,
              email: vendorEmail || null,
            },
          ])
          .select()
          .single();

        if (supplierError) throw supplierError;
        supplierId = newSupplier.id;

        toast({
          title: "Supplier Created",
          description: `Added "${vendorName}" as a new supplier`,
        });
      }

      // Add inventory items
      const itemsToAdd = items.filter(
        (item) => item.addToInventory && item.item_name
      );

      for (const item of itemsToAdd) {
        // Check if item already exists
        const { data: existing } = await supabase
          .from("inventory_items")
          .select("id, quantity")
          .eq("restaurant_id", restaurantId)
          .ilike("name", item.item_name)
          .maybeSingle();

        if (existing) {
          // Update existing item quantity
          const newQuantity = existing.quantity + item.quantity;
          await supabase
            .from("inventory_items")
            .update({
              quantity: newQuantity,
              cost_per_unit: item.rate,
            })
            .eq("id", existing.id);

          // Create transaction record
          await supabase.from("inventory_transactions").insert([
            {
              restaurant_id: restaurantId,
              inventory_item_id: existing.id,
              transaction_type: "purchase",
              quantity_change: item.quantity,
              notes: `Bill: ${invoiceNumber || "N/A"} from ${
                vendorName || "Unknown"
              }`,
            },
          ]);
        } else {
          // Create new inventory item
          const { data: newItem, error: itemError } = await supabase
            .from("inventory_items")
            .insert([
              {
                restaurant_id: restaurantId,
                name: item.item_name,
                quantity: item.quantity,
                unit: item.unit,
                cost_per_unit: item.rate,
                category: "Other",
              },
            ])
            .select()
            .single();

          if (itemError) throw itemError;

          // Create transaction record
          await supabase.from("inventory_transactions").insert([
            {
              restaurant_id: restaurantId,
              inventory_item_id: newItem.id,
              transaction_type: "purchase",
              quantity_change: item.quantity,
              notes: `Bill: ${invoiceNumber || "N/A"} from ${
                vendorName || "Unknown"
              }`,
            },
          ]);
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });

      toast({
        title: "Success!",
        description: `Added ${itemsToAdd.length} items to inventory`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving bill data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save data",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden bg-white dark:bg-gray-800 p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            Review Extracted Bill Data
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Review and edit the extracted information. Items marked will be
            added to inventory.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Supplier Section */}
            <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                  Supplier Details
                </h3>
                {existingSupplierId ? (
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    Existing
                  </Badge>
                ) : vendorName ? (
                  <Badge className="bg-amber-100 text-amber-700 text-xs">
                    New
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">
                    Supplier Name *
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
                    placeholder="Enter supplier name"
                    className="bg-white dark:bg-gray-700 h-9 sm:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">
                    Mobile
                  </Label>
                  <Input
                    value={vendorMobile}
                    onChange={(e) => setVendorMobile(e.target.value)}
                    placeholder="Phone number"
                    className="bg-white dark:bg-gray-700 h-9 sm:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">
                    Address
                  </Label>
                  <Input
                    value={vendorAddress}
                    onChange={(e) => setVendorAddress(e.target.value)}
                    placeholder="Supplier address"
                    className="bg-white dark:bg-gray-700 h-9 sm:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    placeholder="Email address"
                    className="bg-white dark:bg-gray-700 h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm font-medium">
                  Invoice Number
                </Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Invoice #"
                  className="bg-white dark:bg-gray-700 h-9 sm:h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium">
                  Invoice Date
                </Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="bg-white dark:bg-gray-700 h-9 sm:h-10 text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Items Section */}
            <div>
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    Items
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {items.length} items
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addNewItem}
                  className="h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <Card
                    key={index}
                    className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50"
                  >
                    {/* Item Name Row */}
                    <div className="flex items-center gap-2 mb-3">
                      <Checkbox
                        checked={item.addToInventory}
                        onCheckedChange={(checked) =>
                          updateItem(index, "addToInventory", checked)
                        }
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <Label className="text-xs text-gray-500 mb-1 block">
                          Item Name
                        </Label>
                        <Input
                          value={item.item_name}
                          onChange={(e) =>
                            updateItem(index, "item_name", e.target.value)
                          }
                          placeholder="Item name"
                          className="bg-white dark:bg-gray-600 h-9 text-sm font-medium"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 h-8 w-8 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Qty, Unit, Rate, Amount Row */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500 block mb-1">
                          Qty
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="bg-white dark:bg-gray-600 h-9 text-sm px-2 text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 block mb-1">
                          Unit
                        </Label>
                        <Input
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(index, "unit", e.target.value)
                          }
                          placeholder="kg"
                          className="bg-white dark:bg-gray-600 h-9 text-sm px-2 text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 block mb-1">
                          Rate ({currencySymbol})
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "rate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="bg-white dark:bg-gray-600 h-9 text-sm px-2 text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 block mb-1">
                          Amount
                        </Label>
                        <div className="h-9 flex items-center justify-center px-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-md font-bold text-sm text-emerald-700 dark:text-emerald-300">
                          {currencySymbol}
                          {item.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Grand Total */}
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Grand Total</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {currencySymbol}
                    {grandTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSaving || items.filter((i) => i.addToInventory).length === 0
            }
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save to Inventory
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
