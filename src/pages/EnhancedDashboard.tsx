import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessDashboardData } from "@/hooks/useBusinessDashboardData";
import { EnhancedStats } from "@/components/Dashboard/EnhancedStats";
import { CustomizableDashboard } from "@/components/Dashboard/CustomizableDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, BarChart3, Settings, Sparkles, 
  TrendingUp, Activity, Zap, Target
} from "lucide-react";
import { useCurrencyContext } from '@/contexts/CurrencyContext';

interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'trend' | 'custom';
  title: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  position: { row: number; col: number };
  data?: any;
  visible: boolean;
}

const EnhancedDashboard = () => {
  const { user } = useAuth();
  const { data: dashboardData } = useBusinessDashboardData();
  const { symbol: currencySymbol } = useCurrencyContext();
  
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [editMode, setEditMode] = useState(false);

  // Update widgets when dashboard data loads
  useEffect(() => {
    const totalRevenue = dashboardData?.revenueTrendData?.reduce(
      (sum: number, day: any) => sum + (day.revenue || 0), 0
    ) || 0;
    
    const totalOrders = dashboardData?.revenueTrendData?.reduce(
      (sum: number, day: any) => sum + (day.orders || 0), 0
    ) || 0;

    setDashboardWidgets([
      {
        id: 'revenue-kpi',
        type: 'kpi' as const,
        title: 'Revenue',
        size: 'sm' as const,
        position: { row: 0, col: 0 },
        data: { value: `${currencySymbol}${totalRevenue.toLocaleString()}` },
        visible: true
      },
      {
        id: 'orders-kpi',
        type: 'kpi' as const,
        title: 'Orders',
        size: 'sm' as const,
        position: { row: 0, col: 1 },
        data: { value: totalOrders.toLocaleString() },
        visible: true
      },
      {
        id: 'revenue-chart',
        type: 'chart' as const,
        title: 'Revenue Chart',
        size: 'lg' as const,
        position: { row: 1, col: 0 },
        visible: true
      },
      {
        id: 'trend-analysis',
        type: 'trend' as const,
        title: 'Trend Analysis',
        size: 'md' as const,
        position: { row: 1, col: 2 },
        visible: true
      }
    ]);
  }, [dashboardData, currencySymbol]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 dark:from-violet-800 dark:via-purple-800 dark:to-fuchsia-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  Enhanced Dashboard
                </h1>
              </div>
              <p className="text-white/80 text-sm sm:text-base ml-14">
                Advanced analytics and customizable insights
              </p>
            </div>
            <div className="flex items-center gap-3 ml-14 sm:ml-0">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <Activity className="h-5 w-5 text-green-300" />
                <span className="text-white font-medium text-sm">Real-time</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <Zap className="h-5 w-5 text-yellow-300" />
                <span className="text-white font-medium text-sm">Insights</span>
              </div>
            </div>
          </div>
        </div>
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full h-auto">
            <path 
              d="M0,50 C150,100 350,0 500,50 C650,100 800,0 1000,50 C1200,100 1350,0 1440,50 L1440,100 L0,100 Z" 
              className="fill-slate-50 dark:fill-gray-900"
            />
          </svg>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 -mt-4">
        <Tabs defaultValue="overview" className="space-y-6">
          {/* Modern Tab Navigation */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-2 shadow-xl shadow-purple-500/10 border border-white/20 dark:border-gray-700/30">
            <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent h-auto p-0">
              <TabsTrigger 
                value="overview" 
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-300"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 transition-all duration-300"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger 
                value="custom" 
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/30 transition-all duration-300"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Custom Layout</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-purple-500/10 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 border-b border-gray-100 dark:border-gray-700">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/30">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Performance Overview
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <EnhancedStats />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-blue-500/10 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border-b border-gray-100 dark:border-gray-700">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Advanced Analytics
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <EnhancedStats />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Layout Tab */}
          <TabsContent value="custom" className="space-y-6 mt-6">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-pink-500/10 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 border-b border-gray-100 dark:border-gray-700">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg shadow-pink-500/30">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    Custom Dashboard Layout
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <CustomizableDashboard
                  widgets={dashboardWidgets}
                  onWidgetUpdate={setDashboardWidgets}
                  editMode={editMode}
                  onEditModeChange={setEditMode}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
