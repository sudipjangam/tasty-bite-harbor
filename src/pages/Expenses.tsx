import React, { useState } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import AuthLoader from "@/components/Auth/AuthLoader";
import ExpensesList from "@/components/Expenses/ExpensesList";
import ExpensesOverview from "@/components/Expenses/ExpensesOverview";
import ExpenseAnalytics from "@/components/Expenses/ExpenseAnalytics";
import ExpenseHelpDialog from "@/components/Expenses/ExpenseHelpDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  LayoutDashboard,
  List,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { useExpenseData } from "@/hooks/useExpenseData";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

const Expenses = () => {
  const { user, loading } = useAuthState();
  const { data: expenseData } = useExpenseData();
  const [activeTab, setActiveTab] = useState("overview");
  const { symbol: currencySymbol } = useCurrencyContext();

  if (loading) {
    return <AuthLoader />;
  }

  if (!user) {
    return <AuthLoader />;
  }

  const totalExpenses = expenseData?.totalExpenses || 0;
  const monthlyExpenses = expenseData?.totalMonthlyExpenses || 0;
  const categoriesCount = expenseData?.expenseBreakdown?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-950 dark:via-purple-950/50 dark:to-indigo-950 p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-purple-500 via-indigo-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/30 dark:shadow-purple-500/50">
              <DollarSign className="h-8 w-8 text-white drop-shadow-lg" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                Expense Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg mt-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Track and analyze your business expenses
              </p>
            </div>
          </div>
          <ExpenseHelpDialog />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Last 30 Days
                </p>
                <p className="text-3xl font-bold mt-1">
                  {currencySymbol}
                  {totalExpenses.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-cyan-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-sm font-medium">This Month</p>
                <p className="text-3xl font-bold mt-1">
                  {currencySymbol}
                  {monthlyExpenses.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">
                  Categories
                </p>
                <p className="text-3xl font-bold mt-1">{categoriesCount}</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <List className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-2">
            <TabsList className="inline-flex w-auto min-w-full md:w-auto space-x-1 p-1 bg-transparent rounded-2xl">
              <TabsTrigger
                value="overview"
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400"
              >
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400"
              >
                <List className="h-4 w-4" />
                Expenses
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="animate-in fade-in">
          <ExpensesOverview />
        </TabsContent>

        <TabsContent value="expenses" className="animate-in fade-in">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-purple-500/20 rounded-3xl shadow-xl dark:shadow-purple-500/10 p-8">
            <ExpensesList />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="animate-in fade-in">
          <ExpenseAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Expenses;
