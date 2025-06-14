
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/Layout/PageHeader";
import { ProfitLossStatement } from "./ProfitLossStatement";
import { CashFlowManagement } from "./CashFlowManagement";
import { InvoiceManagement } from "./InvoiceManagement";
import { BudgetManagement } from "./BudgetManagement";
import { TaxReporting } from "./TaxReporting";
import { FinancialReports } from "./FinancialReports";
import HotelRevenueManager from "../Revenue/HotelRevenueManager";
import { Calculator, TrendingUp, FileText, PieChart, Receipt, Target, Hotel, BarChart3, Sparkles } from "lucide-react";

const FinancialDashboard = () => {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Modern Header */}
      <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl">
            <Calculator className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Financial Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              Comprehensive financial management for your restaurant and hotel operations
            </p>
          </div>
          
          {/* Quick status indicators */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Real-time</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Live Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs Container */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-6 transform hover:scale-[1.01] transition-all duration-300">
        <Tabs defaultValue="overview" className="w-full">
          <div className="mb-6">
            <TabsList className="grid w-full grid-cols-7 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200/50 dark:border-gray-700/50">
              <TabsTrigger 
                value="overview" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-blue-200 rounded-xl transition-all duration-300"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="revenue" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-purple-200 rounded-xl transition-all duration-300"
              >
                <Hotel className="h-4 w-4" />
                <span className="hidden sm:inline">Revenue</span>
              </TabsTrigger>
              <TabsTrigger 
                value="profit-loss" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-emerald-200 rounded-xl transition-all duration-300"
              >
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">P&L</span>
              </TabsTrigger>
              <TabsTrigger 
                value="cash-flow" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-cyan-200 rounded-xl transition-all duration-300"
              >
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Cash Flow</span>
              </TabsTrigger>
              <TabsTrigger 
                value="invoices" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-orange-200 rounded-xl transition-all duration-300"
              >
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Invoices</span>
              </TabsTrigger>
              <TabsTrigger 
                value="budgets" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-pink-200 rounded-xl transition-all duration-300"
              >
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Budgets</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-indigo-200 rounded-xl transition-all duration-300"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Reports</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6">
            <div className="bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 border border-gray-200/30 dark:border-gray-700/30">
              <FinancialReports />
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="mt-6">
            <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200/30 dark:border-purple-700/30">
              <HotelRevenueManager />
            </div>
          </TabsContent>

          <TabsContent value="profit-loss" className="mt-6">
            <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-6 border border-emerald-200/30 dark:border-emerald-700/30">
              <ProfitLossStatement />
            </div>
          </TabsContent>

          <TabsContent value="cash-flow" className="mt-6">
            <div className="bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-cyan-200/30 dark:border-cyan-700/30">
              <CashFlowManagement />
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <div className="bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-900/20 dark:to-red-900/20 rounded-2xl p-6 border border-orange-200/30 dark:border-orange-700/30">
              <InvoiceManagement />
            </div>
          </TabsContent>

          <TabsContent value="budgets" className="mt-6">
            <div className="bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl p-6 border border-pink-200/30 dark:border-pink-700/30">
              <BudgetManagement />
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-indigo-200/30 dark:border-indigo-700/30">
              <TaxReporting />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialDashboard;
