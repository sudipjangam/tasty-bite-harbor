
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Calculator, 
  LayoutDashboard,
  FileSpreadsheet,
  ShoppingCart,
  Package,
  Calendar,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { GSTDashboard, GSTR1Panel, GSTR3BPanel, FilingCalendar, HSNSummary, InputTaxCredit } from "./GST";
import { GSTHelp } from "./GSTHelp";
import { GSTReportPeriod } from "@/hooks/useGSTData";

export const TaxReporting = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<GSTReportPeriod>("current_month");
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6 border border-indigo-200/50 dark:border-indigo-800/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  GST Reporting
                </h2>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Phase 1
                </Badge>
              </div>
              <p className="text-muted-foreground">
                GST returns, tax compliance, and filing management
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as GSTReportPeriod)}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800">
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
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200/50 dark:border-gray-700/50 h-auto">
          <TabsTrigger 
            value="dashboard" 
            className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-indigo-500/20 rounded-lg"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-xs">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger 
            value="gstr1" 
            className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/20 data-[state=active]:to-emerald-500/20 rounded-lg"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="text-xs">GSTR-1</span>
          </TabsTrigger>
          <TabsTrigger 
            value="gstr3b" 
            className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-pink-500/20 rounded-lg"
          >
            <Calculator className="h-4 w-4" />
            <span className="text-xs">GSTR-3B</span>
          </TabsTrigger>
          <TabsTrigger 
            value="itc" 
            className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500/20 data-[state=active]:to-cyan-500/20 rounded-lg"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs">ITC</span>
          </TabsTrigger>
          <TabsTrigger 
            value="hsn" 
            className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-amber-500/20 rounded-lg"
          >
            <Package className="h-4 w-4" />
            <span className="text-xs">HSN</span>
          </TabsTrigger>
          <TabsTrigger 
            value="calendar" 
            className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500/20 data-[state=active]:to-rose-500/20 rounded-lg"
          >
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Calendar</span>
          </TabsTrigger>
          <TabsTrigger 
            value="help" 
            className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500/20 data-[state=active]:to-slate-500/20 rounded-lg"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="text-xs">Help</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <div className="mt-6">
          <TabsContent value="dashboard">
            <GSTDashboard period={selectedPeriod} />
          </TabsContent>

          <TabsContent value="gstr1">
            <GSTR1Panel period={selectedPeriod} />
          </TabsContent>

          <TabsContent value="gstr3b">
            <GSTR3BPanel period={selectedPeriod} />
          </TabsContent>

          <TabsContent value="itc">
            <InputTaxCredit period={selectedPeriod} />
          </TabsContent>

          <TabsContent value="hsn">
            <HSNSummary period={selectedPeriod} />
          </TabsContent>

          <TabsContent value="calendar">
            <FilingCalendar />
          </TabsContent>

          <TabsContent value="help">
            <GSTHelp />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
