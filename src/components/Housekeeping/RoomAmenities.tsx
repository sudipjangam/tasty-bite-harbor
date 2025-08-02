
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Coffee, Plus, Package, DollarSign } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface RoomAmenity {
  id: string;
  name: string;
  description: string;
  category: string;
  cost_per_unit: number;
  is_complimentary: boolean;
  is_active: boolean;
}

const categoryColors = {
  bathroom: "bg-blue-100 text-blue-800",
  bedroom: "bg-green-100 text-green-800",
  technology: "bg-purple-100 text-purple-800",
  food_beverage: "bg-orange-100 text-orange-800",
  entertainment: "bg-pink-100 text-pink-800",
};

const RoomAmenities = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  const { data: amenities = [], isLoading } = useQuery({
    queryKey: ["room-amenities", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("room_amenities")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("category", { ascending: true });

      if (error) throw error;
      return data as RoomAmenity[];
    },
    enabled: !!restaurantId,
  });

  const createAmenityMutation = useMutation({
    mutationFn: async (amenityData: any) => {
      const { error } = await supabase
        .from("room_amenities")
        .insert([{ ...amenityData, restaurant_id: restaurantId }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-amenities"] });
      setIsDialogOpen(false);
      toast({ title: "Amenity created successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error creating amenity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("room_amenities")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-amenities"] });
      toast({ title: "Amenity status updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating amenity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const amenityData = {
      name: formData.get("name"),
      description: formData.get("description"),
      category: formData.get("category"),
      cost_per_unit: parseFloat(formData.get("cost_per_unit") as string) || 0,
      is_complimentary: formData.get("is_complimentary") === "on",
    };

    createAmenityMutation.mutate(amenityData);
  };

  if (isLoading) {
    return <div>Loading room amenities...</div>;
  }

  // Group amenities by category
  const groupedAmenities = amenities.reduce((acc, amenity) => {
    if (!acc[amenity.category]) {
      acc[amenity.category] = [];
    }
    acc[amenity.category].push(amenity);
    return acc;
  }, {} as Record<string, RoomAmenity[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Room Amenities</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <StandardizedButton>
              <Plus className="h-4 w-4 mr-2" />
              Add Amenity
            </StandardizedButton>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Room Amenity</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Mini Fridge, WiFi, Towels"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bathroom">Bathroom</SelectItem>
                    <SelectItem value="bedroom">Bedroom</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="food_beverage">Food & Beverage</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of the amenity"
                />
              </div>
              <div>
                <Label htmlFor="cost_per_unit">Cost per Unit (₹)</Label>
                <Input
                  id="cost_per_unit"
                  name="cost_per_unit"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="is_complimentary" name="is_complimentary" defaultChecked />
                <Label htmlFor="is_complimentary">Complimentary</Label>
              </div>
              <StandardizedButton type="submit" className="w-full">
                Add Amenity
              </StandardizedButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedAmenities).map(([category, amenitiesList]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold mb-3 capitalize">
              {category.replace('_', ' ')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {amenitiesList.map((amenity) => (
                <StandardizedCard key={amenity.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{amenity.name}</h4>
                      <Badge className={categoryColors[amenity.category as keyof typeof categoryColors]}>
                        {amenity.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Switch
                      checked={amenity.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: amenity.id, is_active: checked })
                      }
                    />
                  </div>

                  {amenity.description && (
                    <p className="text-sm text-gray-600 mb-2">{amenity.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      {amenity.is_complimentary ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Complimentary
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>₹{amenity.cost_per_unit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </StandardizedCard>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedAmenities).length === 0 && (
        <div className="text-center py-8">
          <Coffee className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No amenities added yet. Create your first amenity to get started.</p>
        </div>
      )}
    </div>
  );
};

export default RoomAmenities;
