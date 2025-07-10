
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EnhancedStats } from "@/components/Dashboard/EnhancedStats";
import { CustomizableDashboard } from "@/components/Dashboard/CustomizableDashboard";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BarChart3, Settings } from "lucide-react";

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
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([
    {
      id: 'revenue-kpi',
      type: 'kpi' as const,
      title: 'Revenue',
      size: 'sm' as const,
      position: { row: 0, col: 0 },
      data: { value: '₹45,230' },
      visible: true
    },
    {
      id: 'orders-kpi',
      type: 'kpi' as const,
      title: 'Orders',
      size: 'sm' as const,
      position: { row: 0, col: 1 },
      data: { value: '1,234' },
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
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Enhanced Dashboard"
        description="Advanced analytics and customizable insights"
      />
      
      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Custom Layout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <EnhancedStats />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <EnhancedStats />
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <CustomizableDashboard
              widgets={dashboardWidgets}
              onWidgetUpdate={setDashboardWidgets}
              editMode={editMode}
              onEditModeChange={setEditMode}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
