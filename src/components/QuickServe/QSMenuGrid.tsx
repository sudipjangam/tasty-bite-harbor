import React, { useState, useMemo } from "react";
import { QSRMenuItem, QSRCategory } from "@/hooks/useQSRMenuItems";
import { cn } from "@/lib/utils";
import { Search, Ban, RotateCcw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface QSMenuGridProps {
  menuItems: QSRMenuItem[];
  categories: QSRCategory[];
  isLoading: boolean;
  cartItemCounts: Record<string, number>;
  onAddItem: (item: QSRMenuItem) => void;
  onToggleAvailability?: (params: {
    itemId: string;
    isAvailable: boolean;
  }) => void;
  onRestoreAll?: () => void;
  soldOutCount?: number;
  isToggling?: boolean;
  isRestoring?: boolean;
}

export const QSMenuGrid: React.FC<QSMenuGridProps> = ({
  menuItems,
  categories,
  isLoading,
  cartItemCounts,
  onAddItem,
  onToggleAvailability,
  onRestoreAll,
  soldOutCount = 0,
  isToggling,
  isRestoring,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSoldOut, setShowSoldOut] = useState(false);
  const { symbol: currencySymbol } = useCurrencyContext();

  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Filter by availability
    if (showSoldOut) {
      items = items.filter((item) => !item.is_available);
    } else {
      items = items.filter((item) => item.is_available);
    }

    if (selectedCategory !== "all") {
      items = items.filter(
        (item) =>
          item.category.toLowerCase().replace(/\s+/g, "-") === selectedCategory,
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q),
      );
    }
    return items;
  }, [menuItems, selectedCategory, searchQuery, showSoldOut]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center animate-pulse shadow-lg shadow-orange-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-400 dark:text-white/40">
            Loading menu...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ─── Search Bar + Sold Out Toggle ─── */}
      <div className="px-3 py-2.5 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/30" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/80 dark:bg-white/5 backdrop-blur-sm border-gray-200/60 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 h-10 rounded-2xl text-sm shadow-sm focus:shadow-md focus:border-orange-300 dark:focus:border-orange-500/40 transition-all"
          />
        </div>

        {/* Sold Out Filter Toggle */}
        {soldOutCount > 0 && (
          <button
            onClick={() => setShowSoldOut(!showSoldOut)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95",
              showSoldOut
                ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25"
                : "bg-white/80 dark:bg-white/5 backdrop-blur-sm text-gray-500 dark:text-white/50 border border-gray-200/60 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 shadow-sm",
            )}
          >
            <Ban className="h-3.5 w-3.5" />
            Sold Out ({soldOutCount})
          </button>
        )}

        {/* Restore All Button */}
        {showSoldOut && soldOutCount > 0 && onRestoreAll && (
          <button
            onClick={onRestoreAll}
            disabled={isRestoring}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50"
          >
            <RotateCcw
              className={cn("h-3.5 w-3.5", isRestoring && "animate-spin")}
            />
            {isRestoring ? "..." : "Restore All"}
          </button>
        )}
      </div>

      {/* ─── Category Pills ─── */}
      <div className="px-3 pb-2.5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 active:scale-95",
              selectedCategory === "all"
                ? "bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 border border-white/20"
                : "bg-white/80 dark:bg-white/5 backdrop-blur-sm text-gray-600 dark:text-white/50 border border-gray-200/60 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white/80 shadow-sm",
            )}
          >
            🍽️ All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 active:scale-95",
                selectedCategory === cat.id
                  ? "bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white shadow-lg shadow-orange-500/30 border border-white/20"
                  : "bg-white/80 dark:bg-white/5 backdrop-blur-sm text-gray-600 dark:text-white/50 border border-gray-200/60 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white/80 shadow-sm",
              )}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Menu Items Grid ─── */}
      <div className="flex-1 overflow-y-auto px-3 pb-24 md:pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredItems.map((item) => {
            const cartCount = cartItemCounts[item.id] || 0;
            const isSoldOut = !item.is_available;

            return (
              <div
                key={item.id}
                className={cn(
                  "relative rounded-2xl transition-all duration-200 group",
                  // Glassmorphism base
                  "bg-white/70 dark:bg-white/[0.06] backdrop-blur-sm",
                  // Border & shadow
                  "border border-white/60 dark:border-white/[0.08]",
                  "shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]",
                  // 3D hover lift
                  !isSoldOut &&
                    "hover:shadow-[0_8px_30px_rgba(249,115,22,0.12)] hover:-translate-y-0.5",
                  // In-cart glow
                  !isSoldOut &&
                    cartCount > 0 &&
                    "ring-2 ring-orange-400/60 dark:ring-orange-500/50 shadow-[0_4px_20px_rgba(249,115,22,0.2)] bg-gradient-to-br from-orange-50/80 to-pink-50/50 dark:from-orange-500/10 dark:to-pink-500/5",
                  // Sold out
                  isSoldOut && "opacity-50 grayscale-[30%]",
                )}
              >
                {/* Main clickable area */}
                <button
                  onClick={() => !isSoldOut && onAddItem(item)}
                  disabled={isSoldOut}
                  className={cn(
                    "w-full p-3.5 text-left transition-all duration-150 active:scale-[0.96] rounded-2xl",
                    isSoldOut && "cursor-not-allowed",
                  )}
                >
                  {/* Cart Badge */}
                  {cartCount > 0 && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <div className="relative">
                        <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-orange-500/40 border-2 border-white dark:border-gray-900">
                          {cartCount}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SOLD OUT Badge */}
                  {isSoldOut && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[9px] font-black rounded-lg uppercase tracking-wider shadow-lg shadow-red-500/25">
                        Sold Out
                      </span>
                    </div>
                  )}

                  {/* Veg/Non-Veg indicator */}
                  {item.is_veg !== undefined && (
                    <div className="absolute top-3 right-3">
                      <div
                        className={cn(
                          "w-5 h-5 border-2 rounded flex items-center justify-center",
                          item.is_veg
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
                            : "border-red-500 bg-red-50 dark:bg-red-500/10",
                        )}
                      >
                        <div
                          className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            item.is_veg ? "bg-emerald-500" : "bg-red-500",
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <p
                      className={cn(
                        "text-sm font-semibold line-clamp-2 pr-6 leading-tight",
                        isSoldOut
                          ? "text-gray-400 dark:text-white/30 line-through"
                          : "text-gray-800 dark:text-white/90",
                      )}
                    >
                      {item.name}
                    </p>
                    <p
                      className={cn(
                        "text-lg font-black",
                        isSoldOut
                          ? "text-gray-300 dark:text-white/20"
                          : "bg-gradient-to-r from-orange-600 via-rose-500 to-pink-500 bg-clip-text text-transparent",
                      )}
                    >
                      {currencySymbol}
                      {item.price}
                    </p>
                  </div>
                </button>

                {/* Toggle Availability Button */}
                {onToggleAvailability && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAvailability({
                        itemId: item.id,
                        isAvailable: !item.is_available,
                      });
                    }}
                    disabled={isToggling}
                    className={cn(
                      "w-full py-1.5 text-[10px] font-semibold rounded-b-2xl transition-all border-t",
                      isSoldOut
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-transparent text-red-400/50 dark:text-red-400/30 border-gray-100/50 dark:border-white/5 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100",
                    )}
                  >
                    {isSoldOut ? "↩ Mark Available" : "✕ Mark Sold Out"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-white/30">
            {showSoldOut ? (
              <>
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center mb-4 shadow-inner">
                  <Ban className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-sm font-medium">No sold-out items</p>
                <button
                  onClick={() => setShowSoldOut(false)}
                  className="mt-3 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  ← Back to menu
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center mb-4 shadow-inner">
                  <Search className="h-7 w-7 opacity-40" />
                </div>
                <p className="text-sm font-medium">No items found</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
