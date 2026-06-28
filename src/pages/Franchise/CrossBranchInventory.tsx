import React, { useState } from "react";
import { MOCK_INVENTORY, MOCK_BRANCHES } from "@/data/franchiseMockData";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, ArrowRightLeft, ShoppingBag, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  ok: { label: "OK", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  low: { label: "Low", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const CrossBranchInventory: React.FC = () => {
  const { currentBranch } = useFranchise();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"levels" | "transfer" | "bulk">("levels");
  const [branchFilter, setBranchFilter] = useState("all");

  // Transfer state
  const [transSource, setTransSource] = useState("branch-1");
  const [transDest, setTransDest] = useState("branch-2");
  const [transItem, setTransItem] = useState("inv2"); // Chicken
  const [transQty, setTransQty] = useState(5);

  // Bulk Purchase state
  const [bulkItem, setBulkItem] = useState("Basmati Rice");
  const [bulkQty, setBulkQty] = useState(100);
  const [bulkDistMode, setBulkDistMode] = useState("equal");

  const filtered = MOCK_INVENTORY.filter((i) =>
    currentBranch ? i.branchId === currentBranch.id : branchFilter === "all" || i.branchId === branchFilter
  );

  const critical = filtered.filter((i) => i.status === "critical").length;
  const low = filtered.filter((i) => i.status === "low").length;

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transSource === transDest) {
      toast({ title: "Error", description: "Source and destination cannot be same", variant: "destructive" });
      return;
    }
    const item = MOCK_INVENTORY.find(i => i.id === transItem);
    const srcB = MOCK_BRANCHES.find(b => b.id === transSource);
    const destB = MOCK_BRANCHES.find(b => b.id === transDest);
    toast({
      title: "Transfer Initiated",
      description: `Moving ${transQty} ${item?.unit || "units"} of ${item?.name} from ${srcB?.name} to ${destB?.name}.`,
    });
  };

  const handleBulkPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Bulk Order Placed",
      description: `Ordered ${bulkQty}kg of ${bulkItem}. Allocation strategy: ${bulkDistMode}.`,
    });
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
              {MOCK_BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                    const branch = MOCK_BRANCHES.find((b) => b.id === item.branchId);
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
                  {MOCK_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Destination Branch</label>
                <select
                  value={transDest}
                  onChange={(e) => setTransDest(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                >
                  {MOCK_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                {MOCK_INVENTORY.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} in {i.branchName})</option>)}
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

            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              Execute Transfer
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

            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              Place Bulk Purchase Order
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CrossBranchInventory;
