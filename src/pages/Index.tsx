import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { PermissionDeniedDialog } from "@/components/Auth/PermissionDeniedDialog";
import {
  BarChart3,
  Users,
  TrendingUp,
  Sparkles,
  Clock,
  PieChart,
  Table2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Stats from "@/components/Dashboard/Stats";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";
import TrendingItems from "@/components/Dashboard/TrendingItems";
import StaffSelfServiceSection from "@/components/Dashboard/StaffSelfServiceSection";
import RevenuePieChart from "@/components/Dashboard/RevenuePieChart";
import RecentOrdersTable from "@/components/Dashboard/RecentOrdersTable";
import TimeClockDialog from "@/components/Staff/TimeClockDialog";
import LeaveRequestDialog from "@/components/Staff/LeaveRequestDialog";
import { useRefetchOnNavigation } from "@/hooks/useRefetchOnNavigation";
import { useAutoClockOut } from "@/hooks/useAutoClockOut";
import type { StaffMember } from "@/types/staff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import FoodTruckDashboard from "@/components/Dashboard/FoodTruckDashboard";

const Index = () => {
  const { user, hasPermission } = useAuth();
  const { restaurantId } = useRestaurantId();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Refetch dashboard data when navigating to this page
  useRefetchOnNavigation(["dashboard-orders"]);

  // Detect food truck mode
  const { data: locationType } = useQuery({
    queryKey: ["restaurant-location-type", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("location_type")
        .eq("id", restaurantId)
        .single();
      return data?.location_type || "fixed";
    },
    staleTime: 1000 * 60 * 10,
  });

  const [permissionDialog, setPermissionDialog] = useState<{
    open: boolean;
    featureName: string;
    requiredPermission: string;
  }>({
    open: false,
    featureName: "",
    requiredPermission: "",
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
    hasCompletedShiftToday,
    leaveBalances,
    upcomingLeave,
    refetchTimeEntries,
    refetchLeaveData,
  } = useCurrentStaff();

  // Auto clock-out: automatically ends shift after configured time
  useAutoClockOut(staff?.id, activeClockEntry, restaurantId);

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

  // Auto clock-in: Automatically clock in staff when they log in if not already clocked in
  useEffect(() => {
    const autoClockInStaff = async () => {
      if (
        !isLoadingStaff &&
        isStaff &&
        staff &&
        !activeClockEntry &&
        !hasCompletedShiftToday &&
        restaurantId
      ) {
        // Check if we already auto-clocked in this session to prevent infinite loops
        const today = new Date().toISOString().split("T")[0];
        const autoClockedKey = `auto-clocked-in-${today}`;

        if (!sessionStorage.getItem(autoClockedKey)) {
          try {
            // First mark as attempted to prevent duplicate calls
            sessionStorage.setItem(autoClockedKey, "true");

            // Double check if already clocked in to prevent race conditions
            const { data: activeSessions } = await supabase
              .from("staff_time_clock")
              .select("*")
              .eq("staff_id", staff.id)
              .is("clock_out", null)
              .limit(1);

            if (activeSessions && activeSessions.length > 0) {
              return; // Already clocked in
            }

            // Create clock-in record
            const { error } = await supabase.from("staff_time_clock").insert([
              {
                staff_id: staff.id,
                restaurant_id: restaurantId,
                clock_in: new Date().toISOString(),
                notes: "Auto clock-in on login",
                clock_in_status: "no_shift",
              },
            ]);

            if (error) throw error;

            // Update staff status
            await supabase
              .from("staff")
              .update({ status: "working" })
              .eq("id", staff.id);

            toast({
              title: "✓ Shift Started",
              description: `Automatically clocked in at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Have a great shift!`,
            });

            refetchTimeEntries();
          } catch (error: any) {
            console.error("Auto clock-in failed:", error);
            // Optionally clear session storage so it tries again later if it failed?
            // sessionStorage.removeItem(autoClockedKey);
          }
        }
      }
    };

    autoClockInStaff();
  }, [
    isLoadingStaff,
    isStaff,
    staff,
    activeClockEntry,
    hasCompletedShiftToday,
    restaurantId,
    refetchTimeEntries,
    toast,
  ]);

  const handleNavigationWithPermission = (
    path: string,
    permission: string,
    featureName: string,
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

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  // If food truck mode, render specialized dashboard
  if (locationType === "mobile") {
    return <FoodTruckDashboard />;
  }

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
                  {greeting}
                  {user?.email ? `, ${user.email.split("@")[0]}` : ""}!
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
                <span className="text-sm font-medium text-white">
                  Systems Online
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-colors">
                <Users className="h-4 w-4 text-blue-300" />
                <span className="text-sm font-medium text-white">
                  Staff Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 space-y-8 -mt-12 relative z-20">
        {/* Self-Service Section */}
        {isStaff && staff ? (
          <StaffSelfServiceSection
            staffName={`${staff.first_name || ""} ${
              staff.last_name || ""
            }`.trim()}
            isClockedIn={!!activeClockEntry}
            activeClockEntry={activeClockEntry}
            recentTimeEntries={recentTimeEntries}
            leaveBalances={leaveBalances}
            upcomingLeave={upcomingLeave}
            onClockInOut={() => setIsTimeClockDialogOpen(true)}
            onRequestLeave={() => setIsLeaveDialogOpen(true)}
            isLoading={isLoadingStaff}
          />
        ) : (
          !isLoadingStaff && (
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
                    Your account is not linked to a staff profile yet. Contact
                    your administrator to link your email
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {" "}
                      ({user?.email})
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          )
        )}

        {/* Business Statistics - Premium Design */}
        <div className="relative group/section">
          {/* Animated gradient border glow */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 via-blue-500 via-purple-500 to-orange-500 rounded-[26px] opacity-20 blur-sm group-hover/section:opacity-30 transition-opacity duration-700 animate-pulse-gentle" />
          
          <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl border border-white/40 dark:border-gray-700/30 rounded-3xl shadow-2xl overflow-hidden">
            {/* Decorative floating orbs */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-purple-400/10 via-blue-400/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-emerald-400/10 via-teal-400/5 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
            
            <div className="relative p-6 sm:p-8">
              {/* Section header */}
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl blur-md opacity-40" />
                    <div className="relative p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                      Business Overview
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Key performance metrics • Last 30 days
                    </p>
                  </div>
                </div>
                
                {/* Live indicator */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/30 rounded-full">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Live</span>
                </div>
              </div>

              <Stats />
            </div>
          </div>
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

        {/* Financial Insights Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown Pie Chart */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 border-b border-gray-100 dark:border-gray-700/50">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg shadow-pink-500/20">
                  <PieChart className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                  Revenue by Category
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <RevenuePieChart />
            </CardContent>
          </Card>

          {/* Recent Orders Table */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 border-b border-gray-100 dark:border-gray-700/50">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl shadow-lg shadow-cyan-500/20">
                  <Table2 className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Top Orders Today
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <RecentOrdersTable />
            </CardContent>
          </Card>
        </div>
      </div>

      <PermissionDeniedDialog
        open={permissionDialog.open}
        onOpenChange={(open) =>
          setPermissionDialog((prev) => ({ ...prev, open }))
        }
        featureName={permissionDialog.featureName}
        requiredPermission={permissionDialog.requiredPermission}
        onNavigateToHome={() => navigate("/")}
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

      {/* Removed AutoClockInPrompt as it is now handled automatically */}
    </div>
  );
};

export default Index;
