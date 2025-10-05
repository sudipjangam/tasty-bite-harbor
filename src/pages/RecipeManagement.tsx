import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChefHat, Plus, TrendingUp, Package, Calculator } from "lucide-react";
import { RecipeList } from "@/components/Recipes/RecipeList";
import { RecipeDialog } from "@/components/Recipes/RecipeDialog";
import { BatchProductionManager } from "@/components/Recipes/BatchProductionManager";
import { RecipeCostingCard } from "@/components/Recipes/RecipeCostingCard";
import { useRecipes } from "@/hooks/useRecipes";
import { MobileNavigation } from "@/components/ui/mobile-navigation";

const RecipeManagement = () => {
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const { recipes, isLoading } = useRecipes();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-100 dark:from-gray-900 dark:via-slate-900 dark:to-orange-950 p-6">
      {/* Header */}
      <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl shadow-lg">
              <ChefHat className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Recipe & Costing Management
              </h1>
              <p className="text-muted-foreground text-lg mt-2">
                Manage recipes, calculate costs, and track batch production
              </p>
            </div>
          </div>
          <Button onClick={() => setShowRecipeDialog(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Recipe
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ChefHat className="h-4 w-4" />
                Total Recipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecipes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeRecipes} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Food Cost %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCostPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Target: &lt;30%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All recipes combined
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(recipes.map(r => r.category)).size}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Different types
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/90 backdrop-blur-sm border border-white/30 rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="recipes" className="p-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="costing">Costing Analysis</TabsTrigger>
            <TabsTrigger value="batch">Batch Production</TabsTrigger>
          </TabsList>

          <TabsContent value="recipes" className="mt-6">
            <RecipeList 
              recipes={recipes} 
              isLoading={isLoading}
              onEdit={handleEditRecipe}
            />
          </TabsContent>

          <TabsContent value="costing" className="mt-6">
            <RecipeCostingCard recipes={recipes} />
          </TabsContent>

          <TabsContent value="batch" className="mt-6">
            <BatchProductionManager />
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
