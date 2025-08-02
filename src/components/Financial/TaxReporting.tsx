
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialData } from "@/hooks/useFinancialData";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Calculator, AlertCircle, HelpCircle } from "lucide-react";
import { GSTHelp } from "./GSTHelp";
import { format } from "date-fns";

export const TaxReporting = () => {
  const { data: financialData, isLoading } = useFinancialData();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Calculate tax data from actual invoice line items
  const calculateTaxSummary = () => {
    const summary = {
      gst5: { taxableAmount: 0, taxAmount: 0, transactions: 0 },
      gst12: { taxableAmount: 0, taxAmount: 0, transactions: 0 },
      gst18: { taxableAmount: 0, taxAmount: 0, transactions: 0 },
      serviceTax: { taxableAmount: 0, taxAmount: 0, transactions: 0 },
    };

    financialData?.invoices?.forEach(invoice => {
      invoice.invoice_line_items?.forEach(item => {
        const taxableAmount = item.unit_price * item.quantity;
        const taxAmount = taxableAmount * (item.tax_rate / 100);
        
        if (item.tax_rate === 5) {
          summary.gst5.taxableAmount += taxableAmount;
          summary.gst5.taxAmount += taxAmount;
          summary.gst5.transactions += 1;
        } else if (item.tax_rate === 12) {
          summary.gst12.taxableAmount += taxableAmount;
          summary.gst12.taxAmount += taxAmount;
          summary.gst12.transactions += 1;
        } else if (item.tax_rate === 18) {
          summary.gst18.taxableAmount += taxableAmount;
          summary.gst18.taxAmount += taxAmount;
          summary.gst18.transactions += 1;
        } else if (item.tax_rate > 0) {
          summary.serviceTax.taxableAmount += taxableAmount;
          summary.serviceTax.taxAmount += taxAmount;
          summary.serviceTax.transactions += 1;
        }
      });
    });

    return summary;
  };

  const taxSummary = calculateTaxSummary();

  const totalTaxable = Object.values(taxSummary).reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalTax = Object.values(taxSummary).reduce((sum, item) => sum + item.taxAmount, 0);

  const handleExportGSTReturn = async () => {
    try {
      toast({
        title: "Exporting GST Return",
        description: "Your GST return is being prepared...",
      });
      
      if (!financialData?.restaurantId) {
        toast({
          title: "Error",
          description: "Restaurant information not found",
          variant: "destructive",
        });
        return;
      }

      // Generate GST return content
      const gstReturnData = [
        ['GST Return Report', '', '', ''],
        ['Period:', selectedPeriod, '', ''],
        ['Generated:', format(new Date(), 'yyyy-MM-dd HH:mm:ss'), '', ''],
        ['', '', '', ''],
        ['Tax Rate', 'Taxable Amount', 'Tax Amount', 'Transactions'],
        ...Object.entries(taxSummary).map(([key, data]) => {
          const rate = key === 'gst5' ? '5%' : key === 'gst12' ? '12%' : key === 'gst18' ? '18%' : 'Other';
          return [rate, data.taxableAmount.toString(), data.taxAmount.toString(), data.transactions.toString()];
        }),
        ['', '', '', ''],
        ['Total', totalTaxable.toString(), totalTax.toString(), ''],
      ].map(row => row.join(',')).join('\n');

      // Create and download file
      const blob = new Blob([gstReturnData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `gst-return-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Complete",
        description: "GST return has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export GST return",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading tax reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tax Reporting</h2>
          <p className="text-muted-foreground">GST returns and tax compliance reports</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="current_quarter">Current Quarter</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="current_year">Current Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleExportGSTReturn}>
            <Download className="mr-2 h-4 w-4" />
            Export GST Return
          </Button>
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Taxable</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalTaxable} />
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalTax} />
            </div>
            <p className="text-xs text-muted-foreground">
              GST collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Effective Rate</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((totalTax / totalTaxable) * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average tax rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Date</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Dec 20</div>
            <p className="text-xs text-muted-foreground">
              Next GST filing
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gst-summary" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="gst-summary">GST Summary</TabsTrigger>
          <TabsTrigger value="gst-breakdown">GST Breakdown</TabsTrigger>
          <TabsTrigger value="tax-config">Tax Configuration</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="help">
            <HelpCircle className="h-4 w-4 mr-1" />
            Help
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gst-summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>GST Summary</CardTitle>
              <CardDescription>
                Overview of GST collected by tax rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(taxSummary).map(([key, data]) => {
                  const rate = key === 'gst5' ? '5%' : key === 'gst12' ? '12%' : key === 'gst18' ? '18%' : 'Service Tax';
                  
                  return (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">GST @ {rate}</span>
                          <Badge variant="outline">{data.transactions} transactions</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Taxable Amount: <CurrencyDisplay amount={data.taxableAmount} />
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          <CurrencyDisplay amount={data.taxAmount} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Tax Collected
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="flex items-center justify-between p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex-1">
                    <span className="font-semibold text-lg">Total GST</span>
                    <p className="text-sm text-muted-foreground">
                      Total Taxable: <CurrencyDisplay amount={totalTaxable} />
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl text-primary">
                      <CurrencyDisplay amount={totalTax} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      To be filed
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gst-breakdown" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed GST Breakdown</CardTitle>
              <CardDescription>
                Transaction-wise GST details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Detailed transaction breakdown will be displayed here.
                <br />
                This will show individual invoices and their GST calculations.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax-config" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
              <CardDescription>
                Configure tax rates and settings for your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialData?.taxConfigs?.map((config) => (
                  <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.tax_name}</span>
                        <Badge 
                          variant={config.is_active ? "default" : "secondary"}
                        >
                          {config.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {config.tax_rate}%
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {config.tax_type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>
                Tax filing status and compliance requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="font-medium">GSTR-1 Filed</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(new Date().getFullYear(), new Date().getMonth() - 1), "MMMM yyyy")} return filed on {format(new Date(), "MMM dd, yyyy")}
                    </div>
                  </div>
                  <Badge variant="default">Completed</Badge>
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg bg-yellow-50">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="font-medium">GSTR-3B Pending</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(), "MMMM yyyy")} return due on {format(new Date(new Date().getFullYear(), new Date().getMonth(), 20), "MMM dd, yyyy")}
                    </div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-50">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="font-medium">GST Payment</div>
                    <div className="text-sm text-muted-foreground">
                      Monthly GST payment of <CurrencyDisplay amount={totalTax} /> due
                    </div>
                  </div>
                  <Badge variant="outline">Upcoming</Badge>
                </div>

                {financialData?.invoices && financialData.invoices.length > 0 && (
                  <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">Invoice Records</div>
                      <div className="text-sm text-muted-foreground">
                        {financialData.invoices.length} invoices generated this period
                      </div>
                    </div>
                    <Badge variant="default">Updated</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="mt-6">
          <GSTHelp />
        </TabsContent>
      </Tabs>
    </div>
  );
};
