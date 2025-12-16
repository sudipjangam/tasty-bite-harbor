import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { UserRole, UserWithMetadata } from "@/types/auth";

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface EditUserDialogProps {
  user: UserWithMetadata;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export const EditUserDialog = ({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    roleId: "",
    roleName: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [systemRoles] = useState<UserRole[]>(['staff', 'waiter', 'chef', 'manager', 'admin', 'owner']);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchRoles = async () => {
      if (!currentUser?.restaurant_id) return;
      
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('*')
          .eq('restaurant_id', currentUser.restaurant_id)
          .order('name');
        
        if (error) throw error;
        setRoles(data || []);
      } catch (error) {
        console.error('Error fetching roles:', error);
      }
    };

    fetchRoles();
  }, [currentUser?.restaurant_id]);

  useEffect(() => {
    if (user && open) {
      // Determine the correct roleId - use role_id if it exists (custom role), otherwise use system role
      const roleId = user.role_id || user.role || "staff";
      
      setFormData({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        roleId: roleId,
        roleName: user.role_name_text || user.role || "staff",
        newPassword: "",
      });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Determine if it's a system role or custom role
      const isSystemRole = systemRoles.includes(formData.roleId as UserRole);
      const customRole = roles.find(r => r.id === formData.roleId);

      const payload: any = {
        id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
      };

      if (isSystemRole) {
        payload.role = formData.roleId as UserRole;
      } else {
        payload.role_id = formData.roleId;
        payload.role_name_text = customRole?.name || formData.roleName;
      }

      if (formData.newPassword) {
        payload.new_password = formData.newPassword;
      }

      const { data, error } = await supabase.functions.invoke('user-management', {
        body: { action: 'update_user', userData: payload },
      });

      if (error) throw error as any;

      toast.success('User updated successfully');
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="col-span-3"
                placeholder="Leave blank to keep current"
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};