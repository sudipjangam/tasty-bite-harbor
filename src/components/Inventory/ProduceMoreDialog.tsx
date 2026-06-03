import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Hammer,
  Scale,
  DollarSign,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProduceMoreDialogProps {
  item: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    reorder_level: number | null;
    cost_per_unit: number | null;
    restaurant_id: string;
    category: string;
    is_produced?: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductionComplete: () => void;
}

export default function ProduceMoreDialog({
  item,
  open,
  onOpenChange,
  onProductionComplete,
}: ProduceMoreDialogProps) {
  const { toast } = useToast();
  const { currencySymbol } = useCurrencyContext();
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [editedIngredients, setEditedIngredients] = useState<any[]>([]);
  const [autoScale, setAutoScale] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const { data: recipeData, isLoading: isLoadingRecipe, error: recipeError } = useQuery({
    queryKey: ["production-recipe", item?.id],
    queryFn: async () => {
      if (!item) return null;

      const { data: recipe, error: recipeErr } = await supabase
        .from("recipes")
        .select("*")
        .eq("recipe_type", "production")
        .eq("output_inventory_item_id", item.id)
        .maybeSingle();

      if (recipeErr) throw recipeErr;
      if (!recipe) return null;

      const { data: ingredients, error: ingredientsErr } = await supabase
        .from("recipe_ingredients")
        .select(`
          id,
          recipe_id,
          inventory_item_id,
          quantity,
          unit,
          cost_per_unit,
          total_cost,
          inventory_items (
            name,
            quantity,
            unit,
            cost_per_unit
          )
        `)
        .eq("recipe_id", recipe.id);

      if (ingredientsErr) throw ingredientsErr;

      return {
        recipe,
        ingredients: (ingredients || []).map((ing: any) => ({
          inventory_item_id: ing.inventory_item_id,
          name: ing.inventory_items?.name || "Unknown Item",
          defaultQuantity: ing.quantity,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit || ing.inventory_items?.cost_per_unit || 0,
          available_stock: ing.inventory_items?.quantity || 0,
        })),
      };
    },
    enabled: !!item && open,
  });

  useEffect(() => {
    if (recipeData) {
      const defaultOutput = recipeData.recipe.output_quantity || 1;
      setBatchQuantity(defaultOutput);
      setEditedIngredients(recipeData.ingredients);
    }
  }, [recipeData]);

  const handleBatchQuantityChange = (val: number) => {
    setBatchQuantity(val);
    if (autoScale && recipeData) {
      const defaultOutput = recipeData.recipe.output_quantity || 1;
      const ratio = defaultOutput > 0 ? val / defaultOutput : 0;
      const updated = editedIngredients.map((ing) => ({
        ...ing,
        quantity: Number((ing.defaultQuantity * ratio).toFixed(4)),
      }));
      setEditedIngredients(updated);
    }
  };

  const handleAutoScaleToggle = (checked: boolean) => {
    setAutoScale(checked);
    if (checked && recipeData) {
      const defaultOutput = recipeData.recipe.output_quantity || 1;
      const ratio = defaultOutput > 0 ? batchQuantity / defaultOutput : 0;
      const updated = editedIngredients.map((ing) => ({
        ...ing,
        quantity: Number((ing.defaultQuantity * ratio).toFixed(4)),
      }));
      setEditedIngredients(updated);
    }
  };

  const handleIngredientQtyChange = (index: number, val: number) => {
    const updated = [...editedIngredients];
    updated[index].quantity = val;
    setEditedIngredients(updated);
  };

  const totalProductionCost = editedIngredients.reduce(
    (sum, ing) => sum + ing.quantity * ing.cost_per_unit,
    0
  );

  const costPerProducedUnit = batchQuantity > 0 ? totalProductionCost / batchQuantity : 0;

  const sameUnitInputTotal = editedIngredients
    .filter((m) => m.unit === item?.unit)
    .reduce((sum, m) => sum + m.quantity, 0);
  const wastageQty = sameUnitInputTotal > 0 ? Math.max(0, sameUnitInputTotal - batchQuantity) : 0;

  const hasInsufficientStock = editedIngredients.some(
    (ing) => ing.quantity > ing.available_stock
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !recipeData || isSubmitting) return;

    if (batchQuantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please specify a positive production quantity.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Live stock verification
      for (const ing of editedIngredients) {
        const { data: liveItem, error: liveErr } = await supabase
          .from("inventory_items")
          .select("quantity, name")
          .eq("id", ing.inventory_item_id)
          .single();

        if (liveErr || !liveItem) {
          throw new Error(`Failed to check stock for ${ing.name}`);
        }

        if (liveItem.quantity < ing.quantity) {
          throw new Error(
            `Insufficient stock for ${ing.name}. Need ${ing.quantity} ${ing.unit}, available ${liveItem.quantity} ${ing.unit}`
          );
        }
      }

      // 2. Deduct ingredient stock and log transactions
      for (const ing of editedIngredients) {
        const { data: currentItemData } = await supabase
          .from("inventory_items")
          .select("quantity")
          .eq("id", ing.inventory_item_id)
          .single();

        const currentQty = currentItemData?.quantity || 0;
        const newQty = Math.max(0, currentQty - ing.quantity);

        await supabase
          .from("inventory_items")
          .update({ quantity: newQty })
          .eq("id", ing.inventory_item_id);

        await supabase.from("inventory_transactions").insert({
          restaurant_id: item.restaurant_id,
          inventory_item_id: ing.inventory_item_id,
          transaction_type: "production_consumed",
          quantity_change: -ing.quantity,
          unit_cost_at_time: ing.cost_per_unit,
          total_cost: ing.quantity * ing.cost_per_unit,
          notes: `Re-production: ${item.name}`,
        });
      }

      // 3. Update produced item stock
      const { data: currentOutputItem } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("id", item.id)
        .single();

      const outputCurrentQty = currentOutputItem?.quantity || 0;
      const outputNewQty = outputCurrentQty + batchQuantity;

      await supabase
        .from("inventory_items")
        .update({
          quantity: outputNewQty,
          cost_per_unit: costPerProducedUnit > 0 ? costPerProducedUnit : (item.cost_per_unit || 0),
        })
        .eq("id", item.id);

      // 4. Create new lot for FIFO tracking
      const lotNumber = "PROD-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const { data: outputLot } = await supabase
        .from("inventory_lots")
        .insert({
          restaurant_id: item.restaurant_id,
          inventory_item_id: item.id,
          quantity_purchased: batchQuantity,
          quantity_remaining: batchQuantity,
          unit_cost: costPerProducedUnit > 0 ? costPerProducedUnit : (item.cost_per_unit || 0),
          lot_number: lotNumber,
          notes: notes || `Re-production from saved formula: ${editedIngredients.map((m) => m.name).join(", ")}`,
        })
        .select()
        .single();

      // 5. Create transaction for the produced item
      await supabase.from("inventory_transactions").insert({
        restaurant_id: item.restaurant_id,
        inventory_item_id: item.id,
        transaction_type: "production_output",
        quantity_change: batchQuantity,
        unit_cost_at_time: costPerProducedUnit > 0 ? costPerProducedUnit : (item.cost_per_unit || 0),
        total_cost: totalProductionCost,
        lot_id: outputLot?.id || null,
        notes: notes || `Produced from formula. Lot: ${lotNumber}`,
      });

      // 6. Wastage transaction
      if (wastageQty > 0) {
        await supabase.from("inventory_transactions").insert({
          restaurant_id: item.restaurant_id,
          inventory_item_id: item.id,
          transaction_type: "waste",
          quantity_change: -wastageQty,
          unit_cost_at_time: costPerProducedUnit,
          total_cost: wastageQty * costPerProducedUnit,
          notes: `Production wastage: ${wastageQty} ${item.unit} lost during production of ${item.name}`,
        });
      }

      // 7. Create production audit log
      const { data: productionLog } = await supabase
        .from("homemade_production_logs")
        .insert({
          restaurant_id: item.restaurant_id,
          output_inventory_item_id: item.id,
          output_quantity: batchQuantity,
          output_unit: item.unit,
          total_cost: totalProductionCost,
          cost_per_unit: costPerProducedUnit,
          wastage_quantity: wastageQty,
          wastage_unit: wastageQty > 0 ? item.unit : null,
          notes: notes || `Produced ${batchQuantity} ${item.unit} of ${item.name} from saved formula`,
        })
        .select()
        .single();

      if (productionLog) {
        await supabase.from("homemade_production_log_items").insert(
          editedIngredients.map((ing) => ({
            production_log_id: productionLog.id,
            inventory_item_id: ing.inventory_item_id,
            quantity_consumed: ing.quantity,
            unit: ing.unit,
            cost_per_unit: ing.cost_per_unit,
            total_cost: ing.quantity * ing.cost_per_unit,
          }))
        );
      }

      toast({
        title: "Production Complete",
        description: `Successfully produced ${batchQuantity} ${item.unit} of ${item.name}.`,
      });

      onProductionComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Production Failed",
        description: err.message || "An unexpected error occurred during production.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-none rounded-2xl shadow-2xl bg-white dark:bg-gray-900">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Hammer className="h-5 w-5 animate-pulse" /> Produce More {item.name}
            </DialogTitle>
            <DialogDescription className="text-amber-50/80 text-sm">
              Use the saved production formula to produce more and update inventory.
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoadingRecipe ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Fetching production recipe...</p>
          </div>
        ) : !recipeData ? (
          <div className="p-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">No Production Recipe Found</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                No saved production formula exists for <strong>{item.name}</strong>. Create one from the recipe dialog or re-create this item.
              </p>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl mt-2">
              Close Dialog
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Output Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="batchQuantity" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Target Quantity ({item.unit})
                </Label>
                <div className="relative">
                  <Input
                    id="batchQuantity"
                    type="number"
                    step="any"
                    min="0.0001"
                    value={batchQuantity}
                    onChange={(e) => handleBatchQuantityChange(Number(e.target.value))}
                    className="rounded-xl border-gray-200 focus-visible:ring-amber-500 pr-12 font-medium"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                    {item.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-6 col-span-2 sm:col-span-1">
                <Label htmlFor="autoScale" className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Auto-scale quantities
                </Label>
                <Switch
                  id="autoScale"
                  checked={autoScale}
                  onCheckedChange={handleAutoScaleToggle}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>

            <Separator className="bg-gray-100 dark:bg-gray-800" />

            {/* Ingredients Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-amber-500" /> Required Raw Materials
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  Recipe ratio base: {recipeData.recipe.output_quantity} {item.unit}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {editedIngredients.map((ing, idx) => {
                  const isInsufficient = ing.quantity > ing.available_stock;
                  return (
                    <div
                      key={ing.inventory_item_id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                        isInsufficient
                          ? "bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30"
                          : "bg-gray-50/50 dark:bg-gray-800/10 border-gray-100 dark:border-gray-800/50"
                      )}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {ing.name}
                          </span>
                          {isInsufficient && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 rounded-md font-medium">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Stock: {ing.available_stock} {ing.unit}</span>
                          <span>•</span>
                          <span>Cost: {currencySymbol}{ing.cost_per_unit}/{ing.unit}</span>
                        </div>
                      </div>

                      {/* Ingredient Quantity Input */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative w-28">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={ing.quantity}
                            onChange={(e) => handleIngredientQtyChange(idx, Number(e.target.value))}
                            className={cn(
                              "h-8 rounded-lg text-xs font-semibold pr-8 text-right focus-visible:ring-amber-500",
                              isInsufficient && "border-red-300 focus-visible:ring-red-400"
                            )}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-medium">
                            {ing.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cost and Summary */}
            <div className="bg-amber-50/40 dark:bg-amber-950/5 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-amber-600" /> Unit Cost
                </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {currencySymbol}{costPerProducedUnit.toFixed(2)} / {item.unit}
                </span>
              </div>

              {wastageQty > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-gray-400" /> Est. Wastage
                  </span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {wastageQty.toFixed(2)} {item.unit}
                  </span>
                </div>
              )}

              <Separator className="bg-amber-200/30 dark:bg-amber-800/20 my-1" />

              <div className="flex items-center justify-between text-sm font-bold text-amber-900 dark:text-amber-400">
                <span>Total Cost</span>
                <span>{currencySymbol}{totalProductionCost.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                Production Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Batch conditions, helper name, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl border-gray-200 focus-visible:ring-amber-500 text-sm resize-none h-16"
              />
            </div>

            {hasInsufficientStock && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-xl">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-700 dark:text-red-400 font-medium">
                  Cannot produce. One or more raw materials have insufficient stock. Please replenish your inventory.
                </span>
              </div>
            )}

            {/* Footer */}
            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs gap-1.5"
                disabled={isSubmitting || hasInsufficientStock}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Producing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Start Production
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
