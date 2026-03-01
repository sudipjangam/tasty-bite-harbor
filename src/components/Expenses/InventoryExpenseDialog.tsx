import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  ShoppingCart,
  Package,
  Loader2,
  Download,
  CalendarDays,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InventoryExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const InventoryExpenseDialog: React.FC<InventoryExpenseDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [monthOffset, setMonthOffset] = useState("0");

  // Calculate date range based on selected month
  const dateRange = useMemo(() => {
    const offset = parseInt(monthOffset);
    const targetMonth = subMonths(new Date(), offset);
    return {
      start: startOfMonth(targetMonth),
      end: endOfMonth(targetMonth),
      label: format(targetMonth, "MMMM yyyy"),
    };
  }, [monthOffset]);

  // Fetch inventory items with cost data
  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ["inventory-expense-items", restaurantId, monthOffset],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_items")
        .select(
          "id, name, quantity, unit, cost_per_unit, min_quantity, category",
        )
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId && isOpen,
  });

  // Check for existing inventory import for this month
  const { data: existingImport } = useQuery({
    queryKey: ["inventory-duplicate-check", restaurantId, monthOffset],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data } = await supabase
        .from("expenses")
        .select("id, amount, expense_date")
        .eq("restaurant_id", restaurantId)
        .eq("category", "groceries")
        .eq("subcategory", "Inventory Import")
        .gte("expense_date", format(dateRange.start, "yyyy-MM-dd"))
        .lte("expense_date", format(dateRange.end, "yyyy-MM-dd"))
        .limit(1);
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!restaurantId && isOpen,
  });

  // Toggle item selection
  const toggleItem = (id: string) => {
    const updated = new Set(selectedItems);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedItems(updated);
  };

  // Select all / deselect all
  const toggleAll = () => {
    if (selectedItems.size === inventoryItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(inventoryItems.map((i) => i.id)));
    }
  };

  // Calculate total for selected items
  const selectedTotal = useMemo(() => {
    return inventoryItems
      .filter((item) => selectedItems.has(item.id))
      .reduce(
        (sum, item) => sum + (item.cost_per_unit || 0) * (item.quantity || 0),
        0,
      );
  }, [inventoryItems, selectedItems]);

  // Build description breakdown
  const buildDescription = () => {
    const selected = inventoryItems.filter((item) =>
      selectedItems.has(item.id),
    );
    const lines = selected.map(
      (item) =>
        `${item.name}: ${item.quantity} ${item.unit} × ${currencySymbol}${(item.cost_per_unit || 0).toFixed(2)} = ${currencySymbol}${((item.cost_per_unit || 0) * (item.quantity || 0)).toFixed(2)}`,
    );
    return `Inventory expense for ${dateRange.label}\n${lines.join("\n")}\nTotal: ${currencySymbol}${selectedTotal.toFixed(2)}`;
  };

  // Import as expense
  const handleImport = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one inventory item.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("No restaurant found");

      const { error } = await supabase.from("expenses").insert({
        restaurant_id: profile.restaurant_id,
        category: "groceries",
        subcategory: "Inventory Import",
        amount: Math.round(selectedTotal * 100) / 100,
        description: buildDescription(),
        expense_date: format(new Date(), "yyyy-MM-dd"),
        payment_method: "cash",
        is_recurring: false,
        created_by: session.user.id,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] });

      toast({
        title: "Inventory Expense Imported",
        description: `${currencySymbol}${selectedTotal.toFixed(2)} from ${selectedItems.size} items recorded as grocery expense.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error importing inventory expense:", error);
      toast({
        title: "Import Failed",
        description: "Could not record the inventory expense.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            Import Inventory as Expense
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select inventory items to record as grocery/ingredient expenses.
          </p>
        </DialogHeader>

        {/* Month Selector */}
        <div className="flex items-center gap-3 px-1">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <Select value={monthOffset} onValueChange={setMonthOffset}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Current Month</SelectItem>
              <SelectItem value="1">Last Month</SelectItem>
              <SelectItem value="2">2 Months Ago</SelectItem>
              <SelectItem value="3">3 Months Ago</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {dateRange.label}
          </Badge>
        </div>

        {/* Duplicate Warning */}
        {existingImport && (
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/30">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              An inventory expense of{" "}
              <strong>
                {currencySymbol}
                {existingImport.amount}
              </strong>{" "}
              was already imported for {dateRange.label} on{" "}
              {format(new Date(existingImport.expense_date), "MMM d")}.
              Importing again will create a duplicate.
            </span>
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto border rounded-xl">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
          ) : inventoryItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No inventory items found</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                <Checkbox
                  checked={
                    selectedItems.size === inventoryItems.length &&
                    inventoryItems.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">
                  Item
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 text-right">
                  Qty
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-right">
                  Cost/Unit
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">
                  Total
                </span>
              </div>

              {/* Items */}
              {inventoryItems.map((item) => {
                const total = (item.cost_per_unit || 0) * (item.quantity || 0);
                const isSelected = selectedItems.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors ${isSelected ? "bg-green-50/50 dark:bg-green-900/10" : ""}`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      {item.category && (
                        <p className="text-xs text-gray-400">{item.category}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300 w-20 text-right">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 w-24 text-right">
                      {currencySymbol}
                      {(item.cost_per_unit || 0).toFixed(2)}
                    </span>
                    <span
                      className={`text-sm font-semibold w-28 text-right ${isSelected ? "text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-200"}`}
                    >
                      {currencySymbol}
                      {total.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingDown className="h-4 w-4" />
            <span>
              {selectedItems.size} of {inventoryItems.length} items selected
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total Expense</p>
            <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {currencySymbol}
              {selectedTotal.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedItems.size === 0}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Import as Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryExpenseDialog;
