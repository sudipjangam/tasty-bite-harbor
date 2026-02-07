import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const RoomStatusDashboard = () => {
  const { toast } = useToast();
  const { restaurantId } = useRestaurantId();

  // Real-time subscriptions
  useRealtimeSubscription({
    table: "rooms",
    queryKey: ["rooms-status", restaurantId],
    filter: restaurantId
      ? { column: "restaurant_id", value: restaurantId }
      : null,
  });

  useRealtimeSubscription({
    table: "room_cleaning_schedules",
    queryKey: ["cleaning-schedules-today", restaurantId],
    filter: restaurantId
      ? { column: "restaurant_id", value: restaurantId }
      : null,
  });

  useRealtimeSubscription({
    table: "room_maintenance_requests",
    queryKey: ["maintenance-requests-open", restaurantId],
    filter: restaurantId
      ? { column: "restaurant_id", value: restaurantId }
      : null,
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms-status", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: cleaningSchedules } = useQuery({
    queryKey: ["cleaning-schedules-today", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("room_cleaning_schedules")
        .select(
          `
          *,
          rooms(name),
          staff(first_name, last_name)
        `,
        )
        .eq("restaurant_id", restaurantId)
        .eq("scheduled_date", today)
        .order("scheduled_time");

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: maintenanceRequests } = useQuery({
    queryKey: ["maintenance-requests-open", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("room_maintenance_requests")
        .select(
          `
          *,
          rooms(name)
        `,
        )
        .eq("restaurant_id", restaurantId)
        .in("status", ["open", "in_progress"])
        .order("priority", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "occupied":
        return "bg-blue-500";
      case "cleaning":
        return "bg-yellow-500";
      case "maintenance":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  if (roomsLoading) {
    return (
      <div className="space-y-6">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
                  <div className="h-6 w-8 bg-gray-300 dark:bg-gray-600 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Room grid skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-4 border rounded-lg animate-pulse">
                  <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-2" />
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-1" />
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roomStats =
    roomsData?.reduce(
      (acc, room) => {
        acc[room.status] = (acc[room.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ) || {};

  return (
    <div className="space-y-6">
      {/* Colorful Room Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Available Rooms */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-500 p-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg">✅</span>
            </div>
            <div>
              <p className="text-xs text-white/80 font-medium uppercase tracking-wider">
                Available
              </p>
              <p className="text-2xl font-bold text-white">
                {roomStats.available || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Occupied Rooms */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-500 p-4 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg">🛏️</span>
            </div>
            <div>
              <p className="text-xs text-white/80 font-medium uppercase tracking-wider">
                Occupied
              </p>
              <p className="text-2xl font-bold text-white">
                {roomStats.occupied || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Cleaning Rooms */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-yellow-500 p-4 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg">🧹</span>
            </div>
            <div>
              <p className="text-xs text-white/80 font-medium uppercase tracking-wider">
                Cleaning
              </p>
              <p className="text-2xl font-bold text-white">
                {roomStats.cleaning || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Maintenance Rooms */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-red-500 to-rose-500 p-4 rounded-xl shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-lg">🔧</span>
            </div>
            <div>
              <p className="text-xs text-white/80 font-medium uppercase tracking-wider">
                Maintenance
              </p>
              <p className="text-2xl font-bold text-white">
                {roomStats.maintenance || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Cleaning Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Cleaning Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cleaningSchedules?.length === 0 ? (
              <p className="text-muted-foreground">
                No cleaning scheduled for today
              </p>
            ) : (
              cleaningSchedules?.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{schedule.rooms?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {schedule.scheduled_time} - {schedule.staff?.first_name}{" "}
                      {schedule.staff?.last_name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      schedule.status === "completed" ? "default" : "secondary"
                    }
                  >
                    {schedule.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Open Maintenance Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Open Maintenance Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {maintenanceRequests?.length === 0 ? (
              <p className="text-muted-foreground">
                No open maintenance requests
              </p>
            ) : (
              maintenanceRequests?.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{request.rooms?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.title}
                    </p>
                  </div>
                  <Badge variant={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Room Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Room Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {roomsData?.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No rooms found. Add rooms to get started.
              </div>
            ) : (
              roomsData?.map((room) => (
                <div
                  key={room.id}
                  className="p-4 border rounded-lg text-center"
                >
                  <div
                    className={`w-4 h-4 rounded-full mx-auto mb-2 ${getStatusColor(room.status)}`}
                  ></div>
                  <p className="font-medium">{room.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {room.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoomStatusDashboard;
