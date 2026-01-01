import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import { PermissionDeniedDialog } from "@/components/Auth/PermissionDeniedDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ChefHat,
  Receipt,
  CalendarClock,
  ArrowRight,
  Activity,
  Clock,
  Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Stats from "@/components/Dashboard/Stats";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";
import { LiveOrderStatus } from "@/components/Dashboard/LiveOrderStatus";
import RoomStatusWidget from "@/components/Dashboard/RoomStatusWidget";
import StaffAttendanceWidget from "@/components/Dashboard/StaffAttendanceWidget";

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [permissionDialog, setPermissionDialog] = useState<{
    open: boolean;
    featureName: string;
    requiredPermission: string;
  }>({
    open: false,
    featureName: "",
    requiredPermission: "",
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
        requiredPermission: permission,
      });
    }
  };

  const quickActions = [
    {
      title: "New Order",
      description: "Create order",
      icon: <Plus className="h-6 w-6" />,
      onClick: () =>
        handleNavigationWithPermission(
          "/orders",
          "orders.create",
          "Order Management"
        ),
      gradient: "from-emerald-500 to-teal-600",
      shadowColor: "shadow-emerald-500/30",
      permission: "orders.create" as const,
    },
    {
      title: "POS",
      description: "Point of sale",
      icon: <Receipt className="h-6 w-6" />,
      onClick: () =>
        handleNavigationWithPermission("/pos", "orders.create", "POS"),
      gradient: "from-blue-500 to-indigo-600",
      shadowColor: "shadow-blue-500/30",
      permission: "orders.create" as const,
    },
    {
      title: "Menu",
      description: "Manage items",
      icon: <Coffee className="h-6 w-6" />,
      onClick: () =>
        handleNavigationWithPermission("/menu", "menu.view", "Menu Management"),
      gradient: "from-orange-500 to-red-600",
      shadowColor: "shadow-orange-500/30",
      permission: "menu.view" as const,
    },
    {
      title: "Kitchen",
      description: "View orders",
      icon: <ChefHat className="h-6 w-6" />,
      onClick: () =>
        handleNavigationWithPermission(
          "/kitchen",
          "orders.update",
          "Kitchen Display"
        ),
      gradient: "from-purple-500 to-pink-600",
      shadowColor: "shadow-purple-500/30",
      permission: "orders.update" as const,
    },
    {
      title: "Rooms",
      description: "Room status",
      icon: <Bed className="h-6 w-6" />,
      onClick: () =>
        handleNavigationWithPermission(
          "/rooms",
          "rooms.view",
          "Room Management"
        ),
      gradient: "from-cyan-500 to-blue-600",
      shadowColor: "shadow-cyan-500/30",
      permission: "rooms.view" as const,
    },
    {
      title: "Staff",
      description: "Team management",
      icon: <Users className="h-6 w-6" />,
      onClick: () =>
        handleNavigationWithPermission(
          "/staff",
          "staff.view",
          "Staff Management"
        ),
      gradient: "from-violet-500 to-purple-600",
      shadowColor: "shadow-violet-500/30",
      permission: "staff.view" as const,
    },
    {
      title: "Inventory",
      description: "Stock levels",
      icon: <Package className="h-6 w-6" />,
      onClick: () =>
        handleNavigationWithPermission(
          "/inventory",
          "inventory.view",
          "Inventory"
        ),
      gradient: "from-amber-500 to-orange-600",
      shadowColor: "shadow-amber-500/30",
      permission: "inventory.view" as const,
    },
    {
      title: "Analytics",
      description: "Insights",
      icon: <Sparkles className="h-6 w-6" />,
      onClick: () =>
        handleNavigationWithPermission(
          "/analytics",
          "analytics.view",
          "Analytics"
        ),
      gradient: "from-pink-500 to-rose-600",
      shadowColor: "shadow-pink-500/30",
      permission: "analytics.view" as const,
    },
  ];

  // Filter quick actions based on user permissions
  const filteredQuickActions = quickActions.filter((action) =>
    hasPermission(action.permission)
  );

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-800 dark:via-purple-800 dark:to-pink-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-white">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                {greeting}, {user?.email ? user.email.split("@")[0] : "there"}!
                👋
              </h1>
              <p className="mt-2 text-white/80 text-sm sm:text-base">
                Here's what's happening with your restaurant today
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <Clock className="h-5 w-5 text-white" />
                <span className="text-white font-medium text-sm sm:text-base">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                <Activity className="h-5 w-5 text-green-300" />
                <span className="text-white font-medium text-sm">Live</span>
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

      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 -mt-4">
        {/* Quick Actions Grid */}
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Jump to frequently used features
              </p>
            </div>
          </div>

          {filteredQuickActions.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
              {filteredQuickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`group relative bg-gradient-to-br ${action.gradient} rounded-2xl p-4 sm:p-5 text-white transition-all duration-300 hover:scale-105 hover:-translate-y-1 ${action.shadowColor} shadow-lg hover:shadow-xl active:scale-95`}
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-2xl transition-all duration-300"></div>
                  <div className="relative flex flex-col items-center text-center gap-2">
                    <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                      {action.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">
                        {action.title}
                      </div>
                      <div className="text-sm opacity-90 hidden sm:block">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  No quick actions available for your role.
                </p>
                <p className="text-sm text-gray-400">
                  Contact your administrator for access.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Grid - Responsive 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Order Status */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border-b border-gray-100 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Live Orders
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <LiveOrderStatus />
            </CardContent>
          </Card>

          {/* Room Status Widget */}
          {hasPermission("rooms.view") && (
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 border-b border-gray-100 dark:border-gray-700">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30">
                    <Bed className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Room Status
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <RoomStatusWidget />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Staff Attendance - Full Width */}
        {hasPermission("staff.view") && (
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 border-b border-gray-100 dark:border-gray-700">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/30">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Staff Attendance
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <StaffAttendanceWidget />
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 border-b border-gray-100 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/30">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Performance Overview
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Stats />
          </CardContent>
        </Card>

        {/* Weekly Sales Chart */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 border-b border-gray-100 dark:border-gray-700">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg shadow-pink-500/30">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                Weekly Sales Trend
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <WeeklySalesChart />
          </CardContent>
        </Card>
      </div>

      {/* Permission Denied Dialog */}
      <PermissionDeniedDialog
        open={permissionDialog.open}
        onOpenChange={(open) =>
          setPermissionDialog((prev) => ({ ...prev, open }))
        }
        featureName={permissionDialog.featureName}
        requiredPermission={permissionDialog.requiredPermission}
        onNavigateToHome={() => navigate("/")}
      />
    </div>
  );
};

export default Dashboard;
