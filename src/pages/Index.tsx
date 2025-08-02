
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
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Stats from "@/components/Dashboard/Stats";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";

const Index = () => {
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
      gradient: "from-emerald-500 to-teal-600",
      permission: 'orders.create' as const
    },
    {
      title: "View Menu",
      description: "Manage menu items",
      icon: <Coffee className="h-5 w-5" />,
      onClick: () => handleNavigationWithPermission('/menu', 'menu.view', 'Menu Management'),
      variant: 'secondary' as const,
      gradient: "from-amber-500 to-orange-500",
      permission: 'menu.view' as const
    },
    {
      title: "Room Status",
      description: "Check room availability",
      icon: <Bed className="h-5 w-5" />,
      onClick: () => handleNavigationWithPermission('/rooms', 'rooms.view', 'Room Management'),
      variant: 'secondary' as const,
      gradient: "from-blue-500 to-indigo-600",
      permission: 'rooms.view' as const
    },
    {
      title: "Analytics",
      description: "View business insights",
      icon: <BarChart3 className="h-5 w-5" />,
      onClick: () => handleNavigationWithPermission('/analytics', 'analytics.view', 'Analytics Dashboard'),
      variant: 'secondary' as const,
      gradient: "from-purple-500 to-pink-600",
      permission: 'analytics.view' as const
    }
  ];

  // Filter quick actions based on user permissions
  const filteredQuickActions = quickActions.filter(action => 
    hasPermission(action.permission)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950">
      {/* Modern Header */}
      <div className="p-4 md:p-6">
        <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 rounded-2xl shadow-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 bg-clip-text text-transparent">
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                Here's an overview of your restaurant and hotel operations
              </p>
            </div>
          </div>
          
          {/* Quick status indicators */}
          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">All Systems Online</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Staff Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-6 space-y-8">
        {/* Enhanced Quick Actions */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Quick Actions
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Fast access to your most important tasks
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredQuickActions.length > 0 ? (
              filteredQuickActions.map((action, index) => (
                <div 
                  key={index} 
                  className="group relative overflow-hidden bg-white/90 backdrop-blur-sm border border-white/30 rounded-2xl p-6 hover:bg-white hover:border-purple-200 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onClick={action.onClick}
                >
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 bg-gradient-to-r ${action.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {action.icon}
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-lg group-hover:text-purple-700 transition-colors duration-300">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {action.description}
                    </p>
                    
                    <div className={`w-full h-0.5 bg-gradient-to-r ${action.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                    No Quick Actions Available
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    Contact your administrator to request access to features.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Stats Section */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Business Overview
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Real-time insights into your operations
              </p>
            </div>
          </div>
          <Stats />
        </div>

        {/* Enhanced Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sales Overview Chart */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Sales Overview
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Weekly performance trends
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4">
              <WeeklySalesChart />
            </div>
          </div>
          
          {/* Performance Metrics */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Performance Metrics
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Key business indicators
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="group relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-green-800 dark:text-green-200">
                      Customer Satisfaction
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">96%</span>
                    <div className="text-xs text-green-500">+2% this week</div>
                  </div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-4 border border-blue-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-blue-800 dark:text-blue-200">
                      Table Turnover Rate
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">2.3x</span>
                    <div className="text-xs text-blue-500">+0.2x this week</div>
                  </div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 border border-purple-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Bed className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-purple-800 dark:text-purple-200">
                      Room Occupancy
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-purple-600">78%</span>
                    <div className="text-xs text-purple-500">+5% this week</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

export default Index;
