import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchAllowedComponents, hasFeatureAccess } from "@/utils/subscriptionUtils";
import {
  getFeatureKeyForComponent,
  getCategoryForComponent,
  syncAppComponentsWithRegistry,
} from "@/utils/featureComponentMapping";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Settings,
  Shield,
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

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_deletable: boolean;
  is_system: boolean;
  has_full_access: boolean;
}

interface EditRoleDialogProps {
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface AppComponent {
  id: string;
  name: string;
  description: string | null;
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

export const EditRoleDialog = ({
  role,
  open,
  onOpenChange,
  onSuccess,
}: EditRoleDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || "");
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if current user is an admin
  const isCurrentUserAdmin = (() => {
    if (!user) return false;
    const userRole = (user.role_name_text || user.role || "").toLowerCase();
    return user.role_has_full_access || userRole.includes("admin");
  })();

  // Check if this is an admin-level role
  const isAdminRole =
    role.has_full_access || role.name.toLowerCase().includes("admin");

  // Fetch components filtered by restaurant subscription (auto-synced with registry)
  const { data: components, isLoading: componentsLoading } = useQuery({
    queryKey: ["app-components-filtered", user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return [];

      // Auto-sync app_components table with feature registry
      const allComponents = await syncAppComponentsWithRegistry();

      // Get subscription plan components
      const subscriptionComponents = await fetchAllowedComponents(
        user.restaurant_id
      );

      // Filter to only show components the restaurant has access to
      return (allComponents as AppComponent[]).filter((c) => {
        const featureKey = getFeatureKeyForComponent(c.name);
        return hasFeatureAccess(featureKey, subscriptionComponents) || 
               subscriptionComponents.some((sc) => sc.toLowerCase() === c.name.toLowerCase());
      });
    },
    enabled: open && !!user?.restaurant_id,
  });

  // Fetch current role components
  const { data: roleComponents, isLoading: roleComponentsLoading } = useQuery({
    queryKey: ["role-components", role.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_components")
        .select("component_id")
        .eq("role_id", role.id);

      if (error) throw error;
      return data.map((rc) => rc.component_id);
    },
    enabled: open,
  });

  // Group components by macro category (derived from FEATURE_REGISTRY)
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

  useEffect(() => {
    if (roleComponents) {
      setSelectedComponents(roleComponents);
    }
  }, [roleComponents]);

  useEffect(() => {
    if (open) {
      setName(role.name);
      setDescription(role.description || "");
    }
  }, [open, role]);

  const handleToggleComponent = (componentId: string) => {
    setSelectedComponents((prev) =>
      prev.includes(componentId)
        ? prev.filter((id) => id !== componentId)
        : [...prev, componentId]
    );
  };

  /* Added useQueryClient to invalidate cache */
  const queryClient = useQueryClient();

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

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    // Prevent non-admins from renaming roles to include "admin"
    if (
      !isCurrentUserAdmin &&
      name.trim().toLowerCase().includes("admin") &&
      !role.name.toLowerCase().includes("admin")
    ) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can use 'admin' in a role name.",
        variant: "destructive",
      });
      return;
    }

    // Prevent non-admins from editing admin-level roles
    if (!isCurrentUserAdmin && isAdminRole) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can modify admin-level roles.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken)
        throw new Error("You must be signed in to perform this action.");

      console.log("Updating role with components:", selectedComponents);

      const { data, error } = await supabase.functions.invoke(
        "role-management",
        {
          body: JSON.stringify({
            action: "update",
            id: role.id,
            name: name.trim(),
            description: description.trim() || null,
            componentIds: selectedComponents,
          }),
        }
      );

      if (error) throw error;
      if (data.success) {
        // Invalidate the cache so next time we open this, it fetches fresh data
        await queryClient.invalidateQueries({
          queryKey: ["role-components", role.id],
        });
        // Also invalidate lists that might depend on this
        await queryClient.invalidateQueries({ queryKey: ["roles"] });

        toast({ title: "Success", description: "Role updated successfully" });
        onSuccess();
      } else {
        throw new Error(data.error || "Failed to update role");
      }
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = componentsLoading || roleComponentsLoading;

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
                Edit Role: {role.name}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Configure role details and component permissions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Role Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Housekeeper, Front Desk"
                disabled={!role.is_deletable}
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
              />
              {!role.is_deletable && (
                <p className="text-xs text-amber-600">
                  System roles cannot be renamed
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this role"
                rows={2}
                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Component Access</Label>
              <span className="text-xs text-muted-foreground">
                {selectedComponents.length} / {components?.length || 0} selected
              </span>
            </div>

            {isLoading ? (
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
                              disabled={role.has_full_access}
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
                                  } ${role.has_full_access ? "opacity-70 cursor-not-allowed" : ""}`}
                                  onClick={() => !role.has_full_access && handleToggleComponent(component.id)}
                                >
                                  <Checkbox
                                    id={`edit-${component.id}`}
                                    checked={selectedComponents.includes(component.id)}
                                    onCheckedChange={() => handleToggleComponent(component.id)}
                                    disabled={role.has_full_access}
                                    className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <label
                                      htmlFor={`edit-${component.id}`}
                                      className={`text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5 ${
                                        role.has_full_access ? "cursor-not-allowed" : "cursor-pointer"
                                      }`}
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
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
