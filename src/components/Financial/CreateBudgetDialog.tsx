import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialData } from "@/hooks/useFinancialData";
import { Plus, Minus } from "lucide-react";

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BudgetLineItem {
  account_id: string;
  budgeted_amount: number;
  period_start: string;
  period_end: string;
}

export const CreateBudgetDialog = ({ open, onOpenChange }: CreateBudgetDialogProps) => {
  const { data: financialData } = useFinancialData();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    budget_name: "",
    budget_type: "annual",
    budget_year: new Date().getFullYear(),
    status: "draft",
  });

  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([
    {
      account_id: "",
      budgeted_amount: 0,
      period_start: `${new Date().getFullYear()}-01-01`,
      period_end: `${new Date().getFullYear()}-12-31`,
    }
  ]);

  const handleAddLineItem = () => {
    setLineItems(prev => [...prev, {
      account_id: "",
      budgeted_amount: 0,
      period_start: `${formData.budget_year}-01-01`,
      period_end: `${formData.budget_year}-12-31`,
    }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleLineItemChange = (index: number, field: keyof BudgetLineItem, value: any) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (!financialData?.restaurantId) {
        throw new Error("Restaurant information not found");
      }

      // Validate form
      if (!formData.budget_name.trim()) {
        throw new Error("Budget name is required");
      }

      if (lineItems.some(item => !item.account_id || item.budgeted_amount <= 0)) {
        throw new Error("All line items must have an account and positive amount");
      }

      // Create budget
      const { data: budget, error: budgetError } = await supabase
        .from("budgets")
        .insert({
          restaurant_id: financialData.restaurantId,
          budget_name: formData.budget_name,
          budget_type: formData.budget_type,
          budget_year: formData.budget_year,
          status: formData.status,
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      // Create budget line items
      const lineItemsData = lineItems.map(item => ({
        budget_id: budget.id,
        account_id: item.account_id,
        budgeted_amount: item.budgeted_amount,
        period_start: item.period_start,
        period_end: item.period_end,
        actual_amount: 0,
        variance_amount: 0,
        variance_percentage: 0,
      }));

      const { error: lineItemsError } = await supabase
        .from("budget_line_items")
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      toast({
        title: "Success",
        description: "Budget created successfully",
      });

      // Reset form
      setFormData({
        budget_name: "",
        budget_type: "annual",
        budget_year: new Date().getFullYear(),
        status: "draft",
      });
      
      setLineItems([{
        account_id: "",
        budgeted_amount: 0,
        period_start: `${new Date().getFullYear()}-01-01`,
        period_end: `${new Date().getFullYear()}-12-31`,
      }]);

      onOpenChange(false);

    } catch (error: any) {
      console.error("Error creating budget:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create budget",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
          <DialogDescription>
            Set up a new budget for tracking your financial performance
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
                min={new Date().getFullYear()}
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
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg">
                  <div className="col-span-6">
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
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.budgeted_amount}
                      onChange={(e) => handleLineItemChange(index, "budgeted_amount", Number(e.target.value))}
                      min="0"
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      type="date"
                      value={item.period_start}
                      onChange={(e) => handleLineItemChange(index, "period_start", e.target.value)}
                    />
                  </div>

                  <div className="col-span-1">
                    <Input
                      type="date"
                      value={item.period_end}
                      onChange={(e) => handleLineItemChange(index, "period_end", e.target.value)}
                    />
                  </div>

                  <div className="col-span-1">
                    {lineItems.length > 1 && (
                      <Button
                        onClick={() => handleRemoveLineItem(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Budget"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};