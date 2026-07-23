import React, { useState } from "react";
import { useAuthState } from "@/hooks/useAuthState";
import AuthLoader from "@/components/Auth/AuthLoader";
import ExpensesList from "@/components/Expenses/ExpensesList";
import ExpensesOverview from "@/components/Expenses/ExpensesOverview";
import ExpenseAnalytics from "@/components/Expenses/ExpenseAnalytics";
import ExpenseHelpDialog from "@/components/Expenses/ExpenseHelpDialog";
import ExpenseWastageTab from "@/components/Expenses/ExpenseWastageTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  LayoutDashboard,
  List,
  BarChart3,
  Trash2,
} from "lucide-react";
import { useExpenseData } from "@/hooks/useExpenseData";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { usePlanType } from "@/hooks/usePlanType";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const Expenses = () => {
  const { restaurantName } = useRestaurantId();
  const { user, loading } = useAuthState();
  const { data: expenseData } = useExpenseData();
  const [activeTab, setActiveTab] = useState("overview");
  const { symbol: currencySymbol } = useCurrencyContext();
  const { label: planLabel } = usePlanType();

  if (loading || !user) {
    return <AuthLoader />;
  }

  const totalExpenses = expenseData?.totalExpenses || 0;
  const monthlyExpenses = expenseData?.totalMonthlyExpenses || 0;
  const categoriesCount = expenseData?.expenseBreakdown?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40 dark:from-[#0d0e1a] dark:via-[#12142a] dark:to-[#0d0e1a] p-2 sm:p-4 md:p-6">

      {/* ── TOPBAR HEADER ── */}
      <div className="mb-4 md:mb-6 flex items-center justify-between gap-3 px-1 md:px-2">
        <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
          <div className="w-9 h-9 md:w-11 md:h-11 rounded-[11px] md:rounded-[13px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/40 dark:shadow-indigo-500/50 shrink-0">
            <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <div className="min-w-0">
            {restaurantName && (
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-indigo-300">
                {restaurantName}
              </p>
            )}
            <h1 className="text-base md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
              Expense Management
            </h1>
            <p className="text-[10px] md:text-sm text-gray-500 dark:text-[#5c6191] font-normal mt-0.5 truncate">
              Track and analyse your {planLabel.toLowerCase()} expenses
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <ExpenseHelpDialog />
        </div>
      </div>

      {/* ── TABS ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-1 mb-3 md:mb-5 px-1 md:px-2 -mx-1">
          <div className="flex items-center gap-1">
            <FeatureLock feature="expenses.basic" interceptClicks={true}>
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 md:px-5 py-1.5 md:py-2 rounded-t-xl text-[11px] md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 md:gap-2 border border-transparent border-b-0 whitespace-nowrap ${
                  activeTab === "overview"
                    ? "bg-indigo-500/15 dark:bg-indigo-500/15 text-indigo-600 dark:text-white border-indigo-500/30 dark:border-indigo-500/30 shadow-[0_-4px_20px_rgba(99,102,241,0.12)]"
                    : "text-gray-400 dark:text-[#5c6191] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "overview" ? "bg-indigo-500" : "bg-current opacity-50"}`} />
                Overview
              </button>
            </FeatureLock>
            <FeatureLock feature="expenses.basic" interceptClicks={true}>
              <button
                onClick={() => setActiveTab("expenses")}
                className={`px-3 md:px-5 py-1.5 md:py-2 rounded-t-xl text-[11px] md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 md:gap-2 border border-transparent border-b-0 whitespace-nowrap ${
                  activeTab === "expenses"
                    ? "bg-indigo-500/15 dark:bg-indigo-500/15 text-indigo-600 dark:text-white border-indigo-500/30 dark:border-indigo-500/30 shadow-[0_-4px_20px_rgba(99,102,241,0.12)]"
                    : "text-gray-400 dark:text-[#5c6191] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5"
                }`}
              >
                Expenses
              </button>
            </FeatureLock>
            <FeatureLock feature="expenses.advanced" interceptClicks={true}>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-3 md:px-5 py-1.5 md:py-2 rounded-t-xl text-[11px] md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 md:gap-2 border border-transparent border-b-0 whitespace-nowrap ${
                  activeTab === "analytics"
                    ? "bg-indigo-500/15 dark:bg-indigo-500/15 text-indigo-600 dark:text-white border-indigo-500/30 dark:border-indigo-500/30 shadow-[0_-4px_20px_rgba(99,102,241,0.12)]"
                    : "text-gray-400 dark:text-[#5c6191] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5"
                }`}
              >
                Analytics
              </button>
            </FeatureLock>
            <FeatureLock feature="expenses.advanced" interceptClicks={true}>
              <button
                onClick={() => setActiveTab("wastage")}
                className={`px-3 md:px-5 py-1.5 md:py-2 rounded-t-xl text-[11px] md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 md:gap-2 border border-transparent border-b-0 whitespace-nowrap ${
                  activeTab === "wastage"
                    ? "bg-indigo-500/15 dark:bg-indigo-500/15 text-indigo-600 dark:text-white border-indigo-500/30 dark:border-indigo-500/30 shadow-[0_-4px_20px_rgba(99,102,241,0.12)]"
                    : "text-gray-400 dark:text-[#5c6191] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100/60 dark:hover:bg-white/5"
                }`}
              >
                Wastage
              </button>
            </FeatureLock>
          </div>
        </div>

        {/* ── CONTENT AREA ── */}
        <div className="border-t border-indigo-200/40 dark:border-indigo-500/20">

          {activeTab === "overview" && (
            <div className="animate-in fade-in pt-5">
              <ExpensesOverview />
            </div>
          )}

          {activeTab === "expenses" && (
            <div className="animate-in fade-in pt-5">
              <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-2xl shadow-xl dark:shadow-none p-3 sm:p-5 md:p-8">
                <ExpensesList />
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="animate-in fade-in pt-5">
              <ExpenseAnalytics />
            </div>
          )}

          {activeTab === "wastage" && (
            <div className="animate-in fade-in pt-5">
              <div className="bg-white/80 dark:bg-white/[0.055] backdrop-blur-2xl border border-gray-200/60 dark:border-white/[0.09] rounded-2xl shadow-xl dark:shadow-none p-6 md:p-8">
                <ExpenseWastageTab />
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default Expenses;
