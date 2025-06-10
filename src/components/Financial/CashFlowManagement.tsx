
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useFinancialData } from "@/hooks/useFinancialData";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export const CashFlowManagement = () => {
  const { data: financialData, isLoading } = useFinancialData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getOverdueInvoices = () => {
    if (!financialData?.invoices) return [];
    const today = new Date();
    return financialData.invoices.filter(invoice => 
      new Date(invoice.due_date) < today && 
      invoice.status !== 'paid' && 
      invoice.status !== 'cancelled'
    );
  };

  const getTotalReceivables = () => {
    if (!financialData?.invoices) return 0;
    return financialData.invoices
      .filter(invoice => invoice.status !== 'paid' && invoice.status !== 'cancelled')
      .reduce((sum, invoice) => sum + (invoice.total_amount - invoice.paid_amount), 0);
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cash Flow Management</h2>
          <p className="text-muted-foreground">Monitor your cash inflows and outflows</p>
        </div>
        <Button>Generate Cash Flow Report</Button>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceivables)}</div>
            <p className="text-xs text-muted-foreground">
              From {financialData?.invoices?.filter(i => i.status !== 'paid').length || 0} unpaid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                overdueInvoices.reduce((sum, invoice) => 
                  sum + (invoice.total_amount - invoice.paid_amount), 0
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              From {overdueInvoices.length} overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                recentPayments.reduce((sum, payment) => sum + payment.amount, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              From {recentPayments.length} payments received
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receivables" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="payments">Recent Payments</TabsTrigger>
          <TabsTrigger value="forecast">Cash Forecast</TabsTrigger>
        </TabsList>

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
                  ?.filter(invoice => invoice.status !== 'paid' && invoice.status !== 'cancelled')
                  .map((invoice) => {
                    const isOverdue = new Date(invoice.due_date) < new Date();
                    const remainingAmount = invoice.total_amount - invoice.paid_amount;
                    
                    return (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invoice.invoice_number}</span>
                            <Badge 
                              variant={isOverdue ? "destructive" : "secondary"}
                            >
                              {isOverdue ? "Overdue" : invoice.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {invoice.customer_name} • Due: {format(new Date(invoice.due_date), "MMM dd, yyyy")}
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
                
                {(!financialData?.invoices || financialData.invoices.length === 0) && (
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
                        <span className="font-medium">{payment.payment_number}</span>
                        <Badge variant="outline">{payment.payment_method}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                        {payment.reference_number && ` • Ref: ${payment.reference_number}`}
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
                This will show projected income from pending invoices and scheduled expenses.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
