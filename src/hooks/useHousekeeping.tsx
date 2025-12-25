import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";

// Types
export type HousekeepingStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "inspected";
export type HousekeepingPriority = "urgent" | "high" | "normal" | "low";
export type HousekeepingTaskType =
  | "checkout"
  | "stayover"
  | "deep_clean"
  | "turndown"
  | "inspection";

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
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();

  // Calculate stats from tasks
  const stats: HousekeepingStats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    inspected: tasks.filter((t) => t.status === "inspected").length,
  };

  // Fetch housekeeping tasks
  const fetchTasks = useCallback(async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    try {
      // Fetch tasks with room names
      const { data: tasksData, error: tasksError } = await supabase
        .from("housekeeping_tasks")
        .select(
          `
          *,
          rooms:room_id (name)
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;

      // Transform data to include room_name
      const transformedTasks: HousekeepingTask[] = (tasksData || []).map(
        (task: any) => ({
          ...task,
          room_name: task.rooms?.name || "Unknown Room",
        })
      );

      setTasks(transformedTasks);
    } catch (error) {
      console.error("Error fetching housekeeping tasks:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch housekeeping tasks.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, toast]);

  // Initial fetch
  useEffect(() => {
    if (restaurantId) {
      fetchTasks();
    }
  }, [restaurantId, fetchTasks]);

  // Create a new task
  const createTask = async (input: CreateTaskInput) => {
    if (!restaurantId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No restaurant ID available.",
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from("housekeeping_tasks")
        .insert([
          {
            room_id: input.room_id,
            task_type: input.task_type,
            priority: input.priority || "normal",
            assigned_to: input.assigned_to || null,
            notes: input.notes || null,
            status: "pending",
            restaurant_id: restaurantId,
          },
        ])
        .select(
          `
          *,
          rooms:room_id (name)
        `
        )
        .single();

      if (error) throw error;

      const newTask: HousekeepingTask = {
        ...data,
        room_name: data.rooms?.name || "Unknown Room",
      };

      setTasks((prev) => [newTask, ...prev]);

      toast({
        title: "Task Created",
        description: "Housekeeping task has been created successfully.",
      });

      return true;
    } catch (error) {
      console.error("Error creating housekeeping task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create housekeeping task.",
      });
      return false;
    }
  };

  // Update task status
  const updateStatus = async ({ taskId, status }: UpdateStatusInput) => {
    try {
      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Set timestamps based on status
      if (status === "in_progress") {
        updateData.started_at = new Date().toISOString();
      } else if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else if (status === "inspected") {
        updateData.inspected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("housekeeping_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, ...updateData } : task
        )
      );

      toast({
        title: "Status Updated",
        description: `Task status changed to ${status.replace("_", " ")}.`,
      });

      return true;
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task status.",
      });
      return false;
    }
  };

  // Delete a task
  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("housekeeping_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      toast({
        title: "Task Deleted",
        description: "Housekeeping task has been deleted.",
      });

      return true;
    } catch (error) {
      console.error("Error deleting housekeeping task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete housekeeping task.",
      });
      return false;
    }
  };

  // Assign task to staff
  const assignTask = async (taskId: string, staffId: string) => {
    try {
      const { error } = await supabase
        .from("housekeeping_tasks")
        .update({
          assigned_to: staffId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, assigned_to: staffId } : task
        )
      );

      toast({
        title: "Task Assigned",
        description: "Task has been assigned to staff member.",
      });

      return true;
    } catch (error) {
      console.error("Error assigning task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign task.",
      });
      return false;
    }
  };

  return {
    tasks,
    isLoading,
    stats,
    refetch: fetchTasks,
    createTask,
    updateStatus,
    deleteTask,
    assignTask,
  };
};
