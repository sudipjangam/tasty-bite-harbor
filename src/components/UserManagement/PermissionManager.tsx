import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllowedComponents } from "@/utils/subscriptionUtils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  AlertTriangle,
  Shield,
  Check,
  ChefHat,
  Users,
  BarChart3,
  DollarSign,
  Package,
  Calendar,
  Settings,
} from "lucide-react";
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

// Component category mapping - matching EditRoleDialog
const componentCategories: Record<
  string,
  { icon: any; label: string; color: string }
> = {
  Operations: {
    icon: ChefHat,
    label: "Operations",
    color: "from-orange-500 to-amber-500",
  },
  Management: {
    icon: Users,
    label: "Management",
    color: "from-blue-500 to-indigo-500",
  },
  Analytics: {
    icon: BarChart3,
    label: "Analytics & Reports",
    color: "from-purple-500 to-violet-500",
  },
  Financial: {
    icon: DollarSign,
    label: "Financial",
    color: "from-emerald-500 to-green-500",
  },
  Inventory: {
    icon: Package,
    label: "Inventory & Supplies",
    color: "from-teal-500 to-cyan-500",
  },
  Reservations: {
    icon: Calendar,
    label: "Reservations & Rooms",
    color: "from-rose-500 to-pink-500",
  },
  Settings: {
    icon: Settings,
    label: "Settings & Security",
    color: "from-slate-500 to-gray-500",
  },
};

const getComponentCategory = (name: string): string => {
  const n = name.toLowerCase();
  if (
    ["pos", "orders", "kitchen", "tables", "menu", "qsr"].some((k) =>
      n.includes(k)
    )
  )
    return "Operations";
  if (
    ["staff", "user", "role", "customers", "crm", "marketing"].some((k) =>
      n.includes(k)
    )
  )
    return "Management";
  if (["analytics", "reports", "dashboard", "ai"].some((k) => n.includes(k)))
    return "Analytics";
  if (
    ["financial", "expenses", "invoice", "billing"].some((k) => n.includes(k))
  )
    return "Financial";
  if (["inventory", "suppliers", "recipes"].some((k) => n.includes(k)))
    return "Inventory";
  if (
    ["reservations", "rooms", "housekeeping", "channel"].some((k) =>
      n.includes(k)
    )
  )
    return "Reservations";
  if (
    ["settings", "security", "audit", "backup", "gdpr"].some((k) =>
      n.includes(k)
    )
  )
    return "Settings";
  return "Management";
};

