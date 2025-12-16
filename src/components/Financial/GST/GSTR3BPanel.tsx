import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { Download, FileText, Info, CheckSquare } from "lucide-react";
import { useGSTData, GSTReportPeriod } from '@/hooks/useGSTData';
import { useToast } from '@/hooks/use-toast';

interface GSTR3BPanelProps {
  period: GSTReportPeriod;
}

export const GSTR3BPanel: React.FC<GSTR3BPanelProps> = ({ period }) => {
  const { data: gstData, isLoading } = useGSTData(period);
  const { toast } = useToast();

  if (isLoading) {
    return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl" />;
  }

  const totals = gstData?.totals || {
    totalTaxable: 0,
    totalTax: 0,
    totalCGST: 0,
    totalSGST: 0,
    totalIGST: 0
  };

  const handleExport = () => {
    const gstr3bData = {
      period: gstData?.periodLabel,
      generatedAt: new Date().toISOString(),
      table3_1: {
        a_outward_taxable: {
          taxable_value: totals.totalTaxable,
          igst: totals.totalIGST,
          cgst: totals.totalCGST,
          sgst: totals.totalSGST,
          cess: 0
        },
        b_outward_zero_rated: { taxable_value: 0, igst: 0 },
        c_nil_rated: { taxable_value: 0 },
        d_inward_reverse_charge: { taxable_value: 0, igst: 0, cgst: 0, sgst: 0 },
        e_non_gst: { taxable_value: 0 }
      },
      table4: {
        eligible_itc: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        reversed_itc: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        net_itc: { igst: 0, cgst: 0, sgst: 0, cess: 0 }
      },
      table6: {
        tax_payable: { igst: totals.totalIGST, cgst: totals.totalCGST, sgst: totals.totalSGST },
        paid_through_cash: { igst: totals.totalIGST, cgst: totals.totalCGST, sgst: totals.totalSGST }
      }
    };

    const blob = new Blob([JSON.stringify(gstr3bData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR3B-${gstData?.periodLabel?.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "GSTR-3B Exported",
      description: "JSON file downloaded successfully"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold">GSTR-3B - Monthly Summary Return</h3>
          <p className="text-muted-foreground">
            Period: {gstData?.periodLabel}
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export GSTR-3B
        </Button>
      </div>

      {/* Form Preview */}
      <div className="space-y-4">
        {/* Table 3.1 - Outward Supplies */}
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/30">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">3.1 Details of Outward Supplies and Inward Supplies</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Nature of Supplies</th>
                    <th className="text-right py-2 px-3">Taxable Value</th>
                    <th className="text-right py-2 px-3">IGST</th>
                    <th className="text-right py-2 px-3">CGST</th>
                    <th className="text-right py-2 px-3">SGST</th>
                    <th className="text-right py-2 px-3">Cess</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-green-50 dark:bg-green-900/20">
                    <td className="py-3 px-3 font-medium">(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
                    <td className="text-right py-3 px-3">
                      <CurrencyDisplay amount={totals.totalTaxable} />
                    </td>
                    <td className="text-right py-3 px-3">
                      <CurrencyDisplay amount={totals.totalIGST} />
                    </td>
                    <td className="text-right py-3 px-3">
                      <CurrencyDisplay amount={totals.totalCGST} />
                    </td>
                    <td className="text-right py-3 px-3">
                      <CurrencyDisplay amount={totals.totalSGST} />
                    </td>
                    <td className="text-right py-3 px-3">₹0.00</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-3">(b) Outward taxable supplies (zero rated)</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">-</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">-</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-3">(c) Other outward supplies (Nil rated, exempted)</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground" colSpan={4}>-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-3">(d) Inward supplies (liable to reverse charge)</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3">(e) Non-GST outward supplies</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground" colSpan={4}>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Table 4 - Eligible ITC */}
        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/30">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">4. Eligible ITC</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">ITC Not Available</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Input Tax Credit tracking will be available in Phase 2 after adding purchase invoice data.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Details</th>
                    <th className="text-right py-2 px-3">IGST</th>
                    <th className="text-right py-2 px-3">CGST</th>
                    <th className="text-right py-2 px-3">SGST</th>
                    <th className="text-right py-2 px-3">Cess</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-3">(A) ITC Available</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-3">(B) ITC Reversed</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                  </tr>
                  <tr className="bg-green-50 dark:bg-green-900/20">
                    <td className="py-3 px-3 font-medium">(C) Net ITC Available (A - B)</td>
                    <td className="text-right py-3 px-3 font-bold">₹0.00</td>
                    <td className="text-right py-3 px-3 font-bold">₹0.00</td>
                    <td className="text-right py-3 px-3 font-bold">₹0.00</td>
                    <td className="text-right py-3 px-3 font-bold">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Table 6 - Payment of Tax */}
        <Card className="border-2 border-orange-200 dark:border-orange-800">
          <CardHeader className="bg-orange-50 dark:bg-orange-900/30">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">6. Payment of Tax</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Description</th>
                    <th className="text-right py-2 px-3">IGST</th>
                    <th className="text-right py-2 px-3">CGST</th>
                    <th className="text-right py-2 px-3">SGST/UTGST</th>
                    <th className="text-right py-2 px-3">Cess</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-3">Tax Payable</td>
                    <td className="text-right py-3 px-3">
                      <CurrencyDisplay amount={totals.totalIGST} />
                    </td>
                    <td className="text-right py-3 px-3">
                      <CurrencyDisplay amount={totals.totalCGST} />
                    </td>
                    <td className="text-right py-3 px-3">
                      <CurrencyDisplay amount={totals.totalSGST} />
                    </td>
                    <td className="text-right py-3 px-3">₹0.00</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-3">Paid through ITC</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                    <td className="text-right py-3 px-3 text-muted-foreground">₹0.00</td>
                  </tr>
                  <tr className="bg-red-50 dark:bg-red-900/20">
                    <td className="py-3 px-3 font-medium">Tax/Cess paid in Cash</td>
                    <td className="text-right py-3 px-3 font-bold text-red-600">
                      <CurrencyDisplay amount={totals.totalIGST} />
                    </td>
                    <td className="text-right py-3 px-3 font-bold text-red-600">
                      <CurrencyDisplay amount={totals.totalCGST} />
                    </td>
                    <td className="text-right py-3 px-3 font-bold text-red-600">
                      <CurrencyDisplay amount={totals.totalSGST} />
                    </td>
                    <td className="text-right py-3 px-3 font-bold">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Total Liability Summary */}
            <div className="mt-4 p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total GST Liability (Cash)</span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  <CurrencyDisplay amount={totals.totalTax} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GSTR3BPanel;
