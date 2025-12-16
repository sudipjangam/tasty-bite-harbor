import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2,
  ExternalLink,
  BookOpen
} from "lucide-react";

export const GSTHelp: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-r from-gray-500 to-slate-500 rounded-xl">
          <HelpCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">GST Help & Reference</h3>
          <p className="text-muted-foreground">Quick reference for GST compliance</p>
        </div>
      </div>

      {/* Return Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            GST Return Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-lg">GSTR-1</h4>
                <Badge>Monthly/Quarterly</Badge>
              </div>
              <p className="text-muted-foreground mb-3">
                Details of outward supplies (sales) made during the period
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="ml-2 font-medium">11th of next month</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Late Fee:</span>
                  <span className="ml-2 font-medium">₹50/day (₹20 for nil)</span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-lg">GSTR-3B</h4>
                <Badge>Monthly</Badge>
              </div>
              <p className="text-muted-foreground mb-3">
                Summary return for payment of tax liability
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="ml-2 font-medium">20th of next month</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Interest:</span>
                  <span className="ml-2 font-medium">18% p.a. on late payment</span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-lg">GSTR-9</h4>
                <Badge variant="secondary">Annual</Badge>
              </div>
              <p className="text-muted-foreground mb-3">
                Annual return consolidating all monthly/quarterly returns
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="ml-2 font-medium">31st December of next FY</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Optional if:</span>
                  <span className="ml-2 font-medium">Turnover ≤ ₹2 Crore</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GST Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            GST Rates for Hospitality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-500">5% GST</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• Restaurant services (without ITC)</li>
                <li>• Food delivery services</li>
                <li>• Takeaway food</li>
                <li>• Small hotels (room tariff ≤ ₹1000)</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500">12% GST</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• Hotel rooms (₹1001-₹7500/night)</li>
                <li>• Restaurant services (with ITC)</li>
                <li>• Outdoor catering (non-AC)</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-500">18% GST</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• Hotel rooms (₹7501 and above)</li>
                <li>• Outdoor catering (AC)</li>
                <li>• Banquet services</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">0% (Exempt)</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                <li>• Fresh fruits & vegetables</li>
                <li>• Milk and milk products (unbranded)</li>
                <li>• Curd, lassi, buttermilk</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Common Compliance Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Missing GSTIN on B2B Invoices</h4>
                <p className="text-sm text-muted-foreground">
                  Always capture customer GSTIN for business transactions to claim ITC
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Incorrect HSN Codes</h4>
                <p className="text-sm text-muted-foreground">
                  Use correct 4-8 digit HSN/SAC codes. Wrong codes can lead to penalties.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Best Practice: File Early</h4>
                <p className="text-sm text-muted-foreground">
                  File returns 2-3 days before due date to avoid last-minute portal issues
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Useful Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Useful Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="https://www.gst.gov.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">GST Portal</span>
                <ExternalLink className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">gst.gov.in</p>
            </a>

            <a 
              href="https://cbic-gst.gov.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">CBIC GST</span>
                <ExternalLink className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">Official circulars & updates</p>
            </a>

            <a 
              href="https://einvoice1.gst.gov.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">E-Invoice Portal</span>
                <ExternalLink className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">Generate IRN for B2B</p>
            </a>

            <a 
              href="https://ewaybillgst.gov.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">E-Way Bill</span>
                <ExternalLink className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">For goods transport</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GSTHelp;