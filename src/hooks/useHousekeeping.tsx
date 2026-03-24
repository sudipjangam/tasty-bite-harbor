import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { format } from "date-fns";

// Types
export type HousekeepingStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "inspected";
export type HousekeepingPriority = "urgent" | "high" | "normal" | "low";
export type HousekeepingTaskType =
  | "standard"
  | "checkout"
  | "deep"
  | "maintenance";

export interface HousekeepingTask {
  id: string;
  room_id: string;
  room_name?: string;
  task_type: HousekeepingTaskType;
  status: HousekeepingStatus;
  priority: HousekeepingPriority;
  assigned_to?: string;
  assigned_to_name?: string;
  notes?: string;
  started_at?: string;
  completed_at?: string;
  inspected_at?: string;
  inspected_by?: string;
  created_at: string;
  updated_at: string;
  restaurant_id: string;
}

interface HousekeepingStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  inspected: number;
}

interface CreateTaskInput {
  room_id: string;
  task_type: HousekeepingTaskType;
  priority?: HousekeepingPriority;
  assigned_to?: string;
  notes?: string;
}

interface UpdateStatusInput {
  taskId: string;
  status: HousekeepingStatus;
}

export const useHousekeeping = () => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  // Set up real-time subscription for the 'room_cleaning_schedules' table
  useRealtimeSubscription({
    table: "room_cleaning_schedules",
    queryKey: ["housekeeping_tasks", restaurantId],
    filter: restaurantId ? { column: "restaurant_id", value: restaurantId } : null,
  });

  // Fetch from the real room_cleaning_schedules table
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["housekeeping_tasks", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("room_cleaning_schedules")
        .select(`
          *,
          rooms:room_id(name),
          staff:assigned_staff_id(first_name, last_name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching housekeeping tasks:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch housekeeping tasks.",
        });
        throw error;
      }

      // Map to HousekeepingTask format used by the UI
      return (data || []).map((task: any) => ({
        id: task.id,
        room_id: task.room_id,
        room_name: task.rooms?.name || "Unknown Room",
        task_type: task.cleaning_type as HousekeepingTaskType || "standard",
        status: task.status as HousekeepingStatus || "pending",
        priority: task.priority as HousekeepingPriority || "normal",
        assigned_to: task.assigned_staff_id,
        assigned_to_name: task.staff ? `${task.staff.first_name} ${task.staff.last_name}`.trim() : "Unassigned",
        notes: task.notes,
        started_at: task.actual_start_time,
        completed_at: task.actual_end_time,
        inspected_at: task.inspected_at,
        inspected_by: task.inspected_by,
        created_at: task.created_at,
        updated_at: task.updated_at,
        restaurant_id: task.restaurant_id,
      })) as HousekeepingTask[];
    },
    enabled: !!restaurantId,
  });

  // Calculate stats from tasks
  const stats: HousekeepingStats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inspected: tasks.filter((t) => t.status === "inspected").length,
  };

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const todayDate = format(new Date(), 'yyyy-MM-dd');
      const nowTime = format(new Date(), 'HH:mm:ss');

      const { data, error } = await supabase
        .from("room_cleaning_schedules")
        .insert([{
          restaurant_id: restaurantId,
          room_id: input.room_id,
          cleaning_type: input.task_type,
          priority: input.priority || "normal",
          assigned_staff_id: input.assigned_to || null,
          notes: input.notes || null,
          status: "pending",
          scheduled_date: todayDate,
          scheduled_time: nowTime,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["cleaning-schedules"] });
      toast({
        title: "Task Created",
        description: "Housekeeping task has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create task." });
    }
  });

  const createTask = async (input: CreateTaskInput) => {
    try {
      await createTaskMutation.mutateAsync(input);
      return true;
    } catch {
      return false;
    }
  };

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: UpdateStatusInput) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === "in_progress") {
        updateData.actual_start_time = new Date().toISOString();
      } else if (status === "completed") {
        updateData.actual_end_time = new Date().toISOString();
      } else if (status === "inspected") {
        updateData.inspected_at = new Date().toISOString();
      }

      // First update the task
      const { data: taskData, error } = await supabase
        .from("room_cleaning_schedules")
        .update(updateData)
        .eq("id", taskId)
        .select('room_id')
        .single();

      if (error) throw error;

      // Then sync room status based on the new task status
      if (taskData?.room_id) {
        if (status === "in_progress") {
          await supabase.from("rooms").update({ status: "cleaning" }).eq("id", taskData.room_id);
        } else if (status === "completed" || status === "inspected") {
          await supabase.from("rooms").update({ status: "available" }).eq("id", taskData.room_id);
        }
      }

      return taskData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["cleaning-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms-status"] });
      toast({ title: "Status Updated" });
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  });

  const updateStatus = async (input: UpdateStatusInput) => {
    try {
      await updateStatusMutation.mutateAsync(input);
      return true;
    } catch {
      return false;
    }
  };

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("room_cleaning_schedules")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping_tasks"] });
      toast({ title: "Task Deleted" });
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
    }
  });

  const deleteTask = async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      return true;
    } catch {
      return false;
    }
  };

  // Assign Task Mutation
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, staffId }: { taskId: string; staffId: string }) => {
      if (!restaurantId) throw new Error("No restaurant ID");
      
      const { error } = await supabase
        .from("room_cleaning_schedules")
        .update({
          assigned_staff_id: staffId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);
      if (error) throw error;

      // Get room name for notification
      const { data: scheduleData } = await supabase
        .from("room_cleaning_schedules")
        .select("rooms(name)")
        .eq("id", taskId)
        .single();
      
      const roomName = (scheduleData?.rooms as any)?.name || "Room";

      // Create notification
      await supabase.from("staff_notifications").insert([{
        restaurant_id: restaurantId,
        staff_id: staffId,
        title: "🧹 New Cleaning Task Assigned",
        message: `You have been assigned to clean ${roomName}.`,
        type: "task_assigned",
        reference_type: "cleaning_schedule",
        reference_id: taskId,
        is_read: false,
      }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["cleaning-schedules"] });
      toast({ title: "Staff Assigned", description: "Task successfully assigned to staff." });
    },
    onError: (error) => {
      console.error("Error assigning staff:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to assign staff." });
    }
  });

  const assignTask = async (taskId: string, staffId: string) => {
    try {
      await assignTaskMutation.mutateAsync({ taskId, staffId });
      return true;
    } catch {
      return false;
    }
  };

  // Auto Assign Staff Mutation
  const autoAssignStaffMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      // Get active staff
      const { data: staffList, error: staffError } = await supabase
        .from("staff")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("status", "active");

      if (staffError) throw staffError;
      if (!staffList || staffList.length === 0) {
        throw new Error("No active staff available for assignment.");
      }

      // Get current pending/in progress tasks to count workloads
      const { data: activeTasks, error: tasksError } = await supabase
        .from("room_cleaning_schedules")
        .select("assigned_staff_id")
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "in_progress"])
        .not("assigned_staff_id", "is", null);

      if (tasksError) throw tasksError;

      // Count tasks per staff
      const workload: Record<string, number> = {};
      staffList.forEach(s => workload[s.id] = 0);
      (activeTasks || []).forEach(t => {
        if (t.assigned_staff_id && workload[t.assigned_staff_id] !== undefined) {
          workload[t.assigned_staff_id]++;
        }
      });

      // Find staff with minimum workload
      let leastBusyStaffId = staffList[0].id;
      let minTasks = workload[leastBusyStaffId];

      for (const [staffId, count] of Object.entries(workload)) {
        if (count < minTasks) {
          minTasks = count;
          leastBusyStaffId = staffId;
        }
      }

      // Assign the task
      const { error: assignError } = await supabase
        .from("room_cleaning_schedules")
        .update({
          assigned_staff_id: leastBusyStaffId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (assignError) throw assignError;

      // Get room name for notification
      const { data: scheduleData } = await supabase
        .from("room_cleaning_schedules")
        .select("rooms(name)")
        .eq("id", taskId)
        .single();
      
      const roomName = (scheduleData?.rooms as any)?.name || "Room";

      // Create notification
      await supabase.from("staff_notifications").insert([{
        restaurant_id: restaurantId,
        staff_id: leastBusyStaffId,
        title: "🧹 New Cleaning Task Auto-Assigned",
        message: `You have been automatically assigned to clean ${roomName}.`,
        type: "task_assigned",
        reference_type: "cleaning_schedule",
        reference_id: taskId,
        is_read: false,
      }]);

      return leastBusyStaffId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping_tasks"] });
      queryClient.invalidateQueries({ queryKey: ["cleaning-schedules"] });
      toast({ title: "Auto-Assigned", description: "Task automatically assigned to an available staff member." });
    },
    onError: (error: any) => {
      console.error("Error auto-assigning staff:", error);
      toast({ variant: "destructive", title: "Auto-Assign Failed", description: error.message || "Could not find available staff." });
    }
  });

  const autoAssignTask = async (taskId: string) => {
    try {
      await autoAssignStaffMutation.mutateAsync(taskId);
      return true;
    } catch {
      return false;
    }
  };

  return {
    tasks,
    isLoading,
    stats,
    refetch,
    createTask,
    updateStatus,
    deleteTask,
    assignTask,
    autoAssignTask,
  };
};
