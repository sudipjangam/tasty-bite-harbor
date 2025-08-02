
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

interface CleaningScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  schedule?: any;
}

const CleaningScheduleDialog: React.FC<CleaningScheduleDialogProps> = ({
  open,
  onClose,
  schedule
}) => {
  const [formData, setFormData] = useState({
    room_id: '',
    assigned_staff_id: '',
    scheduled_date: '',
    scheduled_time: '',
    cleaning_type: 'standard',
    estimated_duration: 30,
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

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
    if (schedule) {
      setFormData({
        room_id: schedule.room_id || '',
        assigned_staff_id: schedule.assigned_staff_id || '',
        scheduled_date: schedule.scheduled_date || '',
        scheduled_time: schedule.scheduled_time || '',
        cleaning_type: schedule.cleaning_type || 'standard',
        estimated_duration: schedule.estimated_duration || 30,
        notes: schedule.notes || ''
      });
    } else {
      setFormData({
        room_id: '',
        assigned_staff_id: '',
        scheduled_date: '',
        scheduled_time: '',
        cleaning_type: 'standard',
        estimated_duration: 30,
        notes: ''
      });
    }
  }, [schedule, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      if (!data.room_id || !data.assigned_staff_id || !data.scheduled_date || !data.scheduled_time) {
        throw new Error('Please fill in all required fields');
      }

      const payload = {
        ...data,
        restaurant_id: restaurantId
      };

      if (schedule) {
        const { error } = await supabase
          .from('room_cleaning_schedules')
          .update(payload)
          .eq('id', schedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('room_cleaning_schedules')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaning-schedules'] });
      toast({
        title: "Success",
        description: schedule ? "Schedule updated successfully" : "Schedule created successfully",
      });
      onClose();
    },
    onError: (error) => {
      console.error('Cleaning schedule save error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save schedule",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.room_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a room",
      });
      return;
    }
    
    if (!formData.assigned_staff_id) {
      toast({
        variant: "destructive",
        title: "Error", 
        description: "Please select staff member",
      });
      return;
    }
    
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'Edit Cleaning Schedule' : 'Add Cleaning Schedule'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="room_id">Room</Label>
            <Select
              value={formData.room_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, room_id: value }))}
              required
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
            <Label htmlFor="assigned_staff_id">Assigned Staff</Label>
            <Select
              value={formData.assigned_staff_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_staff_id: value }))}
              required
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
              <Label htmlFor="scheduled_date">Date</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="scheduled_time">Time</Label>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cleaning_type">Cleaning Type</Label>
            <Select
              value={formData.cleaning_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, cleaning_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deep">Deep Clean</SelectItem>
                <SelectItem value="checkout">Checkout Clean</SelectItem>
                <SelectItem value="maintenance">Maintenance Clean</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="estimated_duration">Duration (minutes)</Label>
            <Input
              type="number"
              value={formData.estimated_duration}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) }))}
              min="15"
              max="180"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Special instructions or notes..."
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

export default CleaningScheduleDialog;
