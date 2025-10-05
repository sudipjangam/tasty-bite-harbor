import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Recipe } from "@/hooks/useRecipes";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface RecipeCostingCardProps {
  recipes: Recipe[];
}

export const RecipeCostingCard = ({ recipes }: RecipeCostingCardProps) => {
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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Optimal Cost Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {optimalCostRecipes.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Food cost ≤ 30%
            </p>
            <Progress 
              value={(optimalCostRecipes.length / totalRecipes) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4 text-blue-600" />
              Average Food Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {avgFoodCost.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: 25-30%
            </p>
            <Progress 
              value={Math.min(avgFoodCost, 100)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              High Cost Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {highCostRecipes.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Food cost &gt; 35%
            </p>
            <Progress 
              value={(highCostRecipes.length / totalRecipes) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Profitable Recipes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Most Profitable Recipes
          </CardTitle>
          <CardDescription>
            Recipes with the highest profit margins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topProfitableRecipes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No active recipes with pricing data
              </p>
            ) : (
              topProfitableRecipes.map((recipe) => (
                <div key={recipe.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{recipe.name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>Cost: ₹{recipe.total_cost.toFixed(2)}</span>
                      <span>Price: ₹{recipe.selling_price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-800">
                      {recipe.margin_percentage.toFixed(1)}% Margin
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {recipe.food_cost_percentage.toFixed(1)}% Food Cost
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* High Cost Recipes (Needs Attention) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-600" />
            Recipes Needing Attention
          </CardTitle>
          <CardDescription>
            High food cost percentage - consider repricing or reformulating
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCostlyRecipes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                All recipes have acceptable food costs
              </p>
            ) : (
              topCostlyRecipes.map((recipe) => (
                <div key={recipe.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex-1">
                    <p className="font-medium">{recipe.name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>Cost: ₹{recipe.total_cost.toFixed(2)}</span>
                      <span>Price: ₹{recipe.selling_price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">
                      {recipe.food_cost_percentage.toFixed(1)}% Food Cost
                    </Badge>
                    <p className="text-xs text-red-600 mt-1">
                      {recipe.margin_percentage.toFixed(1)}% Margin
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Costing Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-green-600 mt-1.5" />
              <div>
                <p className="font-medium">Target Food Cost: 25-30%</p>
                <p className="text-muted-foreground">
                  Maintain food costs in this range for optimal profitability
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-600 mt-1.5" />
              <div>
                <p className="font-medium">Review Recipes Above 35%</p>
                <p className="text-muted-foreground">
                  Consider portion control, ingredient substitution, or price increases
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5" />
              <div>
                <p className="font-medium">Regular Cost Updates</p>
                <p className="text-muted-foreground">
                  Update ingredient costs regularly to maintain accurate recipe costing
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
