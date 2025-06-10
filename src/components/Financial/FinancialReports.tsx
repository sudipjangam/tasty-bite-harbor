
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfitLoss } from "@/hooks/useProfitLoss";
import { useFinancialData } from "@/hooks/useFinancialData";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, FileText, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export const FinancialReports = () => {
  const { data: plData, isLoading: plLoading } = useProfitLoss();
  const { data: financialData, isLoading: financialLoading } = useFinancialData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const quickStats = [
    {
      title: "Monthly Revenue",
      value: plData?.revenue.totalRevenue || 0,
      change: "+12.5%",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Net Profit",
      value: plData?.netProfit || 0,
      change: "+8.2%",
      icon: DollarSign,
      color: plData?.netProfit && plData.netProfit > 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: "Outstanding Invoices",
      value: financialData?.invoices?.filter(i => i.status !== 'paid').length || 0,
      change: "₹45,000 total",
      icon: FileText,
      color: "text-orange-600",
    },
    {
      title: "Profit Margin",
      value: plData?.profitMargin || 0,
      change: "+2.1%",
      icon: BarChart3,
      color: "text-blue-600",
      isPercentage: true,
    },
  ];

  if (plLoading || financialLoading) {
    return <div>Loading financial overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Financial Overview</h2>
          <p className="text-muted-foreground">
            {format(startOfMonth(new Date()), "MMMM yyyy")} financial performance
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.isPercentage 
                    ? `${stat.value.toFixed(1)}%`
                    : typeof stat.value === 'number'
                    ? formatCurrency(stat.value)
                    : stat.value
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Financial Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>
              Revenue sources for {format(new Date(), "MMMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Food Sales</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(plData?.revenue.foodSales || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plData?.revenue.totalRevenue 
                      ? ((plData.revenue.foodSales / plData.revenue.totalRevenue) * 100).toFixed(1)
                      : 0
                    }%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Room Revenue</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(plData?.revenue.roomRevenue || 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {plData?.revenue.totalRevenue 
                      ? ((plData.revenue.roomRevenue / plData.revenue.totalRevenue) * 100).toFixed(1)
                      : 0
                    }%
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(plData?.revenue.totalRevenue || 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Financial Metrics</CardTitle>
            <CardDescription>
              Important financial indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Gross Profit Margin</span>
                <Badge variant="outline">
                  {plData?.revenue.totalRevenue 
                    ? ((plData.grossProfit / plData.revenue.totalRevenue) * 100).toFixed(1)
                    : 0
                  }%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Net Profit Margin</span>
                <Badge 
                  variant={plData?.profitMargin && plData.profitMargin > 0 ? "default" : "destructive"}
                >
                  {plData?.profitMargin?.toFixed(1) || 0}%
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Cost of Goods Sold</span>
                <span className="font-semibold">
                  {formatCurrency(plData?.costOfGoodsSold.totalCOGS || 0)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Operating Expenses</span>
                <span className="font-semibold">
                  {formatCurrency(plData?.operatingExpenses.totalExpenses || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Financial Activity</CardTitle>
          <CardDescription>
            Latest invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {financialData?.invoices?.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.customer_name} • {format(new Date(invoice.invoice_date), "MMM dd")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(invoice.total_amount)}
                  </div>
                  <Badge 
                    variant={
                      invoice.status === 'paid' ? 'default' :
                      invoice.status === 'overdue' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
            
            {(!financialData?.invoices || financialData.invoices.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No recent financial activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
