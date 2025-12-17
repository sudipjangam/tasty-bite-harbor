import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, TrendingDown, Scale, Factory, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BatchProduction, useRecipes } from "@/hooks/useRecipes";
import { format, isToday, isThisMonth } from "date-fns";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface BatchProductionManagerProps {
  batchProductions: BatchProduction[];
}

export const BatchProductionManager = ({ batchProductions }: BatchProductionManagerProps) => {
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const restaurantId = useRestaurantId();
  const { recipes } = useRecipes();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [batchFormData, setBatchFormData] = useState({
    recipe_id: "",
    batch_size: "1",
    production_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  // Calculate Stats
  const todayBatches = batchProductions.filter(b => isToday(new Date(b.production_date)));
  
  const completedBatches = batchProductions.filter(b => b.status === 'completed');
  const avgYield = completedBatches.length > 0
    ? completedBatches.reduce((sum, b) => sum + (b.yield_percentage || 0), 0) / completedBatches.length
    : 0;

  const monthWaste = batchProductions
    .filter(b => isThisMonth(new Date(b.production_date)))
    .reduce((sum, b) => sum + ((b.waste_amount || 0) * (b.cost_per_unit || 0)), 0);

  const handleOpenBatchDialog = () => {
    setBatchFormData({
      recipe_id: "",
      batch_size: "1",
      production_date: new Date().toISOString().split('T')[0],
      notes: "",
    });
    setShowBatchDialog(true);
  };

  const handleCreateBatch = async () => {
    if (!restaurantId?.restaurantId || !batchFormData.recipe_id) {
      toast({
        title: "Error",
        description: "Please select a recipe",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedRecipe = recipes.find(r => r.id === batchFormData.recipe_id);
      
      const { error } = await supabase
        .from('batch_productions')
        .insert({
          restaurant_id: restaurantId.restaurantId,
          recipe_id: batchFormData.recipe_id,
          batch_size: parseInt(batchFormData.batch_size) || 1,
          production_date: batchFormData.production_date,
          notes: batchFormData.notes || null,
          status: 'planned',
          total_cost: (selectedRecipe?.total_cost || 0) * (parseInt(batchFormData.batch_size) || 1),
          cost_per_unit: selectedRecipe?.total_cost || 0,
          yield_expected: parseInt(batchFormData.batch_size) || 1,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Batch production created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['batch-productions'] });
      setShowBatchDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create batch: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-violet-900/20 shadow-lg border-0 rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-violet-500" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30">
                <Factory className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-bold text-xl">
                  Batch Production
                </CardTitle>
                <p className="text-sm text-purple-700/70 dark:text-purple-300/70 mt-1">
                  Track production, measure yields, and control waste
                </p>
              </div>
            </div>
            <Button 
              onClick={handleOpenBatchDialog}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-5 py-2 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all duration-300"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Batch
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Batches */}
        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-amber-500" />
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                <Clock className="h-4 w-4 text-white" />
              </div>
              Today's Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {todayBatches.length}
            </div>
            <Badge className={`mt-2 font-medium border-0 ${
              todayBatches.length === 0 
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm shadow-gray-500/30' 
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/30'
            }`}>
              {todayBatches.length === 0 ? "No active batches" : `${todayBatches.length} batches planned`}
            </Badge>
          </CardContent>
        </Card>

        {/* Avg Yield */}
        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
          <div className={`h-1.5 w-full ${avgYield >= 95 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : avgYield >= 85 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-amber-500 to-yellow-500'}`} />
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${avgYield >= 95 ? 'bg-gradient-to-br from-emerald-500 to-green-500' : avgYield >= 85 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-amber-500 to-yellow-500'}`}>
                <Scale className="h-4 w-4 text-white" />
              </div>
              Avg Yield
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${avgYield >= 95 ? 'text-emerald-600' : avgYield >= 85 ? 'text-blue-600' : 'text-amber-600'}`}>
              {avgYield > 0 ? `${avgYield.toFixed(1)}%` : '-'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Target: <span className="text-emerald-600 dark:text-emerald-400 font-medium">&gt;95%</span> efficiency
            </p>
          </CardContent>
        </Card>

        {/* Month Waste */}
        <Card className="overflow-hidden border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-500" />
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg">
                <TrendingDown className="h-4 w-4 text-white" />
              </div>
              Month Waste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              ₹{monthWaste.toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Recorded waste cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Production List or Empty State */}
      {batchProductions.length > 0 ? (
        <Card className="border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Production History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batchProductions.slice(0, 10).map((batch) => {
                const recipe = recipes.find(r => r.id === batch.recipe_id);
                return (
                  <div 
                    key={batch.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">
                        {recipe?.name || 'Unknown Recipe'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(batch.production_date), 'MMM dd, yyyy')} • {batch.batch_size} units
                      </p>
                    </div>
                    <Badge className={`font-medium border-0 ${
                      batch.status === 'completed' 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                        : batch.status === 'in_progress'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                          : batch.status === 'planned'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                            : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                    }`}>
                      {batch.status.replace('_', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-purple-200 dark:border-purple-500/30 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800/50 dark:to-gray-900/50 shadow-none rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/30 mb-4">
              <Scale className="h-10 w-10 text-white" />
            </div>
            <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No production history</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Start logging your batch productions to see detailed analysis of yields and variances over time.
            </p>
            <Button 
              onClick={handleOpenBatchDialog}
              className="mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all duration-300"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start First Batch
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Batch Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-2xl p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-violet-500 p-6 rounded-t-3xl">
            <DialogHeader className="text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Factory className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">New Batch Production</DialogTitle>
                  <DialogDescription className="text-white/80 mt-1">
                    Create a new batch for production tracking
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5">
            {/* Recipe Selection */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300 font-semibold">Select Recipe *</Label>
              <Select 
                value={batchFormData.recipe_id}
                onValueChange={(value) => setBatchFormData(prev => ({ ...prev, recipe_id: value }))}
              >
                <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl">
                  <SelectValue placeholder="Choose a recipe" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl">
                  {recipes.filter(r => r.is_active).map(recipe => (
                    <SelectItem key={recipe.id} value={recipe.id} className="rounded-lg">
                      {recipe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Size */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300 font-semibold">Batch Size (units) *</Label>
              <Input
                type="number"
                value={batchFormData.batch_size}
                onChange={(e) => setBatchFormData(prev => ({ ...prev, batch_size: e.target.value }))}
                min="1"
                className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl"
              />
            </div>

            {/* Production Date */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300 font-semibold">Production Date</Label>
              <Input
                type="date"
                value={batchFormData.production_date}
                onChange={(e) => setBatchFormData(prev => ({ ...prev, production_date: e.target.value }))}
                className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300 font-semibold">Notes (optional)</Label>
              <Textarea
                value={batchFormData.notes}
                onChange={(e) => setBatchFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special notes for this batch..."
                rows={3}
                className="bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-600 rounded-xl resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBatchDialog(false)}
                className="border-2 border-gray-200 dark:border-gray-600 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateBatch}
                disabled={isSubmitting || !batchFormData.recipe_id}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-purple-500/30"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Batch
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
