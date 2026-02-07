import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, BarChart3, LineChart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalyticsHeaderProps {
  analyticsView: "charts" | "business";
  setAnalyticsView: (view: "charts" | "business") => void;
  hasBusinessDashboardAccess: boolean;
  exportToExcel: () => void;
  exportToPDF: () => void;
}

const AnalyticsHeader = ({
  analyticsView,
  setAnalyticsView,
  hasBusinessDashboardAccess,
  exportToExcel,
  exportToPDF,
}: AnalyticsHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Analytics & Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Gain insights into your restaurant's performance
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {hasBusinessDashboardAccess && (
          <Tabs
            value={analyticsView}
            onValueChange={(v) => setAnalyticsView(v as "charts" | "business")}
            className="mr-2"
          >
            <TabsList className="bg-gray-100/80 dark:bg-gray-800/80">
              <TabsTrigger
                value="charts"
                className="flex items-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Charts
              </TabsTrigger>
              <TabsTrigger
                value="business"
                className="flex items-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Business
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <Button
          size="sm"
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30"
          onClick={exportToExcel}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span className="hidden sm:inline">Export to Excel</span>
          <span className="inline sm:hidden">Excel</span>
        </Button>

        <Button
          size="sm"
          className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-lg shadow-rose-500/30"
          onClick={exportToPDF}
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Export to PDF</span>
          <span className="inline sm:hidden">PDF</span>
        </Button>
      </div>
    </div>
  );
};

export default AnalyticsHeader;
