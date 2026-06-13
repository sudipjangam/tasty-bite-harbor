import React from "react";
import { Package, Edit, Trash2, AlertTriangle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InventoryItem } from "@/hooks/useInventoryData";

interface InventoryGridProps {
  paginatedItems: InventoryItem[];
  currencySymbol: string;
  getCategoryIcon: (category: string) => React.ReactElement;
  getStockLevel: (item: InventoryItem) => { pct: number; color: string };
  setSelectedDetailItem: (item: InventoryItem) => void;
  setEditingItem: (item: InventoryItem) => void;
  setIsAddDialogOpen: (open: boolean) => void;
  setItemToDelete: (item: InventoryItem) => void;
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({
  paginatedItems,
  currencySymbol,
  getCategoryIcon,
  getStockLevel,
  setSelectedDetailItem,
  setEditingItem,
  setIsAddDialogOpen,
  setItemToDelete,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5">
      {paginatedItems.map((item) => {
        const stock = getStockLevel(item);
        const isLow =
          item.reorder_level != null && item.quantity <= item.reorder_level;
        return (
          <div
            key={item.id}
            onClick={() => setSelectedDetailItem(item)}
            className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer ${
              isLow
                ? "bg-gradient-to-br from-red-50/60 to-rose-50/40 dark:from-red-950/20 dark:to-rose-950/15 border-red-300/40 dark:border-red-700/30 shadow-lg shadow-red-500/[0.08] hover:shadow-red-500/20"
                : "bg-white/50 dark:bg-white/[0.04] backdrop-blur-xl border-white/40 dark:border-white/[0.06] hover:border-emerald-300/50 dark:hover:border-emerald-600/30 hover:shadow-emerald-500/10"
            }`}
          >
            {/* Top accent bar — gradient with glow */}
            <div
              className={`h-1 w-full bg-gradient-to-r ${
                isLow
                  ? "from-red-400 via-rose-500 to-pink-500"
                  : "from-emerald-400 via-green-400 to-teal-400"
              }`}
            />
            {/* Subtle gradient overlay */}
            <div
              className={`absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 bg-gradient-to-br ${
                isLow
                  ? "from-rose-500 to-pink-500"
                  : "from-emerald-500 to-teal-500"
              }`}
            />

            <div className="relative p-4 md:p-5">
              {/* Header: 3D Icon + Name + Actions */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* 3D Icon Sphere */}
                  <div
                    className={`p-2.5 rounded-2xl shrink-0 shadow-md transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${
                      isLow
                        ? "bg-gradient-to-br from-red-400 to-rose-500 shadow-red-500/30"
                        : "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30"
                    }`}
                    style={{
                      boxShadow:
                        "inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.1)",
                    }}
                  >
                    {React.cloneElement(getCategoryIcon(item.category), {
                      className: "h-5 w-5 text-white drop-shadow-sm",
                    })}
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-tight truncate"
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                      {item.category}
                      {(item as any).is_produced && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-bold shadow-sm">
                          🏠 Made
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Desktop actions */}
                <div className="hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingItem(item);
                      setIsAddDialogOpen(true);
                    }}
                    className="h-8 w-8 rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-sm border border-white/40 dark:border-white/[0.08] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shadow-sm"
                  >
                    <Edit className="h-3.5 w-3.5 text-emerald-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item);
                    }}
                    className="h-8 w-8 rounded-xl bg-white/60 dark:bg-white/[0.06] backdrop-blur-sm border border-white/40 dark:border-white/[0.08] hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>

                {/* Mobile menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8 rounded-xl bg-white/40 dark:bg-white/[0.04] shrink-0"
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-36 rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/40 dark:border-white/[0.06]"
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                        setIsAddDialogOpen(true);
                      }}
                      className="rounded-xl"
                    >
                      <Edit className="h-3.5 w-3.5 mr-2 text-emerald-600" />{" "}
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                      }}
                      className="text-red-600 focus:text-red-600 rounded-xl"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Quantity Display — Large + Bold */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
                    {Number(item.quantity).toFixed(
                      item.quantity % 1 === 0 ? 0 : 2,
                    )}
                  </span>
                  <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {item.unit}
                  </span>
                </div>

                {/* Animated stock level progress bar */}
                {item.reorder_level != null && item.reorder_level > 0 && (
                  <div className="mt-3">
                    <div className="h-2 w-full bg-gray-100/80 dark:bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                          stock.color === "red"
                            ? "from-red-400 via-rose-500 to-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                            : stock.color === "amber"
                              ? "from-amber-400 via-orange-500 to-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                              : "from-emerald-400 via-green-400 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                        }`}
                        style={{ width: `${stock.pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Low Stock Badge — Vibrant with glow */}
              {isLow && (
                <Badge className="text-[10px] font-bold px-2.5 py-1 rounded-xl mb-3 bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-md shadow-red-500/25 animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock
                </Badge>
              )}

              {/* Footer: Price + Reorder — Glassmorphic */}
              <div className="flex items-center justify-between pt-3 border-t border-white/20 dark:border-white/[0.04]">
                <span className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {item.cost_per_unit
                    ? `${currencySymbol}${item.cost_per_unit}/${item.unit}`
                    : "—"}
                </span>
                {item.reorder_level != null && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    Reorder: {item.reorder_level} {item.unit}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
