import React, { useState, useEffect } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, ArrowRightLeft, ShoppingBag, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const statusConfig = {
  ok: { label: "OK", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  low: { label: "Low", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const CrossBranchInventory: React.FC = () => {
  const { currentBranch, allBranches, inventory, demoMode, refetch } = useFranchise();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"levels" | "transfer" | "bulk">("levels");
  const [branchFilter, setBranchFilter] = useState("all");

  // Transfer state
  const [transSource, setTransSource] = useState("");
  const [transDest, setTransDest] = useState("");
  const [transItem, setTransItem] = useState("");
  const [transQty, setTransQty] = useState(5);
  const [isTransferring, setIsTransferring] = useState(false);

  // Bulk Purchase state
  const [bulkItem, setBulkItem] = useState("Basmati Rice");
  const [bulkQty, setBulkQty] = useState(100);
  const [bulkDistMode, setBulkDistMode] = useState("equal");
  const [isBulkOrdering, setIsBulkOrdering] = useState(false);

  // Initialize dropdown defaults from real branch/inventory data
  useEffect(() => {
    if (allBranches.length > 0) {
      if (!transSource || !allBranches.some((b) => b.id === transSource)) {
        setTransSource(allBranches[0].id);
        const second = allBranches.length > 1 ? allBranches[1].id : allBranches[0].id;
        setTransDest(second);
      }
    }
  }, [allBranches, transSource]);

  const sourceItems = inventory.filter((i) => !transSource || i.branchId === transSource);

  useEffect(() => {
    if (sourceItems.length > 0) {
      if (!transItem || !sourceItems.some((i) => i.id === transItem)) {
        setTransItem(sourceItems[0].id);
      }
    } else {
      setTransItem("");
    }
  }, [sourceItems, transItem]);

  const filtered = inventory.filter((i) =>
    currentBranch ? i.branchId === currentBranch.id : branchFilter === "all" || i.branchId === branchFilter
  );

  const critical = filtered.filter((i) => i.status === "critical").length;
  const low = filtered.filter((i) => i.status === "low").length;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transSource === transDest) {
      toast({ title: "Error", description: "Source and destination branch cannot be the same.", variant: "destructive" });
      return;
    }
    const item = inventory.find((i) => i.id === transItem);
    if (!item) {
      toast({ title: "Error", description: "Please select an inventory item to transfer.", variant: "destructive" });
      return;
    }
    if (item.quantity < transQty) {
      toast({
        title: "Insufficient Stock",
        description: `Source branch only has ${item.quantity} ${item.unit} available (requested: ${transQty}).`,
        variant: "destructive",
      });
      return;
    }

    const srcB = allBranches.find((b) => b.id === transSource);
    const destB = allBranches.find((b) => b.id === transDest);

    setIsTransferring(true);
    try {
      if (!demoMode) {
        // 1. Deduct from source branch
        const remainingQty = Math.max(0, item.quantity - transQty);
        const { error: srcErr } = await supabase
          .from("inventory_items")
          .update({ quantity: remainingQty })
          .eq("id", item.id);

        if (srcErr) throw srcErr;

        // 2. Audit log transfer out
        await supabase.from("inventory_transactions").insert({
          restaurant_id: transSource,
          inventory_item_id: item.id,
          transaction_type: "transfer",
          quantity_change: -transQty,
          notes: `Branch Transfer to ${destB?.name || "Branch"}`,
        });

        // 3. Find or insert matching item in destination branch
        const { data: existingDestItem } = await supabase
          .from("inventory_items")
          .select("id, quantity, pricing_unit")
          .eq("restaurant_id", transDest)
          .ilike("name", item.name)
          .maybeSingle();

        let destItemId = existingDestItem?.id;
        let convertedQty = transQty;
        const srcUnit = (item.unit || "").toLowerCase();
        const destUnit = (existingDestItem?.pricing_unit || item.unit || "").toLowerCase();

        // Convert between standard units if mismatched
        if (srcUnit === "kg" && (destUnit === "g" || destUnit === "gm" || destUnit === "grams")) {
          convertedQty = transQty * 1000;
        } else if ((srcUnit === "g" || srcUnit === "gm" || srcUnit === "grams") && destUnit === "kg") {
          convertedQty = transQty / 1000;
        } else if (srcUnit === "l" && (destUnit === "ml" || destUnit === "milliliters")) {
          convertedQty = transQty * 1000;
        } else if (srcUnit === "ml" && destUnit === "l") {
          convertedQty = transQty / 1000;
        }

        try {
          if (existingDestItem) {
            const newDestQty = Number(existingDestItem.quantity || 0) + convertedQty;
            const { error: destErr } = await supabase
              .from("inventory_items")
              .update({ quantity: newDestQty })
              .eq("id", destItemId);
            if (destErr) throw destErr;
          } else {
            const { data: inserted, error: insertErr } = await supabase
              .from("inventory_items")
              .insert({
                restaurant_id: transDest,
                name: item.name,
                category: item.category || "General",
                quantity: convertedQty,
                pricing_unit: item.unit || "kg",
                reorder_level: item.reorderLevel || 10,
              })
              .select("id")
              .single();
            if (insertErr) throw insertErr;
            destItemId = inserted?.id;
          }
        } catch (targetErr) {
          // Rollback source item deduction on destination failure
          await supabase
            .from("inventory_items")
            .update({ quantity: item.quantity })
            .eq("id", item.id);
          throw targetErr;
        }

        // 4. Audit log transfer in
        if (destItemId) {
          await supabase.from("inventory_transactions").insert({
            restaurant_id: transDest,
            inventory_item_id: destItemId,
            transaction_type: "transfer",
            quantity_change: convertedQty,
            notes: `Branch Transfer from ${srcB?.name || "Branch"} (${convertedQty} ${destUnit})`,
          });
        }

        refetch();
      }

      toast({
        title: "Transfer Completed",
        description: `Successfully moved ${transQty} ${item.unit} of ${item.name} from ${srcB?.name} to ${destB?.name}.`,
      });
    } catch (err: any) {
      console.error("Transfer error:", err);
      toast({
        title: "Transfer Failed",
        description: err.message || "Failed to execute stock transfer.",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleBulkPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allBranches.length === 0) {
      toast({ title: "Error", description: "No branches available to distribute purchase.", variant: "destructive" });
      return;
    }

    setIsBulkOrdering(true);
    try {
      if (!demoMode) {
        // Equal distribution
        const perBranchQty = Math.max(1, Math.round(bulkQty / allBranches.length));

        for (const branch of allBranches) {
          const { data: existing } = await supabase
            .from("inventory_items")
            .select("id, quantity")
            .eq("restaurant_id", branch.id)
            .ilike("name", bulkItem)
            .maybeSingle();

          let itemId = existing?.id;
          if (existing) {
            await supabase
              .from("inventory_items")
              .update({ quantity: Number(existing.quantity || 0) + perBranchQty })
              .eq("id", itemId);
          } else {
            const { data: created } = await supabase
              .from("inventory_items")
              .insert({
                restaurant_id: branch.id,
                name: bulkItem,
                category: "Raw Material",
                quantity: perBranchQty,
                pricing_unit: "kg",
                reorder_level: 10,
              })
              .select("id")
              .single();
            itemId = created?.id;
          }

          if (itemId) {
            await supabase.from("inventory_transactions").insert({
              restaurant_id: branch.id,
              inventory_item_id: itemId,
              transaction_type: "purchase",
              quantity_change: perBranchQty,
              notes: `Central Bulk Purchase (${bulkDistMode})`,
            });
          }
        }
        refetch();
      }

      toast({
        title: "Bulk Order Dispatched",
        description: `Allocated ${bulkQty}kg of ${bulkItem} across ${allBranches.length} branches (${bulkDistMode} split).`,
      });
    } catch (err: any) {
      console.error("Bulk order error:", err);
      toast({
        title: "Bulk Order Failed",
        description: err.message || "Failed to record bulk purchase.",
        variant: "destructive",
      });
    } finally {
      setIsBulkOrdering(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Portal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Central stock, transfers & bulk purchasing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("levels")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "levels"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          Stock Levels
        </button>
        <button
          onClick={() => setActiveTab("transfer")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "transfer"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <ArrowRightLeft className="h-4 w-4" /> Stock Transfer
        </button>
        <button
          onClick={() => setActiveTab("bulk")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5",
            activeTab === "bulk"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
          )}
        >
          <ShoppingBag className="h-4 w-4" /> Central Purchase
        </button>
      </div>

      {/* ── Tab 1: Levels ── */}
      {activeTab === "levels" && (
        <div className="space-y-4">
          {(critical > 0 || low > 0) && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>{critical} critical</strong> and <strong>{low} low</strong> stock items need attention
              </p>
            </div>
          )}

          {!currentBranch && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Branches</option>
              {allBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Branch</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Reorder Level</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map((item) => {
                    const sc = statusConfig[item.status];
                    const branch = allBranches.find((b) => b.id === item.branchId);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</p>
                          <p className="text-xs text-gray-400">{item.category}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: branch?.color }} />
                            <span className="text-xs text-gray-600 dark:text-gray-400">{item.branchName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-800 dark:text-white">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs text-gray-400">
                          {item.reorderLevel} {item.unit}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", sc.className)}>
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Stock Transfer ── */}
      {activeTab === "transfer" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 max-w-xl">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Create Internal Branch Transfer</h2>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Source Branch</label>
                <select
                  value={transSource}
                  onChange={(e) => setTransSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                >
                  {allBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Destination Branch</label>
                <select
                  value={transDest}
                  onChange={(e) => setTransDest(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                >
                  {allBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Item</label>
              <select
                value={transItem}
                onChange={(e) => setTransItem(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              >
                {sourceItems.length === 0 && <option value="">No items found in source branch</option>}
                {sourceItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Quantity to Move</label>
              <input
                type="number"
                min={1}
                value={transQty}
                onChange={(e) => setTransQty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={isTransferring || sourceItems.length === 0}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-center gap-2"
            >
              {isTransferring && <Loader2 className="h-4 w-4 animate-spin" />}
              {isTransferring ? "Executing Transfer..." : "Execute Transfer"}
            </Button>
          </form>
        </div>
      )}

      {/* ── Tab 3: Central Purchase ── */}
      {activeTab === "bulk" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 max-w-xl">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Bulk Central Purchasing</h2>
          <form onSubmit={handleBulkPurchase} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Material Item</label>
              <select
                value={bulkItem}
                onChange={(e) => setBulkItem(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              >
                <option>Basmati Rice</option>
                <option>Chicken</option>
                <option>Tomatoes</option>
                <option>Paneer</option>
                <option>Cooking Oil</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Total Order Quantity</label>
              <input
                type="number"
                min={10}
                value={bulkQty}
                onChange={(e) => setBulkQty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Allocation Policy</label>
              <div className="space-y-2">
                {[
                  { value: "equal", label: "Split Equally", desc: "Divide total order volume evenly among all branches" },
                  { value: "need", label: "Need Based", desc: "Distribute based on current branch low-stock signals" },
                  { value: "sales", label: "Sales Proportional", desc: "Allocate proportion matching historical revenue shares" },
                ].map(p => (
                  <label
                    key={p.value}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                      bulkDistMode === p.value
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                    )}
                  >
                    <input
                      type="radio"
                      name="dist"
                      value={p.value}
                      checked={bulkDistMode === p.value}
                      onChange={() => setBulkDistMode(p.value)}
                      className="mt-0.5 accent-violet-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.label}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isBulkOrdering}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white flex items-center justify-center gap-2"
            >
              {isBulkOrdering && <Loader2 className="h-4 w-4 animate-spin" />}
              {isBulkOrdering ? "Placing Order..." : "Place Bulk Purchase Order"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CrossBranchInventory;
