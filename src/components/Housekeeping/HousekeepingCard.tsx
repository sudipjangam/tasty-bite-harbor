import React from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HousekeepingTask,
  HousekeepingStatus,
  HousekeepingPriority,
} from "@/hooks/useHousekeeping";
import {
  Bed,
  User,
  Clock,
  CheckCircle2,
  PlayCircle,
  Eye,
  MoreVertical,
  Trash2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HousekeepingCardProps {
  task: HousekeepingTask;
  onStatusChange: (status: HousekeepingStatus) => void;
  onDelete: () => void;
  onAssign: () => void;
}

const STATUS_CONFIG: Record<
  HousekeepingStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    color:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    icon: Clock,
  },
  in_progress: {
    label: "In Progress",
    color:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    icon: PlayCircle,
  },
  completed: {
    label: "Completed",
    color:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  inspected: {
    label: "Inspected",
    color:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Eye,
  },
};

const PRIORITY_CONFIG: Record<
  HousekeepingPriority,
  { label: string; color: string }
> = {
  low: {
    label: "Low",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  normal: {
    label: "Normal",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  high: {
    label: "High",
    color:
      "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  },
  urgent: {
    label: "Urgent",
    color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  },
};

const HousekeepingCard: React.FC<HousekeepingCardProps> = ({
  task,
  onStatusChange,
  onDelete,
  onAssign,
}) => {
  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const StatusIcon = statusConfig.icon;

  const getNextStatus = (): HousekeepingStatus | null => {
    switch (task.status) {
      case "pending":
        return "in_progress";
      case "in_progress":
        return "completed";
      case "completed":
        return "inspected";
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <Card
      className={cn(
        "p-4 border-l-4 transition-all hover:shadow-md",
        task.status === "pending" && "border-l-red-500",
        task.status === "in_progress" && "border-l-amber-500",
        task.status === "completed" && "border-l-emerald-500",
        task.status === "inspected" && "border-l-blue-500"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Room Name */}
          <div className="flex items-center gap-2 mb-2">
            <Bed className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {task.rooms?.name || "Unknown Room"}
            </span>
            <Badge className={cn("text-xs", priorityConfig.color)}>
              {priorityConfig.label}
            </Badge>
          </div>

          {/* Status Badge */}
          <Badge className={cn("mb-2", statusConfig.color)}>
            <StatusIcon className="h-3.5 w-3.5 mr-1" />
            {statusConfig.label}
          </Badge>

          {/* Task Type */}
          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {task.task_type.replace("_", " ")} cleaning
          </p>

          {/* Assigned To */}
          {task.assigned_profile ? (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
              <User className="h-3.5 w-3.5" />
              <span>{task.assigned_profile.full_name}</span>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-gray-500 hover:text-gray-700 p-0 h-auto"
              onClick={onAssign}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Assign Staff
            </Button>
          )}

          {/* Notes */}
          {task.notes && (
            <p className="mt-2 text-sm text-gray-500 italic">"{task.notes}"</p>
          )}

          {/* Timestamps */}
          <div className="mt-2 text-xs text-gray-400">
            {task.started_at && (
              <span>
                Started: {format(new Date(task.started_at), "h:mm a")} •{" "}
              </span>
            )}
            {task.completed_at && (
              <span>Done: {format(new Date(task.completed_at), "h:mm a")}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {nextStatus && (
            <Button
              size="sm"
              onClick={() => onStatusChange(nextStatus)}
              className={cn(
                nextStatus === "in_progress" &&
                  "bg-amber-500 hover:bg-amber-600",
                nextStatus === "completed" &&
                  "bg-emerald-500 hover:bg-emerald-600",
                nextStatus === "inspected" && "bg-blue-500 hover:bg-blue-600"
              )}
            >
              {nextStatus === "in_progress" && "Start"}
              {nextStatus === "completed" && "Complete"}
              {nextStatus === "inspected" && "Inspect"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAssign}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Staff
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
};

export default HousekeepingCard;
