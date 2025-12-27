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
import { UserPlus, Mail, Lock as LockIcon, Loader2 } from "lucide-react";

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
  restaurantId: propRestaurantId,
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
  const [systemRoles] = useState<UserRole[]>([
    "staff",
    "waiter",
    "chef",
    "manager",
    "admin",
    "owner",
  ]);

  // Check if current user is an admin
  const isCurrentUserAdmin = (() => {
    if (!currentUser) return false;
    const userRole = (
      currentUser.role_name_text ||
      currentUser.role ||
      ""
    ).toLowerCase();
    return currentUser.role_has_full_access || userRole.includes("admin");
  })();

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
    enabled: currentUser?.role === "admin" && !propRestaurantId,
  });

  // Fetch roles for selected restaurant
  const { data: allRoles = [] } = useQuery({
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

  // Filter roles: non-admins cannot see/assign admin-level roles
  const roles = isCurrentUserAdmin
    ? allRoles
    : allRoles.filter((r: Role) => !r.name.toLowerCase().includes("admin"));

  useEffect(() => {
    if (targetRestaurantId) {
      setFormData((prev) => ({ ...prev, restaurantId: targetRestaurantId }));
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
      const customRole = roles.find((r) => r.id === formData.roleId);

      // Call the user-management edge function
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: JSON.stringify({
            action: "create_user",
            userData: {
              email: formData.email,
              password: formData.password,
              first_name: formData.firstName,
              last_name: formData.lastName,
              role: isSystemRole ? formData.roleId : "staff",
              role_id: isSystemRole ? undefined : formData.roleId,
              role_name_text: isSystemRole
                ? undefined
                : customRole?.name || formData.roleName,
              restaurant_id: formData.restaurantId,
            },
          }),
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || "Failed to create user");
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
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
        <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Create New User
              </DialogTitle>
              <DialogDescription className="text-sm">
                Add a new team member with role and permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {isAdmin && !propRestaurantId && (
            <div className="space-y-2">
              <Label htmlFor="restaurant" className="text-sm font-medium">
                Restaurant
              </Label>
              <Select
                value={formData.restaurantId}
                onValueChange={(value) =>
                  setFormData({ ...formData, restaurantId: value })
                }
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl"
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Mail className="h-3.5 w-3.5" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl"
              placeholder="john.doe@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium flex items-center gap-2"
            >
              <LockIcon className="h-3.5 w-3.5" />
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters long.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-sm font-medium">
              Role Assignment
            </Label>
            <Select
              value={formData.roleId}
              onValueChange={(value) => {
                const customRole = roles.find((r) => r.id === value);
                setFormData({
                  ...formData,
                  roleId: value,
                  roleName: customRole?.name || value,
                });
              }}
            >
              <SelectTrigger className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="waiter">Waiter</SelectItem>
                <SelectItem value="chef">Chef</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                {isCurrentUserAdmin && (
                  <SelectItem value="admin">Admin</SelectItem>
                )}
                {(currentUser?.role === "owner" ||
                  currentUser?.role_name_text?.toLowerCase() === "owner") && (
                  <SelectItem value="owner">Owner</SelectItem>
                )}
                {roles.length > 0 &&
                  roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 dark:border-gray-800 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-200 dark:border-gray-700 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
