import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Recipe } from "@/hooks/useRecipes";
import { TrendingUp, TrendingDown, DollarSign, Percent, PieChart, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface RecipeCostingCardProps {
  recipes: Recipe[];
}

export const RecipeCostingCard = ({ recipes }: RecipeCostingCardProps) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  // Calculate metrics
  const totalRecipes = recipes.length;
  const avgFoodCost = recipes.length > 0
    ? recipes.reduce((sum, r) => sum + (r.food_cost_percentage || 0), 0) / recipes.length
    : 0;

  const highCostRecipes = recipes.filter(r => r.food_cost_percentage > 35);
  const optimalCostRecipes = recipes.filter(r => r.food_cost_percentage <= 30);

  const topProfitableRecipes = [...recipes]
    .filter(r => r.is_active)
    .sort((a, b) => b.margin_percentage - a.margin_percentage)
    .slice(0, 5);

  const topCostlyRecipes = [...recipes]
    .filter(r => r.is_active)
    .sort((a, b) => b.food_cost_percentage - a.food_cost_percentage)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 shadow-lg border-0 rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30">
                <PieChart className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-bold text-xl">
                  Cost Analysis
                </CardTitle>
                <CardDescription className="text-emerald-700/70 dark:text-emerald-300/70">
                  Detailed breakdown of food costs and profitability
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Optimal Cost Recipes */}
        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-green-500" />
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              Optimal Cost Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {optimalCostRecipes.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Food cost ≤ 30%
            </p>
            <div className="mt-3 h-2 bg-emerald-100 dark:bg-emerald-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${totalRecipes > 0 ? (optimalCostRecipes.length / totalRecipes) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Avg Food Cost */}
        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
          <div className={`h-1.5 w-full ${avgFoodCost <= 30 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`} />
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${avgFoodCost <= 30 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>
                <Percent className="h-4 w-4 text-white" />
              </div>
              Avg Food Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${avgFoodCost <= 30 ? 'text-blue-600' : 'text-amber-600'}`}>
              {avgFoodCost.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Target: 25-30%
            </p>
            <div className="mt-3 h-2 bg-blue-100 dark:bg-blue-950 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${avgFoodCost <= 30 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                style={{ width: `${Math.min(avgFoodCost, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* High Cost Recipes */}
        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-500" />
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
              High Cost Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {highCostRecipes.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Food cost &gt; 35%
            </p>
            <div className="mt-3 h-2 bg-red-100 dark:bg-red-950 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${totalRecipes > 0 ? (highCostRecipes.length / totalRecipes) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Profitable Recipes */}
        <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-md shadow-emerald-500/30">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent font-bold">
                Most Profitable
              </span>
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Highest profit margins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProfitableRecipes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl inline-block mb-3">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <p>No active recipes with pricing data</p>
                </div>
              ) : (
                topProfitableRecipes.map((recipe, index) => (
                  <div 
                    key={recipe.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/60 dark:to-gray-700/60 border border-gray-100 dark:border-gray-700 hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-orange-600' :
                        'bg-gradient-to-br from-gray-500 to-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{recipe.name}</p>
                        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span>Cost: {currencySymbol}{recipe.total_cost.toFixed(0)}</span>
                          <span>Price: {currencySymbol}{recipe.selling_price.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-sm shadow-emerald-500/30 font-semibold">
                      {recipe.margin_percentage.toFixed(0)}% Margin
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* High Cost Recipes (Needs Attention) */}
        <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-md shadow-red-500/30">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent font-bold">
                Needs Attention
              </span>
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              High food cost percentage (&gt;35%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCostlyRecipes.filter(r => r.food_cost_percentage > 35).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl mb-3">
                    <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">All recipes are within budget!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Great job on cost control</p>
                </div>
              ) : (
                topCostlyRecipes.filter(r => r.food_cost_percentage > 35).map((recipe, index) => (
                  <div 
                    key={recipe.id} 
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-100 dark:border-red-900/30 hover:shadow-md hover:shadow-red-500/10 transition-all duration-300"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{recipe.name}</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                        Margin: {recipe.margin_percentage.toFixed(0)}%
                      </p>
                    </div>
                    <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-sm shadow-red-500/30 font-semibold">
                      {recipe.food_cost_percentage.toFixed(0)}% FC
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-0 shadow-lg rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md shadow-blue-500/30">
              <Target className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-bold text-lg">
              Cost Optimization Tips
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 shadow-sm shadow-emerald-500/50" />
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Target Food Cost</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Aim for 25-30% food cost. Recipes in this range maximize profitability without compromising quality.
              </p>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-sm shadow-amber-500/50" />
                <span className="text-amber-700 dark:text-amber-400 font-semibold">Margin Analysis</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Review any recipe with a margin below 65%. Consider re-engineering the dish or adjusting the selling price.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-5 rounded-xl border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-sm shadow-blue-500/50" />
                <span className="text-blue-700 dark:text-blue-400 font-semibold">Regular Audits</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Ingredient prices fluctuate. Update your inventory costs weekly to keep these metrics accurate.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
