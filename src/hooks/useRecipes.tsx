import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";
import { useToast } from "@/hooks/use-toast";

export interface Recipe {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  category: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  serving_size: number;
  serving_unit: string | null;
  instructions: string | null;
  image_url: string | null;
  is_active: boolean;
  total_cost: number;
  selling_price: number;
  food_cost_percentage: number;
  margin_percentage: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity: number;
  unit: string;
  cost_per_unit: number | null;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  inventory_items?: {
    id: string;
    name: string;
    unit: string;
    cost_per_unit: number | null;
  };
}

export interface BatchProduction {
  id: string;
  restaurant_id: string;
  recipe_id: string;
  batch_size: number;
  production_date: string;
  produced_by: string | null;
  total_cost: number | null;
  cost_per_unit: number | null;
  yield_actual: number | null;
  yield_expected: number | null;
  yield_percentage: number | null;
  waste_amount: number | null;
  waste_reason: string | null;
  notes: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useRecipes = () => {
  const restaurantId = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const recipesQuery = useQuery({
    queryKey: ['recipes', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('restaurant_id', restaurantId.restaurantId)
        .order('name');

      if (error) throw error;
      return data as Recipe[];
    },
    enabled: !!restaurantId?.restaurantId,
  });

  const recipeIngredientsQuery = useQuery({
    queryKey: ['recipe-ingredients', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      // Get all recipes for the restaurant first
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id')
        .eq('restaurant_id', restaurantId.restaurantId);

      if (recipesError) throw recipesError;
      if (!recipes || recipes.length === 0) return [];

      const recipeIds = recipes.map(r => r.id);

      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          inventory_items (
            id,
            name,
            unit,
            cost_per_unit
          )
        `)
        .in('recipe_id', recipeIds);

      if (error) throw error;
      return data as RecipeIngredient[];
    },
    enabled: !!restaurantId?.restaurantId,
  });

  const batchProductionsQuery = useQuery({
    queryKey: ['batch-productions', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('batch_productions')
        .select('*')
        .eq('restaurant_id', restaurantId.restaurantId)
        .order('production_date', { ascending: false });

      if (error) throw error;
      return data as BatchProduction[];
    },
    enabled: !!restaurantId?.restaurantId,
  });

  const createRecipe = useMutation({
    mutationFn: async (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('recipes')
        .insert([recipe])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({
        title: "Success",
        description: "Recipe created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRecipe = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Recipe> & { id: string }) => {
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({
        title: "Success",
        description: "Recipe updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({
        title: "Success",
        description: "Recipe deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    recipes: recipesQuery.data || [],
    recipeIngredients: recipeIngredientsQuery.data || [],
    batchProductions: batchProductionsQuery.data || [],
    isLoading: recipesQuery.isLoading || recipeIngredientsQuery.isLoading || batchProductionsQuery.isLoading,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
};
