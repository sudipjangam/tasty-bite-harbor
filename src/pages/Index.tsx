import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
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
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Stats from "@/components/Dashboard/Stats";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";
import TrendingItems from "@/components/Dashboard/TrendingItems";
import StaffSelfServiceSection from "@/components/Dashboard/StaffSelfServiceSection";
import StaffAttendanceWidget from "@/components/Dashboard/StaffAttendanceWidget";
import TodayScheduleWidget from "@/components/Dashboard/TodayScheduleWidget";
import AttendanceReportsWidget from "@/components/Dashboard/AttendanceReportsWidget";
import LaborCostWidget from "@/components/Dashboard/LaborCostWidget";
import TimeClockDialog from "@/components/Staff/TimeClockDialog";
import LeaveRequestDialog from "@/components/Staff/LeaveRequestDialog";
import { useRefetchOnNavigation } from "@/hooks/useRefetchOnNavigation";
import type { StaffMember } from "@/types/staff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const { user, hasPermission } = useAuth();
  const { restaurantId } = useRestaurantId();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Refetch dashboard data when navigating to this page
  useRefetchOnNavigation(['dashboard-orders']);
  
  const [permissionDialog, setPermissionDialog] = useState<{
    open: boolean;
    featureName: string;
    requiredPermission: string;
  }>({
    open: false,
    featureName: '',
    requiredPermission: ''
  });

  // Self-service dialog states
  const [isTimeClockDialogOpen, setIsTimeClockDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  // Get current staff data using the custom hook
  const {
    staff,
    isLoading: isLoadingStaff,
    isStaff,
    activeClockEntry,
    recentTimeEntries,
    leaveBalances,
    upcomingLeave,
    refetchTimeEntries,
    refetchLeaveData,
  } = useCurrentStaff();

  // Handle clock in/out success
  const handleClockSuccess = () => {
    toast({
      title: activeClockEntry ? "Clocked Out" : "Clocked In",
      description: activeClockEntry 
        ? "You have successfully clocked out. Have a great rest of the day!"
        : "You have successfully clocked in. Have a productive shift!",
    });
    refetchTimeEntries();
    setIsTimeClockDialogOpen(false);
  };

  // Handle leave request success
  const handleLeaveRequestSuccess = () => {
    toast({
      title: "Leave Request Submitted",
      description: "Your leave request has been submitted for approval.",
    });
    refetchLeaveData();
    setIsLeaveDialogOpen(false);
  };


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
      gradient: "from-amber-500 to-orange-600",
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

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950 pb-20">
      {/* Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-800 dark:via-indigo-900 dark:to-blue-900 p-6 sm:p-10 mb-8 rounded-b-[40px] shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {greeting}{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
                </h1>
                <p className="text-blue-100 text-lg mt-1 font-medium">
                  Here's what's happening today
                </p>
              </div>
            </div>
            
            {/* Quick status indicators */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-colors">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                <span className="text-sm font-medium text-white">Systems Online</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-colors">
                <Users className="h-4 w-4 text-blue-300" />
                <span className="text-sm font-medium text-white">Staff Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 space-y-8 -mt-12 relative z-20">
        {/* Self-Service Section */}
        {isStaff && staff ? (
          <StaffSelfServiceSection
            staffName={`${staff.first_name || ""} ${staff.last_name || ""}`.trim()}
            isClockedIn={!!activeClockEntry}
            activeClockEntry={activeClockEntry}
            recentTimeEntries={recentTimeEntries}
            leaveBalances={leaveBalances}
            upcomingLeave={upcomingLeave}
            onClockInOut={() => setIsTimeClockDialogOpen(true)}
            onRequestLeave={() => setIsLeaveDialogOpen(true)}
            isLoading={isLoadingStaff}
          />
        ) : !isLoadingStaff && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/40 dark:border-gray-700/50 rounded-3xl shadow-2xl p-6 md:p-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Staff Self-Service
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Your account is not linked to a staff profile yet. Contact your administrator to link your email 
                  <span className="font-medium text-purple-600 dark:text-purple-400"> ({user?.email})</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Business Statistics - Top Priority */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Business Overview
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Key performance metrics for today
              </p>
            </div>
          </div>
          <Stats />
        </div>

        {/* Charts & Activity - High Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border-b border-gray-100 dark:border-gray-700/50">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Sales Trend
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <WeeklySalesChart />
            </CardContent>
          </Card>
          
          <TrendingItems />
        </div>

        {/* Quick Actions - Medium Priority */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-500" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredQuickActions.length > 0 ? (
              filteredQuickActions.map((action, index) => (
                <button 
                  key={index} 
                  className={`group relative overflow-hidden bg-gradient-to-br ${action.gradient} rounded-2xl p-5 text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 active:scale-95`}
                  onClick={action.onClick}
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-all duration-300"></div>
                  <div className="relative z-10 flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                      {React.cloneElement(action.icon as React.ReactElement, { className: "h-6 w-6 text-white" })}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base sm:text-lg">
                        {action.title}
                      </h3>
                      <p className="text-white/80 text-xs sm:text-sm mt-1 hidden sm:block">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full">
                <div className="bg-white/50 rounded-2xl p-8 text-center border-dashed border-2 border-gray-300">
                    <p>No actions available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Dashboard Grid Legacy Wrapper - Now just for Staff/Reports */}
        <div className="space-y-8">
          
          {/* Staff Management Section */}
          {hasPermission('staff.view') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StaffAttendanceWidget />
              <TodayScheduleWidget />
            </div>
          )}

          {/* Advanced Reports Section */}
          {hasPermission('staff.view') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttendanceReportsWidget />
              <LaborCostWidget />
            </div>
          )}
        </div>
      </div>

      <PermissionDeniedDialog
        open={permissionDialog.open}
        onOpenChange={(open) => setPermissionDialog(prev => ({ ...prev, open }))}
        featureName={permissionDialog.featureName}
        requiredPermission={permissionDialog.requiredPermission}
        onNavigateToHome={() => navigate('/')}
      />

      {staff && restaurantId && (
        <TimeClockDialog
          isOpen={isTimeClockDialogOpen}
          onClose={() => setIsTimeClockDialogOpen(false)}
          staffId={staff.id}
          restaurantId={restaurantId}
          onSuccess={handleClockSuccess}
        />
      )}

      {staff && restaurantId && (
        <LeaveRequestDialog
          isOpen={isLeaveDialogOpen}
          onClose={() => setIsLeaveDialogOpen(false)}
          restaurantId={restaurantId}
          staff_id={staff.id}
          staffOptions={[staff as StaffMember]}
          onSuccess={handleLeaveRequestSuccess}
        />
      )}
    </div>
  );
};

export default Index;
