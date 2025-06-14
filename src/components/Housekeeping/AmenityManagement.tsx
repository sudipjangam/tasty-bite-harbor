import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Package, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import AmenityDialog from "./AmenityDialog";

const AmenityManagement = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  // Real-time subscriptions
  useRealtimeSubscription({
    table: 'room_amenities',
    queryKey: ['room-amenities', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  useRealtimeSubscription({
    table: 'room_amenity_inventory',
    queryKey: ['amenity-inventory', restaurantId],
    filter: restaurantId ? { column: 'restaurant_id', value: restaurantId } : null,
  });

  const { data: amenities, isLoading } = useQuery({
    queryKey: ['room-amenities', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('room_amenities')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: amenityInventory } = useQuery({
    queryKey: ['amenity-inventory', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('room_amenity_inventory')
        .select(`
          *,
          amenity:room_amenities(*),
          room:rooms(name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('last_checked', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('room_amenities')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-amenities'] });
      toast({
        title: "Success",
        description: "Amenity status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update amenity status",
      });
    },
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bathroom': return 'bg-blue-100 text-blue-800';
      case 'bedroom': return 'bg-green-100 text-green-800';
      case 'entertainment': return 'bg-purple-100 text-purple-800';
      case 'kitchen': return 'bg-orange-100 text-orange-800';
      case 'service': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[200px]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Amenity Management</h2>
        <Button onClick={() => {
          setSelectedAmenity(null);
          setOpenDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Amenity
        </Button>
      </div>

      {/* Amenities List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {amenities?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No amenities found. Create your first amenity to get started.
              </div>
            ) : (
              amenities?.map((amenity) => (
                <div key={amenity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="font-semibold">{amenity.name}</h3>
                      <p className="text-sm text-muted-foreground">{amenity.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={getCategoryColor(amenity.category)}>
                          {amenity.category}
                        </Badge>
                        {amenity.is_complimentary ? (
                          <Badge variant="secondary">Complimentary</Badge>
                        ) : (
                          <Badge variant="outline">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${amenity.cost_per_unit}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={amenity.is_active ? "default" : "secondary"}>
                      {amenity.is_active ? "Active" : "Inactive"}
                    </Badge>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ 
                        id: amenity.id, 
                        isActive: !amenity.is_active 
                      })}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {amenity.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAmenity(amenity);
                        setOpenDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Amenity Inventory Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {amenityInventory?.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No inventory records found.
              </div>
            ) : (
              amenityInventory?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{item.room?.name} - {item.amenity?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} | Last checked: {new Date(item.last_checked).toLocaleDateString()}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                    )}
                  </div>
                  
                  <Badge className={getConditionColor(item.condition)}>
                    {item.condition}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AmenityDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        amenity={selectedAmenity}
      />
    </div>
  );
};

export default AmenityManagement;
