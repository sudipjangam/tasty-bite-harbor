import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { LazyImage } from "@/components/ui/lazy-image";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image_url?: string;
  is_available?: boolean;
  is_veg?: boolean;
  pricing_type?: "fixed" | "weight" | "volume" | "unit";
  pricing_unit?: string;
  base_unit_quantity?: number;
}

interface MenuItemsGridProps {
  selectedCategory: string;
  onSelectItem: (item: MenuItem) => void;
}

const MenuItemsGrid = ({
  selectedCategory,
  onSelectItem,
}: MenuItemsGridProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { symbol: currencySymbol } = useCurrencyContext();

  const { data: items, isLoading } = useQuery({
    queryKey: ["menu-items", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      let query = supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id);

      // If category is "All", don't filter by category
      if (selectedCategory !== "All") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!selectedCategory,
  });

  // Filter items based on search query
  const filteredItems = items?.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-400 h-4 w-4" />
          <Input
            className="pl-10 rounded-xl border-2 border-indigo-100 dark:border-indigo-800 bg-gradient-to-r from-white to-indigo-50/50 dark:from-gray-800 dark:to-indigo-900/20"
            placeholder="Search menu items..."
            disabled
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-3 space-y-2">
              <Skeleton className="h-16 w-16 rounded-xl mx-auto" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-3 w-1/2 mx-auto" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-indigo-500 h-4 w-4" />
        <Input
          className="pl-10 h-10 rounded-xl border-2 border-indigo-100 dark:border-indigo-800 bg-gradient-to-r from-white to-indigo-50/50 dark:from-gray-800 dark:to-indigo-900/20 focus:border-indigo-400 focus:ring-indigo-200"
          placeholder="🔍 Quick search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {!selectedCategory ? (
        <div className="text-center py-8">
          <div className="inline-block p-4 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl">
            <span className="text-3xl mb-2 block">🍽️</span>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Select a category to browse
            </p>
          </div>
        </div>
      ) : filteredItems?.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block p-4 bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-800 rounded-2xl">
            <span className="text-3xl mb-2 block">🔍</span>
            <p className="text-gray-500 dark:text-gray-400">
              {items?.length === 0
                ? "No items in this category"
                : "No items match your search"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredItems?.map((item) => {
            const isWeightBased =
              item.pricing_type && item.pricing_type !== "fixed";

            return (
              <Card
                key={item.id}
                className={`group relative p-3 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] overflow-hidden rounded-2xl border-2 ${
                  isWeightBased
                    ? "border-blue-200 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
                    : "border-gray-100 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                }`}
                onClick={() => onSelectItem(item)}
              >
                {/* Quick Add Button - Appears on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="p-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full text-white shadow-lg">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Veg/Non-Veg Indicator */}
                {item.is_veg !== undefined && (
                  <div className="absolute top-2 left-2 z-10">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        item.is_veg
                          ? "border-green-500 bg-white"
                          : "border-red-500 bg-white"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          item.is_veg ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Image Area - Compact */}
                <div className="h-14 w-14 mx-auto mb-2 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative shadow-inner">
                  {item.image_url ? (
                    <LazyImage
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                  ) : (
                    <span className="text-2xl">
                      {item.is_veg ? "🥗" : "🍖"}
                    </span>
                  )}

                  {/* Weight Badge */}
                  {isWeightBased && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-lg">
                      ⚖️
                    </div>
                  )}
                </div>

                {/* Item Name - Compact */}
                <h3 className="font-semibold text-sm text-center line-clamp-2 text-gray-800 dark:text-white mb-1 leading-tight">
                  {item.name}
                </h3>

                {/* Price - Prominent */}
                <div className="text-center">
                  <span className="inline-block px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm rounded-full shadow-md">
                    {currencySymbol}
                    {item.price.toFixed(0)}
                    {isWeightBased && item.pricing_unit && (
                      <span className="text-xs font-normal opacity-80">
                        /{item.pricing_unit}
                      </span>
                    )}
                  </span>
                </div>

                {/* Weight/Volume Badge */}
                {isWeightBased && (
                  <div className="text-center mt-1">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {item.pricing_type === "weight"
                        ? "📊 By Weight"
                        : item.pricing_type === "volume"
                          ? "💧 By Volume"
                          : "📦 Per Unit"}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MenuItemsGrid;
