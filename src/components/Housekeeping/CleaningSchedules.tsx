import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Edit, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import CleaningScheduleDialog from "./CleaningScheduleDialog";

const CleaningSchedules = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  // Real-time subscription for cleaning schedules
  useRealtimeSubscription({
    table: 'room_cleaning_schedules',
    queryKey: ['cleaning-schedules', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['cleaning-schedules', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('room_cleaning_schedules')
        .select(`
          *,
          rooms(name),
          staff(first_name, last_name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time');
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, actualStartTime, actualEndTime }: { 
      id: string; 
      status: string; 
      actualStartTime?: string; 
      actualEndTime?: string; 
    }) => {
      const updateData: any = { status };
      if (actualStartTime) updateData.actual_start_time = actualStartTime;
      if (actualEndTime) updateData.actual_end_time = actualEndTime;

      const { error } = await supabase
        .from('room_cleaning_schedules')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      toast({
        title: "Success",
        description: "Schedule status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update schedule status",
      });
    },
  });

  const handleStartCleaning = (scheduleId: string) => {
    updateStatusMutation.mutate({
      id: scheduleId,
      status: 'in_progress',
      actualStartTime: new Date().toISOString(),
    });
  };

  const handleCompleteCleaning = (scheduleId: string) => {
    updateStatusMutation.mutate({
      id: scheduleId,
      status: 'completed',
      actualEndTime: new Date().toISOString(),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[200px]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cleaning Schedules</h2>
        <Button onClick={() => {
          setSelectedSchedule(null);
          setOpenDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <div className="grid gap-4">
        {schedules?.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No cleaning schedules found. Create your first schedule to get started.
            </CardContent>
          </Card>
        ) : (
          schedules?.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold">{schedule.rooms?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(schedule.scheduled_date).toLocaleDateString()} at {formatTime(schedule.scheduled_time)}
                      </p>
                      {schedule.staff && (
                        <p className="text-sm text-muted-foreground">
                          Assigned to: {schedule.staff.first_name} {schedule.staff.last_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground capitalize">
                        Type: {schedule.cleaning_type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(schedule.status)}>
                      {schedule.status}
                    </Badge>
                    
                    {schedule.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartCleaning(schedule.id)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                    
                    {schedule.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleCompleteCleaning(schedule.id)}
                        disabled={updateStatusMutation.isPending}
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
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {schedule.notes && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-sm">{schedule.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CleaningScheduleDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        schedule={selectedSchedule}
      />
    </div>
  );
};

export default CleaningSchedules;
