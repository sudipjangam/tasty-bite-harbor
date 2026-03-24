import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Check,
  X,
  ClipboardCheck,
  UserPlus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useHousekeeping } from "@/hooks/useHousekeeping";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CleaningScheduleDialog from "./CleaningScheduleDialog";
import HousekeepingChecklistDialog from "./HousekeepingChecklistDialog";

const CleaningSchedules = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [checklistSchedule, setChecklistSchedule] = useState<any>(null);
  const [openChecklist, setOpenChecklist] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  const { hasPermission } = useAuth();
  const { assignTask, updateStatus } = useHousekeeping();

  // Real-time subscription for cleaning schedules
  useRealtimeSubscription({
    table: "room_cleaning_schedules",
    queryKey: ["cleaning-schedules", restaurantId],
    filter: restaurantId
      ? { column: "restaurant_id", value: restaurantId }
      : null,
  });

  const {
    data: schedules,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cleaning-schedules", restaurantId],
    queryFn: async () => {
      console.log("[CleaningSchedules] === QUERY START ===");
      console.log("[CleaningSchedules] Restaurant ID:", restaurantId);
      console.log(
        "[CleaningSchedules] Restaurant ID type:",
        typeof restaurantId
      );
      console.log(
        "[CleaningSchedules] Restaurant ID is truthy?:",
        !!restaurantId
      );

      if (!restaurantId) {
        console.warn(
          "[CleaningSchedules] ⚠️ No restaurant ID - returning empty array"
        );
        return [];
      }

      console.log("[CleaningSchedules] 🔍 Executing Supabase query...");

      const { data, error, count } = await supabase
        .from("room_cleaning_schedules")
        .select(
          `
          *,
          rooms(name),
          assigned_staff:staff!room_cleaning_schedules_assigned_staff_id_fkey(first_name, last_name),
          inspector:staff!room_cleaning_schedules_inspected_by_fkey(first_name, last_name)
        `,
          { count: "exact" }
        )
        .eq("restaurant_id", restaurantId)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      console.log("[CleaningSchedules] Query completed");
      console.log("[CleaningSchedules] Error:", error);
      console.log("[CleaningSchedules] Count:", count);
      console.log("[CleaningSchedules] Data length:", data?.length);
      console.log(
        "[CleaningSchedules] Raw data:",
        JSON.stringify(data, null, 2)
      );

      if (error) {
        console.error("[CleaningSchedules] ❌ Query error:", error);
        throw error;
      }

      console.log(
        "[CleaningSchedules] ✅ Successfully fetched",
        data?.length || 0,
        "schedules"
      );
      console.log("[CleaningSchedules] === QUERY END ===");
      return data || [];
    },
    enabled: !!restaurantId,
  });

  console.log("[CleaningSchedules] Render - isLoading:", isLoading);
  console.log("[CleaningSchedules] Render - schedules:", schedules);
  console.log(
    "[CleaningSchedules] Render - schedules length:",
    schedules?.length
  );

  // Query available staff for assignment
  const { data: staffList } = useQuery({
    queryKey: ["staff-list", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("staff")
        .select("id, first_name, last_name, position")
        .eq("restaurant_id", restaurantId)
        .eq("status", "active")
        .order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const handleStartCleaning = async (scheduleId: string) => {
    await updateStatus({
      taskId: scheduleId,
      status: "in_progress"
    });
  };

  const handleCompleteCleaning = async (scheduleId: string) => {
    await updateStatus({
      taskId: scheduleId,
      status: "completed"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "in_progress":
        return "default";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🧹 Cleaning Schedules
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage room cleaning tasks and assignments
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedSchedule(null);
            setOpenDialog(true);
          }}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <div className="grid gap-4">
        {schedules?.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              No cleaning schedules found
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Create your first schedule to get started
            </p>
          </div>
        ) : (
          schedules?.map((schedule) => {
            const statusConfig: Record<
              string,
              { bg: string; text: string; icon: string }
            > = {
              pending: {
                bg: "bg-gradient-to-r from-orange-500 to-amber-500",
                text: "text-white",
                icon: "⏳",
              },
              in_progress: {
                bg: "bg-gradient-to-r from-blue-500 to-cyan-500",
                text: "text-white",
                icon: "🔄",
              },
              completed: {
                bg: "bg-gradient-to-r from-emerald-500 to-green-500",
                text: "text-white",
                icon: "✅",
              },
              cancelled: {
                bg: "bg-gradient-to-r from-red-500 to-rose-500",
                text: "text-white",
                icon: "❌",
              },
            };
            const config =
              statusConfig[schedule.status] || statusConfig.pending;

            return (
              <div
                key={schedule.id}
                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`h-12 w-12 rounded-xl ${config.bg} flex items-center justify-center shadow-lg`}
                    >
                      <span className="text-xl">{config.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {schedule.rooms?.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Date(
                          schedule.scheduled_date
                        ).toLocaleDateString()}{" "}
                        at {formatTime(schedule.scheduled_time)}
                      </p>
                      {schedule.assigned_staff && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          👤 {schedule.assigned_staff.first_name}{" "}
                          {schedule.assigned_staff.last_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 capitalize mt-1">
                        Type: {schedule.cleaning_type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Priority Badge for post-checkout */}
                    {schedule.priority === "urgent" && (
                      <Badge className="bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 text-xs">
                        🔥 Urgent
                      </Badge>
                    )}

                    <Badge className={`${config.bg} ${config.text} border-0`}>
                      {schedule.status}
                    </Badge>

                    {/* Staff Assignment - Only managers */}
                    {schedule.status === "pending" &&
                      !schedule.assigned_staff &&
                      hasPermission("housekeeping.assign") && (
                        <Select
                          onValueChange={(staffId) => {
                            assignTask(schedule.id, staffId);
                          }}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue placeholder="Assign Staff" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffList?.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.first_name} {staff.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                    {/* Checklist Button - for post_checkout type */}
                    {schedule.cleaning_type === "post_checkout" &&
                      schedule.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setChecklistSchedule(schedule);
                            setOpenChecklist(true);
                          }}
                          className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                        >
                          <ClipboardCheck className="h-4 w-4 mr-1" />
                          Checklist
                        </Button>
                      )}

                    {schedule.status === "pending" &&
                      schedule.cleaning_type !== "post_checkout" && (
                        <Button
                          size="sm"
                          onClick={() => handleStartCleaning(schedule.id)}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}

                    {schedule.status === "in_progress" &&
                      schedule.cleaning_type !== "post_checkout" && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteCleaning(schedule.id)}
                          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSchedule(schedule);
                        setOpenDialog(true);
                      }}
                      className="border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {schedule.notes && (
                  <div className="px-4 pb-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📝 {schedule.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <CleaningScheduleDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        schedule={selectedSchedule}
      />

      <HousekeepingChecklistDialog
        open={openChecklist}
        onClose={() => {
          setOpenChecklist(false);
          setChecklistSchedule(null);
        }}
        schedule={checklistSchedule}
      />
    </div>
  );
};

export default CleaningSchedules;
