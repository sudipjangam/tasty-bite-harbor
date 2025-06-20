import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { UserCheck, Calendar, FileText, Clock, Settings } from "lucide-react";
import type { StaffMember, StaffShift, StaffLeaveBalance, StaffTimeClockEntry, StaffRole, StaffLeaveRequest } from "@/types/staff";

// Import the individual tab components
import { ProfileTab } from "./ProfileComponents/ProfileTab";
import { ScheduleTab } from "./ProfileComponents/ScheduleTab";
import { LeaveTab } from "./ProfileComponents/LeaveTab";
import { TimeClockTab } from "./ProfileComponents/TimeClockTab";
import { PermissionsTab } from "./ProfileComponents/PermissionsTab";
import { StaffHeader } from "./ProfileComponents/StaffHeader";
import { StaffStatusDialog } from "./ProfileComponents/StaffStatusDialog";
import TimeClockDialog from "./TimeClockDialog";
import LeaveRequestDialog from "./LeaveRequestDialog";
import { formatDate, calculateDuration } from "./utilities/staffUtils";

interface StaffDetailProps {
  staffId: string;
  restaurantId: string | null;
  onEdit: (staff: StaffMember) => void;
  onBack: () => void;
}

const StaffDetail: React.FC<StaffDetailProps> = ({
  staffId,
  restaurantId,
  onEdit,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isTimeClockDialogOpen, setIsTimeClockDialogOpen] = useState(false);
  const [isLeaveRequestDialogOpen, setIsLeaveRequestDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch staff details
  const {
    data: staff,
    isLoading: isLoadingStaff,
    refetch: refetchStaff,
  } = useQuery({
    queryKey: ["staff-detail", staffId],
    enabled: !!staffId && !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("id", staffId)
        .single();

      if (error) throw error;
      return data as StaffMember;
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!staffId) return;

    const channel = supabase
      .channel('staff-detail-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff',
          filter: `id=eq.${staffId}`,
        },
        () => {
          refetchStaff();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffId, refetchStaff]);

  // Fetch staff roles
  const { data: roles = [] } = useQuery<StaffRole[]>({
    queryKey: ["staff-roles-all", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_roles")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data as StaffRole[];
    },
  });

  // Fetch upcoming shifts
  const { data: upcomingShifts = [] } = useQuery<StaffShift[]>({
    queryKey: ["staff-shifts", staffId],
    enabled: !!staffId && !!restaurantId,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("staff_shifts")
        .select("*")
        .eq("staff_id", staffId)
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as StaffShift[];
    },
  });

  // Fetch leave balances
  const { data: leaveBalances = [] } = useQuery<StaffLeaveBalance[]>({
    queryKey: ["staff-leave-balances", staffId],
    enabled: !!staffId && !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_leave_balances")
        .select("*")
        .eq("staff_id", staffId);

      if (error) throw error;
      return data as StaffLeaveBalance[];
    },
  });

  // Fetch upcoming leave
  const { data: upcomingLeave = [] } = useQuery<StaffLeaveRequest[]>({
    queryKey: ["staff-upcoming-leave", staffId],
    enabled: !!staffId && !!restaurantId,
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
      
      const { data: requestsData, error: requestsError } = await supabase
        .from("staff_leave_requests")
        .select("*")
        .eq("staff_id", staffId)
        .eq("status", "approved")
        .gte("end_date", now)
        .order("start_date", { ascending: true });

      if (requestsError) throw requestsError;
      
      if (requestsData && requestsData.length === 0) {
        const { data: legacyData, error: legacyError } = await supabase
          .from("staff_leaves")
          .select("*")
          .eq("staff_id", staffId)
          .eq("status", "approved")
          .gte("end_date", now)
          .order("start_date", { ascending: true });
          
        if (legacyError) throw legacyError;
        return legacyData as unknown as StaffLeaveRequest[];
      }
      
      return requestsData as StaffLeaveRequest[];
    },
  });

  // Fetch recent time clock entries
  const { data: timeClockEntries = [] } = useQuery<StaffTimeClockEntry[]>({
    queryKey: ["staff-time-clock", staffId],
    enabled: !!staffId && !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_time_clock")
        .select("*")
        .eq("staff_id", staffId)
        .order("clock_in", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as StaffTimeClockEntry[];
    },
  });

  // Deactivate staff member mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("staff")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-detail"] });
      queryClient.invalidateQueries({ queryKey: ["enhanced-staff"] });
      toast({
        title: "Staff status updated",
        description: "The staff member's status has been updated successfully.",
      });
      setIsStatusDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const handleStatusDialogConfirm = () => {
    if (staff) {
      changeStatusMutation.mutate({ 
        id: staffId, 
        status: staff.status === "inactive" ? "active" : "inactive" 
      });
    }
  };

  const handleActivateDeactivate = () => {
    setIsStatusDialogOpen(true);
  };

  const handleClockInOutSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-time-clock"] });
    setIsTimeClockDialogOpen(false);
  };

  const handleLeaveRequestSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-upcoming-leave"] });
    setIsLeaveRequestDialogOpen(false);
  };

  if (isLoadingStaff) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
          <p className="text-gray-600 animate-pulse">Loading staff details...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Staff not found</CardTitle>
          <CardDescription>The staff member you are looking for does not exist.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button 
            onClick={onBack}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
          >
            Back to staff list
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg p-6">
        <StaffHeader 
          staff={staff} 
          onBack={onBack} 
          onEdit={onEdit}
          onActivateDeactivate={handleActivateDeactivate}
        />
      </div>

      <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-2">
            <TabsList className="w-full bg-transparent rounded-xl p-1">
              <TabsTrigger 
                value="profile" 
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" /> Profile
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" /> Schedule
              </TabsTrigger>
              <TabsTrigger 
                value="leave" 
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <FileText className="h-4 w-4" /> Leave
              </TabsTrigger>
              <TabsTrigger 
                value="timeclock" 
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Clock className="h-4 w-4" /> Time Clock
              </TabsTrigger>
              <TabsTrigger 
                value="permissions" 
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2"
              >
                <Settings className="h-4 w-4" /> Permissions
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="profile" className="mt-0">
              <ProfileTab staff={staff} formatDate={formatDate} />
            </TabsContent>

            <TabsContent value="schedule" className="mt-0">
              <ScheduleTab upcomingShifts={upcomingShifts} formatDate={formatDate} />
            </TabsContent>

            <TabsContent value="leave" className="mt-0">
              <LeaveTab 
                leaveBalances={leaveBalances}
                upcomingLeave={upcomingLeave}
                formatDate={formatDate}
                calculateDuration={calculateDuration}
                onRequestLeave={() => setIsLeaveRequestDialogOpen(true)}
              />
            </TabsContent>

            <TabsContent value="timeclock" className="mt-0">
              <TimeClockTab 
                timeClockEntries={timeClockEntries} 
                formatDate={formatDate} 
                onClockInOut={() => setIsTimeClockDialogOpen(true)}
              />
            </TabsContent>

            <TabsContent value="permissions" className="mt-0">
              <PermissionsTab roles={roles} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Status change confirmation dialog */}
      <StaffStatusDialog
        isInactive={staff.status === "inactive"}
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={handleStatusDialogConfirm}
      />

      {/* Time Clock Dialog */}
      <TimeClockDialog
        isOpen={isTimeClockDialogOpen}
        onClose={() => setIsTimeClockDialogOpen(false)}
        staffId={staffId}
        restaurantId={restaurantId}
        onSuccess={handleClockInOutSuccess}
      />
      
      {/* Leave Request Dialog */}
      <LeaveRequestDialog
        isOpen={isLeaveRequestDialogOpen}
        onClose={() => setIsLeaveRequestDialogOpen(false)}
        restaurantId={restaurantId || ""}
        staff_id={staffId}
        onSuccess={handleLeaveRequestSuccess}
      />
    </div>
  );
};

export default StaffDetail;
