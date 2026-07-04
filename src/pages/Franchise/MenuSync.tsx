import React, { useState } from "react";
import { useFranchise } from "@/contexts/FranchiseContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Send, Plus } from "lucide-react";

const originConfig = {
  master: { label: "Master", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  branch: { label: "Branch", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  inherited: { label: "Inherited", className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400" },
};

const MenuSync: React.FC = () => {
  const { currentBranch, menuItems, allBranches } = useFranchise();
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const filtered = menuItems.filter(
    (m) =>
      !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    const next = new Set(selectedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedItems(next);
  };

  const categories = [...new Set(filtered.map((m) => m.category))];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu Sync</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Master menu · Push to branches
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={selectedItems.size === 0}
          >
            <Send className="h-4 w-4" />
            Push Selected ({selectedItems.size})
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white"
          >
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(originConfig).map(([key, val]) => (
          <span key={key} className={cn("text-xs px-2.5 py-1 rounded-full font-medium", val.className)}>
            {val.label}
          </span>
        ))}
        <span className="text-xs text-gray-400 self-center ml-1">— Item origin</span>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search menu items..."
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
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{cat}</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {catItems.map((item) => {
                  const oc = originConfig[item.origin];
                  const selected = selectedItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3.5 transition-colors",
                        selected ? "bg-violet-50 dark:bg-violet-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggle(item.id)}
                        className="w-4 h-4 rounded accent-violet-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{item.name}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", oc.className)}>
                            {oc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {allBranches.filter((b) => item.branches.includes(b.id)).map((b) => (
                            <span
                              key={b.id}
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
                              style={{ background: b.color }}
                            >
                              {b.code}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">₹{item.price}</p>
                        <p className={cn("text-[10px] mt-0.5", item.isAvailable ? "text-emerald-500" : "text-red-400")}>
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MenuSync;
