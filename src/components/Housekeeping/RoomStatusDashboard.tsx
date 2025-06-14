import React from 'react';
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
    table: 'rooms',
    queryKey: ['rooms-status', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  useRealtimeSubscription({
    table: 'room_cleaning_schedules',
    queryKey: ['cleaning-schedules-today', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  useRealtimeSubscription({
    table: 'room_maintenance_requests',
    queryKey: ['maintenance-requests-open', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms-status', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: cleaningSchedules } = useQuery({
    queryKey: ['cleaning-schedules-today', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('room_cleaning_schedules')
        .select(`
          *,
          rooms(name),
          staff(first_name, last_name)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('scheduled_date', today)
        .order('scheduled_time');
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: maintenanceRequests } = useQuery({
    queryKey: ['maintenance-requests-open', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('room_maintenance_requests')
        .select(`
          *,
          rooms(name)
        `)
        .eq('restaurant_id', restaurantId)
        .in('status', ['open', 'in_progress'])
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-blue-500';
      case 'cleaning': return 'bg-yellow-500';
      case 'maintenance': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (roomsLoading) {
    return <div className="flex justify-center items-center min-h-[200px]">Loading...</div>;
  }

  const roomStats = roomsData?.reduce((acc, room) => {
    acc[room.status] = (acc[room.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      {/* Room Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{roomStats.available || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold">{roomStats.occupied || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="text-sm text-muted-foreground">Cleaning</p>
                <p className="text-2xl font-bold">{roomStats.cleaning || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold">{roomStats.maintenance || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <p className="text-muted-foreground">No cleaning scheduled for today</p>
            ) : (
              cleaningSchedules?.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{schedule.rooms?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {schedule.scheduled_time} - {schedule.staff?.first_name} {schedule.staff?.last_name}
                    </p>
                  </div>
                  <Badge variant={schedule.status === 'completed' ? 'default' : 'secondary'}>
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
              <p className="text-muted-foreground">No open maintenance requests</p>
            ) : (
              maintenanceRequests?.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{request.rooms?.name}</p>
                    <p className="text-sm text-muted-foreground">{request.title}</p>
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
                <div key={room.id} className="p-4 border rounded-lg text-center">
                  <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getStatusColor(room.status)}`}></div>
                  <p className="font-medium">{room.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{room.status}</p>
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
