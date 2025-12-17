import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChefHat, Plus, TrendingUp, Package, Calculator, Sparkles, Utensils, Factory } from "lucide-react";
import { RecipeList } from "@/components/Recipes/RecipeList";
import { RecipeDialog } from "@/components/Recipes/RecipeDialog";
import { BatchProductionManager } from "@/components/Recipes/BatchProductionManager";
import { RecipeCostingCard } from "@/components/Recipes/RecipeCostingCard";
import { useRecipes } from "@/hooks/useRecipes";
import { MobileNavigation } from "@/components/ui/mobile-navigation";

const RecipeManagement = () => {
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const { recipes, batchProductions, isLoading } = useRecipes();

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
  const activeRecipes = recipes.filter(r => r.is_active).length;
  const avgCostPercentage = recipes.length > 0
    ? recipes.reduce((sum, r) => sum + (r.food_cost_percentage || 0), 0) / recipes.length
    : 0;
  const totalCost = recipes.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-100 dark:from-gray-900 dark:via-slate-900 dark:to-orange-950 p-3 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-orange-500/20 rounded-2xl md:rounded-3xl shadow-xl p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-start md:items-center gap-3 md:gap-4">
            <div className="p-3 md:p-4 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-xl md:rounded-2xl shadow-lg shadow-orange-500/30 flex-shrink-0">
              <ChefHat className="h-6 w-6 md:h-8 md:w-8 text-white drop-shadow-md" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent break-words">
                Recipe & Costing Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg mt-1 md:mt-2">
                Manage recipes, calculate costs, and track batch production
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowRecipeDialog(true)} 
            size="lg" 
            className="w-full md:w-auto flex-shrink-0 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Recipe
          </Button>
        </div>

        {/* Stats Cards */}
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
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{activeRecipes}</span> active
              </p>
            </CardContent>
          </Card>

          {/* Avg Food Cost */}
          <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <div className={`h-1.5 w-full ${avgCostPercentage <= 30 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : avgCostPercentage <= 35 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`} />
            <CardHeader className="pb-2 md:pb-3 pt-3">
              <CardTitle className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1 md:gap-2">
                <div className={`p-1.5 rounded-lg ${avgCostPercentage <= 30 ? 'bg-gradient-to-br from-emerald-500 to-green-500' : avgCostPercentage <= 35 ? 'bg-gradient-to-br from-amber-500 to-yellow-500' : 'bg-gradient-to-br from-red-500 to-rose-500'}`}>
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-white" />
                </div>
                Avg Food Cost %
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-2xl md:text-3xl font-bold ${avgCostPercentage <= 30 ? 'text-emerald-600' : avgCostPercentage <= 35 ? 'text-amber-600' : 'text-red-600'}`}>
                {avgCostPercentage.toFixed(1)}%
              </div>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target: <span className="text-emerald-600 dark:text-emerald-400 font-medium">&lt;30%</span>
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
                ₹{totalCost.toFixed(2)}
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
                {new Set(recipes.map(r => r.category)).size}
              </div>
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1">
                Different types
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-orange-500/20 rounded-2xl md:rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="recipes" className="p-3 md:p-6">
          <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800/80 dark:to-gray-700/80 p-1.5 rounded-2xl border border-orange-100 dark:border-orange-500/30">
            <TabsTrigger 
              value="recipes" 
              className="flex items-center gap-2 text-xs md:text-sm rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 font-semibold transition-all duration-300"
            >
              <Utensils className="h-4 w-4" />
              <span className="hidden md:inline">Recipes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="costing" 
              className="flex items-center gap-2 text-xs md:text-sm rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 font-semibold transition-all duration-300"
            >
              <Calculator className="h-4 w-4" />
              <span className="hidden md:inline">Costing</span>
            </TabsTrigger>
            <TabsTrigger 
              value="batch" 
              className="flex items-center gap-2 text-xs md:text-sm rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 font-semibold transition-all duration-300"
            >
              <Factory className="h-4 w-4" />
              <span className="hidden md:inline">Batch</span>
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
            <RecipeCostingCard recipes={recipes} />
          </TabsContent>

          <TabsContent value="batch" className="mt-4 md:mt-6">
            <BatchProductionManager batchProductions={batchProductions} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Recipe Dialog */}
      <RecipeDialog
        open={showRecipeDialog}
        onOpenChange={handleCloseDialog}
        recipe={selectedRecipe}
      />

      <MobileNavigation />
    </div>
  );
};

export default RecipeManagement;
