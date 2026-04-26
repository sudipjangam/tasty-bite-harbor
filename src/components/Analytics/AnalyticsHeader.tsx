import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, BarChart3, LineChart, CalendarRange } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

interface AnalyticsHeaderProps {
  analyticsView: "charts" | "business";
  setAnalyticsView: (view: "charts" | "business") => void;
  hasBusinessDashboardAccess: boolean;
  exportToExcel: () => void;
  exportToPDF: () => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

const QUICK_RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

const AnalyticsHeader = ({
  analyticsView,
  setAnalyticsView,
  hasBusinessDashboardAccess,
  exportToExcel,
  exportToPDF,
  dateRange,
  onDateRangeChange,
}: AnalyticsHeaderProps) => {
  const activeDays = dateRange?.from
    ? Math.ceil(
        ((dateRange.to || new Date()).getTime() - dateRange.from.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 30;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Analytics & Reports
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gain insights into your restaurant's performance
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {hasBusinessDashboardAccess && (
            <Tabs
              value={analyticsView}
              onValueChange={(v) => setAnalyticsView(v as "charts" | "business")}
              className="mr-1"
            >
              <TabsList className="bg-gray-100/80 dark:bg-gray-800/80 h-8">
                <TabsTrigger
                  value="charts"
                  className="text-xs h-7 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
                >
                  <LineChart className="h-3.5 w-3.5 mr-1" />
                  Charts
                </TabsTrigger>
                <TabsTrigger
                  value="business"
                  className="text-xs h-7 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  Business
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <Button
            size="sm"
            className="h-8 flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md shadow-emerald-500/20 text-xs"
            onClick={exportToExcel}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          <Button
            size="sm"
            className="h-8 flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-md shadow-rose-500/20 text-xs"
            onClick={exportToPDF}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Date Range Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
        <CalendarRange className="h-4 w-4 text-purple-500" />
        <span className="text-xs font-medium text-muted-foreground mr-1">Date Range:</span>
        
        {/* Quick range buttons */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          {QUICK_RANGES.map((qr) => (
            <button
              key={qr.label}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeDays === qr.days
                  ? "bg-purple-500 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() =>
                onDateRangeChange?.({
                  from: subDays(new Date(), qr.days),
                  to: new Date(),
                })
              }
            >
              {qr.label}
            </button>
          ))}
        </div>

        {/* Custom date picker */}
        <DatePickerWithRange
          onDateRangeChange={onDateRangeChange}
          initialDateRange={dateRange}
        />
      </div>
    </div>
  );
};

export default AnalyticsHeader;
