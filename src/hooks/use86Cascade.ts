import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export interface MenuItem86 {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  image_url?: string | null;
}

export interface Ingredient86Item {
  id: string;
  name: string;
  unit: string;
  current_stock?: number;
  linkedDishes: MenuItem86[];
}

export const use86Cascade = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Realtime subscription on menu_items
  useRealtimeSubscription({
    table: "menu_items",
    queryKey: ["menu-items-86", restaurantId],
  });

  // 1. Fetch Menu Items
  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ["menu-items-86", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, category, price, is_available, image_url")
        .eq("restaurant_id", restaurantId)
        .order("category")
        .order("name");

      if (error) throw error;
      return (data || []) as MenuItem86[];
    },
  });

  // 2. Fetch Recipes & Recipe Ingredients for cascade mapping
  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes-for-86", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, output_inventory_item_id")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: recipeIngredients = [] } = useQuery({
    queryKey: ["recipe-ingredients-for-86", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select(`
          id,
          recipe_id,
          inventory_item_id,
          inventory_items (
            id,
            name,
            unit
          )
        `);

      if (error) throw error;
      return data || [];
    },
  });

  // 3. Fetch Inventory Items
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items-for-86", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, unit, current_stock")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  // Map ingredients to linked dishes
  const ingredientsWithLinkedDishes = useMemo<Ingredient86Item[]>(() => {
    return inventoryItems.map((inv) => {
      // Find all recipe_ingredients using this inventory item
      const matchedRecipeIngs = recipeIngredients.filter(
        (ri) => ri.inventory_item_id === inv.id
      );
      const recipeIds = new Set(matchedRecipeIngs.map((ri) => ri.recipe_id));

      // Find matching recipes
      const matchedRecipes = recipes.filter((r) => recipeIds.has(r.id));
      const recipeNames = matchedRecipes.map((r) => r.name.toLowerCase());

      // Match menu_items by name or recipe association
      const matchedMenu = menuItems.filter((mi) =>
        recipeNames.some((rn) => mi.name.toLowerCase().includes(rn) || rn.includes(mi.name.toLowerCase()))
      );

      return {
        id: inv.id,
        name: inv.name,
        unit: inv.unit || "unit",
        current_stock: inv.current_stock || 0,
        linkedDishes: matchedMenu,
      };
    });
  }, [inventoryItems, recipeIngredients, recipes, menuItems]);

  // Mutation: Toggle single dish availability
  const toggleDishMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .eq("id", id);

      if (error) throw error;
      return { id, isAvailable };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["menu-items-86"] });
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      toast({
        title: res.isAvailable ? "🟢 Item Restocked" : "🔴 Item 86'd / Sold Out",
        description: res.isAvailable
          ? "Item is now live across POS, QR Menu & Aggregators."
          : "Item marked unavailable across POS, QR Menu & Aggregators.",
      });
    },
  });

  // Mutation: 86 all dishes linked to an ingredient
  const toggleIngredientCascadeMutation = useMutation({
    mutationFn: async ({
      dishIds,
      isAvailable,
      ingredientName,
    }: {
      dishIds: string[];
      isAvailable: boolean;
      ingredientName: string;
    }) => {
      if (dishIds.length === 0) return { count: 0, isAvailable, ingredientName };

      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: isAvailable })
        .in("id", dishIds);

      if (error) throw error;
      return { count: dishIds.length, isAvailable, ingredientName };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["menu-items-86"] });
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      toast({
        title: res.isAvailable
          ? `🟢 Restocked ${res.count} Dishes`
          : `⚡ 86'd ${res.count} Dishes (${res.ingredientName})`,
        description: res.isAvailable
          ? `All dishes using ${res.ingredientName} are now active.`
          : `All dishes using ${res.ingredientName} are disabled across POS & Aggregators.`,
      });
    },
  });

  // Mutation: Bulk revive all items
  const bulkReviveAllMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) return;
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: true })
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items-86"] });
      queryClient.invalidateQueries({ queryKey: ["menu_items"] });
      toast({
        title: "🟢 All Menu Items Restocked",
        description: "Entire menu is now live across all POS and aggregator channels.",
      });
    },
  });

  // Counts
  const unavailableDishes = useMemo(
    () => menuItems.filter((m) => !m.is_available),
    [menuItems]
  );
  const unavailableCount = unavailableDishes.length;

  return {
    menuItems,
    unavailableDishes,
    unavailableCount,
    ingredientsWithLinkedDishes,
    isLoading: menuLoading,
    toggleDish86: (id: string, isAvailable: boolean) =>
      toggleDishMutation.mutateAsync({ id, isAvailable }),
    toggleIngredientCascade: (dishIds: string[], isAvailable: boolean, ingredientName: string) =>
      toggleIngredientCascadeMutation.mutateAsync({ dishIds, isAvailable, ingredientName }),
    bulkReviveAll: () => bulkReviveAllMutation.mutateAsync(),
  };
};
