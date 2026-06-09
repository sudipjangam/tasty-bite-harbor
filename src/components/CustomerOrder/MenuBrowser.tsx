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
      <div className="sticky top-0 z-30 -mx-4 px-4 pt-4 pb-4 bg-gradient-to-br from-orange-50 via-blue-50/30 to-white backdrop-blur-xl">
        <div className="bg-gradient-to-r from-orange-500 to-blue-600 text-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/30 shadow-sm">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {restaurantName}
              </h1>
              <p className="text-orange-50 text-sm flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-orange-200" />
                Browse & Order
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Sticky */}
      <div className="sticky top-[140px] z-20 -mx-4 px-4 py-2 bg-white/80 backdrop-blur-xl border-b border-orange-100/50">
        <div className="relative shadow-sm group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <Input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-full border border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 bg-white/90 backdrop-blur-sm transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Category Filters - Horizontal Scroll */}
      <div className="sticky top-[212px] z-10 -mx-4 px-4 py-3 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
          {categories.map((category) => (
            <Badge
              key={category.name}
              variant={
                selectedCategory === category.name ? "default" : "outline"
              }
              className={`cursor-pointer whitespace-nowrap snap-start flex-shrink-0 px-5 py-2.5 text-sm font-semibold transition-all duration-300 rounded-full border ${
                selectedCategory === category.name
                  ? "bg-gradient-to-r from-orange-500 to-blue-600 text-white shadow-md scale-[1.02] border-transparent"
                  : "bg-white text-gray-600 hover:bg-orange-50 hover:text-orange-600 border-gray-200 hover:border-orange-200"
              }`}
              onClick={() => setSelectedCategory(category.name)}
            >
              {category.name}
              <span
                className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  selectedCategory === category.name
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
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
