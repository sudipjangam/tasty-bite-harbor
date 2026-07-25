import React, { useState, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { QSRMenuItem } from "@/hooks/useQSRMenuItems";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyImage } from "@/components/ui/lazy-image";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface MenuItemVariant {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  sort_order: number;
  is_available: boolean;
}

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
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();

  // Variant state
  const [variantsMap, setVariantsMap] = useState<Record<string, MenuItemVariant[]>>({});
  const [variantPickerItem, setVariantPickerItem] = useState<QSRMenuItem | null>(null);

  // Fetch all variants for this restaurant once
  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const { data } = await supabase
        .from("menu_item_variants")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("sort_order");
      if (data && data.length > 0) {
        const map: Record<string, MenuItemVariant[]> = {};
        data.forEach((v: any) => {
          if (!map[v.menu_item_id]) map[v.menu_item_id] = [];
          map[v.menu_item_id].push(v);
        });
        setVariantsMap(map);
      }
    })();
  }, [restaurantId]);

  // Handle item tap — check for variants
  const handleItemTap = (item: QSRMenuItem) => {
    const itemVariants = variantsMap[item.id];
    if (itemVariants && itemVariants.length > 0) {
      setVariantPickerItem(item);
    } else {
      onAddItem(item);
    }
  };

  const handleVariantSelect = (variant: MenuItemVariant) => {
    if (!variantPickerItem) return;
    const variantItem: QSRMenuItem = {
      ...variantPickerItem,
      id: `${variantPickerItem.id}__${variant.id}`,
      name: `${variantPickerItem.name} (${variant.name})`,
      price: variant.price,
    };
    onAddItem(variantItem);
    setVariantPickerItem(null);
  };

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Filter by category
    if (selectedCategory) {
      items = items.filter(
        (item) =>
          item.category.toLowerCase().replace(/\s+/g, "-") === selectedCategory,
      );
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
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
    <div className="flex flex-col h-full relative">
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

        {/* Category Pills — with fade-edge scroll container */}
        <div className="relative mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("")}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all touch-manipulation flex-shrink-0",
                selectedCategory === ""
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
              )}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all touch-manipulation uppercase flex-shrink-0",
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
          {/* Right fade edge */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent" />
        </div>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredItems.map((item) => {
            const cartCount = cartItemCounts[item.id] || 0;
            const hasVariants = (variantsMap[item.id]?.length || 0) > 0;

            return (
              <button
                key={item.id}
                onClick={() => handleItemTap(item)}
                className={cn(
                  "relative p-2 rounded-xl border transition-all duration-200 touch-manipulation",
                  "flex flex-col items-center text-center",
                  "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                  "hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600",
                  "active:scale-95",
                )}
              >
                {/* Cart count badge */}
                {cartCount > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md z-10">
                    {cartCount}
                  </div>
                )}

                {/* Item image or emoji */}
                {item.image_url ? (
                  <LazyImage
                    src={item.image_url}
                    alt={item.name}
                    className="w-10 h-10 object-cover"
                    containerClassName="w-10 h-10 rounded-lg mb-1.5 overflow-hidden"
                  />
                ) : (
                  <div className="text-2xl mb-1.5">
                    {item.is_veg ? "🥦" : "🍖"}
                  </div>
                )}

                {/* Item name */}
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight">
                  {item.name}
                </span>

                {/* Price */}
                <CurrencyDisplay
                  amount={item.price}
                  showTooltip={false}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs mt-0.5"
                />

                {/* Sizes badge indicator */}
                {hasVariants && (
                  <span className="mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                    {variantsMap[item.id].length} Sizes
                  </span>
                )}

                {/* Veg/Non-veg — compact dot indicator */}
                {item.is_veg !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-sm border",
                        item.is_veg
                          ? "bg-green-500 border-green-600"
                          : "bg-red-500 border-red-600",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[9px] font-medium",
                        item.is_veg
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {item.is_veg ? "V" : "NV"}
                    </span>
                  </div>
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

      {/* ─── Variant Picker Overlay ─── */}
      {variantPickerItem && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center p-0 sm:p-4"
          onClick={() => setVariantPickerItem(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 border-t sm:border border-white/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar for mobile */}
            <div className="flex justify-center mb-3 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {variantPickerItem.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose a size
                </p>
              </div>
              <button
                onClick={() => setVariantPickerItem(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Variant Options */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {variantsMap[variantPickerItem.id]?.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-gray-100 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/50 bg-white/80 dark:bg-white/5 hover:bg-gradient-to-r hover:from-indigo-50/80 hover:to-purple-50/50 dark:hover:from-indigo-500/10 dark:hover:to-purple-500/5 transition-all active:scale-[0.98]"
                >
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {variant.name}
                  </span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                    {currencySymbol}{variant.price}
                  </span>
                </button>
              ))}
            </div>

            {/* Regular Base Item Option */}
            <button
              onClick={() => {
                onAddItem(variantPickerItem);
                setVariantPickerItem(null);
              }}
              className="w-full mt-3 p-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-center text-xs font-semibold text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
            >
              Regular — {currencySymbol}{variantPickerItem.price}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
