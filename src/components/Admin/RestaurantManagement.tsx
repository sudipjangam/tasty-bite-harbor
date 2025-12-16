import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateRestaurantDialog } from "./CreateRestaurantDialog";
import { EditRestaurantDialog } from "./EditRestaurantDialog";
import { DeleteRestaurantDialog } from "./DeleteRestaurantDialog";
import { toast } from "sonner";

interface Restaurant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  verification_status: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  created_at: string;
}

export const RestaurantManagement = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [deletingRestaurant, setDeletingRestaurant] = useState<Restaurant | null>(null);

  const { data: restaurants = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Restaurant[];
    },
  });

  const handleSuccess = () => {
    refetch();
    toast.success("Operation completed successfully");
  };

  if (isLoading) {
    return <div>Loading restaurants...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Restaurant Management</CardTitle>
              <CardDescription>
                Manage all restaurants on the platform
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Restaurant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                        <Badge variant={restaurant.is_active ? "default" : "secondary"}>
                          {restaurant.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{restaurant.verification_status}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {restaurant.owner_name && (
                          <div>Owner: {restaurant.owner_name}</div>
                        )}
                        {restaurant.email && <div>Email: {restaurant.email}</div>}
                        {restaurant.phone && <div>Phone: {restaurant.phone}</div>}
                        {restaurant.address && <div>Address: {restaurant.address}</div>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(restaurant.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRestaurant(restaurant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingRestaurant(restaurant)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <CreateRestaurantDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleSuccess}
      />

      {editingRestaurant && (
        <EditRestaurantDialog
          restaurant={editingRestaurant}
          open={!!editingRestaurant}
          onOpenChange={(open) => !open && setEditingRestaurant(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deletingRestaurant && (
        <DeleteRestaurantDialog
          restaurant={deletingRestaurant}
          open={!!deletingRestaurant}
          onOpenChange={(open) => !open && setDeletingRestaurant(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
