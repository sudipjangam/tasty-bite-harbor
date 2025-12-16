
import React, { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, FileBarChart, FileText, Database } from "lucide-react";

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
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Reporting & Business Intelligence
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate reports, analyze trends, and export data
        </p>
      </div>

      <Tabs defaultValue="default" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span> Analytics
          </TabsTrigger>
          <TabsTrigger value="default" className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4" />
            <span className="hidden sm:inline">Default</span> Reports
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Custom</span> Builder
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span> Center
          </TabsTrigger>
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
