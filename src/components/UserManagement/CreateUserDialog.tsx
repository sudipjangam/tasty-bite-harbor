import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/types/auth";

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  restaurantId?: string;
}

export const CreateUserDialog = ({ 
  open, 
  onOpenChange, 
  onUserCreated,
  restaurantId: propRestaurantId 
}: CreateUserDialogProps) => {
  const { user: currentUser } = useAuth();
  const targetRestaurantId = propRestaurantId || currentUser?.restaurant_id;

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    roleId: "staff",
    roleName: "staff",
    restaurantId: targetRestaurantId || "",
  });
  const [loading, setLoading] = useState(false);
  const [systemRoles] = useState<UserRole[]>(['staff', 'waiter', 'chef', 'manager', 'admin', 'owner']);

  // Fetch restaurants for admin
  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurants-for-user-creation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: currentUser?.role === 'admin' && !propRestaurantId,
  });

  // Fetch roles for selected restaurant
  const { data: roles = [] } = useQuery({
    queryKey: ["roles-for-user", formData.restaurantId],
    queryFn: async () => {
      if (!formData.restaurantId) return [];
      
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("restaurant_id", formData.restaurantId)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.restaurantId && open,
  });

  useEffect(() => {
    if (targetRestaurantId) {
      setFormData(prev => ({ ...prev, restaurantId: targetRestaurantId }));
    }
  }, [targetRestaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.restaurantId) {
      toast.error("Please select a restaurant");
      return;
    }

    setLoading(true);
    try {
      const isSystemRole = systemRoles.includes(formData.roleId as UserRole);
      const customRole = roles.find(r => r.id === formData.roleId);

      // Call the user-management edge function
      const { data, error } = await supabase.functions.invoke('user-management', {
        body: JSON.stringify({
          action: 'create_user',
          userData: {
            email: formData.email,
            password: formData.password,
            first_name: formData.firstName,
            last_name: formData.lastName,
            role: isSystemRole ? formData.roleId : 'staff',
            role_id: isSystemRole ? undefined : formData.roleId,
            role_name_text: isSystemRole ? undefined : (customRole?.name || formData.roleName),
            restaurant_id: formData.restaurantId,
          }
        })
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create user');
      }

      toast.success("User created successfully");
      onUserCreated();
      onOpenChange(false);
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        roleId: "staff",
        roleName: "staff",
        restaurantId: targetRestaurantId || "",
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the organization with specific role and permissions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {isAdmin && !propRestaurantId && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="restaurant" className="text-right">
                  Restaurant
                </Label>
                <Select
                  value={formData.restaurantId}
                  onValueChange={(value) => setFormData({ ...formData, restaurantId: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select restaurant" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((restaurant) => (
                      <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="password" className="text-right">
                 Password
               </Label>
               <Input
                 id="password"
                 type="password"
                 value={formData.password}
                 onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                 className="col-span-3"
                 required
                 minLength={8}
               />
             </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                First Name
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => {
                  const customRole = roles.find(r => r.id === value);
                  setFormData({ 
                    ...formData, 
                    roleId: value,
                    roleName: customRole?.name || value
                  });
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="waiter">Waiter</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  {(currentUser?.role === 'owner' || currentUser?.role === 'admin' || 
                    currentUser?.role_name_text?.toLowerCase() === 'admin' ||
                    currentUser?.role_name_text?.toLowerCase() === 'owner') && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                  {(currentUser?.role === 'owner' || currentUser?.role_name_text?.toLowerCase() === 'owner') && (
                    <SelectItem value="owner">Owner</SelectItem>
                  )}
                  {roles.length > 0 && roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
