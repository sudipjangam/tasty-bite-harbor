import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Pencil,
  Calendar,
  MoreVertical,
  AlertCircle,
} from "lucide-react";
import ExpenseForm from "./ExpenseForm";
import { useToast } from "@/hooks/use-toast";
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
import { useCurrencyContext } from "@/contexts/CurrencyContext";

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
  recurring_frequency: string | null;
  status: string;
  created_at: string;
}

const ExpensesList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { symbol: currencySymbol } = useCurrencyContext();

  const {
    data: expenses = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] });
      toast({
        title: "Expense Deleted",
        description: "The expense has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense.",
        variant: "destructive",
      });
    },
  });

  const getDateRangeFilter = () => {
    const today = new Date();
    switch (dateRange) {
      case "7":
        return subDays(today, 7);
      case "30":
        return subDays(today, 30);
      case "90":
        return subDays(today, 90);
      case "365":
        return subDays(today, 365);
      default:
        return subDays(today, 30);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    // When searchTerm is empty, all expenses match the search
    const matchesSearch =
      searchTerm === "" ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.subcategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || expense.category === categoryFilter;
    const expenseDate = parseISO(expense.expense_date);
    const matchesDate = expenseDate >= getDateRangeFilter();
    return matchesSearch && matchesCategory && matchesDate;
  });

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      groceries: "bg-gradient-to-r from-green-500 to-emerald-600 text-white",
      ingredients: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white",
      staff_salary: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white",
      utilities: "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
      rent: "bg-gradient-to-r from-red-500 to-rose-600 text-white",
      equipment: "bg-gradient-to-r from-purple-500 to-violet-600 text-white",
      marketing: "bg-gradient-to-r from-pink-500 to-rose-600 text-white",
      maintenance: "bg-gradient-to-r from-gray-500 to-slate-600 text-white",
      other: "bg-gradient-to-r from-orange-500 to-amber-600 text-white",
    };
    return (
      colors[category] ||
      "bg-gradient-to-r from-gray-500 to-slate-600 text-white"
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      groceries: "Groceries",
      ingredients: "Ingredients",
      staff_salary: "Staff Salaries",
      utilities: "Utilities",
      rent: "Rent",
      equipment: "Equipment",
      marketing: "Marketing",
      maintenance: "Maintenance",
      other: "Other",
    };
    return labels[category] || category;
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const confirmDelete = () => {
    if (deleteExpenseId) {
      deleteExpense.mutate(deleteExpenseId);
      setDeleteExpenseId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-lg px-4 py-2 rounded-xl shadow-lg shadow-purple-500/30">
            {currencySymbol}
            {totalAmount.toLocaleString()}
          </Badge>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredExpenses.length} expenses
          </span>
        </div>
        <Button
          onClick={() => {
            setEditingExpense(null);
            setIsFormOpen(true);
          }}
          className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl"
          />
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl">
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl">
            <Filter className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="groceries">Groceries</SelectItem>
            <SelectItem value="staff_salary">Staff Salaries</SelectItem>
            <SelectItem value="utilities">Utilities</SelectItem>
            <SelectItem value="rent">Rent</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 bg-gradient-to-br from-gray-400 to-slate-500 rounded-2xl inline-block mb-4 shadow-xl">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              No expenses found
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Click "Add Expense" to record your first expense.
            </p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Badge
                      className={`${getCategoryColor(
                        expense.category
                      )} shadow-md`}
                    >
                      {getCategoryLabel(expense.category)}
                    </Badge>
                    {expense.subcategory && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        • {expense.subcategory}
                      </span>
                    )}
                    {expense.is_recurring && (
                      <Badge
                        variant="outline"
                        className="text-xs border-purple-300 dark:border-purple-600 text-purple-600 dark:text-purple-400"
                      >
                        Recurring
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(expense.expense_date), "MMM dd, yyyy")}
                    </span>
                    {expense.vendor_name && (
                      <span>• {expense.vendor_name}</span>
                    )}
                    <span className="capitalize">
                      • {expense.payment_method.replace("_", " ")}
                    </span>
                  </div>
                  {expense.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {expense.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {currencySymbol}
                      {expense.amount.toLocaleString()}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(expense)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteExpenseId(expense.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ExpenseForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["expense-data"] });
        }}
        editExpense={editingExpense}
      />

      <AlertDialog
        open={!!deleteExpenseId}
        onOpenChange={() => setDeleteExpenseId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensesList;
