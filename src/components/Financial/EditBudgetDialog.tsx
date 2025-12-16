import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Minus, Save } from "lucide-react";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface EditBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: {
    id: string;
    budget_name: string;
    budget_type: string;
    budget_year: number;
    status: string;
    budget_line_items: Array<{
      id: string;
      account_id?: string;
      budgeted_amount: number;
      actual_amount: number;
      period_start: string;
      period_end: string;
      account: {
        id: string;
        account_name: string;
        account_code: string;
      } | null;
    }>;
  };
}

interface BudgetLineItem {
  id?: string;
  account_id: string;
  budgeted_amount: number;
  actual_amount: number;
  period_start: string;
  period_end: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

export const EditBudgetDialog = ({ open, onOpenChange, budget }: EditBudgetDialogProps) => {
  const { data: financialData } = useFinancialData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    budget_name: "",
    budget_type: "annual",
    budget_year: new Date().getFullYear(),
    status: "draft",
  });

  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);

  // Initialize form with budget data
  useEffect(() => {
    if (budget) {
      setFormData({
        budget_name: budget.budget_name,
        budget_type: budget.budget_type,
        budget_year: budget.budget_year,
        status: budget.status,
      });
      
      setLineItems(budget.budget_line_items.map(item => ({
        id: item.id,
        account_id: item.account?.id || "",
        budgeted_amount: item.budgeted_amount,
        actual_amount: item.actual_amount,
        period_start: item.period_start,
        period_end: item.period_end,
        isNew: false,
        isDeleted: false,
      })));
    }
  }, [budget]);

  const handleAddLineItem = () => {
    setLineItems(prev => [...prev, {
      account_id: "",
      budgeted_amount: 0,
      actual_amount: 0,
      period_start: `${formData.budget_year}-01-01`,
      period_end: `${formData.budget_year}-12-31`,
      isNew: true,
      isDeleted: false,
    }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, isDeleted: true } : item
    ));
  };

  const handleLineItemChange = (index: number, field: keyof BudgetLineItem, value: any) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Validate form
      if (!formData.budget_name.trim()) {
        throw new Error("Budget name is required");
      }

      const activeItems = lineItems.filter(item => !item.isDeleted);
      if (activeItems.some(item => !item.account_id || item.budgeted_amount <= 0)) {
        throw new Error("All line items must have an account and positive amount");
      }

      // Update budget
      const { error: budgetError } = await supabase
        .from("budgets")
        .update({
          budget_name: formData.budget_name,
          budget_type: formData.budget_type,
          budget_year: formData.budget_year,
          status: formData.status,
        })
        .eq("id", budget.id);

      if (budgetError) throw budgetError;

      // Handle line item changes
      for (const item of lineItems) {
        if (item.isDeleted && item.id) {
          // Delete existing item
          await supabase
            .from("budget_line_items")
            .delete()
            .eq("id", item.id);
        } else if (item.isNew && !item.isDeleted) {
          // Insert new item
          await supabase
            .from("budget_line_items")
            .insert({
              budget_id: budget.id,
              account_id: item.account_id,
              budgeted_amount: item.budgeted_amount,
              actual_amount: item.actual_amount,
              period_start: item.period_start,
              period_end: item.period_end,
              variance_amount: item.actual_amount - item.budgeted_amount,
              variance_percentage: item.budgeted_amount > 0 
                ? ((item.actual_amount - item.budgeted_amount) / item.budgeted_amount) * 100 
                : 0,
            });
        } else if (item.id && !item.isDeleted) {
          // Update existing item
          await supabase
            .from("budget_line_items")
            .update({
              account_id: item.account_id,
              budgeted_amount: item.budgeted_amount,
              actual_amount: item.actual_amount,
              period_start: item.period_start,
              period_end: item.period_end,
              variance_amount: item.actual_amount - item.budgeted_amount,
              variance_percentage: item.budgeted_amount > 0 
                ? ((item.actual_amount - item.budgeted_amount) / item.budgeted_amount) * 100 
                : 0,
            })
            .eq("id", item.id);
        }
      }

      toast({
        title: "Success",
        description: "Budget updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["financial-data"] });
      onOpenChange(false);

    } catch (error: any) {
      console.error("Error updating budget:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update budget",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activeLineItems = lineItems.filter(item => !item.isDeleted);
  const totalBudgeted = activeLineItems.reduce((sum, item) => sum + item.budgeted_amount, 0);
  const totalActual = activeLineItems.reduce((sum, item) => sum + item.actual_amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
          <DialogDescription>
            Modify budget details and line items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Budget Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget_name">Budget Name</Label>
              <Input
                id="budget_name"
                value={formData.budget_name}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_name: e.target.value }))}
                placeholder="e.g., Annual Budget 2024"
              />
            </div>

            <div>
              <Label htmlFor="budget_type">Budget Type</Label>
              <Select
                value={formData.budget_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, budget_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="budget_year">Budget Year</Label>
              <Input
                id="budget_year"
                type="number"
                value={formData.budget_year}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_year: Number(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Budget Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div>
              <p className="text-sm text-muted-foreground">Total Budgeted</p>
              <p className="text-xl font-bold text-blue-600">
                <CurrencyDisplay amount={totalBudgeted} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Actual</p>
              <p className={`text-xl font-bold ${totalActual > totalBudgeted ? 'text-red-600' : 'text-green-600'}`}>
                <CurrencyDisplay amount={totalActual} />
              </p>
            </div>
          </div>

          {/* Budget Line Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Budget Categories</h3>
              <Button onClick={handleAddLineItem} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => {
                if (item.isDeleted) return null;
                
                return (
                  <div key={item.id || index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg bg-white dark:bg-gray-900">
                    <div className="col-span-4">
                      <Label className="text-xs text-muted-foreground">Account</Label>
                      <Select
                        value={item.account_id}
                        onValueChange={(value) => handleLineItemChange(index, "account_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          {financialData?.accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Budgeted</Label>
                      <Input
                        type="number"
                        value={item.budgeted_amount}
                        onChange={(e) => handleLineItemChange(index, "budgeted_amount", Number(e.target.value))}
                        min="0"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Actual</Label>
                      <Input
                        type="number"
                        value={item.actual_amount}
                        onChange={(e) => handleLineItemChange(index, "actual_amount", Number(e.target.value))}
                        min="0"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Start</Label>
                      <Input
                        type="date"
                        value={item.period_start}
                        onChange={(e) => handleLineItemChange(index, "period_start", e.target.value)}
                      />
                    </div>

                    <div className="col-span-1">
                      <Label className="text-xs text-muted-foreground">End</Label>
                      <Input
                        type="date"
                        value={item.period_end}
                        onChange={(e) => handleLineItemChange(index, "period_end", e.target.value)}
                      />
                    </div>

                    <div className="col-span-1 flex justify-center pt-5">
                      <Button
                        onClick={() => handleRemoveLineItem(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
