
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialData } from "@/hooks/useFinancialData";
import { FileText, Download, Calculator, AlertCircle } from "lucide-react";

export const TaxReporting = () => {
  const { data: financialData, isLoading } = useFinancialData();
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Sample tax data - in real implementation, this would be calculated from actual transactions
  const taxSummary = {
    gst5: { taxableAmount: 25000, taxAmount: 1250, transactions: 15 },
    gst12: { taxableAmount: 150000, taxAmount: 18000, transactions: 45 },
    gst18: { taxableAmount: 200000, taxAmount: 36000, transactions: 30 },
    serviceTax: { taxableAmount: 80000, taxAmount: 8000, transactions: 20 },
  };

  const totalTaxable = Object.values(taxSummary).reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalTax = Object.values(taxSummary).reduce((sum, item) => sum + item.taxAmount, 0);

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
          
          <Button>
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
            <div className="text-2xl font-bold">{formatCurrency(totalTaxable)}</div>
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
            <div className="text-2xl font-bold">{formatCurrency(totalTax)}</div>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gst-summary">GST Summary</TabsTrigger>
          <TabsTrigger value="gst-breakdown">GST Breakdown</TabsTrigger>
          <TabsTrigger value="tax-config">Tax Configuration</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
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
                          Taxable Amount: {formatCurrency(data.taxableAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {formatCurrency(data.taxAmount)}
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
                      Total Taxable: {formatCurrency(totalTaxable)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl text-primary">
                      {formatCurrency(totalTax)}
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
                      November 2024 return filed on Dec 10, 2024
                    </div>
                  </div>
                  <Badge variant="default">Completed</Badge>
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg bg-yellow-50">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="font-medium">GSTR-3B Pending</div>
                    <div className="text-sm text-muted-foreground">
                      December 2024 return due on Dec 20, 2024
                    </div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>

                <div className="flex items-center gap-3 p-4 border rounded-lg bg-blue-50">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="font-medium">GST Payment</div>
                    <div className="text-sm text-muted-foreground">
                      Monthly GST payment of {formatCurrency(totalTax)} due
                    </div>
                  </div>
                  <Badge variant="outline">Upcoming</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
