import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";
import { useToast } from "./use-toast";

export interface Category {
  id: string;
  name: string;
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
  const { data: customCategories = [], isLoading } = useQuery({
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

  // Combine default and custom categories
  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map(c => c.name)
  ];

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
