
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
import { Calculator, TrendingUp, FileText, PieChart, Receipt, Target, Hotel } from "lucide-react";

const FinancialDashboard = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Financial Management"
        description="Comprehensive financial management for your restaurant and hotel operations"
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <Hotel className="h-4 w-4" />
            Revenue Mgmt
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            P&L
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Budgets
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <FinancialReports />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <HotelRevenueManager />
        </TabsContent>

        <TabsContent value="profit-loss" className="mt-6">
          <ProfitLossStatement />
        </TabsContent>

        <TabsContent value="cash-flow" className="mt-6">
          <CashFlowManagement />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <InvoiceManagement />
        </TabsContent>

        <TabsContent value="budgets" className="mt-6">
          <BudgetManagement />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <TaxReporting />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
