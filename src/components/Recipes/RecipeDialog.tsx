import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Recipe, useRecipes } from "@/hooks/useRecipes";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Loader2, Plus, Trash2, ChefHat, Utensils, ClipboardList, Sparkles, Clock, DollarSign, Users, FileText, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: Recipe | null;
}

interface RecipeIngredient {
  inventory_item_id: string;
  quantity: number;
  unit: string;
  notes?: string;
}

// Unit conversion factors to base units (kg for mass, l for volume)
const UNIT_CONVERSIONS: Record<string, { base: string; factor: number }> = {
  kg: { base: 'kg', factor: 1 },
  g: { base: 'kg', factor: 0.001 },
  l: { base: 'l', factor: 1 },
  ml: { base: 'l', factor: 0.001 },
  piece: { base: 'piece', factor: 1 },
  cup: { base: 'l', factor: 0.24 }, // approx 240ml
  tbsp: { base: 'l', factor: 0.015 }, // approx 15ml
  tsp: { base: 'l', factor: 0.005 }, // approx 5ml
};

// Convert quantity from one unit to another
const convertUnits = (quantity: number, fromUnit: string, toUnit: string): number => {
  const from = UNIT_CONVERSIONS[fromUnit] || { base: fromUnit, factor: 1 };
  const to = UNIT_CONVERSIONS[toUnit] || { base: toUnit, factor: 1 };
  
  // If same base unit, convert
  if (from.base === to.base) {
    return (quantity * from.factor) / to.factor;
  }
  
  // If different base units, return as-is (can't convert kg to liters)
  return quantity;
};

