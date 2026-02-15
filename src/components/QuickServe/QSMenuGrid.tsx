import React, { useState, useMemo } from "react";
import { QSRMenuItem, QSRCategory } from "@/hooks/useQSRMenuItems";
import { cn } from "@/lib/utils";
import { Search, Leaf } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface QSMenuGridProps {
  menuItems: QSRMenuItem[];
  categories: QSRCategory[];
  isLoading: boolean;
  cartItemCounts: Record<string, number>;
  onAddItem: (item: QSRMenuItem) => void;
}

export const QSMenuGrid: React.FC<QSMenuGridProps> = ({
  menuItems,
  categories,
  isLoading,
  cartItemCounts,
  onAddItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { symbol: currencySymbol } = useCurrencyContext();

  const filteredItems = useMemo(() => {
    let items = menuItems;
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
  }, [menuItems, selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search Bar */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 rounded-xl text-sm"
          />
        </div>
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
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80",
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
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80",
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
            return (
              <button
                key={item.id}
                onClick={() => onAddItem(item)}
                className={cn(
                  "relative p-3 rounded-xl text-left transition-all duration-150 active:scale-95 group",
                  "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15",
                  cartCount > 0 &&
                    "ring-2 ring-orange-500/50 bg-orange-500/10 border-orange-500/30",
                )}
              >
                {/* Cart Badge */}
                {cartCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg z-10">
                    {cartCount}
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
                  <p className="text-sm font-medium text-white/90 line-clamp-2 pr-5">
                    {item.name}
                  </p>
                  <p className="text-base font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                    {currencySymbol}
                    {item.price}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <Search className="h-8 w-8 mb-2" />
            <p className="text-sm">No items found</p>
          </div>
        )}
      </div>
    </div>
  );
};
