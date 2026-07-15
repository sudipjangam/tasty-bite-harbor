import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserRole, UserWithMetadata } from "@/types/auth";
import {
  User,
  Loader2,
  Lock,
  Shield,
  Settings,
  ChefHat,
  Users,
  BarChart3,
  DollarSign,
  Package,
  Calendar,
  Home,
  Wrench,
  Zap,
  ShoppingCart,
  UtensilsCrossed,
  LayoutGrid,
  Truck,
  CalendarDays,
  Receipt,
  Sparkles,
  Megaphone,
  Monitor,
  Soup,
  Key,
  UserCheck,
  Bed,
  Globe,
} from "lucide-react";
import { fetchAllowedComponents, hasFeatureAccess } from "@/utils/subscriptionUtils";
import {
  getFeatureKeyForComponent,
  getCategoryForComponent,
  syncAppComponentsWithRegistry,
} from "@/utils/featureComponentMapping";

interface Role {
  id: string;
  name: string;
  description?: string;
  is_system?: boolean;
  has_full_access?: boolean;
}

interface AppComponent {
  id: string;
  name: string;
  description: string | null;
}

interface EditUserDialogProps {
  user: UserWithMetadata;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

// ─── Icon map for dynamic registry-based category rendering ──────────────
const ICON_MAP: Record<string, any> = {
  LayoutDashboard: Home,
  Monitor,
  Zap,
  ShoppingCart,
  ChefHat,
  UtensilsCrossed,
  Package,
  Soup,
  LayoutGrid,
  BarChart3,
  Users,
  UserCheck,
  DollarSign,
  Receipt,
  Truck,
  CalendarDays,
  Shield,
  Settings,
  Sparkles,
  Megaphone,
  Key,
  Calendar,
  Bed,
  Globe,
};

export const EditUserDialog = ({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: EditUserDialogProps) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    roleId: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

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

  // Fetch roles from database
  const { data: allRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles", currentUser?.restaurant_id],
    queryFn: async () => {
      if (!currentUser?.restaurant_id) return [];
      const { data, error } = await supabase
        .from("roles")
        .select("id, name, description, is_system, has_full_access")
        .eq("restaurant_id", currentUser.restaurant_id)
        .order("is_system", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as Role[];
    },
    enabled: open && !!currentUser?.restaurant_id,
  });

  // Filter roles: non-admins cannot see/assign admin-level roles
  const roles = isCurrentUserAdmin
    ? allRoles
    : allRoles.filter(
        (r) => !r.name.toLowerCase().includes("admin") && !r.has_full_access
      );

  // Fetch components filtered by subscription (auto-synced with registry)
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ["app-components-filtered", currentUser?.restaurant_id],
    queryFn: async () => {
      if (!currentUser?.restaurant_id) return [];
      const allComponents = await syncAppComponentsWithRegistry();
      const subscriptionComponents = await fetchAllowedComponents(
        currentUser.restaurant_id
      );
      return (allComponents as AppComponent[]).filter((c) => {
        const featureKey = getFeatureKeyForComponent(c.name);
        return hasFeatureAccess(featureKey, subscriptionComponents) ||
               subscriptionComponents.some((sc) => sc.toLowerCase() === c.name.toLowerCase());
      });
    },
    enabled: open && !!currentUser?.restaurant_id,
  });

  // Fetch user's current component permissions
  const { data: userComponents, isLoading: userComponentsLoading } = useQuery({
    queryKey: ["user-components", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_component_permissions")
        .select("component_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((uc) => uc.component_id);
    },
    enabled: open,
  });

  // Group components by macro category
  const groupedComponents = useMemo(() => {
    if (!components) return {};
    
    const MACRO_GROUPS = {
      Overview: ["Dashboard"],
      Operations: [
        "POS", "Orders", "QSR POS", "QuickServe POS", 
        "Kitchen", "Kitchen TV", "Recipes", "Menu", 
        "Tables", "Inventory"
      ],
      "Guest Services": ["Rooms", "Reservations", "Housekeeping"],
      Management: [
        "Staff", "Customers", "Marketing", "User Management", 
        "Permission Management", "Channel Management", 
        "Analytics", "Financial"
      ],
      System: ["Settings", "Gate Services", "AI Assistant"]
    };

    const categoryToMacroGroup = (catLabel: string) => {
      if (MACRO_GROUPS.Operations.includes(catLabel)) return "Operations";
      if (MACRO_GROUPS["Guest Services"].includes(catLabel)) return "Guest Services";
      if (MACRO_GROUPS.Management.includes(catLabel)) return "Management";
      if (MACRO_GROUPS.Overview.includes(catLabel)) return "Overview";
      return "System";
    };

    const groups: Record<string, AppComponent[]> = {
      Overview: [],
      Operations: [],
      "Guest Services": [],
      Management: [],
      System: []
    };

    components.forEach((comp) => {
      const catInfo = getCategoryForComponent(comp.name);
      const macro = categoryToMacroGroup(catInfo.label);
      if (groups[macro]) {
        groups[macro].push(comp);
      } else {
        groups[macro] = [comp];
      }
    });

    // Remove empty macro groups
    Object.keys(groups).forEach(key => {
      if (!groups[key] || groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [components]);

  // Initialize form when dialog opens or user changes
  useEffect(() => {
    if (open && user) {
      let selectedRoleId = user.role_id || "";
      if (!selectedRoleId && roles.length > 0) {
        const matchingRole = roles.find(
          (r) =>
            r.name.toLowerCase() ===
            (user.role_name_text || user.role || "").toLowerCase()
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
      setActiveTab("details");
    }
  }, [open, user, roles]);

  // Load user component permissions
  useEffect(() => {
    if (userComponents) {
      setSelectedComponents(userComponents);
    }
  }, [userComponents]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({ firstName: "", lastName: "", roleId: "", newPassword: "" });
      setSelectedComponents([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.roleId) {
      toast.error("Please select a role");
      return;
    }

    setLoading(true);

    try {
      const selectedRole = roles.find((r) => r.id === formData.roleId);

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

      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: { action: "update_user", userData: payload },
        }
      );

      if (error) throw error;

      // Save individual permission overrides
      if (selectedComponents.length > 0 || (userComponents && userComponents.length > 0)) {
        // Delete existing permissions
        await supabase
          .from("user_component_permissions")
          .delete()
          .eq("user_id", user.id);

        // Insert new permissions
        if (selectedComponents.length > 0) {
          const insertData = selectedComponents.map((componentId) => ({
            user_id: user.id,
            component_id: componentId,
          }));
          await supabase
            .from("user_component_permissions")
            .insert(insertData);
        }

        // Invalidate permission cache
        await queryClient.invalidateQueries({
          queryKey: ["user-components", user.id],
        });
      }

      toast.success("User updated successfully");
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find((r) => r.id === formData.roleId);
  const isPermissionsLoading = componentsLoading || userComponentsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
        <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Edit User
              </DialogTitle>
              <DialogDescription className="text-sm">
                Update user information, role, and access permissions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-lg font-medium text-sm"
            >
              <User className="h-4 w-4 mr-2" />
              Details & Role
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-lg font-medium text-sm"
            >
              <Shield className="h-4 w-4 mr-2" />
              Permissions
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="details" className="space-y-5 pt-4 mt-0">
              {/* Name Fields */}
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
                    placeholder="Enter first name"
                    className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20"
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, roleId: value })
                  }
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedRole.description}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="newPassword"
                  className="text-sm font-medium flex items-center gap-2"
                >
                  <Lock className="h-3.5 w-3.5" />
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  placeholder="Leave blank to keep current password"
                  className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20"
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters. Leave empty to keep current password.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="pt-4 mt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Component Access</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedComponents.length} / {components?.length || 0} selected
                  </span>
                </div>

                {isPermissionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <ScrollArea className="h-[350px] border rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="space-y-6">
                      {Object.entries(groupedComponents).map(
                        ([macroCategory, comps]) => {
                          const allSelected = comps.every((c) =>
                            selectedComponents.includes(c.id)
                          );

                          const MACRO_COLORS: Record<string, string> = {
                            Overview: "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300",
                            Operations: "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50 text-blue-700 dark:text-blue-300",
                            "Guest Services": "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300",
                            Management: "bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/50 text-purple-700 dark:text-purple-300",
                            System: "bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/50 text-slate-700 dark:text-slate-300",
                          };
                          const colorClass = MACRO_COLORS[macroCategory] || MACRO_COLORS.System;

                          return (
                            <div key={macroCategory} className={`p-4 rounded-xl border ${colorClass} space-y-3`}>
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-xs font-bold uppercase tracking-wider">{macroCategory}</h3>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSelectAll(macroCategory)}
                                  className="text-xs h-7 opacity-80 hover:opacity-100 bg-white/50 dark:bg-gray-800/50"
                                >
                                  {allSelected ? "Deselect All" : "Select All"}
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {comps.map((component) => {
                                  const catMeta = getCategoryForComponent(component.name);
                                  const Icon = ICON_MAP[catMeta.icon] || Settings;

                                  return (
                                    <div
                                      key={component.id}
                                      className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer bg-white dark:bg-gray-800/80 ${
                                        selectedComponents.includes(component.id)
                                          ? "border-primary/50 shadow-sm"
                                          : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                                      }`}
                                      onClick={() => handleToggleComponent(component.id)}
                                    >
                                      <Checkbox
                                        id={`perm-${component.id}`}
                                        checked={selectedComponents.includes(component.id)}
                                        onCheckedChange={() => handleToggleComponent(component.id)}
                                        className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <label
                                          htmlFor={`perm-${component.id}`}
                                          className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer flex items-center gap-1.5"
                                        >
                                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                          {component.name}
                                        </label>
                                        {component.description && (
                                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {component.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </ScrollArea>
                )}

                <p className="text-xs text-muted-foreground">
                  Individual permissions override the role's defaults.
                </p>
              </div>
            </TabsContent>

            <DialogFooter className="pt-4 border-t border-gray-100 dark:border-gray-800 gap-2 mt-4">
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
