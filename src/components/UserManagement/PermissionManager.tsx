import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Shield, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [initComplete, setInitComplete] = useState(false);

  // Fetch all available components
  const { data: components, isLoading: isLoadingComponents } = useQuery({
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
  const { data: userData, isLoading: isLoadingUser, error: userDataError } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      // Get profile for role info
      const { data: profile, error: profileError } = await supabase
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

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

      // Get component names accessible to user
      const { data: componentNames, error: rpcError } = await supabase.rpc(
        "get_user_components",
        { user_id: userId }
      );

      if (rpcError) {
        console.error("RPC error:", rpcError);
        throw rpcError;
      }

      return { 
        profile, 
        componentNames: (componentNames as any[])?.map(row => row.component_name) || [] 
      };
    },
    enabled: open && !!userId,
  });

  // Fetch component IDs from role_components if user has a role_id
  const { data: roleComponentIds, isLoading: isLoadingRoleComponents } = useQuery({
    queryKey: ["role-components", userId],
    queryFn: async () => {
      // Get user's profile to get role_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", userId)
        .single();

      if (profileError || !profile?.role_id) {
        console.log("No role_id found for user, returning empty array");
        return [];
      }

      // Get component IDs from role_components
      const { data: roleComps, error: rpcError } = await supabase
        .from("role_components")
        .select("component_id")
        .eq("role_id", profile.role_id);

      if (rpcError) {
        console.error("Error fetching role_components:", rpcError);
        return [];
      }

      console.log("Fetched role_components:", roleComps);
      return (roleComps || []).map(rc => rc.component_id);
    },
    enabled: open && !!userId,
  });

  // Initialize selected components when data loads
  useEffect(() => {
    if (userData && components && !initComplete) {
      setUserProfile(userData.profile);
      
      // If we have role_component IDs directly, use those
      if (roleComponentIds && roleComponentIds.length > 0) {
        console.log("Using role_component IDs directly:", roleComponentIds);
        setSelectedComponents(roleComponentIds);
      } else {
        // Fallback: Map component names to IDs (case-insensitive)
        const initialIds = components
          .filter(c => userData.componentNames.some(
            name => name.toLowerCase() === c.name.toLowerCase()
          ))
          .map(c => c.id);
        
        console.log("Mapped from component names:", {
          componentNames: userData.componentNames,
          mappedIds: initialIds,
          allComponents: components.map(c => c.name)
        });
        
        setSelectedComponents(initialIds);
      }
      setInitComplete(true);
    }
  }, [userData, components, roleComponentIds, initComplete]);

  // Reset init state when dialog closes
  useEffect(() => {
    if (!open) {
      setInitComplete(false);
      setSelectedComponents([]);
      setUserProfile(null);
    }
  }, [open]);

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
      if (!userProfile) {
        throw new Error("User profile not loaded");
      }

      const currentRoleId = userProfile.role_id;
      const currentRoleName = userProfile.roles?.name;
      const isCustomIndividualRole = currentRoleName?.startsWith("Custom Access for " + userName);

      let targetRoleId = currentRoleId;

      if (isCustomIndividualRole && currentRoleId) {
        // Update existing individual role
        const { data, error } = await supabase.functions.invoke('role-management', {
          body: JSON.stringify({
            action: 'update',
            id: currentRoleId,
            componentIds: selectedComponents,
          }),
        });

        if (error) {
          console.error("Role update error:", error);
          throw new Error(error.message || "Failed to update permissions");
        }
        if (!data?.success) {
          throw new Error(data?.error || 'Failed to update role permissions');
        }
        
        toast.success("Permissions updated successfully");
      } else {
        // Create new individual role
        const newRoleName = `Custom Access for ${userName} (${new Date().getTime().toString().slice(-4)})`;
        
        // 1. Create Role
        const { data: roleData, error: roleError } = await supabase.functions.invoke('role-management', {
          body: JSON.stringify({
            action: 'create',
            name: newRoleName,
            description: `Individual permissions for ${userName}`,
            componentIds: selectedComponents,
          }),
        });

        if (roleError) {
          console.error("Role create error:", roleError);
          throw new Error(roleError.message || "Failed to create custom role");
        }
        if (!roleData?.success) {
          throw new Error(roleData?.error || 'Failed to create custom role');
        }

        const newRoleId = roleData.role.id;

        // 2. Assign Role to User
        const { data: assignData, error: assignError } = await supabase.functions.invoke('user-management', {
          body: JSON.stringify({
            action: 'update_user',
            userData: {
              id: userId,
              role_id: newRoleId,
              role_name_text: roleData.role.name,
              role: 'staff' 
            }
          }),
        });

        if (assignError) {
          console.error("Role assign error:", assignError);
          throw new Error(assignError.message || "Failed to assign new role");
        }
        if (!assignData?.success) {
          throw new Error(assignData?.error || 'Failed to assign new role');
        }
        
        toast.success("Created custom role and updated permissions");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      toast.error(error.message || "Failed to save permissions. Make sure you have admin privileges.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingUser || isLoadingComponents || isLoadingRoleComponents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            Manage Permissions
          </DialogTitle>
          {/* Fixed: Using span instead of div inside DialogDescription area */}
          <p className="text-sm text-muted-foreground mt-1">
            Configure individual access rights for <strong>{userName}</strong>
          </p>
        </DialogHeader>

        {/* Warnings - moved outside DialogDescription */}
        {userProfile?.roles?.name && !userProfile.roles.name.startsWith("Custom Access for") && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
              Saving will switch this user from "{userProfile.roles.name}" role to a custom individual role.
            </AlertDescription>
          </Alert>
        )}
        
        {!userProfile?.roles?.name && userProfile?.role && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
              Saving will switch this user from "{userProfile.role}" system role to a custom individual role.
            </AlertDescription>
          </Alert>
        )}

        {userDataError && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200 text-xs">
              Error loading permissions: {(userDataError as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-sm text-muted-foreground">Loading permissions...</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="space-y-3">
              {components?.map((component) => {
                const isChecked = selectedComponents.includes(component.id);
                return (
                  <div 
                    key={component.id} 
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      isChecked 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' 
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => handleToggleComponent(component.id)}
                  >
                    <Checkbox
                      id={`perm-${component.id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleComponent(component.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`perm-${component.id}`}
                        className="text-sm font-medium cursor-pointer flex items-center gap-2"
                      >
                        {component.name}
                        {isChecked && <Check className="h-3 w-3 text-indigo-600" />}
                      </label>
                      {component.description && (
                        <span className="text-xs text-muted-foreground block mt-0.5">
                          {component.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting || isLoading}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
