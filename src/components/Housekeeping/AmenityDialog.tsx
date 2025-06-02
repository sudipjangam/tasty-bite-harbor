
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface AmenityDialogProps {
  open: boolean;
  onClose: () => void;
  amenity?: any;
}

const AmenityDialog: React.FC<AmenityDialogProps> = ({
  open,
  onClose,
  amenity
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    is_complimentary: true,
    cost_per_unit: '',
    is_active: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const restaurantId = useRestaurantId();

  useEffect(() => {
    if (amenity) {
      setFormData({
        name: amenity.name || '',
        description: amenity.description || '',
        category: amenity.category || '',
        is_complimentary: amenity.is_complimentary ?? true,
        cost_per_unit: amenity.cost_per_unit?.toString() || '',
        is_active: amenity.is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        is_complimentary: true,
        cost_per_unit: '',
        is_active: true
      });
    }
  }, [amenity, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        restaurant_id: restaurantId,
        cost_per_unit: data.is_complimentary ? 0 : (data.cost_per_unit ? parseFloat(data.cost_per_unit) : 0)
      };

      if (amenity) {
        const { error } = await supabase
          .from('room_amenities')
          .update(payload)
          .eq('id', amenity.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('room_amenities')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-amenities'] });
      toast({
        title: "Success",
        description: amenity ? "Amenity updated successfully" : "Amenity created successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save amenity",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {amenity ? 'Edit Amenity' : 'Add Amenity'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Amenity name"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the amenity"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bathroom">Bathroom</SelectItem>
                <SelectItem value="bedroom">Bedroom</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_complimentary}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_complimentary: checked }))}
            />
            <Label>Complimentary</Label>
          </div>

          {!formData.is_complimentary && (
            <div>
              <Label htmlFor="cost_per_unit">Cost per Unit</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label>Active</Label>
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

export default AmenityDialog;
