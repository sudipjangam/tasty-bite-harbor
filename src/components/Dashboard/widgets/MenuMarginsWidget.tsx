import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { AlertCircle, TrendingUp, TrendingDown, ChefHat } from "lucide-react";

interface MarginItem {
  menuItemName: string;
  sellingPrice: number;
  ingredientCost: number;
  margin: number;
  marginPercent: number;
}

const MenuMarginsWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();

  const { data: margins, isLoading } = useQuery({
    queryKey: ["menu-margins", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      // Fetch recipes linked to menu items
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id, name, menu_item_id")
        .eq("restaurant_id", restaurantId)
        .not("menu_item_id", "is", null);

      if (!recipes || recipes.length === 0) return [];

      // Fetch menu items for selling prices
      const menuItemIds = recipes
        .map((r: any) => r.menu_item_id)
        .filter(Boolean);
      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("id, name, price")
        .in("id", menuItemIds);

      const menuItemMap = new Map((menuItems || []).map((m: any) => [m.id, m]));

      // Fetch recipe ingredients with inventory costs
      const recipeIds = recipes.map((r: any) => r.id);
      const { data: ingredients } = await supabase
        .from("recipe_ingredients")
        .select(`recipe_id, quantity, inventory_items (cost_per_unit)`)
        .in("recipe_id", recipeIds);

      // Calculate cost per recipe
      const recipeCostMap = new Map<string, number>();
      (ingredients || []).forEach((ing: any) => {
        const cost =
          (Number(ing.quantity) || 0) *
          (Number(ing.inventory_items?.cost_per_unit) || 0);
        recipeCostMap.set(
          ing.recipe_id,
          (recipeCostMap.get(ing.recipe_id) || 0) + cost,
        );
      });

      // Build margin data
      const result: MarginItem[] = recipes
        .map((recipe: any) => {
          const menuItem = menuItemMap.get(recipe.menu_item_id);
          if (!menuItem) return null;
          const sellingPrice = Number(menuItem.price) || 0;
          const ingredientCost = recipeCostMap.get(recipe.id) || 0;
          const margin = sellingPrice - ingredientCost;
          const marginPercent =
            sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

          return {
            menuItemName: menuItem.name || recipe.name,
            sellingPrice,
            ingredientCost,
            margin,
            marginPercent,
          };
        })
        .filter(Boolean) as MarginItem[];

      // Sort by margin % descending
      return result.sort((a, b) => b.marginPercent - a.marginPercent);
    },
    staleTime: 1000 * 60 * 15,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 bg-gray-100 dark:bg-gray-700/50 rounded-xl"
          />
        ))}
      </div>
    );
  }

  if (!margins || margins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] text-gray-400 text-sm gap-2">
        <ChefHat className="h-8 w-8" />
        <p>No margin data yet</p>
        <p className="text-xs">Link recipes to menu items with ingredients</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {margins.slice(0, 8).map((item, idx) => {
        const isGood = item.marginPercent >= 60;
        const isBad = item.marginPercent < 30;

        return (
          <div
            key={item.menuItemName}
            className={`rounded-xl p-2.5 border transition-all ${
              isGood
                ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30"
                : isBad
                  ? "bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30"
                  : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {isGood ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : isBad ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {item.menuItemName}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isGood
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : isBad
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {item.marginPercent.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-gray-400">
                Cost: {currencySymbol}
                {item.ingredientCost.toFixed(0)} → Sell: {currencySymbol}
                {item.sellingPrice.toFixed(0)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  item.margin >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {item.margin >= 0 ? "+" : ""}
                {currencySymbol}
                {item.margin.toFixed(0)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MenuMarginsWidget;