export const PermissionManager = ({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess,
}: PermissionManagerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [initComplete, setInitComplete] = useState(false);

  // Fetch components filtered by restaurant subscription
  const { data: components, isLoading: isLoadingComponents } = useQuery({
    queryKey: ["app-components-filtered", user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return [];

      // Get subscription plan components
      const subscriptionComponents = await fetchAllowedComponents(
        user.restaurant_id
      );

      const { data, error } = await supabase
        .from("app_components")
        .select("*")
        .order("name");

      if (error) throw error;

      // Filter to only show components the restaurant has access to
      return (data as AppComponent[]).filter((c) =>
        subscriptionComponents.some(
          (sc) => sc.toLowerCase() === c.name.toLowerCase()
        )
      );
    },
    enabled: open && !!user?.restaurant_id,
  });

  // Fetch user profile and their current components
  const {
    data: userData,
    isLoading: isLoadingUser,
    error: userDataError,
  } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      // Get profile for role info
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          *,
          roles (
            id,
            name,
            is_deletable
          )
        `
        )
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
        componentNames:
          (componentNames as any[])?.map((row) => row.component_name) || [],
      };
    },
    enabled: open && !!userId,
  });

  // Fetch component IDs from role_components if user has a role_id
  const { data: roleComponentIds, isLoading: isLoadingRoleComponents } =
    useQuery({
      queryKey: ["role-components-for-user", userId],
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
        return (roleComps || []).map((rc) => rc.component_id);
      },
      enabled: open && !!userId,
    });

  // Group components by category
  const groupedComponents = useMemo(() => {
    if (!components) return {};
    const groups: Record<string, AppComponent[]> = {};
    components.forEach((comp) => {
      const cat = getComponentCategory(comp.name);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(comp);
    });
    return groups;
  }, [components]);

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
          .filter((c) =>
            userData.componentNames.some(
              (name) => name.toLowerCase() === c.name.toLowerCase()
            )
          )
          .map((c) => c.id);

        console.log("Mapped from component names:", {
          componentNames: userData.componentNames,
          mappedIds: initialIds,
          allComponents: components.map((c) => c.name),
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

  const handleSelectAll = (category: string) => {
    const categoryComponents = groupedComponents[category] || [];
    const allSelected = categoryComponents.every((c) =>
      selectedComponents.includes(c.id)
    );

    if (allSelected) {
      setSelectedComponents((prev) =>
        prev.filter((id) => !categoryComponents.find((c) => c.id === id))
      );
    } else {
      const newIds = categoryComponents.map((c) => c.id);
      setSelectedComponents((prev) => [...new Set([...prev, ...newIds])]);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      if (!userProfile) {
        throw new Error("User profile not loaded");
      }

      const currentRoleId = userProfile.role_id;
      const currentRoleName = userProfile.roles?.name;
      const isCustomIndividualRole = currentRoleName?.startsWith(
        "Custom Access for " + userName
      );

      let targetRoleId = currentRoleId;

      if (isCustomIndividualRole && currentRoleId) {
        // Update existing individual role
        const { data, error } = await supabase.functions.invoke(
          "role-management",
          {
            body: JSON.stringify({
              action: "update",
              id: currentRoleId,
              componentIds: selectedComponents,
            }),
          }
        );

        if (error) {
          console.error("Role update error:", error);
          throw new Error(error.message || "Failed to update permissions");
        }
        if (!data?.success) {
          throw new Error(data?.error || "Failed to update role permissions");
        }

        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({
          queryKey: ["role-components-for-user", userId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["user-permissions", userId],
        });

        toast.success("Permissions updated successfully");
      } else {
        // Create new individual role
        const newRoleName = `Custom Access for ${userName} (${new Date()
          .getTime()
          .toString()
          .slice(-4)})`;

        // 1. Create Role
        const { data: roleData, error: roleError } =
          await supabase.functions.invoke("role-management", {
            body: JSON.stringify({
              action: "create",
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
          throw new Error(roleData?.error || "Failed to create custom role");
        }

        const newRoleId = roleData.role.id;

        // 2. Assign Role to User
        const { data: assignData, error: assignError } =
          await supabase.functions.invoke("user-management", {
            body: JSON.stringify({
              action: "update_user",
              userData: {
                id: userId,
                role_id: newRoleId,
                role_name_text: roleData.role.name,
                role: "staff",
              },
            }),
          });

        if (assignError) {
          console.error("Role assign error:", assignError);
          throw new Error(assignError.message || "Failed to assign new role");
        }
        if (!assignData?.success) {
          throw new Error(assignData?.error || "Failed to assign new role");
        }

        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({
          queryKey: ["role-components-for-user", userId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["user-permissions", userId],
        });

        toast.success("Created custom role and updated permissions");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving permissions:", error);
      toast.error(
        error.message ||
          "Failed to save permissions. Make sure you have admin privileges."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading =
    isLoadingUser || isLoadingComponents || isLoadingRoleComponents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
        <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Manage Permissions: {userName}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Configure individual access rights and component permissions
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Warnings */}
        {userProfile?.roles?.name &&
          !userProfile.roles.name.startsWith("Custom Access for") && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                Saving will switch this user from "{userProfile.roles.name}"
                role to a custom individual role.
              </AlertDescription>
            </Alert>
          )}

        {!userProfile?.roles?.name && userProfile?.role && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
              Saving will switch this user from "{userProfile.role}" system role
              to a custom individual role.
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

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Component Access</span>
            <span className="text-xs text-muted-foreground">
              {selectedComponents.length} / {components?.length || 0} selected
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
              <p className="text-sm text-muted-foreground">
                Loading permissions...
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[350px] border rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="space-y-6">
                {Object.entries(groupedComponents).map(([category, comps]) => {
                  const catInfo =
                    componentCategories[category] ||
                    componentCategories["Management"];
                  const Icon = catInfo.icon;
                  const allSelected = comps.every((c) =>
                    selectedComponents.includes(c.id)
                  );
                  const someSelected = comps.some((c) =>
                    selectedComponents.includes(c.id)
                  );

                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-6 w-6 rounded-lg bg-gradient-to-br ${catInfo.color} flex items-center justify-center`}
                          >
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {catInfo.label}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectAll(category)}
                          className="text-xs h-7"
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                        {comps.map((component) => (
                          <div
                            key={component.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                              selectedComponents.includes(component.id)
                                ? "bg-primary/5 border-primary/30 dark:bg-primary/10"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            }`}
                            onClick={() => handleToggleComponent(component.id)}
                          >
                            <Checkbox
                              id={`perm-${component.id}`}
                              checked={selectedComponents.includes(
                                component.id
                              )}
                              onCheckedChange={() =>
                                handleToggleComponent(component.id)
                              }
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <label
                                htmlFor={`perm-${component.id}`}
                                className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                              >
                                {component.name}
                              </label>
                              {component.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {component.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || isLoading}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25"
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
