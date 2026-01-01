import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { QSRMenuItem } from "@/hooks/useQSRMenuItems";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface QSRMenuGridProps {
  menuItems: QSRMenuItem[];
  categories: { id: string; name: string; emoji: string }[];
  onAddItem: (item: QSRMenuItem) => void;
  cartItemCounts: Record<string, number>; // menuItemId -> quantity in cart
  isLoading?: boolean;
}

export const QSRMenuGrid: React.FC<QSRMenuGridProps> = ({
  menuItems,
  categories,
  onAddItem,
  cartItemCounts,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Filter by category
    if (selectedCategory) {
      items = items.filter(
        (item) =>
          item.category.toLowerCase().replace(/\s+/g, "-") === selectedCategory
      );
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }

    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-8 w-24 rounded-full flex-shrink-0"
              />
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory("")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation",
              selectedCategory === ""
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-manipulation uppercase",
                selectedCategory === category.id
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
          Quick Menu Select
        </h2>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredItems.map((item) => {
            const cartCount = cartItemCounts[item.id] || 0;

            return (
              <button
                key={item.id}
                onClick={() => onAddItem(item)}
                className={cn(
                  "relative p-3 rounded-xl border transition-all duration-200 touch-manipulation",
                  "flex flex-col items-center text-center",
                  "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                  "hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600",
                  "active:scale-95"
                )}
              >
                {/* Cart count badge */}
                {cartCount > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                    {cartCount}
                  </div>
                )}

                {/* Item image or emoji */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg mb-2"
                  />
                ) : (
                  <div className="text-3xl mb-2">
                    {item.is_veg ? "🥦" : "🍖"}
                  </div>
                )}

                {/* Item name */}
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
                  {item.name}
                </span>

                {/* Price */}
                <CurrencyDisplay
                  amount={item.price}
                  showTooltip={false}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm mt-1"
                />

                {/* Veg/Non-veg indicator */}
                {item.is_veg !== undefined && (
                  <span
                    className={cn(
                      "mt-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full",
                      item.is_veg
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                    )}
                  >
                    {item.is_veg ? "Veg" : "Non-Veg"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="font-medium">No items found</p>
            <p className="text-sm">
              Try adjusting your search or category filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
