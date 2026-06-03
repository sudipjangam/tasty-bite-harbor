import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Layers,
  IndianRupee,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit,
  Calendar,
  Plus,
  Hammer,
} from "lucide-react";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { format, isPast, differenceInDays } from "date-fns";
import ProduceMoreDialog from "./ProduceMoreDialog";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  reorder_level: number | null;
  cost_per_unit: number | null;
  restaurant_id: string;
  category: string;
  is_produced?: boolean;
}

interface Lot {
  id: string;
  purchase_date: string;
  quantity_purchased: number;
  quantity_remaining: number;
  unit_cost: number;
  lot_number: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

interface InventoryItemDetailProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onAddStock: (item: InventoryItem) => void;
}

const InventoryItemDetail: React.FC<InventoryItemDetailProps> = ({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAddStock,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();
  const [produceMoreOpen, setProduceMoreOpen] = useState(false);

  const handleProductionComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    if (item?.id) {
      queryClient.invalidateQueries({ queryKey: ["item-lots-detail", item.id] });
      queryClient.invalidateQueries({ queryKey: ["production-logs", item.id] });
    }
  };

  const { data: lots = [], isLoading } = useQuery({
    queryKey: ["item-lots-detail", item?.id],
    queryFn: async () => {
      if (!item) return [];
      const { data, error } = await supabase
        .from("inventory_lots")
        .select("*")
        .eq("inventory_item_id", item.id)
        .order("purchase_date", { ascending: true });
      if (error) throw error;
      return data as Lot[];
    },
    enabled: !!item && open,
  });

  const { data: productionLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["production-logs", item?.id],
    queryFn: async () => {
      if (!item || !item.is_produced) return [];
      const { data, error } = await supabase
        .from("homemade_production_logs")
        .select("*")
        .eq("output_inventory_item_id", item.id)
        .order("produced_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!item && open && !!item.is_produced,
  });

  // FIFO Costing Calculations
  const fifoSummary = useMemo(() => {
    if (!lots.length) return { reportedExpense: 0, remainingValue: 0, effectiveRate: 0, totalUsed: 0, totalRemaining: 0 };

    let totalUsedQty = 0;
    let totalUsedCost = 0;
    let totalRemainingQty = 0;
    let totalRemainingValue = 0;

    lots.forEach((lot) => {
      const used = lot.quantity_purchased - lot.quantity_remaining;
      totalUsedQty += used;
      totalUsedCost += used * lot.unit_cost;
      totalRemainingQty += lot.quantity_remaining;
      totalRemainingValue += lot.quantity_remaining * lot.unit_cost;
    });

    return {
      reportedExpense: totalUsedCost,
      remainingValue: totalRemainingValue,
      effectiveRate: totalUsedQty > 0 ? totalUsedCost / totalUsedQty : 0,
      totalUsed: totalUsedQty,
      totalRemaining: totalRemainingQty,
    };
  }, [lots]);

  const activeLots = lots.filter((l) => l.quantity_remaining > 0);
  const depletedLots = lots.filter((l) => l.quantity_remaining <= 0);

  const getLotStatus = (lot: Lot) => {
    if (lot.quantity_remaining <= 0) return { label: "Depleted", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400", icon: CheckCircle2 };
    if (lot.expiry_date && isPast(new Date(lot.expiry_date))) return { label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: Trash2 };
    if (lot.expiry_date && differenceInDays(new Date(lot.expiry_date), new Date()) <= 7) return { label: "Expiring Soon", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock };
    return { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 };
  };

  if (!item) return null;

  const isLow = item.reorder_level != null && item.quantity <= item.reorder_level;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] bg-background text-foreground backdrop-blur-2xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 bg-gradient-to-r ${isLow ? "from-red-500 to-rose-600" : "from-emerald-500 to-green-600"}`}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <Package className="h-6 w-6" />
              {item.name}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-sm flex items-center gap-2 mt-1">
              <Badge variant="outline" className="border-white/40 text-white text-xs">{item.category}</Badge>
              <span>·</span>
              <span>{item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 2)} {item.unit} in stock</span>
              {isLow && (
                <>
                  <span>·</span>
                  <Badge variant="destructive" className="bg-white/20 text-white text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock
                  </Badge>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 px-6 pt-4 pb-2">
            <Button
              size="sm"
              onClick={() => { onOpenChange(false); onAddStock(item); }}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl shadow-md text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Stock
            </Button>
            {item.is_produced && (
              <Button
                size="sm"
                onClick={() => setProduceMoreOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-md text-xs"
              >
                <Hammer className="h-3.5 w-3.5 mr-1.5" /> Produce More
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onOpenChange(false); onEdit(item); }}
              className="rounded-xl text-xs"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit Item
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onOpenChange(false); onDelete(item); }}
              className="rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </div>

          {/* FIFO Summary Cards */}
          <div className="grid grid-cols-3 gap-3 px-6 py-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/40 rounded-xl p-3.5">
              <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Reported Expense</p>
              <p className="text-lg font-extrabold text-blue-800 dark:text-blue-200">
                {currencySymbol}{fifoSummary.reportedExpense.toFixed(2)}
              </p>
              <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                {fifoSummary.totalUsed.toFixed(2)} {item.unit} used
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-100 dark:border-emerald-800/40 rounded-xl p-3.5">
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Remaining Value</p>
              <p className="text-lg font-extrabold text-emerald-800 dark:text-emerald-200">
                {currencySymbol}{fifoSummary.remainingValue.toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-0.5">
                {fifoSummary.totalRemaining.toFixed(2)} {item.unit} in stock
              </p>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-100 dark:border-violet-800/40 rounded-xl p-3.5">
              <p className="text-[11px] font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Effective Rate</p>
              <p className="text-lg font-extrabold text-violet-800 dark:text-violet-200">
                {currencySymbol}{fifoSummary.effectiveRate.toFixed(2)}/{item.unit}
              </p>
              <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5">
                FIFO weighted avg
              </p>
            </div>
          </div>

          {/* FIFO Explanation */}
          <div className="mx-6 mb-3 p-3 bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30 rounded-xl">
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>FIFO Costing:</strong> Most accurate for perishables like restaurant ingredients. Matches actual physical usage. Older stock is used first — newer batches retain their own cost until consumed.
            </p>
          </div>

          {/* Active Lots Table */}
          {activeLots.length > 0 && (
            <div className="px-6 pb-2">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" />
                Active Batches ({activeLots.length})
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 dark:bg-gray-700/50">
                      <TableHead className="text-xs font-bold py-2.5">Lot / Date</TableHead>
                      <TableHead className="text-xs font-bold py-2.5 text-right">Rate</TableHead>
                      <TableHead className="text-xs font-bold py-2.5 text-right">Available</TableHead>
                      <TableHead className="text-xs font-bold py-2.5 text-right">Used</TableHead>
                      <TableHead className="text-xs font-bold py-2.5 text-right">Cost</TableHead>
                      <TableHead className="text-xs font-bold py-2.5">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLots.map((lot, idx) => {
                      const usedQty = lot.quantity_purchased - lot.quantity_remaining;
                      const usedCost = usedQty * lot.unit_cost;
                      const status = getLotStatus(lot);
                      const StatusIcon = status.icon;
                      const usagePct = lot.quantity_purchased > 0 ? (lot.quantity_remaining / lot.quantity_purchased) * 100 : 0;

                      return (
                        <TableRow key={lot.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                          <TableCell className="py-2.5">
                            <div>
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                {lot.lot_number || `Batch ${idx + 1}`}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="h-2.5 w-2.5" />
                                {format(new Date(lot.purchase_date), "dd MMM yyyy")}
                              </p>
                              {lot.expiry_date && (
                                <p className={`text-[10px] mt-0.5 ${isPast(new Date(lot.expiry_date)) ? "text-red-500" : "text-gray-400"}`}>
                                  Exp: {format(new Date(lot.expiry_date), "dd MMM yyyy")}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                              {currencySymbol}{lot.unit_cost.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <div>
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {lot.quantity_remaining.toFixed(2)} {item.unit}
                              </span>
                              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mt-1 ml-auto">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, usagePct)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {usedQty > 0 ? `${usedQty.toFixed(2)} ${item.unit}` : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {currencySymbol}{(lot.quantity_remaining * lot.unit_cost).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge variant="outline" className={`text-[10px] h-5 ${status.color} border-0`}>
                              <StatusIcon className="h-2.5 w-2.5 mr-1" />
                              {status.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Depleted / Used Lots */}
          {depletedLots.length > 0 && (
            <div className="px-6 pb-4 pt-2">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-400" />
                Fully Used Batches ({depletedLots.length})
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 dark:bg-gray-700/50">
                      <TableHead className="text-xs font-bold py-2">Lot / Date</TableHead>
                      <TableHead className="text-xs font-bold py-2 text-right">Rate</TableHead>
                      <TableHead className="text-xs font-bold py-2 text-right">Total Purchased</TableHead>
                      <TableHead className="text-xs font-bold py-2 text-right">Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depletedLots.map((lot, idx) => (
                      <TableRow key={lot.id} className="opacity-60">
                        <TableCell className="py-2">
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {lot.lot_number || `Batch ${activeLots.length + idx + 1}`}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {format(new Date(lot.purchase_date), "dd MMM yyyy")}
                          </p>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <span className="text-xs text-gray-500">{currencySymbol}{lot.unit_cost.toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <span className="text-xs text-gray-500">{lot.quantity_purchased.toFixed(2)} {item.unit}</span>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <span className="text-xs text-gray-500">{currencySymbol}{(lot.quantity_purchased * lot.unit_cost).toFixed(2)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* No Lots State */}
          {lots.length === 0 && !isLoading && (
            <div className="text-center py-10 px-6">
              <Layers className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">No batch/lot records found</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Add stock to this item to start tracking FIFO batches
              </p>
              <Button
                size="sm"
                onClick={() => { onOpenChange(false); onAddStock(item); }}
                className="mt-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add First Batch
              </Button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-500" />
              <p className="text-sm text-gray-500">Loading batch data...</p>
            </div>
          )}

          {/* Production History */}
          {item.is_produced && productionLogs.length > 0 && (
            <div className="px-6 pb-4 pt-2">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-150 mb-2 flex items-center gap-2">
                <Hammer className="h-4 w-4 text-amber-500" />
                Production History ({productionLogs.length})
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 dark:bg-gray-700/50">
                      <TableHead className="text-xs font-bold py-2">Produced At</TableHead>
                      <TableHead className="text-xs font-bold py-2 text-right">Quantity</TableHead>
                      <TableHead className="text-xs font-bold py-2 text-right">Unit Cost</TableHead>
                      <TableHead className="text-xs font-bold py-2 text-right">Total Cost</TableHead>
                      <TableHead className="text-xs font-bold py-2">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="py-2 text-xs text-gray-600 dark:text-gray-400">
                          {log.produced_at ? format(new Date(log.produced_at), "dd MMM yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell className="text-right py-2 text-xs font-semibold">
                          {log.output_quantity} {log.output_unit}
                        </TableCell>
                        <TableCell className="text-right py-2 text-xs text-gray-500">
                          {currencySymbol}{log.cost_per_unit?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right py-2 text-xs text-gray-500 font-medium">
                          {currencySymbol}{log.total_cost?.toFixed(2)}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-gray-500 max-w-[150px] truncate" title={log.notes || ""}>
                          {log.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Item Details Footer */}
          <div className="px-6 py-3 bg-gray-50/80 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 dark:text-gray-400">
              {item.cost_per_unit != null && (
                <span>Last Cost: <strong className="text-gray-700 dark:text-gray-300">{currencySymbol}{item.cost_per_unit}/{item.unit}</strong></span>
              )}
              {item.reorder_level != null && (
                <span>Reorder Level: <strong className="text-gray-700 dark:text-gray-300">{item.reorder_level} {item.unit}</strong></span>
              )}
              <span>Total Batches: <strong className="text-gray-700 dark:text-gray-300">{lots.length}</strong></span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ProduceMoreDialog
      item={item}
      open={produceMoreOpen}
      onOpenChange={setProduceMoreOpen}
      onProductionComplete={handleProductionComplete}
    />
    </>
  );
};

export default InventoryItemDetail;
