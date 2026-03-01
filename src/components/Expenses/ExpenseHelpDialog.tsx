import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  HelpCircle,
  PieChart,
  TrendingUp,
  Calendar,
  Wallet,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calculator,
  BarChart3,
  DollarSign,
  FileText,
  CreditCard,
  Users,
  Zap,
  Home,
  Wrench,
  Megaphone,
  Package,
  ShoppingCart,
  Car,
  Shield,
  ScrollText,
  CalendarDays,
  AlertTriangle,
  Repeat,
} from "lucide-react";

const ExpenseHelpDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300"
        >
          <HelpCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            Expense Management Help Guide
          </DialogTitle>
          <DialogDescription>
            Learn how to effectively track and analyze your business expenses
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Overview Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-purple-500" />
                Overview
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                The Expense Management module helps you track, categorize, and
                analyze all your business expenses. It provides real-time
                insights into your spending patterns with automated import
                features for inventory and staff salaries.
              </p>
            </section>

            <Separator />

            {/* KPI Cards Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-cyan-500" />
                Dashboard Cards (KPIs)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-gray-800 dark:text-white">
                      Last 30 Days
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Total expenses with real month-over-month comparison
                    percentage.
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-cyan-600" />
                    <span className="font-medium text-gray-800 dark:text-white">
                      This Month
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Current month's total expenses from the 1st to today.
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-gray-800 dark:text-white">
                      Daily Average
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Monthly expenses divided by 30 days to show average daily
                    spending.
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-gray-800 dark:text-white">
                      Top Category
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    The expense category with the highest spending this month.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Expense Categories Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <PieChart className="h-5 w-5 text-purple-500" />
                Expense Categories
              </h3>
              <p className="text-xs text-gray-500 mb-2">
                System categories + your custom categories
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  {
                    icon: Package,
                    label: "Groceries",
                    desc: "Food supplies & ingredients",
                  },
                  {
                    icon: Users,
                    label: "Staff Salaries",
                    desc: "Employee wages",
                  },
                  {
                    icon: Zap,
                    label: "Utilities",
                    desc: "Electric, water, gas",
                  },
                  { icon: Home, label: "Rent", desc: "Property lease" },
                  {
                    icon: Wrench,
                    label: "Equipment",
                    desc: "Kitchen tools & supplies",
                  },
                  {
                    icon: Megaphone,
                    label: "Marketing",
                    desc: "Ads & promotions",
                  },
                  {
                    icon: Wrench,
                    label: "Maintenance",
                    desc: "Repairs & upkeep",
                  },
                  {
                    icon: Car,
                    label: "Transport & Fuel",
                    desc: "Delivery & travel",
                  },
                  {
                    icon: Shield,
                    label: "Insurance",
                    desc: "Business coverage",
                  },
                  {
                    icon: ScrollText,
                    label: "Licenses",
                    desc: "Permits & renewals",
                  },
                  {
                    icon: Plus,
                    label: "Custom",
                    desc: "Create your own categories",
                  },
                ].map((cat, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg text-center ${cat.label === "Custom" ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 border-dashed" : "bg-gray-50 dark:bg-gray-800/50"}`}
                  >
                    <cat.icon className="h-4 w-4 mx-auto mb-1 text-gray-600 dark:text-gray-400" />
                    <p className="text-xs font-medium text-gray-800 dark:text-white">
                      {cat.label}
                    </p>
                    <p className="text-[10px] text-gray-500">{cat.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Import Features Section — NEW */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <ShoppingCart className="h-5 w-5 text-green-500" />
                Quick Import Features
              </h3>
              <div className="space-y-3">
                {/* Import Inventory */}
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-600" />
                    Import Inventory
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Pulls your current inventory items with quantities and cost
                    per unit. Select items and import as grocery expense with
                    detailed breakdown. Choose which month to record the expense
                    for.
                  </p>
                </div>

                {/* Import Salaries */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Import Staff Salaries
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Automatically calculates salary based on attendance and
                    approved leaves. Shows leave days, working days, and
                    deductions per staff member.
                  </p>
                  <div className="mt-2 p-2 bg-white/60 dark:bg-gray-800 rounded border">
                    <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Salary Calculation:
                    </p>
                    <div className="space-y-1">
                      <code className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded block">
                        Daily Staff: Salary/day × Working Days
                      </code>
                      <code className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded block">
                        Monthly Staff: Salary − (Salary ÷ Days in Month × Leave
                        Days)
                      </code>
                    </div>
                  </div>
                </div>

                {/* Duplicate Detection */}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Duplicate Import Detection
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Both import dialogs check if a similar expense was already
                    recorded for the selected month. An amber warning appears if
                    a duplicate is detected.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Adding Expenses Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <Plus className="h-5 w-5 text-green-500" />
                Adding Expenses
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full shrink-0">
                    1
                  </span>
                  Click <strong>"Add Expense"</strong> or use the Import buttons
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full shrink-0">
                    2
                  </span>
                  Select a <strong>Category</strong> (or create a custom one)
                  and enter the <strong>Amount</strong>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full shrink-0">
                    3
                  </span>
                  Choose the <strong>Expense Date</strong> and{" "}
                  <strong>Payment Method</strong>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full shrink-0">
                    4
                  </span>
                  Optionally add Subcategory, Vendor Name, and Description
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full shrink-0">
                    5
                  </span>
                  Toggle <strong>Recurring</strong> if it's a repeating expense
                </p>
              </div>
            </section>

            <Separator />

            {/* Payment Methods Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Payment Methods
              </h3>
              <div className="flex flex-wrap gap-2">
                {["Cash", "Card", "Bank Transfer", "Cheque", "UPI"].map(
                  (method) => (
                    <span
                      key={method}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium"
                    >
                      {method}
                    </span>
                  ),
                )}
              </div>
            </section>

            <Separator />

            {/* Recurring Expenses Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <Repeat className="h-5 w-5 text-teal-500" />
                Recurring Expenses & Reminders
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Mark expenses as recurring for regular payments. The system
                shows a <strong>reminder banner</strong> at the top of the
                Expenses tab when recurring expenses haven't been re-entered for
                the current month.
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map(
                  (freq) => (
                    <span
                      key={freq}
                      className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-xs font-medium"
                    >
                      {freq}
                    </span>
                  ),
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Click any reminder chip to quickly add the expense again.
              </p>
            </section>

            <Separator />

            {/* Filtering & Search Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <Search className="h-5 w-5 text-amber-500" />
                Filtering & Search
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Search className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      Search
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Search by description, vendor name, or subcategory
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      Date Range
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Filter by Last 7 days, 30 days, 90 days, or 1 year
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Filter className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      Category Filter
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Filter by system or custom categories
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Charts & Analytics Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                Charts & Analytics
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Expense Trend (Area Chart)
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Daily expense amounts over 30 days to spot spending
                    patterns.
                  </p>
                </div>
                <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-cyan-600" />
                    Category Breakdown (Donut Chart)
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Percentage distribution across all categories.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-amber-600" />
                    Monthly Trend (Bar Chart)
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Real expense totals for the last 6 months with
                    month-over-month comparison.
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    Category Comparison
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    This month vs last month per category — identifies where
                    spending increased or decreased.
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Calculations Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                <Calculator className="h-5 w-5 text-rose-500" />
                How Calculations Work
              </h3>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="font-medium text-gray-800 dark:text-white">
                    Total Expenses
                  </p>
                  <code className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded mt-1 inline-block">
                    Sum of all expense amounts within date range
                  </code>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="font-medium text-gray-800 dark:text-white">
                    Expense Growth (Trend %)
                  </p>
                  <code className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded mt-1 inline-block">
                    ((This Month − Last Month) ÷ Last Month) × 100
                  </code>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="font-medium text-gray-800 dark:text-white">
                    Daily Salary
                  </p>
                  <code className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded mt-1 inline-block">
                    Salary/Day × (Days in Month − Approved Leave Days)
                  </code>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="font-medium text-gray-800 dark:text-white">
                    Monthly Salary
                  </p>
                  <code className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded mt-1 inline-block">
                    Monthly Salary − (Salary ÷ Days in Month × Leave Days)
                  </code>
                </div>
              </div>
            </section>

            <Separator />

            {/* Tips Section */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-3">
                💡 Pro Tips
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  Use <strong>Import Inventory</strong> to auto-calculate
                  grocery expenses from your stock data
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  Use <strong>Import Salaries</strong> at month-end — it
                  auto-applies leave deductions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  Create <strong>custom categories</strong> for expenses unique
                  to your business
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  Mark fixed expenses as <strong>Recurring</strong> to get
                  monthly reminders
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  Review <strong>Analytics</strong> weekly to track spending
                  patterns across categories
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  Always include <strong>vendor names</strong> for better
                  supplier tracking
                </li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseHelpDialog;
