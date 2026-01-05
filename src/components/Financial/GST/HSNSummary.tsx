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
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Package, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useGSTData, GSTReportPeriod } from "@/hooks/useGSTData";
import { format } from "date-fns";

interface HSNSummaryProps {
  period: GSTReportPeriod;
}

export const HSNSummary: React.FC<HSNSummaryProps> = ({ period }) => {
  const { data, isLoading } = useGSTData(period);

  const handleExportCSV = () => {
    if (!data?.hsnSummary) return;

    const headers = [
      "HSN Code",
      "Description",
      "UQC",
      "Quantity",
      "Taxable Value",
      "Rate",
      "CGST",
      "SGST",
      "IGST",
      "Total Tax",
    ];
    const rows = data.hsnSummary.map((hsn) => [
      hsn.hsnCode,
      hsn.description,
      "NOS",
      hsn.quantity,
      hsn.taxableValue.toFixed(2),
      hsn.taxRate + "%",
      hsn.cgstAmount.toFixed(2),
      hsn.sgstAmount.toFixed(2),
      hsn.igstAmount.toFixed(2),
      hsn.totalTax.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HSN_Summary_${format(data.dateRange.start, "MMM_yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  const hsnSummary = data?.hsnSummary || [];
  const totals = {
    quantity: hsnSummary.reduce((sum, h) => sum + h.quantity, 0),
    taxableValue: hsnSummary.reduce((sum, h) => sum + h.taxableValue, 0),
    cgst: hsnSummary.reduce((sum, h) => sum + h.cgstAmount, 0),
    sgst: hsnSummary.reduce((sum, h) => sum + h.sgstAmount, 0),
    igst: hsnSummary.reduce((sum, h) => sum + h.igstAmount, 0),
    totalTax: hsnSummary.reduce((sum, h) => sum + h.totalTax, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl">
            <Package className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold">HSN/SAC Summary</h3>
            <p className="text-sm text-muted-foreground">
              HSN code wise summary for {data?.periodLabel}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCSV}
          disabled={hsnSummary.length === 0}
          className="w-full sm:w-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 dark:from-teal-900/30 dark:to-cyan-900/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unique HSN Codes</p>
            <p className="text-2xl font-bold">{hsnSummary.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-900/30 dark:to-indigo-900/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Quantity</p>
            <p className="text-2xl font-bold">{totals.quantity}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-900/30 dark:to-emerald-900/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Taxable Value</p>
            <p className="text-2xl font-bold">
              <CurrencyDisplay amount={totals.taxableValue} />
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-900/30 dark:to-pink-900/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Tax</p>
            <p className="text-2xl font-bold">
              <CurrencyDisplay amount={totals.totalTax} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* HSN Table */}
      <Card>
        <CardHeader>
          <CardTitle>HSN Summary for GSTR-1</CardTitle>
          <CardDescription>
            Required for invoices with value above ₹2.5 Lakhs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hsnSummary.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-left py-3 px-4">HSN Code</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-center py-3 px-4">UQC</th>
                    <th className="text-right py-3 px-4">Qty</th>
                    <th className="text-right py-3 px-4">Taxable Value</th>
                    <th className="text-center py-3 px-4">Rate</th>
                    <th className="text-right py-3 px-4">CGST</th>
                    <th className="text-right py-3 px-4">SGST</th>
                    <th className="text-right py-3 px-4">IGST</th>
                    <th className="text-right py-3 px-4">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {hsnSummary.map((hsn, idx) => (
                    <tr
                      key={hsn.hsnCode + idx}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono">
                          {hsn.hsnCode}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4 max-w-[200px] truncate"
                        title={hsn.description}
                      >
                        {hsn.description}
                      </td>
                      <td className="text-center py-3 px-4">NOS</td>
                      <td className="text-right py-3 px-4">{hsn.quantity}</td>
                      <td className="text-right py-3 px-4">
                        <CurrencyDisplay amount={hsn.taxableValue} />
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge
                          className={
                            hsn.taxRate === 5
                              ? "bg-green-500"
                              : hsn.taxRate === 12
                              ? "bg-blue-500"
                              : hsn.taxRate === 18
                              ? "bg-purple-500"
                              : hsn.taxRate === 28
                              ? "bg-red-500"
                              : "bg-gray-500"
                          }
                        >
                          {hsn.taxRate}%
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4">
                        <CurrencyDisplay amount={hsn.cgstAmount} />
                      </td>
                      <td className="text-right py-3 px-4">
                        <CurrencyDisplay amount={hsn.sgstAmount} />
                      </td>
                      <td className="text-right py-3 px-4">
                        <CurrencyDisplay amount={hsn.igstAmount} />
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        <CurrencyDisplay amount={hsn.totalTax} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                    <td colSpan={3} className="py-3 px-4">
                      Total
                    </td>
                    <td className="text-right py-3 px-4">{totals.quantity}</td>
                    <td className="text-right py-3 px-4">
                      <CurrencyDisplay amount={totals.taxableValue} />
                    </td>
                    <td className="text-center py-3 px-4">-</td>
                    <td className="text-right py-3 px-4">
                      <CurrencyDisplay amount={totals.cgst} />
                    </td>
                    <td className="text-right py-3 px-4">
                      <CurrencyDisplay amount={totals.sgst} />
                    </td>
                    <td className="text-right py-3 px-4">
                      <CurrencyDisplay amount={totals.igst} />
                    </td>
                    <td className="text-right py-3 px-4">
                      <CurrencyDisplay amount={totals.totalTax} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No HSN data available for this period</p>
              <p className="text-sm mt-2">
                HSN codes are captured from invoice line items
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Common HSN Codes Reference */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">
            Common HSN/SAC Codes for Hospitality
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <code className="font-mono text-xs">996331</code>
              <p className="text-muted-foreground">Restaurant (Non-AC)</p>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <code className="font-mono text-xs">996332</code>
              <p className="text-muted-foreground">Restaurant (AC)</p>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <code className="font-mono text-xs">996311</code>
              <p className="text-muted-foreground">Hotel Room</p>
            </div>
            <div className="p-2 bg-white dark:bg-gray-800 rounded">
              <code className="font-mono text-xs">996334</code>
              <p className="text-muted-foreground">Catering</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HSNSummary;
