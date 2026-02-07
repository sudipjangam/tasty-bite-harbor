import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useFinancialData } from "@/hooks/useFinancialData";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CurrencyDisplay } from "@/components/ui/currency-display";

export const CashFlowManagement = () => {
  const { data: financialData, isLoading } = useFinancialData();
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleGenerateCashFlowReport = async () => {
    try {
      toast({
        title: "Generating Cash Flow Report",
        description: "Your report is being prepared...",
      });

      if (!financialData?.restaurantId) {
        toast({
          title: "Error",
          description: "Restaurant information not found",
          variant: "destructive",
        });
        return;
      }

      // Generate CSV content
      const csvContent = [
        ["Date", "Type", "Description", "Amount", "Status"],
        ...overdueInvoices.map((invoice) => [
          format(new Date(invoice.due_date), "yyyy-MM-dd"),
          "Receivable (Overdue)",
          `Invoice ${invoice.invoice_number} - ${invoice.customer_name}`,
          (invoice.total_amount - invoice.paid_amount).toString(),
          invoice.status,
        ]),
        ...financialData.invoices
          .filter(
            (invoice) =>
              invoice.status !== "paid" &&
              invoice.status !== "cancelled" &&
              !overdueInvoices.find((o) => o.id === invoice.id),
          )
          .map((invoice) => [
            format(new Date(invoice.due_date), "yyyy-MM-dd"),
            "Receivable",
            `Invoice ${invoice.invoice_number} - ${invoice.customer_name}`,
            (invoice.total_amount - invoice.paid_amount).toString(),
            invoice.status,
          ]),
        ...recentPayments.map((payment) => [
          format(new Date(payment.payment_date), "yyyy-MM-dd"),
          "Payment Received",
          `Payment ${payment.payment_number}`,
          payment.amount.toString(),
          "Completed",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `cash-flow-report-${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Report Generated",
        description: "Cash flow report has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate cash flow report",
        variant: "destructive",
      });
    }
  };

  const getOverdueInvoices = () => {
    if (!financialData?.invoices) return [];
    const today = new Date();
    return financialData.invoices.filter(
      (invoice) =>
        new Date(invoice.due_date) < today &&
        invoice.status !== "paid" &&
        invoice.status !== "cancelled",
    );
  };

  const getTotalReceivables = () => {
    if (!financialData?.invoices) return 0;
    return financialData.invoices
      .filter(
        (invoice) =>
          invoice.status !== "paid" && invoice.status !== "cancelled",
      )
      .reduce(
        (sum, invoice) => sum + (invoice.total_amount - invoice.paid_amount),
        0,
      );
  };

  const getRecentPayments = () => {
    if (!financialData?.payments) return [];
    return financialData.payments.slice(0, 5);
  };

  if (isLoading) {
    return <div>Loading cash flow data...</div>;
  }

  const overdueInvoices = getOverdueInvoices();
  const totalReceivables = getTotalReceivables();
  const recentPayments = getRecentPayments();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Cash Flow Management
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor your cash inflows and outflows
          </p>
        </div>
        <Button
          onClick={() => handleGenerateCashFlowReport()}
          className="w-full sm:w-auto text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Generate Cash Flow Report
        </Button>
      </div>

      {/* Cash Flow Summary Cards with 3D Effects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Receivables Card */}
        <Card className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/30 dark:to-blue-950/30 border border-sky-200/50 dark:border-sky-700/30 shadow-[0_8px_25px_rgba(14,165,233,0.15)] hover:shadow-[0_12px_35px_rgba(14,165,233,0.25)] transition-all duration-500 hover:scale-[1.02] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/40 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Total Receivables
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">
              <CurrencyDisplay amount={totalReceivables} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From{" "}
              {financialData?.invoices?.filter((i) => i.status !== "paid")
                .length || 0}{" "}
              unpaid invoices
            </p>
          </CardContent>
        </Card>

        {/* Overdue Amount Card */}
        <Card className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 dark:from-rose-950/30 dark:to-red-950/30 border border-rose-200/50 dark:border-rose-700/30 shadow-[0_8px_25px_rgba(239,68,68,0.15)] hover:shadow-[0_12px_35px_rgba(239,68,68,0.25)] transition-all duration-500 hover:scale-[1.02] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/40 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Overdue Amount
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl shadow-lg">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">
              <CurrencyDisplay
                amount={overdueInvoices.reduce(
                  (sum, invoice) =>
                    sum + (invoice.total_amount - invoice.paid_amount),
                  0,
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {overdueInvoices.length} overdue invoices
            </p>
          </CardContent>
        </Card>

        {/* This Month Payments Card */}
        <Card className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/50 dark:border-emerald-700/30 shadow-[0_8px_25px_rgba(16,185,129,0.15)] hover:shadow-[0_12px_35px_rgba(16,185,129,0.25)] transition-all duration-500 hover:scale-[1.02] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/40 to-transparent rounded-bl-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              This Month Payments
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              <CurrencyDisplay
                amount={recentPayments.reduce(
                  (sum, payment) => sum + payment.amount,
                  0,
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From {recentPayments.length} payments received
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receivables" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="flex md:grid md:grid-cols-3 w-max md:w-full gap-1 bg-gradient-to-r from-cyan-100/80 via-blue-50/80 to-indigo-100/80 dark:from-gray-700/80 dark:via-gray-800/80 dark:to-gray-700/80 rounded-xl p-1 shadow-inner">
            <TabsTrigger
              value="receivables"
              className="text-xs md:text-sm px-3 md:px-4 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border-cyan-300"
            >
              Receivables
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="text-xs md:text-sm px-3 md:px-4 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border-emerald-300"
            >
              Recent Payments
            </TabsTrigger>
            <TabsTrigger
              value="forecast"
              className="text-xs md:text-sm px-3 md:px-4 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border-violet-300"
            >
              Cash Forecast
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="receivables" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Receivables</CardTitle>
              <CardDescription>
                Invoices pending payment and overdue amounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialData?.invoices
                  ?.filter(
                    (invoice) =>
                      invoice.status !== "paid" &&
                      invoice.status !== "cancelled",
                  )
                  .map((invoice) => {
                    const isOverdue = new Date(invoice.due_date) < new Date();
                    const remainingAmount =
                      invoice.total_amount - invoice.paid_amount;

                    return (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {invoice.invoice_number}
                            </span>
                            <Badge
                              variant={isOverdue ? "destructive" : "secondary"}
                            >
                              {isOverdue ? "Overdue" : invoice.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {invoice.customer_name} • Due:{" "}
                            {format(new Date(invoice.due_date), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(remainingAmount)}
                          </div>
                          {invoice.paid_amount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Paid: {formatCurrency(invoice.paid_amount)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {(!financialData?.invoices ||
                  financialData.invoices.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No outstanding receivables
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                Latest payments received from customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {payment.payment_number}
                        </span>
                        <Badge variant="outline">
                          {payment.payment_method}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                        {payment.reference_number &&
                          ` • Ref: ${payment.reference_number}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                  </div>
                ))}

                {recentPayments.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent payments
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Forecast</CardTitle>
              <CardDescription>
                Projected cash inflows and outflows for the next 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Cash flow forecasting feature coming soon...
                <br />
                This will show projected income from pending invoices and
                scheduled expenses.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
