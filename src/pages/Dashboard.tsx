
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { PermissionDeniedDialog } from "@/components/Auth/PermissionDeniedDialog";
import { 
  BarChart3, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp,
  Plus,
  Settings,
  Coffee,
  Bed,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Stats from "@/components/Dashboard/Stats";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [permissionDialog, setPermissionDialog] = useState<{
    open: boolean;
    featureName: string;
    requiredPermission: string;
  }>({
    open: false,
    featureName: '',
    requiredPermission: ''
  });

  const handleNavigationWithPermission = (
    path: string, 
    permission: string, 
    featureName: string
  ) => {
    if (hasPermission(permission as any)) {
      navigate(path);
    } else {
      setPermissionDialog({
        open: true,
        featureName,
        requiredPermission: permission
      });
    }
  };

  const quickActions = [
    {
      title: "New Order",
      description: "Create a new order",
      icon: <Plus className="h-5 w-5" />,
      onClick: () => handleNavigationWithPermission('/orders', 'orders.create', 'Order Management'),
      variant: 'primary' as const,
      permission: 'orders.create' as const
    },
    {
      title: "View Menu",
      description: "Manage menu items",
      icon: <Coffee className="h-5 w-5" />,
      onClick: () => handleNavigationWithPermission('/menu', 'menu.view', 'Menu Management'),
      variant: 'secondary' as const,
      permission: 'menu.view' as const
    },
    {
      title: "Room Management", 
      description: "Check room status",
      icon: <Bed className="h-5 w-5" />,
      onClick: () => handleNavigationWithPermission('/rooms', 'rooms.view', 'Room Management'),
      variant: 'secondary' as const,
      permission: 'rooms.view' as const
    },
    {
      title: "Analytics",
      description: "View business insights",
      icon: <Sparkles className="h-5 w-5" />,
      onClick: () => handleNavigationWithPermission('/analytics', 'analytics.view', 'Analytics Dashboard'),
      variant: 'primary' as const,
      permission: 'analytics.view' as const
    }
  ];

  // Filter quick actions based on user permissions
  const filteredQuickActions = quickActions.filter(action => 
    hasPermission(action.permission)
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title={`Welcome back${user?.email ? `, ${user.email.split('@')[0]}` : ''}!`}
        description="Here's what's happening with your restaurant today"
      />
      
      <div className="p-6 space-y-8">
        {/* Quick Actions */}
        <StandardizedCard className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Common tasks and shortcuts</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredQuickActions.length > 0 ? (
              filteredQuickActions.map((action, index) => (
                <StandardizedButton
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant}
                  className="h-auto p-4 flex flex-col items-center gap-2 text-center"
                >
                  {action.icon}
                  <div>
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs opacity-70">{action.description}</div>
                  </div>
                </StandardizedButton>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No quick actions available for your role.</p>
                <p className="text-sm">Contact your administrator for access to features.</p>
              </div>
            )}
          </div>
        </StandardizedCard>

        {/* Stats Overview */}
        <StandardizedCard className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Performance Overview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Key metrics at a glance</p>
          </div>
          <Stats />
        </StandardizedCard>

        {/* Weekly Sales Chart */}
        <StandardizedCard className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Sales Trend</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Revenue performance over the past week</p>
          </div>
          <WeeklySalesChart />
        </StandardizedCard>
      </div>

      {/* Permission Denied Dialog */}
      <PermissionDeniedDialog
        open={permissionDialog.open}
        onOpenChange={(open) => setPermissionDialog(prev => ({ ...prev, open }))}
        featureName={permissionDialog.featureName}
        requiredPermission={permissionDialog.requiredPermission}
        onNavigateToHome={() => navigate('/')}
      />
    </div>
  );
};

export default Dashboard;
