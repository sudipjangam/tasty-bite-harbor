import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Edit, Calendar, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import MaintenanceRequestDialog from "./MaintenanceRequestDialog";

const MaintenanceRequests = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  // Real-time subscription for maintenance requests
  useRealtimeSubscription({
    table: 'room_maintenance_requests',
    queryKey: ['maintenance-requests', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['maintenance-requests', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('room_maintenance_requests')
        .select(`
          *,
          rooms(name),
          reported_by:staff!reported_by(first_name, last_name),
          assigned_to:staff!assigned_to(first_name, last_name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('room_maintenance_requests')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update request status",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'closed': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[200px]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Maintenance Requests</h2>
        <Button onClick={() => {
          setSelectedRequest(null);
          setOpenDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Request
        </Button>
      </div>

      <div className="grid gap-4">
        {requests?.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No maintenance requests found. Create your first request to get started.
            </CardContent>
          </Card>
        ) : (
          requests?.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{request.title}</h3>
                      <Badge variant={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                      <Badge variant={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      Room: {request.rooms?.name}
                    </p>
                    
                    <p className="text-sm mb-4">{request.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div>
                        <p>Reported by: {request.reported_by?.first_name} {request.reported_by?.last_name}</p>
                        <p>Date: {new Date(request.created_at).toLocaleDateString()}</p>
                      </div>
                      
                      {request.assigned_to && (
                        <div>
                          <p>Assigned to: {request.assigned_to.first_name} {request.assigned_to.last_name}</p>
                          {request.scheduled_date && (
                            <p>Scheduled: {new Date(request.scheduled_date).toLocaleDateString()}</p>
                          )}
                        </div>
                      )}
                      
                      {(request.estimated_cost || request.actual_cost) && (
                        <div>
                          {request.estimated_cost && <p>Est. Cost: ${request.estimated_cost}</p>}
                          {request.actual_cost && <p>Actual Cost: ${request.actual_cost}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {request.status === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'in_progress' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Start Work
                      </Button>
                    )}
                    
                    {request.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'completed' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Complete
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setOpenDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {request.notes && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-sm">{request.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <MaintenanceRequestDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        request={selectedRequest}
      />
    </div>
  );
};

export default MaintenanceRequests;
