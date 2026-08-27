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
} from "lucide-react";
import { MenuItemCard, CustomerMenuItem } from "./MenuItemCard";

interface MenuBrowserProps {
  menuItems: CustomerMenuItem[];
  restaurantName: string;
  tableName?: string;
}

export const MenuBrowser: React.FC<MenuBrowserProps> = ({
  menuItems,
  restaurantName,
  tableName,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non_veg" | "bestseller">("all");

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

      const isVegItem =
        item.dietary === "veg" ||
        (!item.dietary &&
          !item.name.toLowerCase().includes("chicken") &&
          !item.name.toLowerCase().includes("mutton") &&
          !item.name.toLowerCase().includes("fish") &&
          !item.name.toLowerCase().includes("prawn") &&
          !item.name.toLowerCase().includes("egg") &&
          !item.name.toLowerCase().includes("pork") &&
          !item.name.toLowerCase().includes("beef"));

      let matchesDietary = true;
      if (dietaryFilter === "veg") matchesDietary = isVegItem;
      if (dietaryFilter === "non_veg") matchesDietary = !isVegItem;
      if (dietaryFilter === "bestseller") matchesDietary = !!item.is_bestseller || item.price > 250;

      return matchesSearch && matchesCategory && matchesDietary && item.is_available;
    });
  }, [menuItems, searchTerm, selectedCategory, dietaryFilter]);

  return (
    <div className="space-y-4">
      {/* Restaurant Header */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 p-5 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-sm">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-sm">
                {restaurantName}
              </h1>
              <p className="text-purple-100 text-xs flex items-center gap-1 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                Contactless Table Ordering
              </p>
            </div>
          </div>

          {tableName && (
            <Badge className="bg-white/90 text-purple-900 hover:bg-white font-black text-xs px-3 py-1.5 rounded-2xl shadow-md border-0">
              Table {tableName}
            </Badge>
          )}
        </div>
      </div>

      {/* Sticky Search & Dietary Filter Strip */}
      <div className="sticky top-2 z-30 space-y-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-3 rounded-3xl border border-gray-200/60 dark:border-gray-800 shadow-lg">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search favorite dishes, drinks, desserts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-11 rounded-2xl text-xs bg-gray-50 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 focus-visible:ring-purple-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dietary Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <Button
            size="sm"
            variant={dietaryFilter === "all" ? "default" : "outline"}
            onClick={() => setDietaryFilter("all")}
            className={`rounded-xl text-[11px] font-bold h-7 px-2.5 ${
              dietaryFilter === "all" ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : ""
            }`}
          >
            All
          </Button>

          <Button
            size="sm"
            variant={dietaryFilter === "veg" ? "default" : "outline"}
            onClick={() => setDietaryFilter(dietaryFilter === "veg" ? "all" : "veg")}
            className={`rounded-xl text-[11px] font-bold h-7 px-2.5 gap-1 ${
              dietaryFilter === "veg"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "text-emerald-700 dark:text-emerald-400 border-emerald-300"
            }`}
          >
            <Leaf className="w-3 h-3" /> Pure Veg
          </Button>

          <Button
            size="sm"
            variant={dietaryFilter === "non_veg" ? "default" : "outline"}
            onClick={() => setDietaryFilter(dietaryFilter === "non_veg" ? "all" : "non_veg")}
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
            variant={dietaryFilter === "bestseller" ? "default" : "outline"}
            onClick={() => setDietaryFilter(dietaryFilter === "bestseller" ? "all" : "bestseller")}
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
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === category.name
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 scale-105"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Menu Item Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white/50 dark:bg-gray-900/50 rounded-3xl border border-dashed p-6">
          <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
            No dishes found matching your filters
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("All");
              setDietaryFilter("all");
            }}
            className="text-purple-600 text-xs font-bold mt-1"
          >
            Reset all filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
