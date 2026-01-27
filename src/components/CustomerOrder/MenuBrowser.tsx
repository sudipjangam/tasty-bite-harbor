import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, UtensilsCrossed } from "lucide-react";
import { MenuItemCard } from "./MenuItemCard";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  is_available: boolean;
}

interface MenuBrowserProps {
  menuItems: MenuItem[];
  restaurantName: string;
}

export const MenuBrowser = ({
  menuItems,
  restaurantName,
}: MenuBrowserProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Get unique categories with item counts
  const categories = useMemo(() => {
    const catCounts = menuItems.reduce(
      (acc, item) => {
        if (item.is_available) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return [
      { name: "All", count: menuItems.filter((i) => i.is_available).length },
      ...Object.entries(catCounts).map(([name, count]) => ({ name, count })),
    ];
  }, [menuItems]);

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory && item.is_available;
    });
  }, [menuItems, searchTerm, selectedCategory]);

  return (
    <div className="space-y-4">
      {/* Restaurant Header - Sticky */}
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-4 pb-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white p-6 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {restaurantName}
              </h1>
              <p className="text-purple-100 text-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Browse & Order
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Sticky */}
      <div className="sticky top-[140px] z-20 -mx-4 px-4 py-2 bg-gradient-to-br from-purple-50/95 via-pink-50/95 to-orange-50/95 backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-full border-2 border-purple-200 focus:border-purple-400 shadow-md bg-white/90 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Category Filters - Horizontal Scroll */}
      <div className="sticky top-[212px] z-10 -mx-4 px-4 py-3 bg-gradient-to-br from-purple-50/90 via-pink-50/90 to-orange-50/90 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {categories.map((category) => (
            <Badge
              key={category.name}
              variant={
                selectedCategory === category.name ? "default" : "outline"
              }
              className={`cursor-pointer whitespace-nowrap snap-start flex-shrink-0 px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                selectedCategory === category.name
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg scale-105"
                  : "bg-white/80 hover:bg-purple-50 border-purple-200 text-gray-700"
              }`}
              onClick={() => setSelectedCategory(category.name)}
            >
              {category.name}
              <span
                className={`ml-2 text-xs ${
                  selectedCategory === category.name
                    ? "text-purple-100"
                    : "text-gray-500"
                }`}
              >
                ({category.count})
              </span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-8">
        {filteredItems.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 px-4">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No items found
            </h3>
            <p className="text-gray-500 text-center">
              Try searching with different keywords or select another category
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
};
