import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  Layers,
  IndianRupee,
  Trash2,
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

interface ConsumptionItem {
  inventory_item_id: string;
  item_name: string;
  item_unit: string;
  total_quantity: number;
  total_cost: number;
  lot_count: number;
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

  // Fetch inventory consumption from transactions (FIFO cost-tracked)
  const { data: consumptionData = [], isLoading } = useQuery({
    queryKey: ["inventory-consumption", restaurantId, monthOffset],
    queryFn: async () => {
      if (!restaurantId) return [];

      // Get all usage transactions for the period with item details
      const { data: transactions, error } = await supabase
        .from("inventory_transactions")
        .select(`
          inventory_item_id,
          quantity_change,
          total_cost,
          unit_cost_at_time,
          lot_id,
          inventory_items!inner(name, unit)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("transaction_type", "usage")
        .gte("created_at", format(dateRange.start, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.end, "yyyy-MM-dd'T'23:59:59"))
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!transactions || transactions.length === 0) return [];

      // Aggregate by inventory item
      const itemMap = new Map<string, ConsumptionItem>();
      for (const t of transactions) {
        const itemId = t.inventory_item_id;
        const itemInfo = t.inventory_items as any;
        const existing = itemMap.get(itemId);
        
        if (existing) {
          existing.total_quantity += Math.abs(t.quantity_change || 0);
          existing.total_cost += Math.abs(t.total_cost || 0);
          if (t.lot_id) existing.lot_count++;
        } else {
          itemMap.set(itemId, {
            inventory_item_id: itemId,
            item_name: itemInfo?.name || "Unknown",
            item_unit: itemInfo?.unit || "unit",
            total_quantity: Math.abs(t.quantity_change || 0),
            total_cost: Math.abs(t.total_cost || 0),
            lot_count: t.lot_id ? 1 : 0,
          });
        }
      }

      return Array.from(itemMap.values()).sort((a, b) => b.total_cost - a.total_cost);
    },
    enabled: !!restaurantId && isOpen,
  });

  // Fetch wastage data from waste transactions
  const { data: wastageData = [], isLoading: isWastageLoading } = useQuery({
    queryKey: ["inventory-wastage", restaurantId, monthOffset],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data: transactions, error } = await supabase
        .from("inventory_transactions")
        .select(`
          inventory_item_id,
          quantity_change,
          total_cost,
          unit_cost_at_time,
          lot_id,
          inventory_items!inner(name, unit)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("transaction_type", "waste")
        .gte("created_at", format(dateRange.start, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.end, "yyyy-MM-dd'T'23:59:59"))
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!transactions || transactions.length === 0) return [];

      const itemMap = new Map<string, ConsumptionItem>();
      for (const t of transactions) {
        const itemId = t.inventory_item_id;
        const itemInfo = t.inventory_items as any;
        const existing = itemMap.get(itemId);

        if (existing) {
          existing.total_quantity += Math.abs(t.quantity_change || 0);
          existing.total_cost += Math.abs(t.total_cost || 0);
          if (t.lot_id) existing.lot_count++;
        } else {
          itemMap.set(itemId, {
            inventory_item_id: itemId,
            item_name: itemInfo?.name || "Unknown",
            item_unit: itemInfo?.unit || "unit",
            total_quantity: Math.abs(t.quantity_change || 0),
            total_cost: Math.abs(t.total_cost || 0),
            lot_count: t.lot_id ? 1 : 0,
          });
        }
      }

      return Array.from(itemMap.values()).sort((a, b) => b.total_cost - a.total_cost);
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
        .eq("subcategory", "Inventory Consumption (FIFO)")
        .gte("expense_date", format(dateRange.start, "yyyy-MM-dd"))
        .lte("expense_date", format(dateRange.end, "yyyy-MM-dd"))
        .limit(1);
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!restaurantId && isOpen,
  });

  // Calculate totals
  const totalConsumed = useMemo(
    () => consumptionData.reduce((sum, item) => sum + item.total_cost, 0),
    [consumptionData],
  );

  const totalWastage = useMemo(
    () => wastageData.reduce((sum, item) => sum + item.total_cost, 0),
    [wastageData],
  );

  const grandTotal = totalConsumed + totalWastage;

  const totalQuantity = useMemo(
    () => consumptionData.reduce((sum, item) => sum + item.total_quantity, 0),
    [consumptionData],
  );

  // Build description
  const buildDescription = () => {
    const usageLines = consumptionData.map(
      (item) =>
        `[USAGE] ${item.item_name}: ${item.total_quantity.toFixed(2)} ${item.item_unit} = ${currencySymbol}${item.total_cost.toFixed(2)}`,
    );
    const wastageLines = wastageData.map(
      (item) =>
        `[WASTE] ${item.item_name}: ${item.total_quantity.toFixed(2)} ${item.item_unit} = ${currencySymbol}${item.total_cost.toFixed(2)}`,
    );
    const allLines = [...usageLines, ...wastageLines];
    return `FIFO Inventory Report for ${dateRange.label}\nUsage: ${currencySymbol}${totalConsumed.toFixed(2)}\nWastage: ${currencySymbol}${totalWastage.toFixed(2)}\n${allLines.join("\n")}\nGrand Total: ${currencySymbol}${grandTotal.toFixed(2)}`;
  };

  // Import as expense
  const handleImport = async () => {
    if ((consumptionData.length === 0 && wastageData.length === 0) || grandTotal <= 0) {
      toast({
        title: "No Data",
        description: "No inventory usage or wastage found for this period.",
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

      // Insert usage expense
      if (totalConsumed > 0) {
        const { error } = await supabase.from("expenses").insert({
          restaurant_id: profile.restaurant_id,
          category: "groceries",
          subcategory: "Inventory Consumption (FIFO)",
          amount: Math.round(totalConsumed * 100) / 100,
          description: buildDescription(),
          expense_date: format(dateRange.end, "yyyy-MM-dd"),
          payment_method: "cash",
          is_recurring: false,
          created_by: session.user.id,
        });
        if (error) throw error;
      }

      // Insert wastage expense
      if (totalWastage > 0) {
        const { error } = await supabase.from("expenses").insert({
          restaurant_id: profile.restaurant_id,
          category: "groceries",
          subcategory: "Inventory Wastage",
          amount: Math.round(totalWastage * 100) / 100,
          description: `Inventory Wastage for ${dateRange.label}\n${wastageData.map(item => `${item.item_name}: ${item.total_quantity.toFixed(2)} ${item.item_unit} = ${currencySymbol}${item.total_cost.toFixed(2)}`).join("\n")}\nTotal Wastage: ${currencySymbol}${totalWastage.toFixed(2)}`,
          expense_date: format(dateRange.end, "yyyy-MM-dd"),
          payment_method: "cash",
          is_recurring: false,
          created_by: session.user.id,
        });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] });

      toast({
        title: "Expenses Recorded",
        description: `Usage: ${currencySymbol}${totalConsumed.toFixed(2)} + Wastage: ${currencySymbol}${totalWastage.toFixed(2)} = Total: ${currencySymbol}${grandTotal.toFixed(2)}`,
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
      <DialogContent className="sm:max-w-[750px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            Inventory Consumption Report
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Auto-calculated from FIFO inventory transactions. Shows exactly how
            much inventory was consumed and its cost.
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
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Layers className="h-3 w-3" />
            FIFO Costing
          </Badge>
        </div>

        {/* Duplicate Warning */}
        {existingImport && (
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/30">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              An inventory consumption expense of{" "}
              <strong>
                {currencySymbol}
                {existingImport.amount}
              </strong>{" "}
              was already recorded for {dateRange.label} on{" "}
              {format(new Date(existingImport.expense_date), "MMM d")}.
              Importing again will create a duplicate.
            </span>
          </div>
        )}

        {/* Consumption List */}
        <div className="flex-1 overflow-y-auto border rounded-xl">
          {isLoading || isWastageLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            </div>
          ) : consumptionData.length === 0 && wastageData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No inventory usage found</p>
              <p className="text-sm mt-1">
                No consumption was recorded for {dateRange.label}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">
                  Item
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-right">
                  Qty Used
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-right">
                  Avg Cost/Unit
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-right">
                  Total Cost
                </span>
              </div>

              {/* Items */}
              {consumptionData.map((item) => {
                const avgCost =
                  item.total_quantity > 0
                    ? item.total_cost / item.total_quantity
                    : 0;
                return (
                  <div
                    key={item.inventory_item_id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.item_name}
                      </p>
                      {item.lot_count > 0 && (
                        <p className="text-xs text-purple-500 dark:text-purple-400 flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {item.lot_count} lot{item.lot_count > 1 ? "s" : ""}{" "}
                          consumed
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300 w-24 text-right">
                      {item.total_quantity.toFixed(2)} {item.item_unit}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 w-24 text-right">
                      {currencySymbol}
                      {avgCost.toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400 w-28 text-right">
                      {currencySymbol}
                      {item.total_cost.toFixed(2)}
                    </span>
                  </div>
                );
              })}

              {/* Usage Subtotal */}
              {consumptionData.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800/30">
                  <div className="flex-1 text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    Usage Subtotal
                  </div>
                  <span className="text-sm font-bold text-green-700 dark:text-green-400 w-28 text-right">
                    {currencySymbol}{totalConsumed.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Wastage Section */}
              {wastageData.length > 0 && (
                <>
                  <div className="flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t-2 border-red-200 dark:border-red-800/30">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                      Wastage / Spoilage
                    </span>
                  </div>
                  {wastageData.map((item) => {
                    const avgCost = item.total_quantity > 0 ? item.total_cost / item.total_quantity : 0;
                    return (
                      <div
                        key={`waste-${item.inventory_item_id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors bg-red-50/30 dark:bg-red-950/10"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                            <Trash2 className="h-3 w-3 text-red-400" />
                            {item.item_name}
                          </p>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300 w-24 text-right">
                          {item.total_quantity.toFixed(2)} {item.item_unit}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300 w-24 text-right">
                          {currencySymbol}{avgCost.toFixed(2)}
                        </span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 w-28 text-right">
                          {currencySymbol}{item.total_cost.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                  {/* Wastage Subtotal */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800/30">
                    <div className="flex-1 text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                      <Trash2 className="h-3.5 w-3.5" />
                      Wastage Subtotal
                    </div>
                    <span className="text-sm font-bold text-red-700 dark:text-red-400 w-28 text-right">
                      {currencySymbol}{totalWastage.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingDown className="h-4 w-4" />
            <span>
              {consumptionData.length} used + {wastageData.length} wasted in {dateRange.label}
            </span>
          </div>
          <div className="text-right space-y-1">
            {totalWastage > 0 && (
              <div className="flex items-center justify-end gap-3 text-xs">
                <span className="text-gray-400">Usage: <span className="font-semibold text-green-600">{currencySymbol}{totalConsumed.toFixed(2)}</span></span>
                <span className="text-gray-400">Wastage: <span className="font-semibold text-red-600">{currencySymbol}{totalWastage.toFixed(2)}</span></span>
              </div>
            )}
            <p className="text-xs text-gray-400">Grand Total</p>
            <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center gap-1">
              <IndianRupee className="h-5 w-5 text-green-600" />
              {grandTotal.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || (consumptionData.length === 0 && wastageData.length === 0) || grandTotal <= 0}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Record as Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryExpenseDialog;
