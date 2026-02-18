import React, { useState, useMemo } from "react";
import { QSRMenuItem, QSRCategory } from "@/hooks/useQSRMenuItems";
import { cn } from "@/lib/utils";
import { Search, Ban, RotateCcw } from "lucide-react";
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

    // Filter by availability - show available items by default, or sold-out items when toggled
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
        <div className="animate-pulse text-gray-400 dark:text-white/60">
          Loading menu...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search Bar + Sold Out Toggle */}
      <div className="px-3 py-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/40" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 h-9 rounded-xl text-sm"
          />
        </div>

        {/* Sold Out Filter Toggle */}
        {soldOutCount > 0 && (
          <button
            onClick={() => setShowSoldOut(!showSoldOut)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0",
              showSoldOut
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-500/30"
                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10",
            )}
          >
            <Ban className="h-3.5 w-3.5" />
            Sold Out ({soldOutCount})
          </button>
        )}

        {/* Restore All Button - only visible in sold-out view */}
        {showSoldOut && soldOutCount > 0 && onRestoreAll && (
          <button
            onClick={onRestoreAll}
            disabled={isRestoring}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-300 dark:border-green-500/30 hover:bg-green-500/20 disabled:opacity-50"
          >
            <RotateCcw
              className={cn("h-3.5 w-3.5", isRestoring && "animate-spin")}
            />
            {isRestoring ? "Restoring..." : "Restore All"}
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="px-3 pb-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
              selectedCategory === "all"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white/80",
            )}
          >
            🍽️ All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                selectedCategory === cat.id
                  ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white/80",
              )}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filteredItems.map((item) => {
            const cartCount = cartItemCounts[item.id] || 0;
            const isSoldOut = !item.is_available;

            return (
              <div
                key={item.id}
                className={cn(
                  "relative rounded-xl transition-all duration-150 group",
                  "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5",
                  "shadow-sm",
                  isSoldOut && "opacity-60",
                )}
              >
                {/* Main clickable area - add to cart */}
                <button
                  onClick={() => !isSoldOut && onAddItem(item)}
                  disabled={isSoldOut}
                  className={cn(
                    "w-full p-3 text-left transition-all duration-150 active:scale-95 rounded-xl",
                    !isSoldOut && "hover:bg-gray-50 dark:hover:bg-white/10",
                    !isSoldOut &&
                      cartCount > 0 &&
                      "ring-2 ring-orange-500/50 bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30",
                    isSoldOut && "cursor-not-allowed",
                  )}
                >
                  {/* Cart Badge */}
                  {cartCount > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg z-10">
                      {cartCount}
                    </div>
                  )}

                  {/* SOLD OUT Badge */}
                  {isSoldOut && (
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <span className="px-1.5 py-0.5 bg-red-500/90 text-white text-[9px] font-bold rounded-md uppercase tracking-wider">
                        Sold Out
                      </span>
                    </div>
                  )}

                  {/* Veg/Non-Veg indicator */}
                  {item.is_veg !== undefined && (
                    <div className="absolute top-2 right-2">
                      <div
                        className={cn(
                          "w-4 h-4 border-2 rounded-sm flex items-center justify-center",
                          item.is_veg ? "border-green-500" : "border-red-500",
                        )}
                      >
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            item.is_veg ? "bg-green-500" : "bg-red-500",
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p
                      className={cn(
                        "text-sm font-medium line-clamp-2 pr-5",
                        isSoldOut
                          ? "text-gray-400 dark:text-white/40 line-through"
                          : "text-gray-800 dark:text-white/90",
                      )}
                    >
                      {item.name}
                    </p>
                    <p
                      className={cn(
                        "text-base font-bold",
                        isSoldOut
                          ? "text-gray-400 dark:text-white/40"
                          : "bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent",
                      )}
                    >
                      {currencySymbol}
                      {item.price}
                    </p>
                  </div>
                </button>

                {/* Toggle Availability Button - small bottom bar */}
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
                      "w-full py-1 text-[10px] font-medium rounded-b-xl transition-all border-t",
                      isSoldOut
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20 hover:bg-green-500/20"
                        : "bg-red-500/5 text-red-500/70 dark:text-red-400/50 border-gray-100 dark:border-white/5 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100",
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
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-white/40">
            {showSoldOut ? (
              <>
                <Ban className="h-8 w-8 mb-2" />
                <p className="text-sm">No sold-out items</p>
                <button
                  onClick={() => setShowSoldOut(false)}
                  className="mt-2 text-xs text-orange-500 hover:underline"
                >
                  Back to menu
                </button>
              </>
            ) : (
              <>
                <Search className="h-8 w-8 mb-2" />
                <p className="text-sm">No items found</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
