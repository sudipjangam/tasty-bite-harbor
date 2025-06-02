
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface MaintenanceRequestDialogProps {
  open: boolean;
  onClose: () => void;
  request?: any;
}

const MaintenanceRequestDialog: React.FC<MaintenanceRequestDialogProps> = ({
  open,
  onClose,
  request
}) => {
  const [formData, setFormData] = useState({
    room_id: '',
    title: '',
    description: '',
    request_type: '',
    priority: 'medium',
    assigned_to: '',
    estimated_cost: '',
    scheduled_date: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantId();

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('status', 'active')
        .order('first_name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (request) {
      setFormData({
        room_id: request.room_id || '',
        title: request.title || '',
        description: request.description || '',
        request_type: request.request_type || '',
        priority: request.priority || 'medium',
        assigned_to: request.assigned_to || '',
        estimated_cost: request.estimated_cost?.toString() || '',
        scheduled_date: request.scheduled_date || '',
        notes: request.notes || ''
      });
    } else {
      setFormData({
        room_id: '',
        title: '',
        description: '',
        request_type: '',
        priority: 'medium',
        assigned_to: '',
        estimated_cost: '',
        scheduled_date: '',
        notes: ''
      });
    }
  }, [request, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        restaurant_id: restaurantId,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null
      };

      if (request) {
        const { error } = await supabase
          .from('room_maintenance_requests')
          .update(payload)
          .eq('id', request.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('room_maintenance_requests')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      toast({
        title: "Success",
        description: request ? "Request updated successfully" : "Request created successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save request",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {request ? 'Edit Maintenance Request' : 'Add Maintenance Request'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="room_id">Room</Label>
            <Select
              value={formData.room_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, room_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms?.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the issue"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the maintenance issue"
              required
            />
          </div>

          <div>
            <Label htmlFor="request_type">Request Type</Label>
            <Select
              value={formData.request_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, request_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="appliance">Appliance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="assigned_to">Assign To</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimated_cost">Estimated Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="scheduled_date">Scheduled Date</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or instructions..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceRequestDialog;
