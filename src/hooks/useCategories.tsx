import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";
import { useToast } from "./use-toast";

export interface Category {
  id: string;
  name: string;
  restaurant_id: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CATEGORIES = [
  "Main Course",
  "Appetizers",
  "Desserts",
  "Beverages",
  "Non-Veg",
  "Vegetarian",
  "Restaurant Specials"
];

export const useCategories = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch custom categories from database
  const { data: customCategories = [], isLoading: isLoadingCustom } = useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!restaurantId,
  });

  // Also fetch unique categories from existing menu items
  const { data: menuItemCategories = [], isLoading: isLoadingMenuItems } = useQuery({
    queryKey: ['menu-item-categories', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('category')
        .eq('restaurant_id', restaurantId)
        .not('category', 'is', null);

      if (error) throw error;
      
      // Extract unique category names
      const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
      return uniqueCategories as string[];
    },
    enabled: !!restaurantId,
  });

  // Combine default, custom, and menu item categories (removing duplicates)
  const allCategoriesSet = new Set([
    ...DEFAULT_CATEGORIES,
    ...customCategories.map(c => c.name),
    ...menuItemCategories
  ]);
  const allCategories = Array.from(allCategoriesSet).sort((a, b) => a.localeCompare(b));

  const isLoading = isLoadingCustom || isLoadingMenuItems;

  // Add new category
  const addCategoryMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      if (!restaurantId) {
        throw new Error('No restaurant ID available');
      }
      
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: categoryName, restaurant_id: restaurantId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', restaurantId] });
      toast({
        title: "Success",
        description: "Category added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add category",
        variant: "destructive",
      });
    },
  });

  return {
    categories: allCategories,
    customCategories,
    defaultCategories: DEFAULT_CATEGORIES,
    isLoading,
    addCategory: addCategoryMutation.mutate,
    isAddingCategory: addCategoryMutation.isPending,
  };
};
