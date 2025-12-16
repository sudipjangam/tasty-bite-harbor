import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  Building2, 
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useGSTData, GSTReportPeriod, generateGSTR1JSON } from '@/hooks/useGSTData';
import { format } from 'date-fns';

interface GSTR1PanelProps {
  period: GSTReportPeriod;
}

export const GSTR1Panel: React.FC<GSTR1PanelProps> = ({ period }) => {
  const { data, isLoading } = useGSTData(period);
  const [expandedB2B, setExpandedB2B] = useState<string | null>(null);

  const handleExportJSON = () => {
    if (!data) return;
    
    // Using a placeholder GSTIN - in production this would come from restaurant settings
    const gstin = "27AAACR5055K1Z5";
    const periodStr = format(data.dateRange.start, 'MMyyyy');
    
    const gstr1Data = generateGSTR1JSON(data, gstin, periodStr);
    const blob = new Blob([JSON.stringify(gstr1Data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${periodStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!data) return;
    
    // B2B CSV
    const b2bHeaders = ['Invoice No', 'Date', 'Customer', 'GSTIN', 'Place of Supply', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'];
    const b2bRows = data.b2bInvoices.map(inv => [
      inv.invoiceNumber,
      inv.invoiceDate,
      inv.customerName,
      inv.customerGstin,
      inv.placeOfSupply,
      inv.taxableAmount.toFixed(2),
      inv.cgstAmount.toFixed(2),
      inv.sgstAmount.toFixed(2),
      inv.igstAmount.toFixed(2),
      inv.totalAmount.toFixed(2)
    ]);
    
    const csvContent = [b2bHeaders.join(','), ...b2bRows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_B2B_${format(data.dateRange.start, 'MMM_yyyy')}.csv`;
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

  const b2bInvoices = data?.b2bInvoices || [];
  const b2cInvoices = data?.b2cInvoices || [];
  const totals = data?.totals || { b2bTaxable: 0, b2bTax: 0, b2cTaxable: 0, b2cTax: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
            <FileSpreadsheet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">GSTR-1 - Outward Supplies</h3>
            <p className="text-muted-foreground">
              Details of outward supplies for {data?.periodLabel}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={!data}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button onClick={handleExportJSON} disabled={!data} className="bg-gradient-to-r from-green-500 to-emerald-500">
            <FileJson className="mr-2 h-4 w-4" />
            Portal JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">B2B Invoices</span>
            </div>
            <p className="text-2xl font-bold">{b2bInvoices.length}</p>
            <p className="text-sm text-muted-foreground">
              <CurrencyDisplay amount={totals.b2bTaxable} />
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200/50 dark:border-purple-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">B2C Invoices</span>
            </div>
            <p className="text-2xl font-bold">{b2cInvoices.length}</p>
            <p className="text-sm text-muted-foreground">
              <CurrencyDisplay amount={totals.b2cTaxable} />
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200/50 dark:border-green-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Tax (B2B)</span>
            </div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              <CurrencyDisplay amount={totals.b2bTax} />
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-900/30 dark:to-amber-900/30 border-orange-200/50 dark:border-orange-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Total Tax (B2C)</span>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              <CurrencyDisplay amount={totals.b2cTax} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* B2B and B2C Tabs */}
      <Tabs defaultValue="b2b">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="b2b" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            B2B Invoices ({b2bInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="b2c" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            B2C Invoices ({b2cInvoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="b2b" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">B2B - Business to Business</CardTitle>
              <CardDescription>Invoices with customer GSTIN</CardDescription>
            </CardHeader>
            <CardContent>
              {b2bInvoices.length > 0 ? (
                <div className="space-y-3">
                  {b2bInvoices.map((invoice) => (
                    <div key={invoice.invoiceNumber} className="border rounded-lg">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => setExpandedB2B(expandedB2B === invoice.invoiceNumber ? null : invoice.invoiceNumber)}
                      >
                        <div className="flex items-center gap-4">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{invoice.customerGstin}</Badge>
                          <div className="text-right">
                            <p className="font-semibold"><CurrencyDisplay amount={invoice.totalAmount} /></p>
                            <p className="text-xs text-muted-foreground">{invoice.invoiceDate}</p>
                          </div>
                          {expandedB2B === invoice.invoiceNumber ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      
                      {expandedB2B === invoice.invoiceNumber && (
                        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800">
                          <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Place of Supply</span>
                              <p className="font-medium">{invoice.placeOfSupply}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CGST</span>
                              <p className="font-medium"><CurrencyDisplay amount={invoice.cgstAmount} /></p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">SGST</span>
                              <p className="font-medium"><CurrencyDisplay amount={invoice.sgstAmount} /></p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">IGST</span>
                              <p className="font-medium"><CurrencyDisplay amount={invoice.igstAmount} /></p>
                            </div>
                          </div>
                          
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2">Description</th>
                                <th className="text-left py-2">HSN</th>
                                <th className="text-right py-2">Qty</th>
                                <th className="text-right py-2">Rate</th>
                                <th className="text-right py-2">Tax %</th>
                                <th className="text-right py-2">Tax</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.lineItems.map((item, idx) => (
                                <tr key={idx} className="border-b">
                                  <td className="py-2">{item.description}</td>
                                  <td className="py-2">{item.hsnCode}</td>
                                  <td className="text-right py-2">{item.quantity}</td>
                                  <td className="text-right py-2"><CurrencyDisplay amount={item.unitPrice} /></td>
                                  <td className="text-right py-2">{item.taxRate}%</td>
                                  <td className="text-right py-2"><CurrencyDisplay amount={item.cgst + item.sgst + item.igst} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No B2B invoices found for this period</p>
                  <p className="text-sm mt-2">B2B invoices require customer GSTIN</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="b2c" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">B2C - Business to Consumer</CardTitle>
              <CardDescription>Invoices without customer GSTIN</CardDescription>
            </CardHeader>
            <CardContent>
              {b2cInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-800">
                        <th className="text-left py-3 px-4">Invoice #</th>
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-left py-3 px-4">Place of Supply</th>
                        <th className="text-right py-3 px-4">Taxable</th>
                        <th className="text-right py-3 px-4">CGST</th>
                        <th className="text-right py-3 px-4">SGST</th>
                        <th className="text-right py-3 px-4">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b2cInvoices.map((invoice) => (
                        <tr key={invoice.invoiceNumber} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-4 font-medium">{invoice.invoiceNumber}</td>
                          <td className="py-3 px-4">{invoice.invoiceDate}</td>
                          <td className="py-3 px-4">{invoice.placeOfSupply}</td>
                          <td className="text-right py-3 px-4"><CurrencyDisplay amount={invoice.taxableAmount} /></td>
                          <td className="text-right py-3 px-4"><CurrencyDisplay amount={invoice.cgstAmount} /></td>
                          <td className="text-right py-3 px-4"><CurrencyDisplay amount={invoice.sgstAmount} /></td>
                          <td className="text-right py-3 px-4 font-semibold"><CurrencyDisplay amount={invoice.totalAmount} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                        <td colSpan={3} className="py-3 px-4">Total</td>
                        <td className="text-right py-3 px-4"><CurrencyDisplay amount={totals.b2cTaxable} /></td>
                        <td className="text-right py-3 px-4"><CurrencyDisplay amount={b2cInvoices.reduce((s, i) => s + i.cgstAmount, 0)} /></td>
                        <td className="text-right py-3 px-4"><CurrencyDisplay amount={b2cInvoices.reduce((s, i) => s + i.sgstAmount, 0)} /></td>
                        <td className="text-right py-3 px-4"><CurrencyDisplay amount={b2cInvoices.reduce((s, i) => s + i.totalAmount, 0)} /></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No B2C invoices found for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GSTR1Panel;
