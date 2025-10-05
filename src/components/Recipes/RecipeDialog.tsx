import { useEffect, useState } from "react";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export const RecipeDialog = ({ open, onOpenChange, recipe }: RecipeDialogProps) => {
  const restaurantId = useRestaurantId();
  const { createRecipe, updateRecipe } = useRecipes();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
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

  // Load recipe data when editing
  useEffect(() => {
    if (recipe) {
      setFormData({
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
      // Load ingredients would require additional query
    } else {
      // Reset form
      setFormData({
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
  }, [recipe, open]);

  const handleSubmit = async () => {
    if (!restaurantId) return;

    setIsSubmitting(true);
    try {
      const recipeData = {
        restaurant_id: restaurantId.restaurantId,
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
        selling_price: parseFloat(formData.selling_price) || 0,
        is_active: formData.is_active,
        total_cost: 0,
        food_cost_percentage: 0,
        margin_percentage: 0,
        created_by: null,
      };

      if (recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, ...recipeData });
      } else {
        const newRecipe = await createRecipe.mutateAsync(recipeData);
        
        // Add ingredients if any
        if (ingredients.length > 0 && newRecipe) {
          await Promise.all(
            ingredients.map(ing =>
              supabase.from('recipe_ingredients').insert({
                recipe_id: newRecipe.id,
                ...ing,
              })
            )
          );
        }
      }

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { inventory_item_id: "", quantity: 0, unit: "kg", notes: "" },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? "Edit Recipe" : "Create New Recipe"}</DialogTitle>
          <DialogDescription>
            {recipe ? "Update recipe details and ingredients" : "Add a new recipe with ingredients and costing"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Recipe Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Butter Chicken"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appetizer">Appetizer</SelectItem>
                    <SelectItem value="main_course">Main Course</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="beverage">Beverage</SelectItem>
                    <SelectItem value="side_dish">Side Dish</SelectItem>
                    <SelectItem value="salad">Salad</SelectItem>
                    <SelectItem value="soup">Soup</SelectItem>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the recipe"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prep_time">Prep Time (minutes)</Label>
                <Input
                  id="prep_time"
                  type="number"
                  value={formData.prep_time_minutes}
                  onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cook_time">Cook Time (minutes)</Label>
                <Input
                  id="cook_time"
                  type="number"
                  value={formData.cook_time_minutes}
                  onChange={(e) => setFormData({ ...formData, cook_time_minutes: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serving_size">Serving Size *</Label>
                <Input
                  id="serving_size"
                  type="number"
                  value={formData.serving_size}
                  onChange={(e) => setFormData({ ...formData, serving_size: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serving_unit">Serving Unit</Label>
                <Input
                  id="serving_unit"
                  value={formData.serving_unit}
                  onChange={(e) => setFormData({ ...formData, serving_unit: e.target.value })}
                  placeholder="e.g., portion, plate, bowl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price (₹) *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2 col-span-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active Recipe</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ingredients" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Add ingredients from your inventory to automatically calculate recipe costs
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="h-4 w-4 mr-1" />
                Add Ingredient
              </Button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label>Ingredient</Label>
                    <Select
                      value={ingredient.inventory_item_id}
                      onValueChange={(value) => updateIngredient(index, 'inventory_item_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} (₹{item.cost_per_unit || 0}/{item.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-32 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="w-32 space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={ingredient.unit}
                      onValueChange={(value) => updateIngredient(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="l">l</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="piece">piece</SelectItem>
                        <SelectItem value="cup">cup</SelectItem>
                        <SelectItem value="tbsp">tbsp</SelectItem>
                        <SelectItem value="tsp">tsp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {ingredients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No ingredients added yet. Click "Add Ingredient" to start.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="instructions">Cooking Instructions</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Step-by-step cooking instructions..."
                rows={12}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {recipe ? "Update Recipe" : "Create Recipe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
