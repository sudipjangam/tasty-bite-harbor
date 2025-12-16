import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useFinancialData } from "@/hooks/useFinancialData";
import { CreateBudgetDialog } from "./CreateBudgetDialog";
import { EditBudgetDialog } from "./EditBudgetDialog";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Pencil, 
  Trash2,
  PlusCircle,
  LayoutDashboard,
  Calendar,
  CheckCircle2,
  XCircle,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
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

interface BudgetLineItem {
  id: string;
  budgeted_amount: number;
  actual_amount: number;
  variance_amount: number;
  variance_percentage: number;
  period_start: string;
  period_end: string;
  account: {
    id: string;
    account_name: string;
    account_code: string;
    account_type: string;
  } | null;
}

interface Budget {
  id: string;
  budget_name: string;
  budget_type: string;
  budget_year: number;
  status: string;
  created_at: string;
  budget_line_items: BudgetLineItem[];
}

export const BudgetManagement = () => {
  const { data: financialData, isLoading } = useFinancialData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const calculateVariance = (actual: number, budgeted: number) => {
    if (budgeted === 0) return 0;
    return ((actual - budgeted) / budgeted) * 100;
  };

  const getVarianceColor = (variance: number, isExpense: boolean = true) => {
    if (isExpense) {
      return variance > 0 ? "text-red-600" : "text-green-600";
    }
    return variance > 0 ? "text-green-600" : "text-red-600";
  };

  const getVarianceIcon = (variance: number, isExpense: boolean = true) => {
    const isPositive = variance > 0;
    const isGood = isExpense ? !isPositive : isPositive;
    
    if (Math.abs(variance) > 10) {
      return isGood ? <TrendingDown className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return isGood ? <TrendingDown className="h-4 w-4 text-green-500" /> : <TrendingUp className="h-4 w-4 text-orange-500" />;
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudget) return;
    
    try {
      setIsDeleting(true);
      
      // Delete line items first
      await supabase
        .from("budget_line_items")
        .delete()
        .eq("budget_id", deletingBudget.id);
      
      // Delete budget
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", deletingBudget.id);
        
      if (error) throw error;
      
      toast({
        title: "Budget Deleted",
        description: `${deletingBudget.budget_name} has been deleted`
      });
      
      queryClient.invalidateQueries({ queryKey: ["financial-data"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete budget",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setDeletingBudget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const budgets = (financialData?.budgets || []) as Budget[];
  
  // Calculate totals from actual budget data
  const totalBudgeted = budgets.reduce((total, budget) => {
    return total + (budget.budget_line_items?.reduce((sum, item) => 
      sum + (item.budgeted_amount || 0), 0) || 0);
  }, 0);
  
  const totalActual = budgets.reduce((total, budget) => {
    return total + (budget.budget_line_items?.reduce((sum, item) => 
      sum + (item.actual_amount || 0), 0) || 0);
  }, 0);
  
  const remaining = totalBudgeted - totalActual;
  const usedPercentage = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  // Generate dynamic alerts from actual budget data
  const generateAlerts = () => {
    const alerts: { type: 'danger' | 'warning' | 'success'; title: string; message: string; budget: string }[] = [];
    
    budgets.forEach(budget => {
      budget.budget_line_items?.forEach(item => {
        if (!item.account) return;
        
        const variance = calculateVariance(item.actual_amount, item.budgeted_amount);
        const accountName = item.account.account_name;
        
        if (variance > 10) {
          alerts.push({
            type: 'danger',
            title: `${accountName} Over Budget`,
            message: `Spent ₹${item.actual_amount.toLocaleString()} against budget of ₹${item.budgeted_amount.toLocaleString()} (${Math.abs(variance).toFixed(1)}% over)`,
            budget: budget.budget_name
          });
        } else if (variance > 0 && variance <= 10) {
          alerts.push({
            type: 'warning',
            title: `${accountName} Near Limit`,
            message: `Spent ₹${item.actual_amount.toLocaleString()} against budget of ₹${item.budgeted_amount.toLocaleString()} (${variance.toFixed(1)}% over)`,
            budget: budget.budget_name
          });
        } else if (variance < -10 && item.actual_amount > 0) {
          alerts.push({
            type: 'success',
            title: `${accountName} Under Budget`,
            message: `Spent ₹${item.actual_amount.toLocaleString()} against budget of ₹${item.budgeted_amount.toLocaleString()} (${Math.abs(variance).toFixed(1)}% under)`,
            budget: budget.budget_name
          });
        }
      });
    });
    
    return alerts.slice(0, 5); // Show top 5 alerts
  };

  const alerts = generateAlerts();

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30 rounded-2xl p-6 border border-emerald-200/50 dark:border-emerald-800/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Budget Management
                </h2>
                {budgets.length > 0 && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {budgets.length} Budget{budgets.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                Track your budget vs actual performance
              </p>
            </div>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Budget
          </Button>
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200/50 dark:border-blue-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Budget</CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              <CurrencyDisplay amount={totalBudgeted} />
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
              {budgets.length > 0 ? 'Active budgets' : 'No budgets created'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200/50 dark:border-purple-800/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Actual Spent</CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              <CurrencyDisplay amount={totalActual} />
            </div>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
              {usedPercentage.toFixed(1)}% of budget used
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${remaining >= 0 ? 'from-green-500/10 to-emerald-500/10 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200/50 dark:border-green-800/50' : 'from-red-500/10 to-orange-500/10 dark:from-red-900/30 dark:to-orange-900/30 border-red-200/50 dark:border-red-800/50'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${remaining >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {remaining >= 0 ? 'Remaining' : 'Over Budget'}
            </CardTitle>
            <div className={`p-2 rounded-xl ${remaining >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {remaining >= 0 ? (
                <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
              <CurrencyDisplay amount={Math.abs(remaining)} />
            </div>
            <p className={`text-xs mt-1 ${remaining >= 0 ? 'text-green-600/70 dark:text-green-400/70' : 'text-red-600/70 dark:text-red-400/70'}`}>
              {(100 - usedPercentage).toFixed(1)}% {remaining >= 0 ? 'remaining' : 'exceeded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      {budgets.length > 0 ? (
        <div className="space-y-4">
          {budgets.map((budget) => {
            const budgetTotal = budget.budget_line_items?.reduce((sum, item) => sum + item.budgeted_amount, 0) || 0;
            const budgetActual = budget.budget_line_items?.reduce((sum, item) => sum + item.actual_amount, 0) || 0;
            const budgetProgress = budgetTotal > 0 ? (budgetActual / budgetTotal) * 100 : 0;
            
            return (
              <Card key={budget.id} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
                        <LayoutDashboard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{budget.budget_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {budget.budget_year} • {budget.budget_type}
                          <Badge variant={budget.status === 'active' ? 'default' : 'secondary'}>
                            {budget.status}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingBudget(budget)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeletingBudget(budget)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Budget Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress: <CurrencyDisplay amount={budgetActual} /> / <CurrencyDisplay amount={budgetTotal} /></span>
                      <span className={budgetProgress > 100 ? 'text-red-600' : 'text-green-600'}>
                        {budgetProgress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(budgetProgress, 100)} className="h-2" />
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {budget.budget_line_items?.map((item) => {
                      const variance = calculateVariance(item.actual_amount, item.budgeted_amount);
                      const itemProgress = item.budgeted_amount > 0 ? (item.actual_amount / item.budgeted_amount) * 100 : 0;
                      const isExpense = item.account?.account_type === 'expense';
                      
                      return (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.account?.account_name || 'Unknown Account'}</span>
                                {variance !== 0 && (
                                  <Badge 
                                    variant={Math.abs(variance) > 10 ? "destructive" : "secondary"}
                                    className="flex items-center gap-1"
                                  >
                                    {getVarianceIcon(variance, isExpense)}
                                    {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  <CurrencyDisplay amount={item.actual_amount} />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Budget: <CurrencyDisplay amount={item.budgeted_amount} />
                                </div>
                              </div>
                            </div>
                            <Progress value={Math.min(itemProgress, 100)} className="h-1.5 mt-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <Target className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">No Budgets Created</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-md">
              Create your first budget to start tracking expenses against planned targets.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create First Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Budget Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Budget Alerts
            </CardTitle>
            <CardDescription>
              Categories that need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    alert.type === 'danger' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                    alert.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                    'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}
                >
                  {alert.type === 'danger' ? (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {alert.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Budget: {alert.budget}
                    </div>
                  </div>
                  <Badge variant={
                    alert.type === 'danger' ? 'destructive' : 
                    alert.type === 'warning' ? 'secondary' : 
                    'default'
                  }>
                    {alert.type === 'danger' ? 'Over Budget' : alert.type === 'warning' ? 'Watch' : 'On Track'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateBudgetDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
      />

      {editingBudget && (
        <EditBudgetDialog
          open={!!editingBudget}
          onOpenChange={(open) => !open && setEditingBudget(null)}
          budget={editingBudget}
        />
      )}

      <AlertDialog open={!!deletingBudget} onOpenChange={(open) => !open && setDeletingBudget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingBudget?.budget_name}"? This will also delete all associated budget line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBudget}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
