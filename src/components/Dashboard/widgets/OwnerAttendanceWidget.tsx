import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, differenceInMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  UserCheck,
  CalendarDays,
  Power,
  UserX,
  AlertCircle,
  Calendar,
} from "lucide-react";

const OwnerAttendanceWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("my-status");

  // Owner's staff record and attendance status
  const {
    staff,
    activeClockEntry,
    isStaff,
    refetchTimeEntries,
  } = useCurrentStaff();

  // Fetch today's clock-ins for ALL staff
  const { data: todayClockIns = [], isLoading: isLoadingAttendance } = useQuery(
    {
      queryKey: ["owner-today-attendance", restaurantId],
      queryFn: async () => {
        if (!restaurantId) return [];
        const today = format(new Date(), "yyyy-MM-dd");

        const { data, error } = await supabase
          .from("staff_time_clock")
          .select(
            `
          id,
          clock_in,
          clock_out,
          clock_in_status,
          staff_id,
          staff:staff_id(id, first_name, last_name)
        `,
          )
          .eq("restaurant_id", restaurantId)
          .gte("clock_in", `${today}T00:00:00`)
          .lte("clock_in", `${today}T23:59:59`)
          .order("clock_in", { ascending: false });

        if (error) {
          console.error("Attendance query error:", error);
          return [];
        }
        return data || [];
      },
      enabled: !!restaurantId,
      refetchInterval: 60000,
    },
  );

  // Fetch upcoming leaves across all staff
  const { data: upcomingLeaves = [], isLoading: isLoadingLeaves } = useQuery({
    queryKey: ["owner-upcoming-leaves", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const today = format(new Date(), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("staff_leave_requests")
        .select(
          `
          id,
          start_date,
          end_date,
          status,
          leave_type,
          staff_id
        `,
        )
        .eq("restaurant_id", restaurantId)
        .gte("end_date", today)
        .in("status", ["approved", "pending"])
        .order("start_date", { ascending: true })
        .limit(10);

      if (error) {
        console.error("Leave query error:", error);
        return [];
      }
      
      if (!data || data.length === 0) return [];

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, first_name, last_name")
        .eq("restaurant_id", restaurantId);

      return data.map(leave => ({
        ...leave,
        staff: staffData?.find(s => s.id === leave.staff_id) || null
      }));
    },
    enabled: !!restaurantId,
  });

  // Owner Clock In / Out Mutations
  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!staff?.id || !restaurantId) throw new Error("Missing staff info");

      // Verify no active entry exists
      const { data: existing } = await supabase
        .from("staff_time_clock")
        .select("id, clock_out")
        .eq("staff_id", staff.id)
        .order("clock_in", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        if (!existing[0].clock_out) {
           throw new Error("Already clocked in");
        }
        // Check cooldown against the last known clock_out
        if (differenceInMinutes(new Date(), new Date(existing[0].clock_out)) < 5) {
          // Trigger owner notification for violation
          await supabase.from("owner_notifications").insert({
            restaurant_id: restaurantId,
            type: "attendance_violation",
            title: "Rapid Attendance Modification",
            message: `${staff.first_name} ${staff.last_name} attempted to clock in less than 5 minutes after clocking out.`,
            staff_name: `${staff.first_name} ${staff.last_name}`,
            action_url: "/staff"
          });
          throw new Error("You must wait at least 5 minutes before clocking back in.");
        }
      }

      const { error } = await supabase.from("staff_time_clock").insert({
        staff_id: staff.id,
        restaurant_id: restaurantId,
        clock_in: new Date().toISOString(),
        clock_in_status: "on_time", // Owner is implicitly on time
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Clocked In",
        description: "Your shift has started.",
      });
      refetchTimeEntries();
      queryClient.invalidateQueries({ queryKey: ["owner-today-attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Clocking In",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeClockEntry?.id) throw new Error("No active shift found");

      // Check cooldown against active shift's clock_in
      if (differenceInMinutes(new Date(), new Date(activeClockEntry.clock_in)) < 5) {
         // Trigger owner notification for violation
          await supabase.from("owner_notifications").insert({
            restaurant_id: restaurantId,
            type: "attendance_violation",
            title: "Rapid Attendance Modification",
            message: `${staff?.first_name} ${staff?.last_name} attempted to clock out less than 5 minutes after clocking in.`,
            staff_name: `${staff?.first_name} ${staff?.last_name}`,
            action_url: "/staff"
          });
          throw new Error("You must wait at least 5 minutes before clocking out.");
      }

      const { error } = await supabase
        .from("staff_time_clock")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", activeClockEntry.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Clocked Out",
        description: "Your shift has ended.",
      });
      refetchTimeEntries();
      queryClient.invalidateQueries({ queryKey: ["owner-today-attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Clocking Out",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClockToggle = () => {
    if (activeClockEntry) {
      clockOutMutation.mutate();
    } else {
      clockInMutation.mutate();
    }
  };

  const activeStaff = todayClockIns.filter((e) => !e.clock_out);
  const lateStaff = todayClockIns.filter(
    (e) => e.clock_in_status === "late" && !e.clock_out,
  );

  return (
    <div className="flex flex-col h-full rounded-2xl p-1 gap-2">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex-1 flex flex-col items-center"
      >
        <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl mb-3">
          <TabsTrigger value="my-status" className="rounded-lg text-xs font-semibold">
            Me
          </TabsTrigger>
          <TabsTrigger value="staff-status" className="rounded-lg text-xs font-semibold">
            Staff
            {activeStaff.length > 0 && (
              <span className="ml-1.5 h-4 w-4 rounded-full bg-blue-500 text-[10px] text-white flex items-center justify-center">
                {activeStaff.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-lg text-xs font-semibold">
            Leaves
            {upcomingLeaves.length > 0 && (
              <span className="ml-1.5 h-4 w-4 rounded-full bg-orange-500 text-[10px] text-white flex items-center justify-center">
                {upcomingLeaves.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="w-full flex-1 overflow-y-auto custom-scrollbar relative px-1 max-h-[350px] min-h-[350px]">
          <TabsContent
            value="my-status"
            className="mt-0 h-full flex flex-col items-center justify-center w-full"
          >
            {isStaff ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-center space-y-5 py-4 animate-in fade-in zoom-in-95 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {staff?.first_name} {staff?.last_name}
                  </h3>
                  <p className="text-sm font-medium mt-1 flex items-center justify-center gap-1.5">
                    {activeClockEntry ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4" /> Clocked in since{" "}
                        {format(new Date(activeClockEntry.clock_in), "h:mm a")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        <Power className="w-4 h-4 text-gray-400" /> Currently clocked out
                      </span>
                    )}
                  </p>
                </div>

                <div
                  className={`relative w-[140px] h-[140px] rounded-full flex items-center justify-center transition-all duration-500 ${
                    activeClockEntry
                      ? "bg-rose-50 dark:bg-rose-900/20 shadow-[0_0_40px_-5px_rgba(225,29,72,0.3)]"
                      : "bg-emerald-50 dark:bg-emerald-900/20 shadow-[0_0_40px_-5px_rgba(16,185,129,0.3)]"
                  }`}
                >
                  <Button
                    size="lg"
                    onClick={handleClockToggle}
                    disabled={
                      clockInMutation.isPending || clockOutMutation.isPending
                    }
                    className={`w-[110px] h-[110px] rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-xl ${
                      activeClockEntry
                        ? "bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 hover:shadow-rose-500/40"
                        : "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-500/40"
                    }`}
                  >
                    <Power className="w-8 h-8 text-white drop-shadow-sm" strokeWidth={2.5} />
                    <span className="font-bold text-white tracking-wider text-sm drop-shadow-sm">
                      {activeClockEntry ? "CHECK OUT" : "CHECK IN"}
                    </span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full text-center py-6 px-4">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl mb-3 shadow-inner">
                  <UserX className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  No Staff Match
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                  Please ensure your email matches a staff member in the system to mark attendance.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="staff-status"
            className="mt-0 h-full w-full pb-2"
          >
            {isLoadingAttendance ? (
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full h-14 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"
                  />
                ))}
              </div>
            ) : todayClockIns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl mb-3 shadow-sm">
                  <UserCheck className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No Activity Yet</p>
                <p className="text-xs text-gray-400 mt-1">Staff haven't clocked in today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Staff */}
                {activeStaff.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 pl-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      On Duty Currently <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">{activeStaff.length}</span>
                    </div>
                    {activeStaff.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                             {(entry.staff as any)?.first_name?.charAt(0)}{(entry.staff as any)?.last_name?.charAt(0)}
                           </div>
                           <div>
                              <div className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                {(entry.staff as any)?.first_name} {(entry.staff as any)?.last_name}
                                {entry.clock_in_status === "late" && (
                                    <Badge variant="destructive" className="h-4 px-1 text-[9px] uppercase tracking-wider">Late</Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> In at {format(new Date(entry.clock_in), "h:mm a")}
                              </span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Completed Shifts */}
                {todayClockIns.filter((e) => e.clock_out).length > 0 && (
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 pl-1">
                      Completed Shifts
                    </div>
                    {todayClockIns
                      .filter((e) => e.clock_out)
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-gray-600 dark:text-gray-300">
                              {(entry.staff as any)?.first_name} {(entry.staff as any)?.last_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
                            <span>{format(new Date(entry.clock_in), "h:mm a")}</span>
                            <span>→</span>
                            <span>{format(new Date(entry.clock_out!), "h:mm a")}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="leaves"
            className="mt-0 h-full w-full pb-2"
          >
             {isLoadingLeaves ? (
              <div className="space-y-3 pt-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-full h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl"
                  />
                ))}
              </div>
            ) : upcomingLeaves.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl mb-3 shadow-sm">
                  <CalendarDays className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No Upcoming Leaves</p>
                <p className="text-xs text-gray-400 mt-1">Staff schedules are clear.</p>
              </div>
            ) : (
               <div className="space-y-2.5">
                 {upcomingLeaves.map((leave: any) => {
                    const startDate = new Date(leave.start_date);
                    const endDate = new Date(leave.end_date);
                    
                    return (
                      <div key={leave.id} className="p-3 bg-white dark:bg-gray-800/80 rounded-2xl border border-orange-100 dark:border-orange-900/30 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                        <div className="flex items-start justify-between mb-1 pl-1">
                           <span className="font-bold text-sm text-gray-900 dark:text-white">
                              {(leave.staff as any)?.first_name} {(leave.staff as any)?.last_name}
                           </span>
                           <Badge 
                              variant="outline" 
                              className={`text-[9px] uppercase tracking-wider px-1.5 ${
                                 leave.status === 'approved' 
                                  ? 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/20' 
                                  : 'border-amber-200 text-amber-600 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-900/20'
                              }`}
                           >
                              {leave.status}
                           </Badge>
                        </div>
                        <div className="flex flex-col gap-1 pl-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {leave.leave_type.replace('_', ' ')}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                 })}
               </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default OwnerAttendanceWidget;
