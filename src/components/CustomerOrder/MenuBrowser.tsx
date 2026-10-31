import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Sparkles,
  UtensilsCrossed,
  X,
  Flame,
  Leaf,
  Drumstick,
  BellRing,
  Receipt,
  Egg,
} from "lucide-react";
import { MenuItemCard, CustomerMenuItem, isVegItem, isEggItem } from "./MenuItemCard";

interface MenuBrowserProps {
  menuItems: CustomerMenuItem[];
  restaurantName: string;
  tableName?: string;
  activeOrdersCount?: number;
  onCustomize?: (item: CustomerMenuItem) => void;
  onCallWaiter?: () => void;
  onViewBill?: () => void;
}

export const MenuBrowser: React.FC<MenuBrowserProps> = ({
  menuItems,
  restaurantName,
  tableName,
  activeOrdersCount = 0,
  onCustomize,
  onCallWaiter,
  onViewBill,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [dietaryFilter, setDietaryFilter] = useState<
    "all" | "veg" | "non_veg" | "egg" | "bestseller"
  >("all");

  // Get unique categories with item counts
  const categories = useMemo(() => {
    const catCounts = menuItems.reduce((acc, item) => {
      if (item.is_available) {
        acc[item.category] = (acc[item.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: "All", count: menuItems.filter((i) => i.is_available).length },
      ...Object.entries(catCounts).map(([name, count]) => ({ name, count })),
    ];
  }, [menuItems]);

  // Filter menu items by Category + Search + Dietary
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      const isVeg = isVegItem(item);
      const isEgg = isEggItem(item);

      let matchesDietary = true;
      if (dietaryFilter === "veg") matchesDietary = isVeg;
      if (dietaryFilter === "non_veg") matchesDietary = !isVeg && !isEgg;
      if (dietaryFilter === "egg") matchesDietary = isEgg;
      if (dietaryFilter === "bestseller")
        matchesDietary = !!item.is_bestseller || item.price > 250;

      return (
        matchesSearch && matchesCategory && matchesDietary && item.is_available
      );
    });
  }, [menuItems, searchTerm, selectedCategory, dietaryFilter]);

  return (
    <div className="space-y-3.5">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-r from-stone-900 via-stone-800 to-black p-4 text-white shadow-lg border border-stone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                {restaurantName}
              </h1>
              <p className="text-[11px] text-stone-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Dine-In • Table {tableName}
              </p>
            </div>
          </div>

          {/* Quick Header Service Actions */}
          <div className="flex items-center gap-1.5">
            {onCallWaiter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCallWaiter}
                className="h-8 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 text-[11px] font-bold"
              >
                <BellRing className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Waiter
              </Button>
            )}

            {onViewBill && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewBill}
                className="h-8 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 text-[11px] font-bold"
              >
                <Receipt className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Bill {activeOrdersCount > 0 && `(${activeOrdersCount})`}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Search & Dietary Filter Strip */}
      <div className="sticky top-2 z-30 space-y-2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl p-3 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-md">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            type="text"
            placeholder="Search food, drinks, desserts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-10 rounded-2xl text-xs bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 focus-visible:ring-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dietary Quick Filter Pills (Petpooja style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <Button
            size="sm"
            variant={dietaryFilter === "all" ? "default" : "outline"}
            onClick={() => setDietaryFilter("all")}
            className={`rounded-xl text-[11px] font-bold h-7 px-2.5 ${
              dietaryFilter === "all"
                ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300"
            }`}
          >
            All
          </Button>

          <Button
            size="sm"
            variant={dietaryFilter === "veg" ? "default" : "outline"}
            onClick={() =>
              setDietaryFilter(dietaryFilter === "veg" ? "all" : "veg")
            }
            className={`rounded-xl text-[11px] font-bold h-7 px-2.5 gap-1 ${
              dietaryFilter === "veg"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "text-emerald-700 dark:text-emerald-400 border-emerald-300"
            }`}
          >
            <Leaf className="w-3 h-3" /> Veg
          </Button>

          <Button
            size="sm"
            variant={dietaryFilter === "non_veg" ? "default" : "outline"}
            onClick={() =>
              setDietaryFilter(dietaryFilter === "non_veg" ? "all" : "non_veg")
            }
            className={`rounded-xl text-[11px] font-bold h-7 px-2.5 gap-1 ${
              dietaryFilter === "non_veg"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "text-rose-700 dark:text-rose-400 border-rose-300"
            }`}
          >
            <Drumstick className="w-3 h-3" /> Non-Veg
          </Button>

          <Button
            size="sm"
            variant={dietaryFilter === "egg" ? "default" : "outline"}
            onClick={() =>
              setDietaryFilter(dietaryFilter === "egg" ? "all" : "egg")
            }
            className={`rounded-xl text-[11px] font-bold h-7 px-2.5 gap-1 ${
              dietaryFilter === "egg"
                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                : "text-yellow-700 dark:text-yellow-400 border-yellow-300"
            }`}
          >
            <Egg className="w-3 h-3" /> Egg
          </Button>

          <Button
            size="sm"
            variant={dietaryFilter === "bestseller" ? "default" : "outline"}
            onClick={() =>
              setDietaryFilter(
                dietaryFilter === "bestseller" ? "all" : "bestseller",
              )
            }
            className={`rounded-xl text-[11px] font-bold h-7 px-2.5 gap-1 ${
              dietaryFilter === "bestseller"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "text-amber-700 dark:text-amber-400 border-amber-300"
            }`}
          >
            <Flame className="w-3 h-3" /> Bestsellers
          </Button>
        </div>

        {/* Category Horizontal Scroll */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === category.name
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30 scale-105"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Menu Item Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white/60 dark:bg-stone-900/60 rounded-3xl border border-dashed border-stone-300 dark:border-stone-800 p-6">
          <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-stone-600 dark:text-stone-300">
            No items found matching your filters
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("All");
              setDietaryFilter("all");
            }}
            className="text-amber-600 text-xs font-bold mt-1"
          >
            Reset all filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onCustomize={onCustomize}
            />
          ))}
        </div>
      )}
    </div>
  );
};
