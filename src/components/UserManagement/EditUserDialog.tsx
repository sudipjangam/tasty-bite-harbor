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
import { UserRole, UserWithMetadata } from "@/types/auth";
import { User, Loader2, Mail, Lock, ChevronDown } from "lucide-react";

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system?: boolean;
  has_full_access?: boolean;
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
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

  // Fetch roles from database
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', currentUser?.restaurant_id],
    queryFn: async () => {
      if (!currentUser?.restaurant_id) return [];
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, is_system, has_full_access')
        .eq('restaurant_id', currentUser.restaurant_id)
        .order('is_system', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return data as Role[];
    },
    enabled: open && !!currentUser?.restaurant_id,
  });

  // Initialize form when dialog opens or user changes
  useEffect(() => {
    if (open && user) {
      // Use role_id if available, otherwise try to find role by name
      let selectedRoleId = user.role_id || "";
      
      // If no role_id but we have roles loaded, try to match by name
      if (!selectedRoleId && roles.length > 0) {
        const matchingRole = roles.find(r => 
          r.name.toLowerCase() === (user.role_name_text || user.role || "").toLowerCase()
        );
        if (matchingRole) {
          selectedRoleId = matchingRole.id;
        }
      }
      
      setFormData({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        roleId: selectedRoleId,
        newPassword: "",
      });
    }
  }, [open, user, roles]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({ firstName: "", lastName: "", roleId: "", newPassword: "" });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roleId) {
      toast.error("Please select a role");
      return;
    }

    setLoading(true);

    try {
      const selectedRole = roles.find(r => r.id === formData.roleId);

      const payload: any = {
        id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role_id: formData.roleId,
        role_name_text: selectedRole?.name || "",
      };

      if (formData.newPassword) {
        payload.new_password = formData.newPassword;
      }

      const { data, error } = await supabase.functions.invoke('user-management', {
        body: { action: 'update_user', userData: payload },
      });

      if (error) throw error;

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

  const selectedRole = roles.find(r => r.id === formData.roleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
        <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Edit User</DialogTitle>
              <DialogDescription className="text-sm">
                Update user information and role assignment
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Enter first name"
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Enter last name"
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <Select
              value={formData.roleId}
              onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              disabled={rolesLoading}
            >
              <SelectTrigger className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20">
                {rolesLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading roles...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select a role" />
                )}
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <span>{role.name}</span>
                      {role.is_system && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          System
                        </span>
                      )}
                      {role.has_full_access && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          Full Access
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRole?.description && (
              <p className="text-xs text-muted-foreground mt-1">{selectedRole.description}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="Leave blank to keep current password"
              className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20"
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters. Leave empty to keep current password.
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 dark:border-gray-800 gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-gray-200 dark:border-gray-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || rolesLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};