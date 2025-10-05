import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Clock, DollarSign, TrendingUp } from "lucide-react";
import { Recipe, useRecipes } from "@/hooks/useRecipes";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RecipeListProps {
  recipes: Recipe[];
  isLoading: boolean;
  onEdit: (recipe: Recipe) => void;
}

export const RecipeList = ({ recipes, isLoading, onEdit }: RecipeListProps) => {
  const { deleteRecipe } = useRecipes();

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      appetizer: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      main_course: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      dessert: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
      beverage: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
      side_dish: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      salad: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      soup: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      breakfast: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      snack: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getDifficultyColor = (difficulty: string | null) => {
    if (!difficulty) return "bg-gray-100 text-gray-800";
    const colors: Record<string, string> = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      hard: "bg-red-100 text-red-800",
    };
    return colors[difficulty];
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No recipes yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first recipe to start managing costs and portions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">{recipe.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {recipe.description || "No description"}
                </CardDescription>
              </div>
              {!recipe.is_active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Badge className={getCategoryColor(recipe.category)}>
                {recipe.category.replace('_', ' ')}
              </Badge>
              {recipe.difficulty && (
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {recipe.difficulty}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Time Info */}
              {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {recipe.prep_time_minutes && `Prep: ${recipe.prep_time_minutes}m`}
                    {recipe.prep_time_minutes && recipe.cook_time_minutes && ' | '}
                    {recipe.cook_time_minutes && `Cook: ${recipe.cook_time_minutes}m`}
                  </span>
                </div>
              )}

              {/* Cost Info */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Cost:</span>
                  <span>₹{recipe.total_cost.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Price:</span>
                  <span>₹{recipe.selling_price.toFixed(2)}</span>
                </div>
              </div>

              {/* Food Cost % */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>Food Cost:</span>
                </div>
                <Badge 
                  variant={recipe.food_cost_percentage > 35 ? "destructive" : "default"}
                >
                  {recipe.food_cost_percentage.toFixed(1)}%
                </Badge>
              </div>

              {/* Serving Size */}
              <div className="text-sm text-muted-foreground">
                Serves: {recipe.serving_size} {recipe.serving_unit || 'portions'}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(recipe)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Recipe?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{recipe.name}" and all its ingredient associations. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteRecipe.mutate(recipe.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
