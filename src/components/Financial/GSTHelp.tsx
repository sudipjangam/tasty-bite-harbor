import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Info, FileText, AlertCircle } from "lucide-react";

export const GSTHelp = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">GST Help & Documentation</h2>
        <p className="text-muted-foreground">Understanding GST calculations and compliance requirements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              GST Calculation
            </CardTitle>
            <CardDescription>
              How GST is calculated on your invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Basic Formula:</h4>
              <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm">
                GST Amount = (Taxable Amount × GST Rate) / 100
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Example:</h4>
              <div className="space-y-1 text-sm">
                <div>Service Amount: ₹1,000</div>
                <div>GST @ 18%: ₹180</div>
                <div className="font-semibold">Total: ₹1,180</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Common GST Rates:</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Food Items</span>
                  <Badge variant="outline">5%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Restaurant Services</span>
                  <Badge variant="outline">5%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Room Service</span>
                  <Badge variant="outline">12%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Hotel Services</span>
                  <Badge variant="outline">18%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              GST Returns
            </CardTitle>
            <CardDescription>
              Filing requirements and deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Monthly Returns:</h4>
              <div className="space-y-2 text-sm">
                <div>GSTR-1: Sales details (Due: 11th of next month)</div>
                <div>GSTR-3B: Summary return (Due: 20th of next month)</div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-2">What's Included:</h4>
              <ul className="space-y-1 text-sm list-disc list-inside">
                <li>All taxable sales and purchases</li>
                <li>Input tax credit claimed</li>
                <li>Tax liability and payment details</li>
                <li>HSN/SAC codes for goods/services</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Data Sources
            </CardTitle>
            <CardDescription>
              Where your GST data comes from in the system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Invoice Line Items:</h4>
              <ul className="space-y-1 text-sm list-disc list-inside">
                <li>Each line item has a tax rate (5%, 12%, 18%)</li>
                <li>System calculates: Item Total × Tax Rate</li>
                <li>Aggregated by tax rate for reporting</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Transaction Counting:</h4>
              <ul className="space-y-1 text-sm list-disc list-inside">
                <li>Each invoice line item = 1 transaction</li>
                <li>Grouped by GST rate for summary</li>
                <li>Excludes cancelled/draft invoices</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Compliance Tips
            </CardTitle>
            <CardDescription>
              Best practices for GST compliance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Record Keeping:</h4>
              <ul className="space-y-1 text-sm list-disc list-inside">
                <li>Maintain all invoice records for 6 years</li>
                <li>Ensure proper HSN/SAC codes</li>
                <li>Keep supporting documents</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Filing Deadlines:</h4>
              <ul className="space-y-1 text-sm list-disc list-inside">
                <li>Never miss monthly return deadlines</li>
                <li>Pay tax liability on time</li>
                <li>File nil returns if no transactions</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">System Benefits:</h4>
              <ul className="space-y-1 text-sm list-disc list-inside">
                <li>Auto-calculation reduces errors</li>
                <li>Real-time compliance tracking</li>
                <li>Easy export for filing</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-yellow-800">
                  This system provides automated GST calculations based on your invoice data.
                </p>
                <p className="text-yellow-700">
                  Always verify calculations with your chartered accountant before filing returns. 
                  GST rates and rules may change - ensure you're using current rates for your business type.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};