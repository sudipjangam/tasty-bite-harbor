import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  UtensilsCrossed,
  Search,
  DollarSign,
  TrendingUp,
  Percent,
  Sparkles,
  Package,
  AlertTriangle,
  ArrowRight,
  Save,
  RotateCcw,
  Zap,
  Info,
  Bike,
  CheckCircle2,
} from "lucide-react";
import { Recipe, RecipeIngredient } from "@/hooks/useRecipes";
import { useToast } from "@/hooks/use-toast";

interface DishMarginCalculatorProps {
  recipes: Recipe[];
  recipeIngredients: RecipeIngredient[];
  isLoading: boolean;
  onUpdateRecipe?: (recipe: Partial<Recipe> & { id: string }) => Promise<any>;
}

interface EditableIngredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
}

export const DishMarginCalculator: React.FC<DishMarginCalculatorProps> = ({
  recipes,
  recipeIngredients,
  isLoading,
  onUpdateRecipe,
}) => {
  const { toast } = useToast();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Simulated editable values for the selected recipe
  const [simulatedSellingPrice, setSimulatedSellingPrice] = useState<number>(0);
  const [packagingCost, setPackagingCost] = useState<number>(15); // Standard ₹15 container
  const [aggregatorCommissionPct, setAggregatorCommissionPct] = useState<number>(24); // 24% standard Swiggy/Zomato cut
  const [targetMarginPct, setTargetMarginPct] = useState<number>(65); // 65% target margin
  const [editableIngredients, setEditableIngredients] = useState<EditableIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === "All" || r.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [recipes, searchQuery, categoryFilter]);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(recipes.map((r) => r.category))).filter(Boolean);
    return ["All", ...cats];
  }, [recipes]);

  // Select initial recipe if not set
  useEffect(() => {
    if (!selectedRecipeId && recipes.length > 0) {
      setSelectedRecipeId(recipes[0].id);
    }
  }, [recipes, selectedRecipeId]);

  // Active selected recipe
  const activeRecipe = useMemo(() => {
    return recipes.find((r) => r.id === selectedRecipeId) || recipes[0] || null;
  }, [recipes, selectedRecipeId]);

  // Sync state when active recipe changes
  useEffect(() => {
    if (!activeRecipe) return;

    setSimulatedSellingPrice(activeRecipe.selling_price || 0);

    // Get ingredients for this recipe
    const ings = recipeIngredients.filter((ri) => ri.recipe_id === activeRecipe.id);
    const mapped: EditableIngredient[] = ings.map((ri) => {
      const unitCost = ri.cost_per_unit || ri.inventory_items?.cost_per_unit || 0;
      const qty = ri.quantity || 0;
      return {
        id: ri.id,
        name: ri.inventory_items?.name || ri.notes || "Ingredient",
        unit: ri.unit || ri.inventory_items?.unit || "unit",
        quantity: qty,
        costPerUnit: unitCost,
        totalCost: qty * unitCost,
      };
    });

    setEditableIngredients(mapped);
  }, [activeRecipe, recipeIngredients]);

  // Update ingredient line
  const handleIngredientChange = (
    index: number,
    field: "quantity" | "costPerUnit",
    value: number
  ) => {
    setEditableIngredients((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      if (field === "quantity") item.quantity = value;
      if (field === "costPerUnit") item.costPerUnit = value;
      item.totalCost = item.quantity * item.costPerUnit;
      next[index] = item;
      return next;
    });
  };

  // COGS Calculations
  const calculatedFoodCost = useMemo(() => {
    if (editableIngredients.length === 0 && activeRecipe) {
      return activeRecipe.total_cost || 0;
    }
    return editableIngredients.reduce((sum, item) => sum + item.totalCost, 0);
  }, [editableIngredients, activeRecipe]);

  const totalDeliveryCOGS = calculatedFoodCost + packagingCost;

  // 1. Direct Dine-In Margins (0% Commission)
  const dineInProfit = Math.max(0, simulatedSellingPrice - calculatedFoodCost);
  const dineInMarginPct =
    simulatedSellingPrice > 0
      ? (dineInProfit / simulatedSellingPrice) * 100
      : 0;
  const dineInFoodCostPct =
    simulatedSellingPrice > 0
      ? (calculatedFoodCost / simulatedSellingPrice) * 100
      : 0;

  // 2. Aggregator Delivery Margins (Commission + 18% GST on Commission + Packaging + COGS)
  const commissionAmount = (simulatedSellingPrice * aggregatorCommissionPct) / 100;
  const gstOnCommission = commissionAmount * 0.18; // 18% GST on commission fee
  const totalAggregatorDrain = commissionAmount + gstOnCommission;
  const netAggregatorPayout = simulatedSellingPrice - totalAggregatorDrain;
  const aggregatorProfit = netAggregatorPayout - totalDeliveryCOGS;
  const aggregatorMarginPct =
    simulatedSellingPrice > 0
      ? (aggregatorProfit / simulatedSellingPrice) * 100
      : 0;

  // 3. Smart Suggested Price for Aggregators
  // Formula: SuggestedPrice = (FoodCost + Packaging) / (1 - (Commission% * 1.18) - (TargetMargin%))
  const commissionWithGstRate = (aggregatorCommissionPct * 1.18) / 100;
  const targetMarginRate = targetMarginPct / 100;
  const denominator = 1 - commissionWithGstRate - targetMarginRate;
  const suggestedAggregatorPrice =
    denominator > 0.05
      ? Math.ceil(totalDeliveryCOGS / denominator)
      : Math.ceil(simulatedSellingPrice * 1.35);

  // Save changes back to recipe
  const handleSaveRecipePricing = async () => {
    if (!activeRecipe || !onUpdateRecipe) return;

    try {
      setIsSaving(true);
      await onUpdateRecipe({
        id: activeRecipe.id,
        selling_price: simulatedSellingPrice,
        total_cost: calculatedFoodCost,
        food_cost_percentage: parseFloat(dineInFoodCostPct.toFixed(2)),
        margin_percentage: parseFloat(dineInMarginPct.toFixed(2)),
      });
      toast({
        title: "Recipe Pricing Updated",
        description: `Updated ${activeRecipe.name} with COGS ₹${calculatedFoodCost.toFixed(2)}`,
      });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update recipe.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        <UtensilsCrossed className="w-10 h-10 mx-auto text-orange-400 mb-2" />
        <p className="text-sm font-bold">Loading Recipe Costing & Margin Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-5 rounded-3xl shadow-xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-[10px] font-extrabold uppercase tracking-wider">
              Live COGS & Channel Profit Engine
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
              ⚡ Real-Time What-If Simulator
            </Badge>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Dish-Level Recipe Margins & Aggregator Bleed
          </h2>
          <p className="text-xs text-gray-300">
            Compare Dine-In profit (0% commission) vs Swiggy/Zomato (24% commission + packaging + GST) to eliminate hidden delivery losses.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleSaveRecipePricing}
            disabled={isSaving || !activeRecipe}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Recipe COGS"}
          </Button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ─── Column 1: Recipe Selector (3 Cols) ────────────────────────── */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-gray-500">
                Select Active Dish ({filteredRecipes.length})
              </CardTitle>
              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 rounded-xl text-xs bg-gray-50 dark:bg-gray-800"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1 overflow-x-auto scrollbar-none pt-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                      categoryFilter === cat
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-2 max-h-[560px] overflow-y-auto space-y-1.5">
              {filteredRecipes.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  No recipes found
                </div>
              ) : (
                filteredRecipes.map((r) => {
                  const isSelected = r.id === activeRecipe?.id;
                  const foodCostPct = r.food_cost_percentage || 0;
                  const isHealthy = foodCostPct <= 30;

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRecipeId(r.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group border ${
                        isSelected
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-md shadow-orange-500/20 scale-[1.02]"
                          : "bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white border-gray-100 dark:border-gray-800"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-extrabold text-xs truncate">{r.name}</p>
                        <span
                          className={`text-[10px] font-semibold ${
                            isSelected ? "text-orange-100" : "text-gray-400"
                          }`}
                        >
                          {r.category}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-black text-xs">₹{r.selling_price || 0}</p>
                        <Badge
                          className={`text-[9px] px-1.5 py-0 font-mono ${
                            isSelected
                              ? "bg-white/20 text-white border-0"
                              : isHealthy
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {foodCostPct.toFixed(0)}% COGS
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Column 2: Ingredient Breakdown & What-If Editor (5 Cols) ─────── */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl">
            <CardHeader className="p-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{activeRecipe?.name || "Recipe Ingredients"}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Live portion weights & wholesale ingredient unit prices
                  </CardDescription>
                </div>

                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono font-black text-xs px-2.5 py-1">
                  COGS: ₹{calculatedFoodCost.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Selling Price & Packaging Inputs */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase">
                    Dine-In Selling Price (₹)
                  </Label>
                  <Input
                    type="number"
                    value={simulatedSellingPrice || ""}
                    onChange={(e) => setSimulatedSellingPrice(parseFloat(e.target.value) || 0)}
                    className="h-9 rounded-xl font-black text-sm bg-white dark:bg-gray-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-gray-500 uppercase flex items-center justify-between">
                    <span>Packaging Box (₹)</span>
                    <Package className="w-3 h-3 text-orange-500" />
                  </Label>
                  <Input
                    type="number"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                    className="h-9 rounded-xl font-bold text-sm bg-white dark:bg-gray-900"
                  />
                </div>
              </div>

              {/* Ingredient Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-400 uppercase px-1">
                  <span className="w-5/12">Ingredient</span>
                  <span className="w-3/12 text-center">Portion</span>
                  <span className="w-2/12 text-right">Unit (₹)</span>
                  <span className="w-2/12 text-right">Total</span>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                  {editableIngredients.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed">
                      No raw ingredients mapped to this recipe.
                      <p className="text-[10px] text-gray-400 mt-1">
                        Default cost ₹{activeRecipe?.total_cost || 0} is being used.
                      </p>
                    </div>
                  ) : (
                    editableIngredients.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-xs"
                      >
                        <div className="w-5/12 pr-1 truncate">
                          <p className="font-bold text-gray-900 dark:text-gray-200 truncate">
                            {item.name}
                          </p>
                          <span className="text-[10px] text-gray-400">
                            Unit: {item.unit}
                          </span>
                        </div>

                        {/* Editable Portion Quantity */}
                        <div className="w-3/12 px-1">
                          <Input
                            type="number"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleIngredientChange(
                                idx,
                                "quantity",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 text-center text-xs font-mono font-bold rounded-lg bg-white dark:bg-gray-900 p-1"
                          />
                        </div>

                        {/* Editable Unit Cost */}
                        <div className="w-2/12 px-1 text-right">
                          <Input
                            type="number"
                            step="any"
                            value={item.costPerUnit}
                            onChange={(e) =>
                              handleIngredientChange(
                                idx,
                                "costPerUnit",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-7 text-right text-xs font-mono font-bold rounded-lg bg-white dark:bg-gray-900 p-1"
                          />
                        </div>

                        {/* Line Item Total */}
                        <div className="w-2/12 text-right font-black text-gray-800 dark:text-gray-200 font-mono">
                          ₹{item.totalCost.toFixed(1)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Aggregator Commission Rate Slider */}
              <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-orange-600" />
                    Aggregator Commission Rate
                  </span>
                  <Badge className="bg-orange-500 text-white font-mono font-black text-xs px-2 py-0.5">
                    {aggregatorCommissionPct}%
                  </Badge>
                </div>
                <Slider
                  value={[aggregatorCommissionPct]}
                  onValueChange={(val) => setAggregatorCommissionPct(val[0])}
                  min={15}
                  max={32}
                  step={1}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-orange-700 dark:text-orange-300 font-semibold">
                  <span>15% (Tier-2/3)</span>
                  <span>24% (Standard Swiggy/Zomato)</span>
                  <span>30% (High Priority)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Column 3: Dual Profit Gauges & Aggregator Bleed (4 Cols) ─────── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Direct Dine-In Profit (Green) */}
          <Card className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-white dark:from-emerald-950/30 dark:to-gray-900 shadow-lg overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-emerald-500/10 border-b border-emerald-500/20 flex flex-row items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  DIRECT DINE-IN / WEBSTORE
                </span>
                <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  0% Commission • 100% Retained Profit
                </p>
              </div>
              <Badge className="bg-emerald-600 text-white font-black text-xs px-2 py-0.5">
                {dineInMarginPct.toFixed(0)}% Margin
              </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl md:text-3xl font-black text-emerald-700 dark:text-emerald-400">
                  ₹{dineInProfit.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-gray-500">
                  Food Cost: {dineInFoodCostPct.toFixed(1)}%
                </span>
              </div>

              <div className="text-[11px] text-gray-600 dark:text-gray-300 space-y-1 pt-1 border-t border-emerald-100 dark:border-emerald-900">
                <div className="flex justify-between">
                  <span>Selling Price:</span>
                  <span className="font-bold">₹{simulatedSellingPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Raw Ingredient Cost:</span>
                  <span className="font-bold">-₹{calculatedFoodCost.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Swiggy / Zomato Delivery (Red/Amber Drain) */}
          <Card className="rounded-3xl border-2 border-rose-500/40 bg-gradient-to-br from-rose-50/50 via-orange-50/30 to-white dark:from-rose-950/30 dark:to-gray-900 shadow-lg overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-rose-500/10 border-b border-rose-500/20 flex flex-row items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                  SWIGGY / ZOMATO DELIVERY ({aggregatorCommissionPct}%)
                </span>
                <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                  Commission + GST + Box Cost
                </p>
              </div>
              <Badge
                className={`font-black text-xs px-2 py-0.5 ${
                  aggregatorMarginPct >= 40
                    ? "bg-amber-600 text-white"
                    : "bg-rose-600 text-white"
                }`}
              >
                {aggregatorMarginPct.toFixed(0)}% Margin
              </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-2xl md:text-3xl font-black ${
                    aggregatorProfit > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-red-700"
                  }`}
                >
                  ₹{aggregatorProfit.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-rose-600">
                  Drain: ₹{totalAggregatorDrain.toFixed(1)}
                </span>
              </div>

              {/* Breakdown */}
              <div className="text-[11px] text-gray-600 dark:text-gray-300 space-y-1 pt-1 border-t border-rose-100 dark:border-rose-900">
                <div className="flex justify-between">
                  <span>Aggregator Payout ({100 - aggregatorCommissionPct}%):</span>
                  <span className="font-bold">₹{netAggregatorPayout.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Commission ({aggregatorCommissionPct}%) + GST (18%):</span>
                  <span className="font-bold">-₹{totalAggregatorDrain.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Food COGS + Packaging Box:</span>
                  <span className="font-bold">-₹{totalDeliveryCOGS.toFixed(2)}</span>
                </div>
              </div>

              {/* Alert Pill */}
              <div className="p-2.5 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>
                  Aggregator drains ₹{totalAggregatorDrain.toFixed(1)} margin per plate!
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Smart Dynamic Markup Price Suggester */}
          <Card className="rounded-3xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/40 dark:to-purple-950/40 shadow-md">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Aggregator Price Suggester
              </CardTitle>
              <Badge className="bg-indigo-600 text-white font-mono text-[10px]">
                Target {targetMarginPct}% Margin
              </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300">
                To maintain a healthy <strong>{targetMarginPct}% profit</strong> on Swiggy/Zomato after commissions and packaging:
              </p>

              <div className="p-3 rounded-2xl bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900 flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                    SUGGESTED ONLINE PRICE
                  </span>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    ₹{suggestedAggregatorPrice}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setSimulatedSellingPrice(suggestedAggregatorPrice)}
                  className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                >
                  <Zap className="w-3.5 h-3.5" /> Apply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DishMarginCalculator;
