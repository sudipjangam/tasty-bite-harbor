import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNavigate as useRouterNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  Coffee,
  UtensilsCrossed,
  Bed,
  Users,
  ClipboardList,
  Sparkles,
  ArrowRight,
  Clock,
  CalendarDays,
  Bell,
  BellOff,
  CheckCircle2,
  ClipboardCheck,
  Home,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import StaffSelfServiceSection from "./StaffSelfServiceSection";
import TimeClockDialog from "@/components/Staff/TimeClockDialog";
import LeaveRequestDialog from "@/components/Staff/LeaveRequestDialog";
import HousekeepingChecklistDialog from "@/components/Housekeeping/HousekeepingChecklistDialog";
import TodayShiftWidget from "@/components/Staff/TodayShiftWidget";
import type { StaffMember } from "@/types/staff";

// All possible quick actions for staff
const allQuickActions = [
  {
    title: "POS",
    description: "Take new orders",
    icon: ShoppingCart,
    path: "/pos",
    permission: "orders.view",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Orders",
    description: "View & manage orders",
    icon: ClipboardList,
    path: "/orders",
    permission: "orders.view",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    title: "Kitchen",
    description: "Kitchen display system",
    icon: UtensilsCrossed,
    path: "/kitchen",
    permission: "kitchen.view",
    gradient: "from-orange-500 to-red-500",
  },
  {
    title: "Menu",
    description: "View menu items",
    icon: Coffee,
    path: "/menu",
    permission: "menu.view",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    title: "Tables",
    description: "Table management",
    icon: Users,
    path: "/tables",
    permission: "tables.view",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    title: "Rooms",
    description: "Room availability",
    icon: Bed,
    path: "/rooms",
    permission: "rooms.view",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    title: "Reservations",
    description: "View reservations",
    icon: CalendarDays,
    path: "/reservations",
    permission: "reservations.view",
    gradient: "from-rose-500 to-pink-600",
  },
];

// Get time-based greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * Landing page for users without dashboard access.
 * Shows personalized greeting, self-service section for staff, and quick links to accessible components.
 */
const StaffLandingPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { restaurantId } = useRestaurantId();
  const navigate = useRouterNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Self-service dialog states
  const [isTimeClockDialogOpen, setIsTimeClockDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [checklistSchedule, setChecklistSchedule] = useState<any>(null);
  const [openChecklist, setOpenChecklist] = useState(false);

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

  // Filter quick actions based on user permissions
  const accessibleActions = allQuickActions.filter(action =>
    hasPermission(action.permission as any)
  );

  // Get user display name
  const displayName = staff?.first_name || user?.first_name || user?.email?.split("@")[0] || "Team Member";
  const userRole = user?.role_name_text || user?.role || "Staff";

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

  // Fetch staff notifications
  const { data: notifications } = useQuery({
    queryKey: ['staff-notifications', staff?.id],
    queryFn: async () => {
      if (!staff?.id || !restaurantId) return [];
      
      const { data, error } = await supabase
        .from('staff_notifications')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!staff?.id && !!restaurantId,
  });

  // Fetch assigned cleaning tasks for this staff
  const { data: assignedTasks } = useQuery({
    queryKey: ['staff-cleaning-tasks', staff?.id],
    queryFn: async () => {
      if (!staff?.id || !restaurantId) {
        console.log('[StaffLandingPage] No staff or restaurant ID');
        return [];
      }
      
      const { data, error } = await supabase
        .from('room_cleaning_schedules')
        .select(`
          *,
          rooms(name),
          assigned_staff:staff!room_cleaning_schedules_assigned_staff_id_fkey(first_name, last_name)
        `)
        .eq('assigned_staff_id', staff.id)
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        console.error('[StaffLandingPage] Error fetching tasks:', error);
        throw error;
      }
      console.log('[StaffLandingPage] Fetched tasks:', data);
      return data;
    },
    enabled: !!staff?.id && !!restaurantId,
  });

  // Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('staff_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
    }
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!staff?.id) return;
      
      const { error } = await supabase
        .from('staff_notifications')
        .update({ is_read: true })
        .eq('staff_id', staff.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
    }
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;
  const pendingTasks = assignedTasks?.filter((t: any) => t.status === 'pending').length || 0;
  const inProgressTasks = assignedTasks?.filter((t: any) => t.status === 'in_progress').length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-4 md:p-6">
      {/* Welcome Header */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {getGreeting()}, {displayName}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mt-1">
                Welcome back • <span className="capitalize font-medium">{userRole}</span>
              </p>
            </div>
          </div>

          {/* Current Time */}
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Clock className="h-5 w-5" />
            <span className="text-sm">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Today's Shift Widget - Show for linked staff */}
        {isStaff && staff && restaurantId && (
          <div className="mb-6">
            <TodayShiftWidget
              staffId={staff.id}
              restaurantId={restaurantId}
              activeClockEntry={activeClockEntry ? {
                clock_in: activeClockEntry.clock_in,
                clock_in_status: (activeClockEntry as any).clock_in_status,
                minutes_variance: (activeClockEntry as any).minutes_variance
              } : null}
            />
          </div>
        )}

        {/* Self-Service Section - Show for linked staff, or info message for non-linked users */}
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
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-6 md:p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Staff Self-Service
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Your account is not linked to a staff profile yet. Contact your administrator to link your email 
                  <span className="font-medium text-purple-600 dark:text-purple-400"> ({user?.email || 'your email'})</span> to your staff record to access clock in/out and leave features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 📋 Assigned Tasks & Notifications Section - Only for linked staff */}
        {isStaff && staff && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-6 md:p-8 mb-8">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <ClipboardCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  My Tasks & Notifications
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Your assigned housekeeping tasks
                </p>
              </div>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white ml-auto">{unreadCount} new</Badge>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-white/80 font-medium uppercase">Pending</p>
                    <p className="text-2xl font-bold text-white">{pendingTasks}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-white/80 font-medium uppercase">In Progress</p>
                    <p className="text-2xl font-bold text-white">{inProgressTasks}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-white/80 font-medium uppercase">Notifications</p>
                    <p className="text-2xl font-bold text-white">{unreadCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assigned Tasks */}
              <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardCheck className="h-5 w-5 text-purple-500" />
                    My Assigned Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    {!assignedTasks || assignedTasks.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                        <p className="text-gray-500">No pending tasks! 🎉</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignedTasks.map((task: any) => (
                          <div 
                            key={task.id}
                            className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                              task.priority === 'urgent' 
                                ? 'border-l-4 border-l-red-500 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                            }`}
                            onClick={() => {
                              // Navigate to Housekeeping Cleaning tab
                              navigate('/housekeeping?tab=cleaning');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-gray-500" />
                                <span className="font-medium cursor-pointer hover:text-purple-600 transition-colors">{task.rooms?.name}</span>
                                {task.priority === 'urgent' && (
                                  <Badge variant="destructive" className="text-xs">🔥 Urgent</Badge>
                                )}
                              </div>
                              <Badge className={`${task.status === 'in_progress' ? 'bg-blue-500' : 'bg-orange-500'} text-white text-xs`}>
                                {task.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 capitalize">
                              Type: {task.cleaning_type?.replace('_', ' ')}
                            </p>
                            {task.cleaning_type === 'post_checkout' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 border-purple-300 text-purple-600 hover:bg-purple-50 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChecklistSchedule(task);
                                  setOpenChecklist(true);
                                }}
                              >
                                <ClipboardCheck className="h-3 w-3 mr-1" />
                                Open Checklist
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Bell className="h-5 w-5 text-purple-500" />
                      Notifications
                    </CardTitle>
                    {unreadCount > 0 && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending}
                      >
                        <BellOff className="h-4 w-4 mr-1" />
                        Mark All Read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    {!notifications || notifications.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map((notification: any) => (
                          <div 
                            key={notification.id}
                            className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                              notification.is_read
                                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                                : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                            }`}
                            onClick={() => {
                              if (!notification.is_read) {
                                markReadMutation.mutate(notification.id);
                              }
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <ClipboardCheck className="h-4 w-4 text-purple-500 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{notification.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Quick Access Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Quick Access
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Jump to your available tools
              </p>
            </div>
          </div>

          {accessibleActions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {accessibleActions.map((action, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-2xl p-6 hover:bg-white dark:hover:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                  onClick={() => navigate(action.path)}
                >
                  {/* Gradient overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`p-3 bg-gradient-to-r ${action.gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <action.icon className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300" />
                    </div>

                    <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors duration-300">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {action.description}
                    </p>

                    <div
                      className={`w-full h-0.5 bg-gradient-to-r ${action.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // No accessible components
            <div className="text-center py-12">
              <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-8 max-w-md mx-auto">
                <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-full inline-block mb-4">
                  <Clock className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No Modules Assigned Yet
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-4">
                  Please contact your manager or administrator to get access to the system modules.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Need help? Contact your administrator for assistance.
          </p>
        </div>
      </div>

      {/* Time Clock Dialog */}
      {staff && restaurantId && (
        <TimeClockDialog
          isOpen={isTimeClockDialogOpen}
          onClose={() => setIsTimeClockDialogOpen(false)}
          staffId={staff.id}
          restaurantId={restaurantId}
          onSuccess={handleClockSuccess}
        />
      )}

      {/* Leave Request Dialog */}
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

      {/* Housekeeping Checklist Dialog */}
      <HousekeepingChecklistDialog
        open={openChecklist}
        onClose={() => {
          setOpenChecklist(false);
          setChecklistSchedule(null);
          queryClient.invalidateQueries({ queryKey: ['staff-cleaning-tasks'] });
        }}
        schedule={checklistSchedule}
      />
    </div>
  );
};

export default StaffLandingPage;

