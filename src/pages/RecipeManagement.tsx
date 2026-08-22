import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ChefHat,
  Plus,
  TrendingUp,
  Package,
  Calculator,
  Sparkles,
  Utensils,
  Factory,
  BarChart3,
} from "lucide-react";
import { RecipeList } from "@/components/Recipes/RecipeList";
import { RecipeDialog } from "@/components/Recipes/RecipeDialog";
import { BatchProductionManager } from "@/components/Recipes/BatchProductionManager";
import { RecipeCostingCard } from "@/components/Recipes/RecipeCostingCard";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { MenuEngineering } from "@/components/Recipes/MenuEngineering";
import { useRecipes } from "@/hooks/useRecipes";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import HelpProvider from "@/components/Help/HelpProvider";
import { isNativeApp } from "@/utils/platform";

import { useIsMobile } from "@/hooks/use-mobile";

const RecipeManagement = () => {
  const { restaurantName } = useRestaurantId();
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const { recipes, batchProductions, isLoading } = useRecipes();
  const { symbol: currencySymbol } = useCurrencyContext();
  const isMobile = useIsMobile();

  const handleEditRecipe = (recipe: any) => {
    setSelectedRecipe(recipe);
    setShowRecipeDialog(true);
  };

  const handleCloseDialog = () => {
    setShowRecipeDialog(false);
    setSelectedRecipe(null);
  };

  // Calculate stats
  const totalRecipes = recipes.length;
  const activeRecipes = recipes.filter((r) => r.is_active).length;
  const avgCostPercentage =
    recipes.length > 0
      ? recipes.reduce((sum, r) => sum + (r.food_cost_percentage || 0), 0) /
        recipes.length
      : 0;
  const totalCost = recipes.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-100 dark:from-gray-900 dark:via-slate-900 dark:to-orange-950 p-3 md:p-6 pb-28 md:pb-8">
      {/* Mobile Top Bar (<md) */}
      {isMobile ? (
        <div className="mb-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-orange-200/60 dark:border-orange-500/20 rounded-2xl p-3 shadow-md">
          {/* Row 1: Header + Action buttons */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-xl text-white shadow-sm flex-shrink-0">
                <ChefHat className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                  Recipes & Costing
                </h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  {restaurantName || "Recipe & Cost Management"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <HelpProvider />
              <Button
                onClick={() => setShowRecipeDialog(true)}
                size="sm"
                className="h-8 px-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1"
                title="New Recipe"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden xs:inline">Recipe</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Compact 4-stat micro row (<50px) */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-orange-50/60 dark:bg-gray-900/60 rounded-xl border border-orange-100 dark:border-orange-950/40">
            {/* Total */}
            <div className="text-center p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-xs">
              <div className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase leading-none mb-0.5">Total</div>
              <div className="text-xs font-extrabold text-gray-800 dark:text-gray-100 font-mono leading-none">{totalRecipes}</div>
            </div>
            {/* Food Cost */}
            <div className="text-center p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-xs">
              <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase leading-none mb-0.5">Cost %</div>
              <div className="text-xs font-extrabold text-gray-800 dark:text-gray-100 font-mono leading-none">{avgCostPercentage.toFixed(0)}%</div>
            </div>
            {/* Total Cost */}
            <div className="text-center p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-xs">
              <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase leading-none mb-0.5">Cost</div>
              <div className="text-xs font-extrabold text-gray-800 dark:text-gray-100 font-mono leading-none truncate">{currencySymbol}{totalCost.toFixed(0)}</div>
            </div>
            {/* Categories */}
            <div className="text-center p-1 rounded-lg bg-white/80 dark:bg-gray-800/80 shadow-xs">
              <div className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase leading-none mb-0.5">Types</div>
              <div className="text-xs font-extrabold text-gray-800 dark:text-gray-100 font-mono leading-none">{new Set(recipes.map((r) => r.category)).size}</div>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Header */
        <div className="mb-4 md:mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-orange-500/20 rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex items-start md:items-center gap-3 md:gap-4">
              <div className="p-3 md:p-4 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-xl md:rounded-2xl shadow-lg shadow-orange-500/30 flex-shrink-0">
                <ChefHat className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow-md" />
              </div>
              <div className="min-w-0 flex-1">
                {restaurantName && (
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-orange-300 mb-0.5">
                    {restaurantName}
                  </p>
                )}
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent break-words">
                  Recipe & Costing Management
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg mt-1 md:mt-2">
                  Manage recipes, calculate costs, and track batch production
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <HelpProvider />
              <Button
                onClick={() => setShowRecipeDialog(true)}
                size="lg"
                className="flex-1 md:flex-none bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:-translate-y-0.5 transition-all duration-300"
              >
                <Plus className="mr-2 h-5 w-5" />
                New Recipe
              </Button>
            </div>
          </div>

          {/* Stats Cards (Desktop) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6">
            {/* Total Recipes */}
            <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-amber-500" />
              <CardHeader className="pb-2 md:pb-3 pt-3">
                <CardTitle className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 md:gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                    <ChefHat className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                  Total Recipes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {totalRecipes}
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {activeRecipes}
                  </span>{" "}
                  active
                </p>
              </CardContent>
            </Card>

            {/* Avg Food Cost */}
            <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div
                className={`h-1.5 w-full ${avgCostPercentage <= 30 ? "bg-gradient-to-r from-emerald-500 to-green-500" : avgCostPercentage <= 35 ? "bg-gradient-to-r from-amber-500 to-yellow-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}
              />
              <CardHeader className="pb-2 md:pb-3 pt-3">
                <CardTitle className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 md:gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${avgCostPercentage <= 30 ? "bg-gradient-to-br from-emerald-500 to-green-500" : avgCostPercentage <= 35 ? "bg-gradient-to-br from-amber-500 to-yellow-500" : "bg-gradient-to-br from-red-500 to-rose-500"}`}
                  >
                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                  Avg Food Cost %
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div
                  className={`text-2xl md:text-3xl font-bold ${avgCostPercentage <= 30 ? "text-emerald-600" : avgCostPercentage <= 35 ? "text-amber-600" : "text-red-600"}`}
                >
                  {avgCostPercentage.toFixed(1)}%
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Target:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    &lt;30%
                  </span>
                </p>
              </CardContent>
            </Card>

            {/* Total Cost */}
            <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
              <CardHeader className="pb-2 md:pb-3 pt-3">
                <CardTitle className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 md:gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                    <Calculator className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                  Total Cost
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {currencySymbol}
                  {totalCost.toFixed(2)}
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  All recipes combined
                </p>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
              <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-pink-500" />
              <CardHeader className="pb-2 md:pb-3 pt-3">
                <CardTitle className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 md:gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Package className="h-3 w-3 md:h-4 md:w-4 text-white" />
                  </div>
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {new Set(recipes.map((r) => r.category)).size}
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Different types
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-orange-500/20 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="recipes" className="p-2.5 sm:p-4 md:p-6">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800/80 dark:to-gray-700/80 p-1 rounded-xl sm:rounded-2xl border border-orange-100 dark:border-orange-500/30 gap-1">
            <TabsTrigger
              value="recipes"
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 text-[11px] sm:text-xs md:text-sm rounded-lg sm:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold transition-all duration-300"
            >
              <Utensils className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Recipes</span>
            </TabsTrigger>
            <TabsTrigger
              value="costing"
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 text-[11px] sm:text-xs md:text-sm rounded-lg sm:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold transition-all duration-300"
            >
              <Calculator className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Costing</span>
            </TabsTrigger>
            <TabsTrigger
              value="engineering"
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 text-[11px] sm:text-xs md:text-sm rounded-lg sm:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold transition-all duration-300"
            >
              <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Matrix</span>
            </TabsTrigger>
            <TabsTrigger
              value="batch"
              disabled
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 text-[11px] sm:text-xs md:text-sm rounded-lg sm:rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md font-bold transition-all duration-300 pointer-events-none opacity-50 cursor-not-allowed"
            >
              <Factory className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Batch</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="mt-4 md:mt-6">
            <RecipeList
              recipes={recipes}
              isLoading={isLoading}
              onEdit={handleEditRecipe}
            />
          </TabsContent>

          <TabsContent value="costing" className="mt-4 md:mt-6">
            <FeatureLock feature="recipes.costing">
              <RecipeCostingCard recipes={recipes} />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="engineering" className="mt-4 md:mt-6">
            <FeatureLock feature="recipes.menu_engineering">
              <MenuEngineering recipes={recipes} />
            </FeatureLock>
          </TabsContent>

          <TabsContent value="batch" className="mt-4 md:mt-6">
            <FeatureLock feature="recipes.batch_processing">
              <BatchProductionManager batchProductions={batchProductions} />
            </FeatureLock>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recipe Dialog */}
      <RecipeDialog
        open={showRecipeDialog}
        onOpenChange={handleCloseDialog}
        recipe={selectedRecipe}
      />

      {!isNativeApp() && <MobileNavigation />}
    </div>
  );
};

export default RecipeManagement;
