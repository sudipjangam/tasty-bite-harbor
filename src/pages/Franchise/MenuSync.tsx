import React, { useState } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Send, Plus, Save, Trash2, AlertTriangle, Layers, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

const originConfig = {
  master: { label: "Master", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  branch: { label: "Branch", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  inherited: { label: "Inherited", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  orphaned: { label: "Orphaned", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const CATEGORIES = ["Main Course", "Starters", "Beverages", "Desserts", "Breads", "Combos", "General"];

const MenuSync: React.FC = () => {
  const { menuItems, allBranches, addMasterMenuItem, pushMenuItemsToBranches, deleteMasterMenuItem } = useFranchise();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Dialog controls
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPushOpen, setIsPushOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Form states - Add Master Item
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Main Course");
  const [formPrice, setFormPrice] = useState<number>(150);
  const [formMinPrice, setFormMinPrice] = useState<number | undefined>(undefined);
  const [formMaxPrice, setFormMaxPrice] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  // Form states - Push to branches
  const [targetBranches, setTargetBranches] = useState<string[]>([]);
  const [allBranchesSelected, setAllBranchesSelected] = useState(true);

  const filtered = menuItems.filter(
    (m) =>
      !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedItems(next);
  };

  const handleOpenAdd = () => {
    setFormName("");
    setFormCategory("Main Course");
    setFormPrice(150);
    setFormMinPrice(undefined);
    setFormMaxPrice(undefined);
    setIsAddOpen(true);
  };

  const handleOpenPush = () => {
    if (selectedItems.size === 0) return;
    setTargetBranches(allBranches.map(b => b.id));
    setAllBranchesSelected(true);
    setIsPushOpen(true);
  };

  const handleOpenDelete = (item: any) => {
    setItemToDelete(item);
    setIsDeleteOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice <= 0) {
      toast({ title: "Error", description: "Valid name and positive price required.", variant: "destructive" });
      return;
    }

    if (formMinPrice && formMaxPrice && formMinPrice > formMaxPrice) {
      toast({ title: "Price Error", description: "Minimum price cannot be greater than maximum price.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const success = await addMasterMenuItem({
      name: formName,
      category: formCategory,
      price: Number(formPrice),
      minPriceOverride: formMinPrice,
      maxPriceOverride: formMaxPrice
    });
    setIsSaving(false);

    if (success) {
      toast({ title: "✨ Item Created", description: `Added ${formName} to Master Menu with origin 'master'.` });
      setIsAddOpen(false);
    } else {
      toast({ title: "Error", description: "Failed to create master menu item.", variant: "destructive" });
    }
  };

  const handlePushSubmit = async () => {
    const branchIds = allBranchesSelected ? allBranches.map(b => b.id) : targetBranches;
    if (branchIds.length === 0) {
      toast({ title: "Error", description: "Select at least one target branch.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const success = await pushMenuItemsToBranches(Array.from(selectedItems), branchIds);
    setIsSaving(false);

    if (success) {
      toast({
        title: "🚀 Menu Synced",
        description: `Pushed ${selectedItems.size} master item(s) to ${branchIds.length} branch(es) with 'inherited' tag.`
      });
      setSelectedItems(new Set());
      setIsPushOpen(false);
    } else {
      toast({ title: "Error", description: "Failed to push menu items to branches.", variant: "destructive" });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!itemToDelete) return;

    setIsSaving(true);
    const success = await deleteMasterMenuItem(itemToDelete.id);
    setIsSaving(false);

    if (success) {
      toast({
        title: "Master Item Deleted",
        description: `Deleted ${itemToDelete.name}. Synced branch items marked as 'Orphaned'.`
      });
      setIsDeleteOpen(false);
      setItemToDelete(null);
    } else {
      toast({ title: "Error", description: "Failed to delete master item.", variant: "destructive" });
    }
  };

  const handleUpdatePriceOverride = (itemId: string, newPrice: number) => {
    const item = menuItems.find(m => m.id === itemId);
    if (!item) return;

    if (item.minPriceOverride && newPrice < item.minPriceOverride) {
      toast({
        title: "Price Limit Rejected",
        description: `Price ₹${newPrice} is below allowed minimum limit ₹${item.minPriceOverride}.`,
        variant: "destructive"
      });
      return;
    }
    if (item.maxPriceOverride && newPrice > item.maxPriceOverride) {
      toast({
        title: "Price Limit Rejected",
        description: `Price ₹${newPrice} is above allowed maximum limit ₹${item.maxPriceOverride}.`,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Price Updated",
      description: `Updated price for ${item.name} to ₹${newPrice}.`
    });
  };

  const categories = [...new Set(filtered.map((m) => m.category))];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Sync</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Master menu catalog · Central distribution & price boundaries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPush}
            disabled={selectedItems.size === 0}
            className="gap-2 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            Push Selected ({selectedItems.size})
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAdd}
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20 hover:scale-[1.02] transition-transform"
          >
            <Plus className="h-4 w-4" /> Add Master Item
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <span className="text-xs text-gray-500 font-semibold mr-1 flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-violet-500" /> Origin Tags:
        </span>
        {Object.entries(originConfig).map(([key, val]) => (
          <span key={key} className={cn("text-xs px-2.5 py-1 rounded-full font-medium", val.className)}>
            {val.label}
          </span>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search menu items by name or category..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />

      {/* Grouped by category */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catItems = filtered.filter((m) => m.category === cat);
          return (
            <div key={cat} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{cat}</h3>
                <span className="text-[11px] text-gray-400 font-medium">{catItems.length} items</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {catItems.map((item) => {
                  const oc = originConfig[item.origin] || originConfig.branch;
                  const selected = selectedItems.has(item.id);
                  const isMaster = item.origin === "master";

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3.5 transition-colors",
                        selected ? "bg-violet-50/70 dark:bg-violet-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded accent-violet-600 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</span>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", oc.className)}>
                            {oc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-gray-400">Pushed to:</span>
                          {allBranches.filter((b) => item.branches.includes(b.id)).map((b) => (
                            <span
                              key={b.id}
                              className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white shadow-sm"
                              style={{ background: b.color }}
                            >
                              {b.code}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Price Limit inputs for Master items */}
                      {isMaster && (
                        <div className="flex items-center gap-2 border-l border-gray-100 dark:border-gray-700 pl-4 shrink-0 hidden sm:flex">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-gray-400 font-semibold uppercase">Min Limit</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {item.minPriceOverride ? `₹${item.minPriceOverride}` : "None"}
                            </span>
                          </div>
                          <div className="flex flex-col ml-2">
                            <span className="text-[9px] text-gray-400 font-semibold uppercase">Max Limit</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {item.maxPriceOverride ? `₹${item.maxPriceOverride}` : "None"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Price & Status */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">₹{item.price}</p>
                        <p className={cn("text-[10px] mt-0.5 font-medium", item.isAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </p>
                      </div>

                      {/* Delete action for master items */}
                      {isMaster && (
                        <button
                          onClick={() => handleOpenDelete(item)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Delete Master Item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── DIALOG 1: ADD MASTER ITEM ─── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Master Menu Item</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Create a new master item to push across all franchise branches.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Special Butter Chicken"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Base Price (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Min Price Limit (₹)</label>
                <input
                  type="number"
                  placeholder="Optional min"
                  value={formMinPrice ?? ""}
                  onChange={(e) => setFormMinPrice(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Max Price Limit (₹)</label>
                <input
                  type="number"
                  placeholder="Optional max"
                  value={formMaxPrice ?? ""}
                  onChange={(e) => setFormMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSaving} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium">
                {isSaving ? "Creating..." : "Create Master Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 2: PUSH TO BRANCHES ─── */}
      <Dialog open={isPushOpen} onOpenChange={setIsPushOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-violet-600" /> Push Items to Branches
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Sync {selectedItems.size} selected item(s) to branch menus with 'inherited' origin tag.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-gray-800 dark:text-gray-200">
              <input
                type="checkbox"
                checked={allBranchesSelected}
                onChange={(e) => setAllBranchesSelected(e.target.checked)}
                className="accent-violet-600 rounded"
              />
              Push to All Active Branches
            </label>

            {!allBranchesSelected && (
              <div className="space-y-2 pl-4">
                <p className="text-xs font-semibold text-gray-500">Target Branches:</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {allBranches.map((branch) => (
                    <label key={branch.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetBranches.includes(branch.id)}
                        onChange={() => {
                          if (targetBranches.includes(branch.id)) {
                            setTargetBranches(targetBranches.filter(id => id !== branch.id));
                          } else {
                            setTargetBranches([...targetBranches, branch.id]);
                          }
                        }}
                        className="accent-violet-600 rounded"
                      />
                      <span className="truncate">{branch.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button onClick={handlePushSubmit} disabled={isSaving} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium">
                {isSaving ? "Syncing..." : `Push to ${allBranchesSelected ? allBranches.length : targetBranches.length} Branch(es)`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DIALOG 3: DELETE MASTER ITEM (MARK ORPHANED) ─── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm p-6 rounded-2xl bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Delete Master Item?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Deleting <strong className="text-gray-800 dark:text-gray-200">{itemToDelete?.name}</strong> will remove it from the master menu catalog.
              All synced branch menu items will be marked as <span className="font-bold text-amber-600">Orphaned</span> for branch review.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 pt-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSubmit}
              disabled={isSaving}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isSaving ? "Deleting..." : "Mark Orphaned & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuSync;
