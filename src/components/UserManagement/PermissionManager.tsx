import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PermissionManagerProps {
  userId: string;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AppComponent {
  id: string;
  name: string;
  description: string | null;
}

export const PermissionManager = ({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess,
}: PermissionManagerProps) => {
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch all available components
  const { data: components } = useQuery({
    queryKey: ["app-components"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_components")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as AppComponent[];
    },
    enabled: open,
  });

  // Fetch user profile and their current components
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      // Get profile for role info
      const { data: profile } = await supabase
        .from("profiles")
        .select(`
          *,
          roles (
            id,
            name,
            is_deletable
          )
        `)
        .eq("id", userId)
        .single();

      // Get component names accessible to user
      const { data: componentNames, error: rpcError } = await supabase.rpc(
        "get_user_components",
        { user_id: userId }
      );

      if (rpcError) throw rpcError;

      // We need component IDs corresponding to these names
      // We'll map them using the components list in the render or effect, 
      // but for initial state we need to wait for components list.
      // So checking components list inside here might be better or do it in useEffect.
      
      return { profile, componentNames: (componentNames as any[])?.map(row => row.component_name) || [] };
    },
    enabled: open && !!userId,
  });

  useEffect(() => {
    if (userData && components) {
      setUserProfile(userData.profile);
      
      // Map component names to IDs
      const initialIds = components
        .filter(c => userData.componentNames.includes(c.name))
        .map(c => c.id);
      
      setSelectedComponents(initialIds);
    }
  }, [userData, components]);

  const handleToggleComponent = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      if (!userProfile) return;

      const currentRoleId = userProfile.role_id;
      const currentRoleName = userProfile.roles?.name;
      const isCustomIndividualRole = currentRoleName?.startsWith("Custom Access for " + userName);

      // Strategy:
      // 1. If user has a custom individual role already, update it.
      // 2. Else, create a new custom role and assign it.
      
      let targetRoleId = currentRoleId;
      let action = 'create'; // default to create new role

      if (isCustomIndividualRole && currentRoleId) {
        // Update existing individual role
        const { data, error } = await supabase.functions.invoke('role-management', {
          body: JSON.stringify({
            action: 'update',
            id: currentRoleId,
            componentIds: selectedComponents,
          }),
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Failed to update role permissions');
        
        toast.success("Permissions updated successfully");
      } else {
        // Create new individual role
        const newRoleName = `Custom Access for ${userName} (${new Date().getTime().toString().slice(-4)})`; // Ensure uniqueness
        
        // 1. Create Role
        const { data: roleData, error: roleError } = await supabase.functions.invoke('role-management', {
          body: JSON.stringify({
            action: 'create',
            name: newRoleName,
            description: `Individual permissions for ${userName}`,
            componentIds: selectedComponents,
          }),
        });

        if (roleError) throw roleError;
        if (!roleData.success) throw new Error(roleData.error || 'Failed to create custom role');

        const newRoleId = roleData.role.id;

        // 2. Assign Role to User
        // We use user-management function to update profile role_id
        const { data: assignData, error: assignError } = await supabase.functions.invoke('user-management', {
          body: JSON.stringify({
            action: 'update_user',
            userData: {
              id: userId,
              role_id: newRoleId,
              role_name_text: roleData.role.name, // Ensure UI shows the custom role name
              role: 'staff' 
            }
          }),
        });

        if (assignError) throw assignError;
        if (!assignData.success) throw new Error(assignData.error || 'Failed to assign new role');
        
        toast.success("Created custom role and updated permissions");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || "Failed to save permissions");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Configure individual access rights for {userName}.
            {userProfile?.roles?.name && !userProfile.roles.name.startsWith("Custom Access for") && (
              <div className="mt-2 text-amber-600 bg-amber-50 p-2 rounded text-xs">
                Note: Saving will switch this user from "{userProfile.roles.name}" role to a custom individual role.
              </div>
            )}
            {!userProfile?.roles?.name && userProfile?.role && (
               <div className="mt-2 text-amber-600 bg-amber-50 p-2 rounded text-xs">
               Note: Saving will switch this user from "{userProfile.role}" system role to a custom individual role.
             </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoadingUser ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <ScrollArea className="h-[400px] border rounded-md p-4 mt-4">
            <div className="space-y-4">
              {components?.map((component) => (
                <div key={component.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={`perm-${component.id}`}
                    checked={selectedComponents.includes(component.id)}
                    onCheckedChange={() => handleToggleComponent(component.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`perm-${component.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {component.name}
                    </label>
                    {component.description && (
                      <p className="text-sm text-muted-foreground">
                        {component.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || isLoadingUser}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
