
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useProfitLoss } from "@/hooks/useProfitLoss";
import { cn } from "@/lib/utils";

export const ProfitLossStatement = () => {
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const { data: plData, isLoading } = useProfitLoss(startDate, endDate);
  const { data: previousData } = useProfitLoss(
    startOfMonth(subMonths(startDate, 1)),
    endOfMonth(subMonths(startDate, 1))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const renderMetricCard = (
    title: string,
    current: number,
    previous?: number,
    isPositiveGood = true
  ) => {
    const change = previous ? getPercentageChange(current, previous) : 0;
    const isPositive = change > 0;
    const isGood = isPositiveGood ? isPositive : !isPositive;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {previous && (
            <div className={cn("flex items-center text-xs", 
              isGood ? "text-green-600" : "text-red-600"
            )}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(current)}</div>
          {previous && (
            <p className="text-xs text-muted-foreground">
              Previous: {formatCurrency(previous)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div>Loading P&L statement...</div>;
  }

  if (!plData) {
    return <div>No data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Profit & Loss Statement</h2>
          <p className="text-muted-foreground">
            {format(startDate, "MMM dd, yyyy")} - {format(endDate, "MMM dd, yyyy")}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  if (date) {
                    setStartDate(date);
                    setIsStartOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(endDate, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  if (date) {
                    setEndDate(date);
                    setIsEndOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCard(
          "Total Revenue",
          plData.revenue.totalRevenue,
          previousData?.revenue.totalRevenue
        )}
        {renderMetricCard(
          "Gross Profit",
          plData.grossProfit,
          previousData?.grossProfit
        )}
        {renderMetricCard(
          "Net Profit",
          plData.netProfit,
          previousData?.netProfit
        )}
        {renderMetricCard(
          "Profit Margin",
          plData.profitMargin,
          previousData?.profitMargin
        )}
      </div>

      {/* Detailed P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Statement</CardTitle>
          <CardDescription>
            Complete profit and loss breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-green-600">Revenue</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span>Food Sales</span>
                  <span>{formatCurrency(plData.revenue.foodSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Room Revenue</span>
                  <span>{formatCurrency(plData.revenue.roomRevenue)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Revenue</span>
                  <span>{formatCurrency(plData.revenue.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-red-600">Cost of Goods Sold</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span>Food Costs</span>
                  <span>{formatCurrency(plData.costOfGoodsSold.foodCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Beverage Costs</span>
                  <span>{formatCurrency(plData.costOfGoodsSold.beverageCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Room Supplies</span>
                  <span>{formatCurrency(plData.costOfGoodsSold.roomSupplies)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total COGS</span>
                  <span>{formatCurrency(plData.costOfGoodsSold.totalCOGS)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between font-semibold text-lg">
                <span>Gross Profit</span>
                <span>{formatCurrency(plData.grossProfit)}</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-orange-600">Operating Expenses</h3>
              <div className="space-y-2 pl-4">
                <div className="flex justify-between">
                  <span>Staff Salaries</span>
                  <span>{formatCurrency(plData.operatingExpenses.staffSalaries)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilities</span>
                  <span>{formatCurrency(plData.operatingExpenses.utilities)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rent</span>
                  <span>{formatCurrency(plData.operatingExpenses.rent)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Marketing</span>
                  <span>{formatCurrency(plData.operatingExpenses.marketing)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Maintenance</span>
                  <span>{formatCurrency(plData.operatingExpenses.maintenance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Expenses</span>
                  <span>{formatCurrency(plData.operatingExpenses.other)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Operating Expenses</span>
                  <span>{formatCurrency(plData.operatingExpenses.totalExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div className={cn("p-4 rounded-lg", 
              plData.netProfit >= 0 ? "bg-green-50" : "bg-red-50"
            )}>
              <div className="flex justify-between font-bold text-xl">
                <span>Net Profit</span>
                <span className={plData.netProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(plData.netProfit)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Profit Margin: {plData.profitMargin.toFixed(2)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
