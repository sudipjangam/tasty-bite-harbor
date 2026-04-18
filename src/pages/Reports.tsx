
import React, { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, FileBarChart, FileText, Database } from "lucide-react";
import { FeatureLock } from "@/components/Auth/FeatureLock";

// Lazy load heavy components
const AdvancedAnalytics = React.lazy(() => import("@/components/Reporting/AdvancedAnalytics"));
const DefaultReports = React.lazy(() => import("@/components/Reporting/DefaultReports"));
const CustomReportBuilder = React.lazy(() => import("@/components/Reporting/CustomReportBuilder"));
const ExportCenter = React.lazy(() => import("@/components/Reporting/ExportCenter"));

const LoadingFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

const Reports = () => {
  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
      {/* Premium Page Header */}
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 bg-clip-text text-transparent leading-tight pb-1">
          Reporting &amp; Business Intelligence
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base">
          Generate reports, analyze trends, and export data
        </p>
      </div>

      <Tabs defaultValue="default" className="w-full">
        {/* Premium Tab Bar */}
        <TabsList className="inline-flex h-auto p-1 sm:p-1.5 mb-5 md:mb-8 bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl sm:rounded-2xl shadow-lg gap-0.5 sm:gap-1 w-full sm:w-auto flex-wrap">
          <FeatureLock feature="reports.tabs.analytics" interceptClicks={true}>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/15 data-[state=active]:to-blue-500/10 data-[state=active]:border data-[state=active]:border-orange-400/30 data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-white/10 whitespace-nowrap"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Advanced</span> Analytics
            </TabsTrigger>
          </FeatureLock>
          <FeatureLock feature="reports.tabs.default" interceptClicks={true}>
            <TabsTrigger
              value="default"
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/15 data-[state=active]:to-blue-500/10 data-[state=active]:border data-[state=active]:border-orange-400/30 data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-white/10 whitespace-nowrap"
            >
              <FileBarChart className="h-4 w-4" />
              <span className="hidden sm:inline">Default</span> Reports
            </TabsTrigger>
          </FeatureLock>
          <FeatureLock feature="reports.tabs.custom_builder" interceptClicks={true}>
            <TabsTrigger
              value="custom"
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/15 data-[state=active]:to-blue-500/10 data-[state=active]:border data-[state=active]:border-orange-400/30 data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-white/10 whitespace-nowrap"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Custom</span> Builder
            </TabsTrigger>
          </FeatureLock>
          <FeatureLock feature="reports.tabs.export_center" interceptClicks={true}>
            <TabsTrigger
              value="export"
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/15 data-[state=active]:to-blue-500/10 data-[state=active]:border data-[state=active]:border-orange-400/30 data-[state=active]:shadow-md data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-white/10 whitespace-nowrap"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span> Center
            </TabsTrigger>
          </FeatureLock>
        </TabsList>

        <TabsContent value="analytics" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <AdvancedAnalytics />
          </Suspense>
        </TabsContent>

        <TabsContent value="default" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <DefaultReports />
          </Suspense>
        </TabsContent>

        <TabsContent value="custom" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <CustomReportBuilder />
          </Suspense>
        </TabsContent>

        <TabsContent value="export" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <ExportCenter />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
