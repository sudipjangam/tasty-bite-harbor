
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useFinancialData } from "@/hooks/useFinancialData";
import { Target, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const BudgetManagement = () => {
  const { data: financialData, isLoading } = useFinancialData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const calculateVariance = (actual: number, budgeted: number) => {
    if (budgeted === 0) return 0;
    return ((actual - budgeted) / budgeted) * 100;
  };

  const getVarianceColor = (variance: number, isExpense: boolean = false) => {
    if (isExpense) {
      return variance > 0 ? "text-red-600" : "text-green-600";
    }
    return variance > 0 ? "text-green-600" : "text-red-600";
  };

  const getVarianceIcon = (variance: number, isExpense: boolean = false) => {
    const isPositive = variance > 0;
    const isGood = isExpense ? !isPositive : isPositive;
    
    if (Math.abs(variance) > 10) {
      return isGood ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;
    }
    return isGood ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div>Loading budget data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          <p className="text-muted-foreground">Track your budget vs actual performance</p>
        </div>
        <Button>
          <Target className="mr-2 h-4 w-4" />
          Create Budget
        </Button>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹5,00,000</div>
            <p className="text-xs text-muted-foreground">
              Current year budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹3,75,000</div>
            <p className="text-xs text-muted-foreground">
              75% of budget used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹1,25,000</div>
            <p className="text-xs text-muted-foreground">
              25% remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Categories</CardTitle>
          <CardDescription>
            Budget vs actual spending by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Sample budget categories - in real implementation, this would come from the database */}
            {[
              { category: "Food Costs", budgeted: 150000, actual: 140000, isExpense: true },
              { category: "Staff Salaries", budgeted: 200000, actual: 205000, isExpense: true },
              { category: "Utilities", budgeted: 30000, actual: 28000, isExpense: true },
              { category: "Marketing", budgeted: 20000, actual: 15000, isExpense: true },
              { category: "Maintenance", budgeted: 25000, actual: 32000, isExpense: true },
              { category: "Revenue", budgeted: 800000, actual: 850000, isExpense: false },
            ].map((item, index) => {
              const variance = calculateVariance(item.actual, item.budgeted);
              const progressPercentage = (item.actual / item.budgeted) * 100;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.category}</span>
                      <Badge 
                        variant={Math.abs(variance) > 10 ? "destructive" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        {getVarianceIcon(variance, item.isExpense)}
                        {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(item.actual)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Budget: {formatCurrency(item.budgeted)}
                      </div>
                    </div>
                  </div>
                  
                  <Progress 
                    value={Math.min(progressPercentage, 100)} 
                    className="h-2"
                  />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>{formatCurrency(item.budgeted)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Budget Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Alerts</CardTitle>
          <CardDescription>
            Categories that need attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <div className="font-medium">Maintenance Budget Exceeded</div>
                <div className="text-sm text-muted-foreground">
                  You've spent ₹32,000 against a budget of ₹25,000 (28% over budget)
                </div>
              </div>
              <Badge variant="destructive">Over Budget</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <div className="font-medium">Staff Salaries Near Budget Limit</div>
                <div className="text-sm text-muted-foreground">
                  You've spent ₹205,000 against a budget of ₹200,000 (2.5% over budget)
                </div>
              </div>
              <Badge variant="secondary">Watch</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50">
              <TrendingDown className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <div className="font-medium">Food Costs Under Budget</div>
                <div className="text-sm text-muted-foreground">
                  You've spent ₹140,000 against a budget of ₹150,000 (6.7% under budget)
                </div>
              </div>
              <Badge variant="default">On Track</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
