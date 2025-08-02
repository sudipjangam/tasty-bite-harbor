
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdvancedAnalytics from "@/components/Reporting/AdvancedAnalytics";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { TrendingUp, Calendar, Target, Users, DollarSign, BarChart } from "lucide-react";

const Reports = () => {
  return (
    <div className="container mx-auto py-4 md:py-8 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Reporting & Business Intelligence
        </h1>
        <p className="text-muted-foreground mt-1">
          Advanced analytics and insights to drive business decisions
        </p>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Advanced Analytics
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Forecasting
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Seasonal Trends
          </TabsTrigger>
          <TabsTrigger value="competitor" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Competitor Analysis
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Custom Reports
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Data Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <AdvancedAnalytics />
        </TabsContent>

        <TabsContent value="forecasting" className="mt-6">
          <StandardizedCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Advanced Forecasting</h3>
            <p className="text-gray-600">
              Predictive analytics and forecasting capabilities:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>• Revenue forecasting using machine learning models</li>
              <li>• Demand prediction for inventory planning</li>
              <li>• Staff scheduling optimization based on predicted volume</li>
              <li>• Seasonal demand patterns analysis</li>
              <li>• Menu item performance predictions</li>
              <li>• Customer lifetime value projections</li>
            </ul>
          </StandardizedCard>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <StandardizedCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Seasonal Trend Analysis</h3>
            <p className="text-gray-600">
              Comprehensive seasonal and trend analysis:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>• Year-over-year performance comparisons</li>
              <li>• Seasonal menu optimization recommendations</li>
              <li>• Weather impact analysis on sales</li>
              <li>• Holiday and event performance tracking</li>
              <li>• Monthly and quarterly trend identification</li>
              <li>• Peak hour and day analysis</li>
            </ul>
          </StandardizedCard>
        </TabsContent>

        <TabsContent value="competitor" className="mt-6">
          <StandardizedCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Competitor Analysis</h3>
            <p className="text-gray-600">
              Market positioning and competitive intelligence:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>• Local market analysis and benchmarking</li>
              <li>• Pricing strategy comparisons</li>
              <li>• Review sentiment analysis vs competitors</li>
              <li>• Market share estimation</li>
              <li>• Competitive promotion tracking</li>
              <li>• Social media engagement comparisons</li>
            </ul>
          </StandardizedCard>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <StandardizedCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Custom Report Builder</h3>
            <p className="text-gray-600">
              Build custom reports tailored to your business needs:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>• Drag-and-drop report builder interface</li>
              <li>• Custom metrics and KPI definitions</li>
              <li>• Automated report scheduling and delivery</li>
              <li>• Interactive dashboard creation</li>
              <li>• Cross-functional data correlation</li>
              <li>• White-label reporting for franchises</li>
            </ul>
          </StandardizedCard>
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <StandardizedCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Export Capabilities</h3>
            <p className="text-gray-600">
              Comprehensive data export and integration options:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>• CSV, Excel, and PDF export formats</li>
              <li>• API access for third-party integrations</li>
              <li>• Real-time data streaming capabilities</li>
              <li>• Accounting software integration (QuickBooks, Xero)</li>
              <li>• Business intelligence tool connections</li>
              <li>• Automated backup and data archiving</li>
            </ul>
          </StandardizedCard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
