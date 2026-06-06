import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Recipe, useRecipes } from "@/hooks/useRecipes";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  Loader2,
  Plus,
  Trash2,
  ChefHat,
  Utensils,
  ClipboardList,
  Sparkles,
  Clock,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  Wand2,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Info,
  Hammer,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { UNIT_CONVERSIONS, RECIPE_UNITS } from "@/constants/units";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  variant_id?: string | null;
  custom_cost?: number;
}

// Unit conversion factors imported from @/constants/units

// Convert quantity from one unit to another
const convertUnits = (
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number => {
  const from = UNIT_CONVERSIONS[fromUnit] || { base: fromUnit, factor: 1 };
  const to = UNIT_CONVERSIONS[toUnit] || { base: toUnit, factor: 1 };

  // If same base unit, convert
  if (from.base === to.base) {
    return (quantity * from.factor) / to.factor;
  }

  // If different base units, return as-is (can't convert kg to liters)
  return quantity;
};

const IngredientCombobox = ({
  value,
  onValueChange,
  inventoryItems,
  currencySymbol,
  existingItemIds = [],
}: {
  value: string;
  onValueChange: (value: string) => void;
  inventoryItems: any[];
  currencySymbol: string;
  existingItemIds?: string[];
}) => {
  const [open, setOpen] = useState(false);
  const selectedItem = inventoryItems.find((item: any) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/50 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] rounded-xl h-[42px] px-4 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
        >
          <span className="truncate flex-1 text-left text-gray-700 dark:text-gray-200">
            {selectedItem
              ? `${selectedItem.name} (${currencySymbol}${selectedItem.cost_per_unit || 0}/${selectedItem.unit})`
              : "Search ingredient..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] sm:w-[400px] p-0 z-[100] shadow-xl"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search ingredients..." className="h-9" />
          <CommandList>
            <CommandEmpty>No ingredient found.</CommandEmpty>
            <CommandGroup className="max-h-[250px] overflow-auto">
              {inventoryItems
                .filter(
                  (item: any) =>
                    !existingItemIds.includes(item.id) || item.id === value,
                )
                .map((item: any) => {
                  const stockVal = item.quantity
                    ? Number(parseFloat(item.quantity).toFixed(3))
                    : 0;
                  return (
                    <CommandItem
                      key={item.id}
                      value={`${item.name} ${item.id}`} // Used for searching text
                      onSelect={() => {
                        onValueChange(item.id);
                        setOpen(false);
                      }}
                      className="flex justify-between items-center rounded-lg cursor-pointer my-0.5"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate font-medium">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Cost: {currencySymbol}
                          {item.cost_per_unit || 0}/{item.unit}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-xs font-mono text-muted-foreground bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                          Stock: {stockVal} {item.unit}
                        </span>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value === item.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const RecipeDialog = ({
  open,
  onOpenChange,
  recipe,
}: RecipeDialogProps) => {
  const restaurantId = useRestaurantId();
  const { createRecipe, updateRecipe } = useRecipes();
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const isInitialized = useRef(false);
  const prevRecipeId = useRef<string | null>(null);
  // Track ingredient load version to prevent stale data from blocking fresh loads
  const ingredientLoadVersion = useRef(0);

  // Form state
  const [formData, setFormData] = useState({
    menu_item_id: "",
    name: "",
    description: "",
    category: "main_course",
    serving_size: "1",
    serving_unit: "portion",
    selling_price: "",
    is_active: true,
    recipe_type: "menu_item",
    output_inventory_item_id: "",
    output_quantity: "1",
    output_unit: "kg",
  });

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [missingIngredients, setMissingIngredients] = useState<string[]>([]);
  const [activeVariantTab, setActiveVariantTab] = useState<string>("");

  // Fetch inventory items for ingredient selection
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId?.restaurantId) return [];
      const { data } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId.restaurantId)
        .order("name");
      return data || [];
    },
    enabled: !!restaurantId?.restaurantId && open,
  });

  // Fetch menu items for linking recipes
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu-items", restaurantId],
    queryFn: async () => {
      if (!restaurantId?.restaurantId) {
        console.log(
          "RecipeDialog: No restaurant ID available for menu items query",
        );
        return [];
      }
      console.log(
        "RecipeDialog: Fetching menu items for restaurant:",
        restaurantId.restaurantId,
      );
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, category, price")
        .eq("restaurant_id", restaurantId.restaurantId)
        .order("name");

      if (error) {
        console.error("RecipeDialog: Error fetching menu items:", error);
        return [];
      }
      console.log(
        "RecipeDialog: Fetched menu items:",
        data?.length || 0,
        "items",
      );
      return data || [];
    },
    enabled: !!restaurantId?.restaurantId && open,
  });

  // Fetch recipe ingredients when editing
  const { data: recipeIngredients = [], dataUpdatedAt } = useQuery({
    queryKey: ["recipe-ingredients-dialog", recipe?.id],
    queryFn: async () => {
      if (!recipe?.id) return [];
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipe.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!recipe?.id && open,
    staleTime: 0, // Always refetch when dialog opens
  });

  // Fetch variants for selected menu item
  const { data: menuVariants = [] } = useQuery({
    queryKey: ["menu-item-variants", formData.menu_item_id],
    queryFn: async () => {
      if (!formData.menu_item_id) return [];
      const { data } = await supabase
        .from("menu_item_variants")
        .select("id, name, price")
        .eq("menu_item_id", formData.menu_item_id)
        .order("sort_order");
      return data || [];
    },
    enabled: !!formData.menu_item_id && open,
  });

  // Reset form when dialog opens or recipe changes
  useEffect(() => {
    if (!open) {
      isInitialized.current = false;
      prevRecipeId.current = null;
      setIngredients([]);
      ingredientLoadVersion.current += 1; // Bump version so next open reloads
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
          serving_size: recipe.serving_size.toString(),
          serving_unit: recipe.serving_unit || "portion",
          selling_price: recipe.selling_price.toString(),
          is_active: recipe.is_active,
          recipe_type: (recipe as any).recipe_type || "menu_item",
          output_inventory_item_id: (recipe as any).output_inventory_item_id || "",
          output_quantity: ((recipe as any).output_quantity || 1).toString(),
          output_unit: (recipe as any).output_unit || "kg",
        });
        setIngredients([]);
        ingredientLoadVersion.current += 1; // Force reload
      } else {
        setFormData({
          menu_item_id: "",
          name: "",
          description: "",
          category: "main_course",
          serving_size: "1",
          serving_unit: "portion",
          selling_price: "",
          is_active: true,
          recipe_type: "menu_item",
          output_inventory_item_id: "",
          output_quantity: "1",
          output_unit: "kg",
        });
        setIngredients([]);
      }

      isInitialized.current = true;
      prevRecipeId.current = currentRecipeId;
    }
  }, [open, recipe]);

  // Load ingredients from DB whenever recipeIngredients data changes.
  // Uses a version counter + dataUpdatedAt to detect fresh data arrivals,
  // preventing the old bug where ingredients.length===0 guard blocked reloads.
  const lastLoadedAt = useRef(0);
  useEffect(() => {
    if (!open || !recipe) return;
    if (recipeIngredients.length === 0) {
      // If DB returned empty array, clear local state too (legitimately no ingredients)
      if (dataUpdatedAt > 0 && lastLoadedAt.current !== dataUpdatedAt) {
        lastLoadedAt.current = dataUpdatedAt;
        setIngredients([]);
      }
      return;
    }
    // Only re-populate if the data has actually changed (new fetch)
    if (lastLoadedAt.current !== dataUpdatedAt) {
      lastLoadedAt.current = dataUpdatedAt;
      setIngredients(
        recipeIngredients.map((ing: any) => ({
          inventory_item_id: ing.inventory_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || "",
          variant_id: ing.variant_id || null,
          custom_cost: undefined,
        })),
      );
    }
  }, [recipeIngredients, dataUpdatedAt, recipe, open]);

  // Calculate ingredient cost with unit conversion
  const calculateIngredientCost = (ingredient: RecipeIngredient): number => {
    if (ingredient.custom_cost !== undefined) {
      return ingredient.custom_cost;
    }

    const inventoryItem = inventoryItems.find(
      (item: any) => item.id === ingredient.inventory_item_id,
    );
    if (!inventoryItem || !inventoryItem.cost_per_unit) return 0;

    const inventoryUnit = inventoryItem.unit || "kg";
    const recipeUnit = ingredient.unit;
    const recipeQuantity = ingredient.quantity;

    // Convert recipe quantity to inventory unit
    const convertedQuantity = convertUnits(
      recipeQuantity,
      recipeUnit,
      inventoryUnit,
    );

    return convertedQuantity * (inventoryItem.cost_per_unit || 0);
  };

  // Total ingredient cost (Base items only — used when NO variants exist)
  const baseCost = ingredients
    .filter((ing) => !ing.variant_id)
    .reduce((sum, ing) => sum + calculateIngredientCost(ing), 0);

  // Per-variant cost calculations
  // When variants exist, each variant already contains its own complete set of ingredients
  // (including copies synced from base via "Sync from Base"). So variant cost = ONLY that
  // variant's ingredients, NOT base + variant (which would double-count).
  const hasVariants = menuVariants.length > 0;
  const variantCostBreakdown = menuVariants.map((variant: any) => {
    const variantCost = ingredients
      .filter((ing) => ing.variant_id === variant.id)
      .reduce((sum, ing) => sum + calculateIngredientCost(ing), 0);
    return {
      variantId: variant.id,
      variantName: variant.name,
      variantPrice: Number(variant.price) || 0,
      totalCost: variantCost,
    };
  });

  // For recipes with variants: use the first (smallest) variant's cost
  // For recipes without variants: use base cost
  const totalIngredientCost = variantCostBreakdown.length > 0
    ? variantCostBreakdown[0].totalCost
    : baseCost;

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
      // When variants exist, use the first (smallest) variant's price & cost
      // for the recipe-level summary; otherwise use the form selling price
      let effectiveSellingPrice = parseFloat(formData.selling_price) || 0;
      let effectiveCost = totalIngredientCost;

      if (variantCostBreakdown.length > 0) {
        const firstVariant = variantCostBreakdown[0];
        effectiveSellingPrice = firstVariant.variantPrice || effectiveSellingPrice;
        effectiveCost = firstVariant.totalCost;
      }

      const foodCostPercentage =
        effectiveSellingPrice > 0 ? (effectiveCost / effectiveSellingPrice) * 100 : 0;
      const marginPercentage =
        effectiveSellingPrice > 0
          ? ((effectiveSellingPrice - effectiveCost) / effectiveSellingPrice) * 100
          : 0;

      const recipeData = {
        restaurant_id: restaurantId.restaurantId,
        menu_item_id: formData.recipe_type === "production" ? null : (formData.menu_item_id || null),
        name: formData.name,
        description: formData.description || null,
        category: formData.category as any,
        prep_time_minutes: null,
        cook_time_minutes: null,
        difficulty: null,
        serving_size: parseInt(formData.serving_size),
        serving_unit: formData.serving_unit,
        instructions: null,
        image_url: null,
        selling_price: formData.recipe_type === "production" ? 0 : effectiveSellingPrice,
        is_active: formData.is_active,
        total_cost: effectiveCost,
        food_cost_percentage: formData.recipe_type === "production" ? 0 : foodCostPercentage,
        margin_percentage: formData.recipe_type === "production" ? 0 : marginPercentage,
        created_by: null,
        recipe_type: formData.recipe_type as "menu_item" | "production",
        output_inventory_item_id: formData.recipe_type === "production" ? (formData.output_inventory_item_id || null) : null,
        output_quantity: formData.recipe_type === "production" ? parseFloat(formData.output_quantity) : null,
        output_unit: formData.recipe_type === "production" ? formData.output_unit : null,
      };

      const validIngredients = ingredients.filter(ing => ing.inventory_item_id && Number(ing.quantity) > 0);

      const buildInsertData = (recipeId: string) =>
        validIngredients.map((ing) => {
          const cost = calculateIngredientCost(ing);
          const qty = Number(ing.quantity) || 0;
          return {
            recipe_id: recipeId,
            inventory_item_id: ing.inventory_item_id,
            quantity: qty,
            unit: ing.unit,
            cost_per_unit: parseFloat((cost / (qty || 1)).toFixed(4)),
            total_cost: parseFloat(cost.toFixed(4)),
            notes: ing.notes || null,
            variant_id: ing.variant_id || null,
          };
        });

      if (recipe) {
        // Update recipe
        await updateRecipe.mutateAsync({ id: recipe.id, ...recipeData });

        // Delete existing ingredients
        const { error: deleteError } = await supabase
          .from("recipe_ingredients")
          .delete()
          .eq("recipe_id", recipe.id);
        if (deleteError) throw deleteError;

        // Insert updated ingredients
        if (validIngredients.length > 0) {
          const { error: insertError } = await supabase
            .from("recipe_ingredients")
            .insert(buildInsertData(recipe.id));
          if (insertError) throw insertError;
        }
      } else {
        const newRecipe = await createRecipe.mutateAsync(recipeData);

        // Add ingredients for new recipe
        if (validIngredients.length > 0 && newRecipe) {
          const { error: insertError } = await supabase
            .from("recipe_ingredients")
            .insert(buildInsertData(newRecipe.id));
          if (insertError) throw insertError;
        }
      }

      // Invalidate and WAIT for refetch so the next dialog open gets fresh data
      await queryClient.invalidateQueries({ queryKey: ["recipe-ingredients"] });
      await queryClient.invalidateQueries({ queryKey: ["recipe-ingredients-dialog"] });
      await queryClient.invalidateQueries({ queryKey: ["recipes"] });

      toast({
        title: "Success ✨",
        description: `Recipe ${recipe ? "updated" : "created"} successfully with ${validIngredients.length} ingredient(s).`,
      });
      onOpenChange(false);
    } catch (error: any) {
      const msg = error?.message || error?.details || JSON.stringify(error) || "Unknown error";
      console.error("Recipe save error:", error);
      toast({
        title: "Error saving recipe",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addIngredient = () => {
    setIngredients([
      {
        inventory_item_id: "",
        quantity: 0,
        unit: "g",
        notes: "",
        variant_id: null,
      }, // Default to grams for easier input
      ...ingredients,
    ]);
  };

  const syncBaseToVariants = () => {
    const baseIngredients = ingredients.filter(
      (ing) => !ing.variant_id && ing.inventory_item_id,
    );

    if (baseIngredients.length === 0) {
      toast({
        title: "No Base Ingredients",
        description:
          "Add some ingredients to the base list first before syncing.",
        variant: "destructive",
      });
      return;
    }

    if (menuVariants.length === 0) {
      toast({
        title: "No Size Variants",
        description: "This menu item does not have size variants configured.",
      });
      return;
    }

    const newIngredients = [...ingredients];
    let itemsCopied = 0;

    menuVariants.forEach((variant: any) => {
      baseIngredients.forEach((baseIng) => {
        // Check if ingredient already exists in this variant
        const exists = newIngredients.some(
          (ing) =>
            ing.variant_id === variant.id &&
            ing.inventory_item_id === baseIng.inventory_item_id,
        );

        if (!exists) {
          newIngredients.unshift({
            ...baseIng,
            variant_id: variant.id,
            custom_cost: undefined, // Automatically recalculate standard cost based on qty/unit
          });
          itemsCopied++;
        }
      });
    });

    if (itemsCopied > 0) {
      setIngredients(newIngredients);
      toast({
        title: "Sync Complete \u2728",
        description: `Successfully synced ${itemsCopied} missing ingredient(s) to your size variants.`,
      });
    } else {
      toast({
        title: "Already Synced",
        description:
          "All base ingredients are already present in the size variants.",
      });
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (
    index: number,
    field: keyof RecipeIngredient,
    value: any,
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  // Handle form field changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // AI Auto-Generate Recipe Content
  const handleAIGenerate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Recipe Name Required",
        description: "Please enter a recipe name first to generate content",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAI(true);
    setMissingIngredients([]);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Build inventory context for smart matching
      const inventoryNames = inventoryItems
        .map((item: any) => `${item.name} (${item.unit})`)
        .join(", ");

      let variantContext = "";
      let ingredientsSchema =
        '{ "name": "ingredient name (use exact inventory names where possible)", "quantity": <number>, "unit": "kg|g|l|ml|piece|dozen|box|pack|cup|tbsp|tsp" }';

      if (menuVariants && menuVariants.length > 0) {
        const variantList = menuVariants
          .map((v: any) => `${v.name} (ID: ${v.id})`)
          .join(", ");
        variantContext = `
IMPORTANT SIZE VARIANT INSTRUCTIONS:
This menu item has the following size variants: ${variantList}.
For each ingredient, try to specify exact quantities for EACH size variant separately.
If an ingredient applies to ALL sizes equally (e.g. a base spice), return it once with "variant_id": null.
If an ingredient quantity changes based on size (e.g. 5g for Small, 10g for Medium, 15g for Large), return multiple objects for that identical ingredient name, one for each size, but set the "variant_id" strictly to the corresponding exact ID provided above.`;
        ingredientsSchema =
          '{ "name": "ingredient name", "quantity": <number>, "unit": "g", "variant_id": "<uuid_or_null>" }';
      }

      const prompt = `You are a professional chef and recipe writer. Generate detailed recipe information for "${formData.name}".

Here is the restaurant's current inventory: [${inventoryNames}]
${variantContext}

Please respond ONLY with a valid JSON object (no markdown, no explanation) in this exact format:
{
  "description": "A brief, appetizing 1-2 sentence description of the dish",
  "ingredients": [
    ${ingredientsSchema}
  ]
}

IMPORTANT: For the ingredients array, try to match ingredient names EXACTLY to the inventory list above. If an ingredient is not in the inventory, still include it but use a common name. Include all ingredients needed for the recipe. Be accurate with quantities.`;

      const { data, error } = await supabase.functions.invoke(
        "chat-with-gemini",
        {
          body: {
            messages: [{ role: "user", content: prompt }],
            restaurantId: restaurantId?.restaurantId,
          },
        },
      );

      if (error) throw error;

      // Parse the AI response
      let aiContent = data?.choices?.[0]?.message?.content || "";

      // Clean up the response - remove markdown code blocks if present
      aiContent = aiContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      try {
        const recipeData = JSON.parse(aiContent);

        // Update form with AI-generated content
        setFormData((prev) => ({
          ...prev,
          description: recipeData.description || prev.description,
        }));

        // Process AI-suggested ingredients — match against inventory
        if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
          const matched: RecipeIngredient[] = [];
          const missing: string[] = [];

          for (const aiIng of recipeData.ingredients) {
            const aiName = (aiIng.name || "").toLowerCase().trim();
            if (!aiName) continue;

            // Try exact match first, then fuzzy match
            let bestMatch: any = null;
            let bestScore = 0;

            for (const invItem of inventoryItems) {
              const invName = (invItem.name || "").toLowerCase().trim();
              // Exact match
              if (invName === aiName) {
                bestMatch = invItem;
                bestScore = 100;
                break;
              }
              // Contains match (one contains the other)
              if (invName.includes(aiName) || aiName.includes(invName)) {
                const score =
                  (Math.min(invName.length, aiName.length) /
                    Math.max(invName.length, aiName.length)) *
                  80;
                if (score > bestScore) {
                  bestMatch = invItem;
                  bestScore = score;
                }
              }
              // Word overlap match
              const invWords = invName.split(/\s+/);
              const aiWords = aiName.split(/\s+/);
              const overlap = invWords.filter((w: string) =>
                aiWords.some((aw: string) => aw.includes(w) || w.includes(aw)),
              );
              if (overlap.length > 0) {
                const score =
                  (overlap.length / Math.max(invWords.length, aiWords.length)) *
                  60;
                if (score > bestScore) {
                  bestMatch = invItem;
                  bestScore = score;
                }
              }
            }

            if (bestMatch && bestScore >= 30) {
              matched.push({
                inventory_item_id: bestMatch.id,
                quantity: aiIng.quantity || 1,
                unit: aiIng.unit || bestMatch.unit || "g",
                variant_id: aiIng.variant_id || null, // Capture variant from AI
                notes:
                  bestScore < 80 ? `AI matched from: ${aiIng.name}` : undefined,
              });
            } else {
              missing.push(
                `${aiIng.name} (${aiIng.quantity || ""} ${aiIng.unit || ""}${aiIng.variant_id ? " [Variant Specific]" : ""})`.trim(),
              );
            }
          }

          if (matched.length > 0) {
            // Append instead of replace if ingredients already exist
            setIngredients((prev) => [...prev, ...matched]);
          }
          if (missing.length > 0) {
            setMissingIngredients(missing);
          }
        }

        const ingredientCount = recipeData.ingredients?.length || 0;
        const matchedCount = ingredients.length;
        toast({
          title: "\u2728 Recipe Generated!",
          description: `AI filled recipe details${ingredientCount > 0 ? ` with ${ingredientCount} ingredients` : ""}. Check the Ingredients tab.`,
        });
      } catch (parseError) {
        console.error("Failed to parse AI response:", aiContent);
        throw new Error("Failed to parse AI response");
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast({
        title: "AI Generation Failed",
        description:
          "Could not generate recipe content. Please try again or fill manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
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
                  {recipe
                    ? "Update recipe details and ingredients"
                    : "Add a new recipe with ingredients and costing"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800/80 dark:to-gray-700/80 p-1.5 rounded-2xl border border-orange-100 dark:border-orange-500/30">
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
            </TabsList>

            <TabsContent value="basic" className="space-y-6 mt-6">
              {/* Recipe Type Selector */}
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300 font-semibold">
                  Recipe Type
                </Label>
                <Select
                  value={formData.recipe_type}
                  onValueChange={(value) => handleInputChange("recipe_type", value)}
                >
                  <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Select recipe type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                    <SelectItem value="menu_item" className="rounded-lg">
                      🍽️ Menu Item Recipe (Deducts stock when sold)
                    </SelectItem>
                    <SelectItem value="production" className="rounded-lg">
                      🏭 Production Formula (For homemade inventory items)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Menu Item Link Card */}
              {formData.recipe_type === "menu_item" && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <Label
                      htmlFor="menu_item"
                      className="text-blue-700 dark:text-blue-300 font-semibold"
                    >
                      Link to Menu Item
                    </Label>
                  </div>
                  <Select
                    value={formData.menu_item_id}
                    onValueChange={(value) => {
                      const selectedItem = menuItems.find(
                        (item: any) => item.id === value,
                      );
                      handleInputChange("menu_item_id", value);
                      if (selectedItem) {
                        handleInputChange("name", selectedItem.name);
                        if (selectedItem.price) {
                          handleInputChange(
                            "selling_price",
                            selectedItem.price.toString(),
                          );
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-2 border-blue-200 dark:border-blue-500/30 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-gray-900 dark:text-gray-100">
                      <SelectValue placeholder="Select menu item to link recipe" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                      {menuItems.map((item: any) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                          className="rounded-lg"
                        >
                          {item.name} - {item.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
                    Link this recipe to a menu item for automatic inventory
                    deduction
                  </p>
                  {formData.menu_item_id &&
                    (() => {
                      const linked = menuItems.find(
                        (i: any) => i.id === formData.menu_item_id,
                      );
                      return linked?.price ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          Selling price fetched from menu: {currencySymbol}
                          {linked.price} (editable below)
                        </p>
                      ) : null;
                    })()}
                </div>
              )}

              {/* Production Output Configuration Card */}
              {formData.recipe_type === "production" && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 dark:from-amber-950/10 dark:to-orange-950/10 p-5 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Hammer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-amber-700 dark:text-amber-300 font-semibold">
                      Production Yield Config
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="output_inventory_item" className="text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-1.5">
                        Produced Inventory Item *
                      </Label>
                      <Select
                        value={formData.output_inventory_item_id}
                        onValueChange={(value) => {
                          const item = inventoryItems.find((i: any) => i.id === value);
                          handleInputChange("output_inventory_item_id", value);
                          if (item) {
                            handleInputChange("name", `Production: ${item.name}`);
                            handleInputChange("output_unit", item.unit || "kg");
                          }
                        }}
                      >
                        <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-2 border-amber-200 dark:border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-gray-900 dark:text-gray-100">
                          <SelectValue placeholder="Select output inventory item" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                          {inventoryItems.map((item: any) => (
                            <SelectItem key={item.id} value={item.id} className="rounded-lg">
                              {item.name} ({item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:col-span-1">
                      <div className="space-y-2">
                        <Label htmlFor="output_quantity" className="text-gray-700 dark:text-gray-300 font-semibold">
                          Yield Qty *
                        </Label>
                        <Input
                          id="output_quantity"
                          type="number"
                          step="any"
                          value={formData.output_quantity}
                          onChange={(e) => handleInputChange("output_quantity", e.target.value)}
                          className="bg-white/80 dark:bg-gray-800/80 border-2 border-amber-200 dark:border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="output_unit" className="text-gray-700 dark:text-gray-300 font-semibold">
                          Yield Unit *
                        </Label>
                        <Input
                          id="output_unit"
                          value={formData.output_unit}
                          onChange={(e) => handleInputChange("output_unit", e.target.value)}
                          className="bg-white/80 dark:bg-gray-800/80 border-2 border-amber-200 dark:border-amber-500/30 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipe Name & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="name"
                      className="text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-2"
                    >
                      <ChefHat className="h-4 w-4 text-orange-500" />
                      Recipe Name *
                    </Label>
                    {/* <Button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={!formData.name.trim() || isGeneratingAI}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold px-3 py-1.5 h-8 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:shadow-none text-xs"
                    >
                      {isGeneratingAI ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3 w-3 mr-1.5" />
                          AI Generate
                        </>
                      )}
                    </Button> */}
                  </div>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., Butter Chicken"
                    disabled={!!formData.menu_item_id}
                    className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  />
                  {!formData.name.trim() && (
                    <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                      Enter a recipe name to enable AI auto-fill ✨
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="category"
                    className="text-gray-700 dark:text-gray-300 font-semibold"
                  >
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleInputChange("category", value)
                    }
                  >
                    <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                      <SelectItem value="appetizer" className="rounded-lg">
                        Appetizer
                      </SelectItem>
                      <SelectItem value="main_course" className="rounded-lg">
                        Main Course
                      </SelectItem>
                      <SelectItem value="dessert" className="rounded-lg">
                        Dessert
                      </SelectItem>
                      <SelectItem value="beverage" className="rounded-lg">
                        Beverage
                      </SelectItem>
                      <SelectItem value="side_dish" className="rounded-lg">
                        Side Dish
                      </SelectItem>
                      <SelectItem value="salad" className="rounded-lg">
                        Salad
                      </SelectItem>
                      <SelectItem value="soup" className="rounded-lg">
                        Soup
                      </SelectItem>
                      <SelectItem value="breakfast" className="rounded-lg">
                        Breakfast
                      </SelectItem>
                      <SelectItem value="snack" className="rounded-lg">
                        Snack
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Brief description of the recipe"
                  rows={2}
                  className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none"
                />
              </div>

              {/* Serving & Pricing Row */}
              {formData.recipe_type === "menu_item" && (
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                      Serving & Pricing
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="serving_size"
                        className="text-gray-600 dark:text-gray-400 text-sm flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" /> Serving Size *
                      </Label>
                      <Input
                        id="serving_size"
                        type="number"
                        value={formData.serving_size}
                        onChange={(e) =>
                          handleInputChange("serving_size", e.target.value)
                        }
                        className="bg-white/80 dark:bg-gray-800/80 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="serving_unit"
                        className="text-gray-600 dark:text-gray-400 text-sm"
                      >
                        Serving Unit
                      </Label>
                      <Input
                        id="serving_unit"
                        value={formData.serving_unit}
                        onChange={(e) =>
                          handleInputChange("serving_unit", e.target.value)
                        }
                        placeholder="e.g., portion, plate"
                        className="bg-white/80 dark:bg-gray-800/80 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="selling_price"
                        className="text-gray-600 dark:text-gray-400 text-sm"
                      >
                        Selling Price ({currencySymbol}) *
                      </Label>
                      <Input
                        id="selling_price"
                        type="number"
                        step="0.01"
                        value={formData.selling_price}
                        onChange={(e) =>
                          handleInputChange("selling_price", e.target.value)
                        }
                        className="bg-white/80 dark:bg-gray-800/80 border-2 border-emerald-200 dark:border-emerald-500/30 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Active Switch */}
              <div className="flex items-center justify-between bg-white/80 dark:bg-gray-800/80 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      formData.is_active
                        ? "bg-gradient-to-br from-emerald-400 to-green-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <Sparkles
                      className={`h-4 w-4 ${
                        formData.is_active
                          ? "text-white"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="is_active"
                      className="text-gray-700 dark:text-gray-300 font-semibold"
                    >
                      Active Recipe
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enable this recipe for use
                    </p>
                  </div>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    handleInputChange("is_active", checked)
                  }
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-500 data-[state=checked]:to-green-600"
                />
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="space-y-4 mt-6">
              {/* Missing Ingredients Alert */}
              {missingIngredients.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600 text-lg mt-0.5">⚠️</span>
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                          {missingIngredients.length} ingredient
                          {missingIngredients.length > 1 ? "s" : ""} not in
                          inventory
                        </p>
                        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                          {missingIngredients.map((item, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          Add these to Inventory first, then re-run AI Generate
                          to auto-link them.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMissingIngredients([])}
                      className="text-amber-400 hover:text-amber-600 text-xs font-bold ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Cost Summary */}
              {ingredients.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/30 space-y-3">
                  {/* When variants exist, base is just a template — don't show its cost as additive */}
                  {hasVariants ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                            Base Ingredients
                          </span>
                          <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                            Template Only
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                          Use "Sync from Base" to copy to variants
                        </span>
                      </div>
                      <div className="border-t border-emerald-200 dark:border-emerald-700/30 pt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Per-Variant Cost:</p>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[280px] p-3 text-xs leading-relaxed bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1.5">Understanding Recipe Metrics</p>
                                <div className="space-y-1.5 text-gray-600 dark:text-gray-400">
                                  <p><span className="font-semibold text-emerald-600">FC%</span> = Food Cost % = (Ingredient Cost ÷ Selling Price) × 100</p>
                                  <p><span className="font-semibold text-blue-600">M%</span> = Margin % = ((Selling Price − Ingredient Cost) ÷ Selling Price) × 100</p>
                                  <hr className="border-gray-200 dark:border-gray-700 my-1.5" />
                                  <p className="text-[10px]">🟢 FC ≤30% = Excellent &nbsp; 🟡 FC ≤40% = Good &nbsp; 🔴 FC &gt;40% = High</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {variantCostBreakdown.map((v) => {
                          const fc = v.variantPrice > 0 ? (v.totalCost / v.variantPrice) * 100 : 0;
                          const margin = v.variantPrice > 0 ? ((v.variantPrice - v.totalCost) / v.variantPrice) * 100 : 0;
                          return (
                            <div key={v.variantId} className="flex items-center justify-between bg-white/60 dark:bg-gray-800/40 px-3 py-2 rounded-xl">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{v.variantName}</span>
                                <span className="text-xs text-gray-500">({currencySymbol}{v.variantPrice})</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-emerald-600">
                                  {currencySymbol}{v.totalCost.toFixed(2)}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  fc <= 30 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  fc <= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  FC {fc.toFixed(0)}% · M {margin.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                        Total Recipe Cost:
                      </span>
                      <span className="text-2xl font-bold text-emerald-600">
                        {currencySymbol}{totalIngredientCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════ BASE INGREDIENTS SECTION ═══════ */}
              <div className="bg-gradient-to-br from-purple-50/80 to-indigo-50/80 dark:from-purple-900/10 dark:to-indigo-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-500/20">
                <div className="flex flex-wrap gap-2 justify-between items-center mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30 shrink-0">
                      <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-semibold truncate">
                        📦 Base Ingredients{" "}
                        {menuVariants.length > 0 ? "(All Sizes)" : ""}
                      </p>
                      <p className="text-[10px] sm:text-xs text-purple-600/70 dark:text-purple-400/70 hidden sm:block">
                        {menuVariants.length > 0
                          ? "Used for every size variant — common ingredients"
                          : "Add ingredients from your inventory"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={addIngredient}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-lg shadow-purple-500/30 text-xs sm:text-sm"
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Add
                  </Button>
                </div>

                {/* Base cost summary */}
                {ingredients.filter((ing) => !ing.variant_id && ing.inventory_item_id).length > 0 && (
                  <div className="flex justify-between items-center bg-white/50 dark:bg-gray-800/50 p-2 sm:p-3 rounded-xl border border-purple-100 dark:border-purple-800/50 shadow-sm mb-2">
                    <span className="text-purple-700 dark:text-purple-400 font-semibold text-[10px] sm:text-xs">
                      Total Base Cost{hasVariants ? " (Template)" : ""}:
                    </span>
                    <span className="text-purple-600 dark:text-purple-300 font-bold text-sm sm:text-base">
                      {currencySymbol}{baseCost.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {ingredients
                    .map((ingredient, index) => ({ ingredient, index }))
                    .filter(({ ingredient }) => !ingredient.variant_id)
                    .map(({ ingredient, index }, _, arr) => {
                      const existingItemIds = arr.map(
                        (a) => a.ingredient.inventory_item_id,
                      );
                      const inventoryItem = inventoryItems.find(
                        (item: any) => item.id === ingredient.inventory_item_id,
                      );
                      const ingredientCost =
                        calculateIngredientCost(ingredient);

                      return (
                        <div
                          key={index}
                          className="group relative flex flex-col sm:flex-row gap-3 p-3 sm:p-4 bg-white dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)] hover:border-purple-200 dark:hover:border-purple-500/30 transition-all duration-300"
                        >
                          {/* Ingredient Combobox (takes up remaining space) */}
                          <div className="w-full sm:flex-1 relative">
                            <IngredientCombobox
                              value={ingredient.inventory_item_id}
                              onValueChange={(value) =>
                                updateIngredient(
                                  index,
                                  "inventory_item_id",
                                  value,
                                )
                              }
                              inventoryItems={inventoryItems}
                              currencySymbol={currencySymbol}
                              existingItemIds={existingItemIds}
                            />
                          </div>

                          {/* Controls row */}
                          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 sm:gap-3">
                            {/* Fused Qty and Unit */}
                            <div className="flex flex-1 sm:flex-none items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:border-purple-500 transition-all">
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="Qty"
                                value={ingredient.quantity || ""}
                                onChange={(e) =>
                                  updateIngredient(
                                    index,
                                    "quantity",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="w-[70px] sm:w-20 bg-transparent border-0 h-[40px] text-sm font-medium focus-visible:ring-0 px-3 flex-1 sm:flex-none"
                              />
                              <div className="w-[1px] h-6 bg-gray-300 dark:bg-gray-600" />
                              <Select
                                value={ingredient.unit}
                                onValueChange={(value) =>
                                  updateIngredient(index, "unit", value)
                                }
                              >
                                <SelectTrigger className="w-[66px] sm:w-[72px] bg-transparent border-0 h-[40px] text-xs font-medium focus:ring-0 px-2 shadow-none text-gray-600 dark:text-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl">
                                  {RECIPE_UNITS.map((u) => (
                                    <SelectItem key={u.value} value={u.value} className="rounded-lg">
                                      {u.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Cost display */}
                            <div className="relative group/cost">
                              <Input
                                type="number"
                                step="0.01"
                                value={
                                  ingredient.custom_cost !== undefined
                                    ? ingredient.custom_cost
                                    : ingredientCost.toFixed(2)
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "") {
                                    const updated = [...ingredients];
                                    delete updated[index].custom_cost;
                                    setIngredients(updated);
                                  } else {
                                    updateIngredient(
                                      index,
                                      "custom_cost",
                                      parseFloat(val) || 0,
                                    );
                                  }
                                }}
                                className={`w-[66px] sm:w-[76px] h-[42px] text-right font-bold text-sm px-2 border-2 focus-visible:ring-0 rounded-xl transition-colors ${ingredient.custom_cost !== undefined ? "text-purple-700 bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-800" : "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50"}`}
                                title={
                                  ingredient.custom_cost !== undefined
                                    ? "Manual Cost Override"
                                    : `Calculated Cost: ${currencySymbol}${ingredientCost.toFixed(2)}`
                                }
                              />
                            </div>

                            {/* Delete Button */}
                            <Button
                              type="button"
                              onClick={() => removeIngredient(index)}
                              className="h-[42px] w-[42px] shrink-0 rounded-xl bg-red-50/80 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500 transition-colors border border-red-100 dark:border-red-900/30 shadow-sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                  {ingredients.filter((ing) => !ing.variant_id).length ===
                    0 && (
                    <div className="text-center py-8 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                      <ClipboardList className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No base ingredients yet — click "Add" above
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══════ SIZE-SPECIFIC OVERRIDES ═══════ */}
              {menuVariants.length > 0 && (
                <div className="bg-gradient-to-br from-sky-50/80 to-blue-50/80 dark:from-sky-900/10 dark:to-blue-900/10 p-3 sm:p-4 rounded-2xl border border-sky-100 dark:border-sky-500/20">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg shadow-md shadow-sky-500/30 shrink-0">
                        <Utensils className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-sky-700 dark:text-sky-300 font-semibold">
                          📐 Size Overrides
                        </p>
                        <p className="text-[10px] sm:text-xs text-sky-600/60 dark:text-sky-400/60">
                          Select a size tab → add ingredients that differ from
                          base
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={syncBaseToVariants}
                      className="bg-white/80 dark:bg-gray-800/80 hover:bg-sky-50 dark:hover:bg-sky-900 border-sky-200 dark:border-sky-700 text-sky-600 dark:text-sky-300 h-8 text-[10px] sm:text-xs px-2 shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span className="hidden sm:inline">Sync from Base</span>
                      <span className="sm:hidden">Sync</span>
                    </Button>
                  </div>

                  {/* Variant Tabs */}
                  <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
                    {menuVariants.map((variant: any) => {
                      const count = ingredients.filter(
                        (ing) => ing.variant_id === variant.id,
                      ).length;
                      const isActive = activeVariantTab === variant.id;

                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() =>
                            setActiveVariantTab(isActive ? "" : variant.id)
                          }
                          className={`
                            relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold 
                            transition-all duration-200 shrink-0
                            ${
                              isActive
                                ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30 scale-[1.02]"
                                : "bg-white/80 dark:bg-gray-800/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-600/30 hover:border-sky-400 hover:shadow-sm"
                            }
                          `}
                        >
                          {variant.name}
                          {count > 0 && (
                            <span
                              className={`
                              inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold
                              ${
                                isActive
                                  ? "bg-white/25 text-white"
                                  : "bg-sky-100 dark:bg-sky-800/50 text-sky-600 dark:text-sky-300"
                              }
                            `}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active variant content */}
                  {activeVariantTab ? (
                    <div className="space-y-2">
                      {/* Add button & Cost Summary for this variant */}
                      <div className="flex justify-between items-center bg-white/50 dark:bg-gray-800/50 p-2 sm:p-3 rounded-xl border border-sky-100 dark:border-sky-800/50 shadow-sm mb-2">
                        <div className="flex flex-col">
                          <span className="text-sky-700 dark:text-sky-400 font-semibold text-[10px] sm:text-xs">
                            Total Cost (
                            {
                              menuVariants.find(
                                (v: any) => v.id === activeVariantTab,
                              )?.name
                            }
                            ):
                          </span>
                          <span className="text-sky-600 dark:text-sky-300 font-bold text-sm sm:text-base">
                            {currencySymbol}
                            {(
                              ingredients
                                .filter(
                                  (ing) => ing.variant_id === activeVariantTab,
                                )
                                .reduce(
                                  (sum, ing) =>
                                    sum + calculateIngredientCost(ing),
                                  0,
                                )
                            ).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            const newRow: RecipeIngredient = {
                              inventory_item_id: "",
                              quantity: 0,
                              unit: "g",
                              notes: "",
                              variant_id: activeVariantTab,
                            };
                            setIngredients([newRow, ...ingredients]);
                          }}
                          className="bg-sky-500 hover:bg-sky-600 text-white text-xs px-3 py-1.5 rounded-lg shadow-sm"
                          size="sm"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add to{" "}
                          {
                            menuVariants.find(
                              (v: any) => v.id === activeVariantTab,
                            )?.name
                          }
                        </Button>
                      </div>

                      {/* Ingredient rows for this variant */}
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                        {ingredients
                          .map((ingredient, index) => ({ ingredient, index }))
                          .filter(
                            ({ ingredient }) =>
                              ingredient.variant_id === activeVariantTab,
                          )
                          .map(({ ingredient, index }, _, arr) => {
                            const existingItemIds = arr.map(
                              (a) => a.ingredient.inventory_item_id,
                            );
                            const ingredientCost =
                              calculateIngredientCost(ingredient);
                            return (
                              <div
                                key={index}
                                className="group flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 bg-white/95 dark:bg-gray-900/60 border border-sky-100 dark:border-sky-800/40 rounded-xl shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-500/40 transition-all duration-300"
                              >
                                {/* Ingredient selector full width */}
                                <div className="w-full sm:flex-1 relative">
                                  <IngredientCombobox
                                    value={ingredient.inventory_item_id}
                                    onValueChange={(value) =>
                                      updateIngredient(
                                        index,
                                        "inventory_item_id",
                                        value,
                                      )
                                    }
                                    inventoryItems={inventoryItems}
                                    currencySymbol={currencySymbol}
                                    existingItemIds={existingItemIds}
                                  />
                                </div>

                                {/* Controls row */}
                                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 sm:gap-2.5">
                                  {/* Qty & Unit Fused */}
                                  <div className="flex flex-1 sm:flex-none items-center bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-sky-500/30 focus-within:border-sky-500 transition-all">
                                    <Input
                                      type="number"
                                      step="0.001"
                                      placeholder="Qty"
                                      value={ingredient.quantity || ""}
                                      onChange={(e) =>
                                        updateIngredient(
                                          index,
                                          "quantity",
                                          parseFloat(e.target.value) || 0,
                                        )
                                      }
                                      className="w-[60px] sm:w-[68px] bg-transparent border-0 h-10 text-sm font-medium focus-visible:ring-0 px-2 flex-1 sm:flex-none"
                                    />
                                    <div className="w-[1px] h-5 bg-gray-300 dark:bg-gray-600" />
                                    <Select
                                      value={ingredient.unit}
                                      onValueChange={(value) =>
                                        updateIngredient(index, "unit", value)
                                      }
                                    >
                                      <SelectTrigger className="w-[64px] sm:w-[68px] bg-transparent border-0 h-10 text-xs font-medium focus:ring-0 px-2 shadow-none text-gray-600 dark:text-gray-300">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl">
                                        {RECIPE_UNITS.map((u) => (
                                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Cost Input */}
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={
                                      ingredient.custom_cost !== undefined
                                        ? ingredient.custom_cost
                                        : ingredientCost.toFixed(2)
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "") {
                                        const updated = [...ingredients];
                                        delete updated[index].custom_cost;
                                        setIngredients(updated);
                                      } else {
                                        updateIngredient(
                                          index,
                                          "custom_cost",
                                          parseFloat(val) || 0,
                                        );
                                      }
                                    }}
                                    className={`w-[60px] sm:w-[72px] h-[40px] text-right font-bold text-xs px-1.5 border-2 focus-visible:ring-0 rounded-lg transition-colors ${ingredient.custom_cost !== undefined ? "text-sky-700 bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-800" : "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50"}`}
                                    title={
                                      ingredient.custom_cost !== undefined
                                        ? "Manual Cost Override"
                                        : "Auto-calculated Cost"
                                    }
                                  />

                                  {/* Delete */}
                                  <Button
                                    type="button"
                                    onClick={() => removeIngredient(index)}
                                    className="h-[40px] w-[40px] shrink-0 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500 transition-colors border border-red-100 dark:border-red-900/30"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}

                        {ingredients.filter(
                          (ing) => ing.variant_id === activeVariantTab,
                        ).length === 0 && (
                          <div className="text-center py-6 bg-sky-50/30 dark:bg-sky-800/10 rounded-xl border border-dashed border-sky-200/50 dark:border-sky-700/30">
                            <p className="text-xs text-sky-500 dark:text-sky-400">
                              No overrides for{" "}
                              {
                                menuVariants.find(
                                  (v: any) => v.id === activeVariantTab,
                                )?.name
                              }{" "}
                              yet
                            </p>
                            <p className="text-[10px] text-sky-400/60 mt-0.5">
                              Click "Add to{" "}
                              {
                                menuVariants.find(
                                  (v: any) => v.id === activeVariantTab,
                                )?.name
                              }
                              " above
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5 bg-sky-50/20 dark:bg-sky-800/5 rounded-xl border border-dashed border-sky-200/40 dark:border-sky-700/20">
                      <p className="text-xs text-sky-500/70 dark:text-sky-400/50">
                        👆 Tap a size tab above to manage its ingredients
                      </p>
                    </div>
                  )}
                </div>
              )}
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
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {recipe ? "Update Recipe" : "Create Recipe"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
