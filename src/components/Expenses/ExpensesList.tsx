
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Plus, Search, Filter, Download } from "lucide-react";
import ExpenseForm from "./ExpenseForm";

interface Expense {
  id: string;
  category: string;
  subcategory: string | null;
  amount: number;
  description: string | null;
  expense_date: string;
  payment_method: string;
  vendor_name: string | null;
  is_recurring: boolean;
  status: string;
  created_at: string;
}

const ExpensesList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: expenses = [], isLoading, refetch } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("No restaurant found");

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
  });

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.subcategory?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      groceries: "bg-green-100 text-green-800",
      ingredients: "bg-emerald-100 text-emerald-800",
      staff_salary: "bg-blue-100 text-blue-800",
      utilities: "bg-yellow-100 text-yellow-800",
      rent: "bg-red-100 text-red-800",
      equipment: "bg-purple-100 text-purple-800",
      marketing: "bg-pink-100 text-pink-800",
      maintenance: "bg-gray-100 text-gray-800",
      other: "bg-orange-100 text-orange-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      groceries: "Groceries & Ingredients",
      ingredients: "Raw Ingredients",
      staff_salary: "Staff Salaries",
      utilities: "Utilities",
      rent: "Rent & Property",
      equipment: "Equipment & Supplies",
      marketing: "Marketing & Advertising",
      maintenance: "Maintenance & Repairs",
      other: "Other Expenses",
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return <div className="p-6">Loading expenses...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>Expense Management</span>
                <Badge variant="secondary">₹{totalAmount.toFixed(2)} Total</Badge>
              </CardTitle>
              <CardDescription>
                Track and manage all your business expenses
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="groceries">Groceries & Ingredients</SelectItem>
                <SelectItem value="staff_salary">Staff Salaries</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="rent">Rent & Property</SelectItem>
                <SelectItem value="equipment">Equipment & Supplies</SelectItem>
                <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                <SelectItem value="maintenance">Maintenance & Repairs</SelectItem>
                <SelectItem value="other">Other Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expenses List */}
          <div className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No expenses found. Click "Add Expense" to record your first expense.
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getCategoryColor(expense.category)}>
                          {getCategoryLabel(expense.category)}
                        </Badge>
                        {expense.subcategory && (
                          <span className="text-sm text-gray-600">• {expense.subcategory}</span>
                        )}
                        {expense.is_recurring && (
                          <Badge variant="outline" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{format(new Date(expense.expense_date), "MMM dd, yyyy")}</span>
                        {expense.vendor_name && <span>• {expense.vendor_name}</span>}
                        <span>• {expense.payment_method.replace('_', ' ')}</span>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-gray-700 mt-1">{expense.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        ₹{expense.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(expense.created_at), "MMM dd")}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ExpenseForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default ExpensesList;
