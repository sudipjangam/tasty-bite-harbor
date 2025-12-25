import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useHousekeeping,
  HousekeepingStatus,
  HousekeepingTask,
} from "@/hooks/useHousekeeping";
import { useRooms } from "@/hooks/useRooms";
import HousekeepingCard from "./HousekeepingCard";
import {
  Sparkles,
  Clock,
  PlayCircle,
  CheckCircle2,
  Eye,
  Plus,
  RefreshCw,
  Loader2,
  Bed,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HousekeepingDashboardProps {
  className?: string;
}

const HousekeepingDashboard: React.FC<HousekeepingDashboardProps> = ({
  className,
}) => {
  const {
    tasks,
    isLoading,
    refetch,
    stats,
    createTask,
    updateStatus,
    deleteTask,
  } = useHousekeeping();
  const { rooms } = useRooms();

  const [selectedTab, setSelectedTab] = useState<"all" | HousekeepingStatus>(
    "all"
  );
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Get rooms needing cleaning (cleaning status or checkout)
  const roomsNeedingCleaning = rooms.filter(
    (r) =>
      r.status === "cleaning" &&
      !tasks.some((t) => t.room_id === r.id && t.status !== "inspected")
  );

  const handleCreateTaskForRoom = (roomId: string) => {
    createTask({
      room_id: roomId,
      task_type: "checkout",
      priority: "normal",
    });
  };

  const filteredTasks = tasks.filter((task) => {
    if (selectedTab !== "all" && task.status !== selectedTab) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter)
      return false;
    return true;
  });

  const handleAssign = (task: HousekeepingTask) => {
    // For now, just show a toast - full implementation would open an assignment dialog
    console.log("Assign task:", task.id);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Housekeeping Dashboard
            </h1>
            <p className="text-gray-500 text-sm">Manage room cleaning tasks</p>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {stats.pending}
              </div>
              <div className="text-xs text-red-600 dark:text-red-500">
                Pending
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-3">
            <PlayCircle className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {stats.inProgress}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-500">
                In Progress
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {stats.completed}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-500">
                Completed
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {stats.inspected}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-500">
                Inspected
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600">
          <CardContent className="p-4 flex items-center gap-3">
            <Bed className="h-8 w-8 text-gray-500" />
            <div>
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {stats.total}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Total Tasks
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Needing Cleaning */}
      {roomsNeedingCleaning.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Bed className="h-5 w-5" />
              Rooms Needing Cleaning Tasks ({roomsNeedingCleaning.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {roomsNeedingCleaning.map((room) => (
                <Button
                  key={room.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateTaskForRoom(room.id)}
                  className="border-amber-300 hover:bg-amber-100"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {room.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Cleaning Tasks</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedTab}
            onValueChange={(v) => setSelectedTab(v as any)}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All{" "}
                <Badge className="ml-2" variant="secondary">
                  {stats.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending{" "}
                <Badge className="ml-2 bg-red-100 text-red-700">
                  {stats.pending}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress">
                In Progress{" "}
                <Badge className="ml-2 bg-amber-100 text-amber-700">
                  {stats.inProgress}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed{" "}
                <Badge className="ml-2 bg-emerald-100 text-emerald-700">
                  {stats.completed}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No tasks found</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {filteredTasks.map((task) => (
                      <HousekeepingCard
                        key={task.id}
                        task={task}
                        onStatusChange={(status) =>
                          updateStatus({ taskId: task.id, status })
                        }
                        onDelete={() => deleteTask(task.id)}
                        onAssign={() => handleAssign(task)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default HousekeepingDashboard;
