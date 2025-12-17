import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Clock, DollarSign, TrendingUp, MoreVertical, ChefHat, Flame, Users } from "lucide-react";
import { Recipe, useRecipes } from "@/hooks/useRecipes";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface RecipeListProps {
  recipes: Recipe[];
  isLoading: boolean;
  onEdit: (recipe: Recipe) => void;
}

export const RecipeList = ({ recipes, isLoading, onEdit }: RecipeListProps) => {
  const { deleteRecipe } = useRecipes();
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      appetizer: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-sm shadow-blue-500/30",
      main_course: "bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 shadow-sm shadow-rose-500/30",
      dessert: "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-sm shadow-pink-500/30",
      beverage: "bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-0 shadow-sm shadow-indigo-500/30",
      side_dish: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm shadow-amber-500/30",
      salad: "bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-sm shadow-emerald-500/30",
      soup: "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-sm shadow-orange-500/30",
      breakfast: "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0 shadow-sm shadow-violet-500/30",
      snack: "bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-sm shadow-yellow-500/30",
    };
    return colors[category] || "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0 shadow-sm shadow-gray-500/30";
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    if (!difficulty) return null;
    const styles: Record<string, { color: string; emoji: string }> = {
      easy: { color: "bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-sm shadow-emerald-500/30", emoji: "🟢" },
      medium: { color: "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm shadow-amber-500/30", emoji: "🟡" },
      hard: { color: "bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-sm shadow-red-500/30", emoji: "🔴" },
    };
    const style = styles[difficulty] || styles.medium;
    return (
      <Badge className={`${style.color} capitalize font-medium border-0`}>
        {style.emoji} {difficulty}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-300 to-amber-300 animate-pulse" />
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4 mb-2 rounded-xl" />
              <Skeleton className="h-4 w-1/3 rounded-lg" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/4 rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <Card className="border-2 border-dashed border-orange-200 dark:border-orange-500/30 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800/50 dark:to-gray-900/50 shadow-none rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg shadow-orange-500/30 mb-4">
            <ChefHat className="h-10 w-10 text-white" />
          </div>
          <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No recipes found</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
            Create your first recipe to start managing detailed costs, ingredients, and pricing margins.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <Card 
            key={recipe.id} 
            className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 hover:-translate-y-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl"
          >
            {/* Top gradient bar */}
            <div className={`h-2 w-full ${recipe.is_active ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500' : 'bg-gradient-to-r from-gray-300 to-gray-400'}`} />
            
            <CardHeader className="pb-3 pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2 space-y-3">
                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${getCategoryColor(recipe.category)} capitalize font-medium text-xs px-3 py-1`}>
                      {recipe.category.replace('_', ' ')}
                    </Badge>
                    {getDifficultyBadge(recipe.difficulty)}
                  </div>
                  
                  {/* Recipe name */}
                  <CardTitle className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent leading-tight">
                    {recipe.name}
                  </CardTitle>
                </div>
                
                {/* Menu dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-xl transition-all"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-xl shadow-xl min-w-[160px]"
                  >
                    <DropdownMenuItem 
                      onClick={() => onEdit(recipe)}
                      className="rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4 text-orange-500" /> 
                      <span className="font-medium">Edit Details</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/30 rounded-lg cursor-pointer"
                      onClick={() => setRecipeToDelete(recipe.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> 
                      <span className="font-medium">Delete Recipe</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Description */}
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[40px]">
                {recipe.description || "No description provided."}
              </p>

              {/* Time info */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>Prep: {recipe.prep_time_minutes || 0}m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span>Cook: {recipe.cook_time_minutes || 0}m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span>Serves: {recipe.serving_size}</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/60 dark:to-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Cost
                  </p>
                  <p className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                    ₹{recipe.total_cost.toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Selling Price</p>
                  <p className="font-bold text-xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    ₹{recipe.selling_price.toFixed(0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> Food Cost %
                  </p>
                  <Badge className={`font-semibold ${
                    recipe.food_cost_percentage <= 30 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-500/30' 
                      : recipe.food_cost_percentage <= 35 
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-sm shadow-amber-500/30'
                        : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm shadow-red-500/30'
                  } border-0`}>
                    {recipe.food_cost_percentage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Margin</p>
                  <p className={`font-bold text-lg ${recipe.margin_percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {recipe.margin_percentage.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Quick Action Button */}
              <Button 
                onClick={() => onEdit(recipe)}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transform hover:-translate-y-0.5 transition-all duration-300"
              >
                <Edit className="mr-2 h-4 w-4" />
                Manage Recipe
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!recipeToDelete} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-red-500/20 rounded-3xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Delete Recipe?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will permanently delete this recipe and all its ingredient associations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-6 py-3 rounded-xl transition-all duration-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300"
              onClick={() => {
                if (recipeToDelete) {
                  deleteRecipe.mutate(recipeToDelete);
                  setRecipeToDelete(null);
                }
              }}
            >
              Delete Recipe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
