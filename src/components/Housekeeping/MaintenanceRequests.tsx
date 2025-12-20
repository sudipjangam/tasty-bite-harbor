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
      {/* Header with gradient button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">🔧 Maintenance Requests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage maintenance issues</p>
        </div>
        <Button 
          onClick={() => {
            setSelectedRequest(null);
            setOpenDialog(true);
          }}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Request
        </Button>
      </div>

      <div className="grid gap-4">
        {requests?.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No maintenance requests found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Create your first request to get started</p>
          </div>
        ) : (
          requests?.map((request) => {
            const priorityConfig: Record<string, { border: string; bg: string; icon: string }> = {
              high: { border: 'border-l-4 border-l-red-500', bg: 'bg-gradient-to-r from-red-500 to-rose-500', icon: '🔴' },
              medium: { border: 'border-l-4 border-l-amber-500', bg: 'bg-gradient-to-r from-amber-500 to-yellow-500', icon: '🟡' },
              low: { border: 'border-l-4 border-l-green-500', bg: 'bg-gradient-to-r from-green-500 to-emerald-500', icon: '🟢' },
            };
            const statusConfig: Record<string, { bg: string; text: string }> = {
              open: { bg: 'bg-gradient-to-r from-red-500 to-rose-500', text: 'text-white' },
              in_progress: { bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', text: 'text-white' },
              completed: { bg: 'bg-gradient-to-r from-emerald-500 to-green-500', text: 'text-white' },
              closed: { bg: 'bg-gradient-to-r from-gray-500 to-slate-500', text: 'text-white' },
            };
            const pConfig = priorityConfig[request.priority] || priorityConfig.low;
            const sConfig = statusConfig[request.status] || statusConfig.open;
            
            return (
              <div key={request.id} className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 ${pConfig.border}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{pConfig.icon}</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{request.title}</h3>
                        <Badge className={`${pConfig.bg} text-white border-0 text-xs`}>
                          {request.priority}
                        </Badge>
                        <Badge className={`${sConfig.bg} ${sConfig.text} border-0 text-xs`}>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        🏠 Room: {request.rooms?.name}
                      </p>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{request.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <span>👤</span>
                          <div>
                            <p>Reported by: {request.reported_by?.first_name} {request.reported_by?.last_name}</p>
                            <p className="text-xs">📅 {new Date(request.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {request.assigned_to && (
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <span>🛠️</span>
                            <div>
                              <p>Assigned: {request.assigned_to.first_name} {request.assigned_to.last_name}</p>
                              {request.scheduled_date && (
                                <p className="text-xs">📅 {new Date(request.scheduled_date).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {(request.estimated_cost || request.actual_cost) && (
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <span>💰</span>
                            <div>
                              {request.estimated_cost && <p>Est: ${request.estimated_cost}</p>}
                              {request.actual_cost && <p className="text-emerald-600 font-medium">Actual: ${request.actual_cost}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      {request.status === 'open' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'in_progress' })}
                          disabled={updateStatusMutation.isPending}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                        >
                          Start Work
                        </Button>
                      )}
                      
                      {request.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'completed' })}
                          disabled={updateStatusMutation.isPending}
                          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
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
                        className="border-gray-200 dark:border-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {request.notes && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">📝 {request.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
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
