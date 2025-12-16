import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { ShoppingCart, Info, ArrowDownLeft, ArrowUpRight, Minus } from "lucide-react";
import { GSTReportPeriod } from '@/hooks/useGSTData';

interface InputTaxCreditProps {
  period: GSTReportPeriod;
}

export const InputTaxCredit: React.FC<InputTaxCreditProps> = ({ period }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl">
          <ShoppingCart className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Input Tax Credit (ITC)</h3>
          <p className="text-muted-foreground">Track GST paid on purchases for credit</p>
        </div>
      </div>

      {/* Phase 2 Notice */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-xl">
              <Info className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                Coming in Phase 2
              </h4>
              <p className="text-blue-700 dark:text-blue-300 mb-4">
                Input Tax Credit tracking requires purchase invoice data with supplier GSTIN. 
                This feature will be enabled after adding purchase management integration.
              </p>
              <div className="space-y-2">
                <h5 className="font-medium text-blue-800 dark:text-blue-200">What you'll get:</h5>
                <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Track</Badge>
                    ITC available from purchase invoices
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Match</Badge>
                    GSTR-2B reconciliation
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Offset</Badge>
                    Auto-calculate net tax liability after ITC
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ITC Summary Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <ArrowDownLeft className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">ITC Available</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  ₹0.00
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              From purchase invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <ArrowUpRight className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">ITC Utilized</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  ₹0.00
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Against output tax
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Minus className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Balance ITC</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  ₹0.00
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Carry forward
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ITC Rules Reference */}
      <Card>
        <CardHeader>
          <CardTitle>ITC Eligibility Rules</CardTitle>
          <CardDescription>Quick reference for claiming Input Tax Credit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                <Badge className="bg-green-500">✓</Badge>
                Eligible for ITC
              </h5>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  Raw materials and ingredients
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  Kitchen equipment and machinery
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  POS systems and IT equipment
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  Furniture and fixtures
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  Professional services (accounting, legal)
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                <Badge variant="destructive">✗</Badge>
                Not Eligible for ITC
              </h5>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Motor vehicles (except for specified use)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Food and beverages for personal consumption
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Membership of clubs/fitness centers
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Works contract for construction
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  Goods stolen or lost
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ITC Conditions */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-3">
            Conditions for Claiming ITC
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-700 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">1</Badge>
              <span>Supplier must have filed GSTR-1</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">2</Badge>
              <span>Invoice must be reflected in GSTR-2B</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">3</Badge>
              <span>Goods/services must be received</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">4</Badge>
              <span>Tax invoice must be available</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">5</Badge>
              <span>Payment to supplier within 180 days</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">6</Badge>
              <span>GSTR-3B must be filed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InputTaxCredit;
