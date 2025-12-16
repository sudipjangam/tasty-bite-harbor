import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateUserDialog } from "@/components/UserManagement/CreateUserDialog";
import { EditUserDialog } from "@/components/UserManagement/EditUserDialog";
import { UserList } from "@/components/UserManagement/UserList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const GlobalUserManagement = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: restaurants = [] } = useQuery({
    queryKey: ["admin-restaurants-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const handleUserCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setShowCreateDialog(false);
  };

  const handleUserUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Global User Management</CardTitle>
              <CardDescription>
                Manage users across all restaurants
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:items-center">
              <div className="space-y-2">
                <Label>Filter by Restaurant</Label>
                <Select
                  value={selectedRestaurantId}
                  onValueChange={setSelectedRestaurantId}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="All Restaurants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Restaurants</SelectItem>
                    {restaurants.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UserList
            key={refreshKey}
            users={[]}
            isLoading={false}
            onUserUpdated={handleUserUpdated}
          />
        </CardContent>
      </Card>

      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={handleUserCreated}
        restaurantId={selectedRestaurantId}
      />
    </div>
  );
};
