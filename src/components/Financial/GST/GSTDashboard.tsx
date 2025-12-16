import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  FileText, 
  Calendar, 
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { useGSTData, getFilingDueDates, GSTReportPeriod } from '@/hooks/useGSTData';
import { format } from 'date-fns';

interface GSTDashboardProps {
  period: GSTReportPeriod;
}

export const GSTDashboard: React.FC<GSTDashboardProps> = ({ period }) => {
  const { data: gstData, isLoading } = useGSTData(period);
  const filingDates = getFilingDueDates();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
    );
  }

  const totals = gstData?.totals || {
    totalTaxable: 0,
    totalTax: 0,
    totalCGST: 0,
    totalSGST: 0,
    effectiveRate: 0
  };

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Taxable Value */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Total Taxable Value
            </CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              <CurrencyDisplay amount={totals.totalTaxable} />
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
              {gstData?.periodLabel || 'This Period'}
            </p>
          </CardContent>
        </Card>

        {/* Output Tax (GST Collected) */}
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-200/50 dark:border-emerald-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Output Tax (Collected)
            </CardTitle>
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              <CurrencyDisplay amount={totals.totalTax} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                CGST: <CurrencyDisplay amount={totals.totalCGST} />
              </span>
              <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                SGST: <CurrencyDisplay amount={totals.totalSGST} />
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Effective Tax Rate */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200/50 dark:border-purple-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Effective Rate
            </CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {totals.effectiveRate.toFixed(2)}%
            </div>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
              Weighted average
            </p>
          </CardContent>
        </Card>

        {/* Net Liability */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 dark:from-orange-900/30 dark:to-red-900/30 border-orange-200/50 dark:border-orange-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Net GST Liability
            </CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-xl">
              <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              <CurrencyDisplay amount={totals.totalTax} />
            </div>
            <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
              To be paid (No ITC data yet)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filing Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GSTR-1 Status */}
        <Card className={`border-l-4 ${filingDates.gstr1.isOverdue ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' : filingDates.gstr1.daysRemaining <= 5 ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-l-green-500 bg-green-50 dark:bg-green-900/20'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">GSTR-1</h3>
                  <Badge variant={filingDates.gstr1.isOverdue ? 'destructive' : 'secondary'}>
                    {filingDates.gstr1.isOverdue ? 'Overdue' : `${filingDates.gstr1.daysRemaining} days left`}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Due: {format(filingDates.gstr1.date, 'MMM dd, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Period: {filingDates.gstr1.period}
                </p>
              </div>
              {filingDates.gstr1.isOverdue ? (
                <AlertCircle className="h-8 w-8 text-red-500" />
              ) : filingDates.gstr1.daysRemaining <= 5 ? (
                <Clock className="h-8 w-8 text-yellow-500" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* GSTR-3B Status */}
        <Card className={`border-l-4 ${filingDates.gstr3b.isOverdue ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' : filingDates.gstr3b.daysRemaining <= 5 ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-l-green-500 bg-green-50 dark:bg-green-900/20'}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">GSTR-3B</h3>
                  <Badge variant={filingDates.gstr3b.isOverdue ? 'destructive' : 'secondary'}>
                    {filingDates.gstr3b.isOverdue ? 'Overdue' : `${filingDates.gstr3b.daysRemaining} days left`}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Due: {format(filingDates.gstr3b.date, 'MMM dd, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Period: {filingDates.gstr3b.period}
                </p>
              </div>
              {filingDates.gstr3b.isOverdue ? (
                <AlertCircle className="h-8 w-8 text-red-500" />
              ) : filingDates.gstr3b.daysRemaining <= 5 ? (
                <Clock className="h-8 w-8 text-yellow-500" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* GSTR-9 Status */}
        <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">GSTR-9 (Annual)</h3>
                  <Badge variant="outline">
                    {filingDates.gstr9.daysRemaining} days
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Due: {format(filingDates.gstr9.date, 'MMM dd, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Period: {filingDates.gstr9.period}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GST Breakdown by Rate */}
      <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Collection by Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(gstData?.summary || {}).map(([key, data]) => {
              const rate = key === 'gst5' ? '5%' : key === 'gst12' ? '12%' : key === 'gst18' ? '18%' : 'Other';
              const color = key === 'gst5' ? 'green' : key === 'gst12' ? 'blue' : key === 'gst18' ? 'purple' : 'gray';
              
              return (
                <div 
                  key={key} 
                  className={`p-4 rounded-xl border-2 border-${color}-200 dark:border-${color}-800 bg-gradient-to-br from-${color}-50 to-${color}-100/50 dark:from-${color}-900/30 dark:to-${color}-800/20`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-lg font-bold text-${color}-700 dark:text-${color}-300`}>
                      GST @ {rate}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {data.transactions} txns
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxable:</span>
                      <span className="font-medium">
                        <CurrencyDisplay amount={data.taxableAmount} />
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className={`font-bold text-${color}-600 dark:text-${color}-400`}>
                        <CurrencyDisplay amount={data.taxAmount} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GSTDashboard;