export const RecipeDialog = ({ open, onOpenChange, recipe }: RecipeDialogProps) => {
  const restaurantId = useRestaurantId();
  const { createRecipe, updateRecipe } = useRecipes();
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isInitialized = useRef(false);
  const prevRecipeId = useRef<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    menu_item_id: "",
    name: "",
    description: "",
    category: "main_course",
    prep_time_minutes: "",
    cook_time_minutes: "",
    difficulty: "medium",
    serving_size: "1",
    serving_unit: "portion",
    instructions: "",
    selling_price: "",
    is_active: true,
  });

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // Fetch inventory items for ingredient selection
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-items', restaurantId],
    queryFn: async () => {
      if (!restaurantId?.restaurantId) return [];
      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', restaurantId.restaurantId)
        .order('name');
      return data || [];
    },
    enabled: !!restaurantId?.restaurantId && open,
  });

  // Fetch menu items for linking recipes
  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items', restaurantId],
    queryFn: async () => {
      if (!restaurantId?.restaurantId) return [];
      const { data } = await supabase
        .from('menu_items')
        .select('id, name, category')
        .eq('restaurant_id', restaurantId.restaurantId)
        .order('name');
      return data || [];
    },
    enabled: !!restaurantId?.restaurantId && open,
  });

  // Fetch recipe ingredients when editing
  const { data: recipeIngredients = [] } = useQuery({
    queryKey: ['recipe-ingredients', recipe?.id],
    queryFn: async () => {
      if (!recipe?.id) return [];
      const { data } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id);
      return data || [];
    },
    enabled: !!recipe?.id && open,
  });

  // FIXED: Only reset form when dialog opens or recipe changes, not on every recipeIngredients update
  useEffect(() => {
    if (!open) {
      isInitialized.current = false;
      prevRecipeId.current = null;
      return;
    }

    const currentRecipeId = recipe?.id || null;
    
    // Only initialize if dialog just opened or recipe changed
    if (!isInitialized.current || prevRecipeId.current !== currentRecipeId) {
      if (recipe) {
        setFormData({
          menu_item_id: (recipe as any).menu_item_id || "",
          name: recipe.name,
          description: recipe.description || "",
          category: recipe.category,
          prep_time_minutes: recipe.prep_time_minutes?.toString() || "",
          cook_time_minutes: recipe.cook_time_minutes?.toString() || "",
          difficulty: recipe.difficulty || "medium",
          serving_size: recipe.serving_size.toString(),
          serving_unit: recipe.serving_unit || "portion",
          instructions: recipe.instructions || "",
          selling_price: recipe.selling_price.toString(),
          is_active: recipe.is_active,
        });
      } else {
        // Reset form for new recipe
        setFormData({
          menu_item_id: "",
          name: "",
          description: "",
          category: "main_course",
          prep_time_minutes: "",
          cook_time_minutes: "",
          difficulty: "medium",
          serving_size: "1",
          serving_unit: "portion",
          instructions: "",
          selling_price: "",
          is_active: true,
        });
        setIngredients([]);
      }
      
      isInitialized.current = true;
      prevRecipeId.current = currentRecipeId;
    }
  }, [open, recipe]);

  // Load ingredients separately when they're fetched (only once)
  useEffect(() => {
    if (recipe && recipeIngredients.length > 0 && ingredients.length === 0 && open) {
      setIngredients(recipeIngredients.map(ing => ({
        inventory_item_id: ing.inventory_item_id,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes || "",
      })));
    }
  }, [recipeIngredients, recipe, open]);

  // Calculate ingredient cost with unit conversion
  const calculateIngredientCost = (ingredient: RecipeIngredient): number => {
    const inventoryItem = inventoryItems.find((item: any) => item.id === ingredient.inventory_item_id);
    if (!inventoryItem || !inventoryItem.cost_per_unit) return 0;
    
    const inventoryUnit = inventoryItem.unit || 'kg';
    const recipeUnit = ingredient.unit;
    const recipeQuantity = ingredient.quantity;
    
    // Convert recipe quantity to inventory unit
    const convertedQuantity = convertUnits(recipeQuantity, recipeUnit, inventoryUnit);
    
    return convertedQuantity * (inventoryItem.cost_per_unit || 0);
  };

  // Total ingredient cost
  const totalIngredientCost = ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing), 0);

  const handleSubmit = async () => {
    if (!restaurantId) return;

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Recipe name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const sellingPrice = parseFloat(formData.selling_price) || 0;
      const foodCostPercentage = sellingPrice > 0 ? (totalIngredientCost / sellingPrice) * 100 : 0;
      const marginPercentage = sellingPrice > 0 ? ((sellingPrice - totalIngredientCost) / sellingPrice) * 100 : 0;

      const recipeData = {
        restaurant_id: restaurantId.restaurantId,
        menu_item_id: formData.menu_item_id || null,
        name: formData.name,
        description: formData.description || null,
        category: formData.category as any,
        prep_time_minutes: formData.prep_time_minutes ? parseInt(formData.prep_time_minutes) : null,
        cook_time_minutes: formData.cook_time_minutes ? parseInt(formData.cook_time_minutes) : null,
        difficulty: formData.difficulty as any,
        serving_size: parseInt(formData.serving_size),
        serving_unit: formData.serving_unit,
        instructions: formData.instructions || null,
        image_url: null,
        selling_price: sellingPrice,
        is_active: formData.is_active,
        total_cost: totalIngredientCost,
        food_cost_percentage: foodCostPercentage,
        margin_percentage: marginPercentage,
        created_by: null,
      };

      if (recipe) {
        // Update recipe
        await updateRecipe.mutateAsync({ id: recipe.id, ...recipeData });
        
        // Delete existing ingredients
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', recipe.id);
        
        // Insert updated ingredients with converted costs
        if (ingredients.length > 0) {
          await Promise.all(
            ingredients.map(ing => {
              const cost = calculateIngredientCost(ing);
              return supabase.from('recipe_ingredients').insert({
                recipe_id: recipe.id,
                inventory_item_id: ing.inventory_item_id,
                quantity: ing.quantity,
                unit: ing.unit,
                notes: ing.notes || null,
                cost_per_unit: cost / (ing.quantity || 1),
                total_cost: cost,
              });
            })
          );
        }
      } else {
        const newRecipe = await createRecipe.mutateAsync(recipeData);
        
        // Add ingredients if any
        if (ingredients.length > 0 && newRecipe) {
          await Promise.all(
            ingredients.map(ing => {
              const cost = calculateIngredientCost(ing);
              return supabase.from('recipe_ingredients').insert({
                recipe_id: newRecipe.id,
                inventory_item_id: ing.inventory_item_id,
                quantity: ing.quantity,
                unit: ing.unit,
                notes: ing.notes || null,
                cost_per_unit: cost / (ing.quantity || 1),
                total_cost: cost,
              });
            })
          );
        }
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${recipe ? 'update' : 'create'} recipe`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { inventory_item_id: "", quantity: 0, unit: "g", notes: "" }, // Default to grams for easier input
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  // Handle form field changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-orange-500/20 rounded-3xl shadow-2xl p-0">
        {/* Premium Header */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 rounded-t-3xl">
          <DialogHeader className="text-white">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                <ChefHat className="h-8 w-8 text-white drop-shadow-md" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white drop-shadow-sm">
                  {recipe ? "Edit Recipe" : "Create New Recipe"}
                </DialogTitle>
                <DialogDescription className="text-white/80 mt-1">
                  {recipe ? "Update recipe details and ingredients" : "Add a new recipe with ingredients and costing"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800/80 dark:to-gray-700/80 p-1.5 rounded-2xl border border-orange-100 dark:border-orange-500/30">
              <TabsTrigger 
                value="basic" 
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 font-semibold transition-all duration-300"
              >
                <Utensils className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger 
                value="ingredients"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 font-semibold transition-all duration-300"
              >
                <ClipboardList className="h-4 w-4" />
                Ingredients
              </TabsTrigger>
              <TabsTrigger 
                value="instructions"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 font-semibold transition-all duration-300"
              >
                <FileText className="h-4 w-4" />
                Instructions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-6">
              {/* Menu Item Link Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <Label htmlFor="menu_item" className="text-blue-700 dark:text-blue-300 font-semibold">Link to Menu Item</Label>
                </div>
                <Select 
                  value={formData.menu_item_id} 
                  onValueChange={(value) => {
                    const selectedItem = menuItems.find((item: any) => item.id === value);
                    handleInputChange('menu_item_id', value);
                    if (selectedItem) {
                      handleInputChange('name', selectedItem.name);
                    }
                  }}
                >
                  <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-2 border-blue-200 dark:border-blue-500/30 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select menu item to link recipe" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                    {menuItems.map((item: any) => (
                      <SelectItem key={item.id} value={item.id} className="rounded-lg">
                        {item.name} - {item.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
                  Link this recipe to a menu item for automatic inventory deduction
                </p>
              </div>

              {/* Recipe Name & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-2">
                    <ChefHat className="h-4 w-4 text-orange-500" />
                    Recipe Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Butter Chicken"
                    disabled={!!formData.menu_item_id}
                    className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-700 dark:text-gray-300 font-semibold">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                      <SelectItem value="appetizer" className="rounded-lg">Appetizer</SelectItem>
                      <SelectItem value="main_course" className="rounded-lg">Main Course</SelectItem>
                      <SelectItem value="dessert" className="rounded-lg">Dessert</SelectItem>
                      <SelectItem value="beverage" className="rounded-lg">Beverage</SelectItem>
                      <SelectItem value="side_dish" className="rounded-lg">Side Dish</SelectItem>
                      <SelectItem value="salad" className="rounded-lg">Salad</SelectItem>
                      <SelectItem value="soup" className="rounded-lg">Soup</SelectItem>
                      <SelectItem value="breakfast" className="rounded-lg">Breakfast</SelectItem>
                      <SelectItem value="snack" className="rounded-lg">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700 dark:text-gray-300 font-semibold">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the recipe"
                  rows={2}
                  className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none"
                />
              </div>

              {/* Time & Difficulty Row */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">Time & Difficulty</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prep_time" className="text-gray-600 dark:text-gray-400 text-sm">Prep Time (min)</Label>
                    <Input
                      id="prep_time"
                      type="number"
                      value={formData.prep_time_minutes}
                      onChange={(e) => handleInputChange('prep_time_minutes', e.target.value)}
                      className="bg-white/80 dark:bg-gray-800/80 border-2 border-amber-200 dark:border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cook_time" className="text-gray-600 dark:text-gray-400 text-sm">Cook Time (min)</Label>
                    <Input
                      id="cook_time"
                      type="number"
                      value={formData.cook_time_minutes}
                      onChange={(e) => handleInputChange('cook_time_minutes', e.target.value)}
                      className="bg-white/80 dark:bg-gray-800/80 border-2 border-amber-200 dark:border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty" className="text-gray-600 dark:text-gray-400 text-sm">Difficulty</Label>
                    <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                      <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-2 border-amber-200 dark:border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-gray-900 dark:text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                        <SelectItem value="easy" className="rounded-lg">🟢 Easy</SelectItem>
                        <SelectItem value="medium" className="rounded-lg">🟡 Medium</SelectItem>
                        <SelectItem value="hard" className="rounded-lg">🔴 Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Serving & Pricing Row */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Serving & Pricing</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serving_size" className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-1">
                      <Users className="h-3 w-3" /> Serving Size *
                    </Label>
                    <Input
                      id="serving_size"
                      type="number"
                      value={formData.serving_size}
                      onChange={(e) => handleInputChange('serving_size', e.target.value)}
                      className="bg-white/80 dark:bg-gray-800/80 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serving_unit" className="text-gray-600 dark:text-gray-400 text-sm">Serving Unit</Label>
                    <Input
                      id="serving_unit"
                      value={formData.serving_unit}
                      onChange={(e) => handleInputChange('serving_unit', e.target.value)}
                      placeholder="e.g., portion, plate"
                      className="bg-white/80 dark:bg-gray-800/80 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="selling_price" className="text-gray-600 dark:text-gray-400 text-sm">Selling Price ({currencySymbol}) *</Label>
                    <Input
                      id="selling_price"
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => handleInputChange('selling_price', e.target.value)}
                      className="bg-white/80 dark:bg-gray-800/80 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between bg-white/80 dark:bg-gray-800/80 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${formData.is_active ? 'bg-gradient-to-br from-emerald-400 to-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <Sparkles className={`h-4 w-4 ${formData.is_active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                  <div>
                    <Label htmlFor="is_active" className="text-gray-700 dark:text-gray-300 font-semibold">Active Recipe</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Enable this recipe for use</p>
                  </div>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-600"
                />
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="space-y-4 mt-6">
              <div className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30">
                    <ClipboardList className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                      Add ingredients from your inventory
                    </p>
                    <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                      Units are automatically converted (e.g., 500g → 0.5kg)
                    </p>
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={addIngredient}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>

              {/* Cost Summary */}
              {ingredients.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Total Ingredient Cost:</span>
                    <span className="text-2xl font-bold text-emerald-600">{currencySymbol}{totalIngredientCost.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {ingredients.map((ingredient, index) => {
                  const inventoryItem = inventoryItems.find((item: any) => item.id === ingredient.inventory_item_id);
                  const ingredientCost = calculateIngredientCost(ingredient);
                  
                  return (
                    <div 
                      key={index} 
                      className="flex gap-3 items-end p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-purple-100 dark:border-purple-500/20 rounded-2xl hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
                    >
                      <div className="flex-1 space-y-2">
                        <Label className="text-gray-600 dark:text-gray-400 text-sm">Ingredient</Label>
                        <Select
                          value={ingredient.inventory_item_id}
                          onValueChange={(value) => updateIngredient(index, 'inventory_item_id', value)}
                        >
                          <SelectTrigger className="bg-white/80 dark:bg-gray-900/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 dark:text-gray-100">
                            <SelectValue placeholder="Select ingredient" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                            {inventoryItems.map((item: any) => (
                              <SelectItem key={item.id} value={item.id} className="rounded-lg">
                                {item.name} ({currencySymbol}{item.cost_per_unit || 0}/{item.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-28 space-y-2">
                        <Label className="text-gray-600 dark:text-gray-400 text-sm">Quantity</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={ingredient.quantity || ''}
                          onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="bg-white/80 dark:bg-gray-900/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="w-24 space-y-2">
                        <Label className="text-gray-600 dark:text-gray-400 text-sm">Unit</Label>
                        <Select
                          value={ingredient.unit}
                          onValueChange={(value) => updateIngredient(index, 'unit', value)}
                        >
                          <SelectTrigger className="bg-white/80 dark:bg-gray-900/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-gray-900 dark:text-gray-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                            <SelectItem value="kg" className="rounded-lg">kg</SelectItem>
                            <SelectItem value="g" className="rounded-lg">g</SelectItem>
                            <SelectItem value="l" className="rounded-lg">l</SelectItem>
                            <SelectItem value="ml" className="rounded-lg">ml</SelectItem>
                            <SelectItem value="piece" className="rounded-lg">piece</SelectItem>
                            <SelectItem value="cup" className="rounded-lg">cup</SelectItem>
                            <SelectItem value="tbsp" className="rounded-lg">tbsp</SelectItem>
                            <SelectItem value="tsp" className="rounded-lg">tsp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-24 text-right space-y-2">
                        <Label className="text-gray-600 dark:text-gray-400 text-sm">Cost</Label>
                        <p className="font-bold text-emerald-600 py-2">{currencySymbol}{ingredientCost.toFixed(2)}</p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  );
                })}

                {ingredients.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="p-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl inline-block mb-4">
                      <ClipboardList className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">No ingredients added yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Click "Add Ingredient" to start building your recipe</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="instructions" className="space-y-4 mt-6">
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-5 rounded-2xl border border-teal-100 dark:border-teal-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <Label htmlFor="instructions" className="text-teal-700 dark:text-teal-300 font-semibold">Cooking Instructions</Label>
                </div>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                  placeholder="Step-by-step cooking instructions...&#10;&#10;1. Prepare the ingredients...&#10;2. Heat oil in a pan...&#10;3. Add spices and cook..."
                  rows={14}
                  className="bg-white/80 dark:bg-gray-800/80 border-2 border-teal-200 dark:border-teal-500/30 rounded-xl focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-6 py-3 rounded-xl transition-all duration-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {recipe ? "Update Recipe" : "Create Recipe"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
