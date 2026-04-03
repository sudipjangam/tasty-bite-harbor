import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Calculator, Check, AlertTriangle, Save, RefreshCw } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  cost_per_unit: number | null;
  category?: string;
}

const Stocktake = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [actualCounts, setActualCounts] = useState<Record<string, number>>({});

  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ["inventory-stocktake", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!restaurantId,
  });

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(
      (item) =>
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventoryItems, searchQuery]);

  const handleCountChange = (itemId: string, value: string) => {
    const parsed = value === "" ? undefined : parseFloat(value);
    setActualCounts((prev) => {
      const next = { ...prev };
      if (parsed === undefined || isNaN(parsed)) {
        delete next[itemId];
      } else {
        next[itemId] = parsed;
      }
      return next;
    });
  };

  const getDiscrepancy = (item: InventoryItem) => {
    const actual = actualCounts[item.id];
    if (actual === undefined) return null;
    return actual - item.quantity;
  };

  const processAdjustmentsMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) return;

      const adjustmentsToMake = inventoryItems
        .filter((item) => actualCounts[item.id] !== undefined && actualCounts[item.id] !== item.quantity)
        .map((item) => ({
          item,
          diff: actualCounts[item.id] - item.quantity,
          actual: actualCounts[item.id],
        }));

      for (const { item, diff, actual } of adjustmentsToMake) {
        if (diff > 0) {
          // Positive discrepancy: "Found" stock -> Creates a new lot
          const unitCost = item.cost_per_unit || 0;
          const { data: lotData, error: lotError } = await supabase
            .from("inventory_lots")
            .insert({
              restaurant_id: restaurantId,
              inventory_item_id: item.id,
              quantity_purchased: diff,
              quantity_remaining: diff,
              unit_cost: unitCost,
              lot_number: 'ADJ-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
              notes: "Stocktake Positive Adjustment"
            })
            .select()
            .single();

          if (lotError) throw lotError;

          // Transaction
          await supabase.from("inventory_transactions").insert({
            restaurant_id: restaurantId,
            inventory_item_id: item.id,
            transaction_type: "adjustment",
            quantity_change: diff,
            unit_cost_at_time: unitCost,
            total_cost: diff * unitCost,
            lot_id: lotData.id,
            notes: "Stocktake Audit Add"
          });
          
          await supabase.from("inventory_items").update({ quantity: actual }).eq("id", item.id);
        } else if (diff < 0) {
          // Negative discrepancy: "Lost" stock -> Deplete FIFO
          let remainingToDeduct = Math.abs(diff);

          const { data: activeLots } = await supabase
            .from("inventory_lots")
            .select("*")
            .eq("inventory_item_id", item.id)
            .gt("quantity_remaining", 0)
            .order("purchase_date", { ascending: true });

          let totalCost = 0;

          if (activeLots) {
            for (const lot of activeLots) {
              if (remainingToDeduct <= 0) break;
              const consume = Math.min(remainingToDeduct, lot.quantity_remaining);
              const lotCost = consume * (lot.unit_cost || 0);

              await supabase.from("inventory_lots").update({ 
                quantity_remaining: lot.quantity_remaining - consume 
              }).eq("id", lot.id);

              await supabase.from("inventory_transactions").insert({
                restaurant_id: restaurantId,
                inventory_item_id: item.id,
                transaction_type: "adjustment",
                quantity_change: -consume,
                unit_cost_at_time: lot.unit_cost || 0,
                total_cost: lotCost,
                lot_id: lot.id,
                notes: "Stocktake Audit Waste/Loss"
              });

              totalCost += lotCost;
              remainingToDeduct -= consume;
            }
          }

          if (remainingToDeduct > 0) {
            const fallbackCost = remainingToDeduct * (item.cost_per_unit || 0);
            await supabase.from("inventory_transactions").insert({
              restaurant_id: restaurantId,
              inventory_item_id: item.id,
              transaction_type: "adjustment",
              quantity_change: -remainingToDeduct,
              unit_cost_at_time: item.cost_per_unit || 0,
              total_cost: fallbackCost,
              notes: "Stocktake Audit Waste/Loss (Fallback)"
            });
          }

          await supabase.from("inventory_items").update({ quantity: actual }).eq("id", item.id);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Stocktake Processed", description: "All inventory adjustments applied successfully." });
      setActualCounts({}); // clear counts
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stocktake"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-lots"] });
    },
    onError: (error) => {
      console.error(error);
      toast({ title: "Failed to process stocktake", description: error.message, variant: "destructive" });
    }
  });

  const discrepanciesCount = inventoryItems.filter(i => actualCounts[i.id] !== undefined && actualCounts[i.id] !== i.quantity).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-500" />
            Physical Stocktake Audit
          </h2>
          <p className="text-sm text-gray-500">Reconcile physical inventory with system quantities</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-gray-800"
            />
          </div>
          <Button 
            onClick={() => processAdjustmentsMutation.mutate()} 
            disabled={discrepanciesCount === 0 || processAdjustmentsMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
          >
            {processAdjustmentsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Process Adjustments ({discrepanciesCount})
          </Button>
        </div>
      </div>

      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-xl border-gray-100 dark:border-gray-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/80 dark:bg-gray-700/50">
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>System Qty</TableHead>
                <TableHead className="w-48">Actual Qty</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No items found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map(item => {
                  const variance = getDiscrepancy(item);
                  const isModified = variance !== null;
                  
                  return (
                    <TableRow key={item.id} className={isModified ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell>{item.category || 'Other'}</TableCell>
                      <TableCell>
                        <span className="font-medium">{item.quantity}</span> <span className="text-gray-500 text-xs">{item.unit}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={actualCounts[item.id] === undefined ? "" : actualCounts[item.id]}
                            onChange={e => handleCountChange(item.id, e.target.value)}
                            placeholder={item.quantity.toString()}
                            className={`h-9 ${isModified ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'bg-transparent'}`}
                          />
                          <span className="text-gray-500 text-xs w-6">{item.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isModified ? (
                          <span className={`font-medium ${variance === 0 ? 'text-gray-500' : variance! > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {variance! > 0 ? '+' : ''}{variance?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isModified || variance === 0 ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Match</Badge>
                        ) : variance! > 0 ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">Surplus Found</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200">Loss / Missing</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
    </div>
  );
};

export default Stocktake;
