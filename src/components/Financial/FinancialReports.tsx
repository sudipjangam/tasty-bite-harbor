import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfitLoss } from "@/hooks/useProfitLoss";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useFinancialTrends } from "@/hooks/useFinancialTrends";
import { useFinancialTabAccess } from "@/hooks/useFinancialTabAccess";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Download,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export const FinancialReports = () => {
  const { data: plData, isLoading: plLoading } = useProfitLoss();
  const { data: financialData, isLoading: financialLoading } =
    useFinancialData();
  const { data: trendsData, isLoading: trendsLoading } = useFinancialTrends();
  const { hasHotelAccess } = useFinancialTabAccess();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  // Vibrant solid gradient stat card configurations (works in both light/dark)
  const statCardStyles = [
    {
      bgGradient: "from-rose-500 via-pink-500 to-red-600",
      shadow: "shadow-lg shadow-rose-500/30",
    },
    {
      bgGradient: "from-violet-500 via-purple-500 to-indigo-600",
      shadow: "shadow-lg shadow-violet-500/30",
    },
    {
      bgGradient: "from-amber-500 via-orange-500 to-yellow-600",
      shadow: "shadow-lg shadow-amber-500/30",
    },
    {
      bgGradient: "from-emerald-500 via-teal-500 to-green-600",
      shadow: "shadow-lg shadow-emerald-500/30",
    },
  ];

  const quickStats = [
    {
      title: "Monthly Revenue",
      value: plData?.revenue.totalRevenue || 0,
      change: `${trendsData?.revenueGrowth && trendsData.revenueGrowth >= 0 ? "+" : ""}${trendsData?.revenueGrowth?.toFixed(1) || "0"}%`,
      icon:
        trendsData?.revenueGrowth && trendsData.revenueGrowth >= 0
          ? TrendingUp
          : TrendingDown,
      isPositive: trendsData?.revenueGrowth && trendsData.revenueGrowth >= 0,
    },
    {
      title: "Net Profit",
      value: plData?.netProfit || 0,
      change: `${trendsData?.profitGrowth && trendsData.profitGrowth >= 0 ? "+" : ""}${trendsData?.profitGrowth?.toFixed(1) || "0"}%`,
      icon:
        trendsData?.profitGrowth && trendsData.profitGrowth >= 0
          ? TrendingUp
          : TrendingDown,
      isPositive: plData?.netProfit && plData.netProfit > 0,
    },
    {
      title: "Outstanding Invoices",
      value: trendsData?.outstandingInvoicesCount || 0,
      change: `₹${trendsData?.outstandingInvoicesTotal?.toLocaleString() || "0"} total`,
      icon: FileText,
      isPositive: true,
    },
    {
      title: "Profit Margin",
      value: plData?.profitMargin || 0,
      change: `${trendsData?.marginGrowth && trendsData.marginGrowth >= 0 ? "+" : ""}${trendsData?.marginGrowth?.toFixed(1) || "0"}%`,
      icon:
        trendsData?.marginGrowth && trendsData.marginGrowth >= 0
          ? TrendingUp
          : TrendingDown,
      isPositive: trendsData?.marginGrowth && trendsData.marginGrowth >= 0,
      isPercentage: true,
    },
  ];

  if (plLoading || financialLoading || trendsLoading) {
    return <div>Loading financial overview...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">
            Financial Overview
          </h2>
          <p className="text-muted-foreground">
            {format(startOfMonth(new Date()), "MMMM yyyy")} financial
            performance
          </p>
        </div>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* Vibrant Solid Gradient Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          const styles = statCardStyles[index];
          return (
            <div
              key={index}
              className={`bg-gradient-to-br ${styles.bgGradient} ${styles.shadow} rounded-2xl p-4 text-white transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/80 text-sm font-medium">
                  {stat.title}
                </p>
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">
                {stat.isPercentage
                  ? `${stat.value.toFixed(1)}%`
                  : typeof stat.value === "number" &&
                      !stat.title.includes("Invoices")
                    ? formatCurrency(stat.value)
                    : stat.value}
              </div>
              <p className="text-white/70 text-xs font-medium mt-1">
                {stat.change}
              </p>
            </div>
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
                      ? (
                          (plData.revenue.foodSales /
                            plData.revenue.totalRevenue) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>
              </div>

              {hasHotelAccess && (
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
                        ? (
                            (plData.revenue.roomRevenue /
                              plData.revenue.totalRevenue) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between font-semibold">
                  <span>Total Revenue</span>
                  <span>
                    {formatCurrency(plData?.revenue.totalRevenue || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Financial Metrics</CardTitle>
            <CardDescription>Important financial indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Gross Profit Margin</span>
                <Badge variant="outline">
                  {plData?.revenue.totalRevenue
                    ? (
                        (plData.grossProfit / plData.revenue.totalRevenue) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span>Net Profit Margin</span>
                <Badge
                  variant={
                    plData?.profitMargin && plData.profitMargin > 0
                      ? "default"
                      : "destructive"
                  }
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
          <CardDescription>Latest invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {financialData?.invoices?.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.customer_name} •{" "}
                      {format(new Date(invoice.invoice_date), "MMM dd")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(invoice.total_amount)}
                  </div>
                  <Badge
                    variant={
                      invoice.status === "paid"
                        ? "default"
                        : invoice.status === "overdue"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}

            {(!financialData?.invoices ||
              financialData.invoices.length === 0) && (
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
