import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  Crown,
  Users,
  Loader2,
  ChefHat,
  UserCircle,
  Eye,
  LayoutGrid,
  Server,
  UserCog,
  AlertCircle,
  SearchX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateRoleDialog } from "./CreateRoleDialog";
import { EditRoleDialog } from "./EditRoleDialog";
import { DeleteRoleDialog } from "./DeleteRoleDialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_deletable: boolean;
  is_system: boolean;
  has_full_access: boolean;
  created_at: string;
}

export const RoleManagementDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch roles for the restaurant
  const {
    data: roles,
    isLoading,
    isError,
    error: rolesError,
    refetch,
  } = useQuery({
    queryKey: ["roles", user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return [];

      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("restaurant_id", user.restaurant_id)
        .order("is_system", { ascending: false })
        .order("has_full_access", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as Role[];
    },
    enabled: !!user?.restaurant_id,
  });

  // Fetch active users count per role
  const { data: userCounts } = useQuery({
    queryKey: ["role-user-counts", user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return {};

      const { data, error } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("restaurant_id", user.restaurant_id)
        .eq("is_active", true);

      if (error) throw error;

      // Count users per role
      const counts: Record<string, number> = {};
      data?.forEach((profile) => {
        if (profile.role_id) {
          counts[profile.role_id] = (counts[profile.role_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user?.restaurant_id,
  });

  const handleRoleCreated = () => {
    refetch();
    toast({
      title: "Role Created",
      description: "The role has been created successfully.",
    });
  };

  const handleRoleUpdated = () => {
    refetch();
    setEditingRole(null);
  };

  const handleRoleDeleted = () => {
    refetch();
    setDeletingRole(null);
    toast({
      title: "Role Deleted",
      description: "The role has been deleted successfully.",
    });
  };

  // Check if current user is an admin (has full access or role contains "admin")
  const isCurrentUserAdmin = useMemo(() => {
    if (!user) return false;
    const userRole = (user.role_name_text || user.role || "").toLowerCase();
    return user.role_has_full_access || userRole.includes("admin");
  }, [user]);

  const filteredRoles = useMemo(() => {
    if (!roles) return [];

    // Filter out admin-level roles for non-admin users
    // Only admins can see roles that have "admin" in the name
    let visibleRoles = roles;
    if (!isCurrentUserAdmin) {
      visibleRoles = roles.filter((r) => {
        const roleName = r.name.toLowerCase();
        // Hide roles with "admin" in the name from non-admin users
        return !roleName.includes("admin");
      });
    }

    if (activeTab === "system") return visibleRoles.filter((r) => r.is_system);
    if (activeTab === "custom") return visibleRoles.filter((r) => !r.is_system);
    return visibleRoles;
  }, [roles, activeTab, isCurrentUserAdmin]);

  // Calculate stats based on VISIBLE roles (respecting admin filtering)
  const stats = useMemo(() => {
    if (!roles) return { total: 0, system: 0, custom: 0, activeUsers: 0 };

    // Apply same visibility filter as filteredRoles
    let visibleRoles = roles;
    if (!isCurrentUserAdmin) {
      visibleRoles = roles.filter(
        (r) => !r.name.toLowerCase().includes("admin")
      );
    }

    // Count total active users across all visible roles
    const totalActiveUsers = visibleRoles.reduce((sum, role) => {
      return sum + (userCounts?.[role.id] || 0);
    }, 0);

    return {
      total: visibleRoles.length,
      system: visibleRoles.filter((r) => r.is_system).length,
      custom: visibleRoles.filter((r) => !r.is_system).length,
      activeUsers: totalActiveUsers,
    };
  }, [roles, isCurrentUserAdmin, userCounts]);

  const getRoleIcon = (role: Role) => {
    const n = role.name.toLowerCase();
    if (role.has_full_access || n.includes("admin"))
      return <Crown className="h-5 w-5" />;
    if (n.includes("owner")) return <ShieldCheck className="h-5 w-5" />;
    if (n.includes("manager")) return <Shield className="h-5 w-5" />;
    if (n.includes("chef")) return <ChefHat className="h-5 w-5" />;
    if (n.includes("waiter")) return <UserCircle className="h-5 w-5" />;
    if (n.includes("staff")) return <Users className="h-5 w-5" />;
    if (n.includes("viewer")) return <Eye className="h-5 w-5" />;
    return <UserCog className="h-5 w-5" />;
  };

  const getRoleTheme = (role: Role) => {
    const n = role.name.toLowerCase();

    // Theme format: [BorderColor, BadgeColor, IconColor]
    if (role.has_full_access || n.includes("admin")) {
      return {
        border: "border-blue-500",
        badge: "bg-blue-100 text-blue-700",
        icon: "text-blue-600",
        btn: "bg-blue-600 hover:bg-blue-700",
      };
    }
    if (n.includes("owner")) {
      return {
        border: "border-purple-600",
        badge: "bg-purple-100 text-purple-700",
        icon: "text-purple-600",
        btn: "bg-purple-600 hover:bg-purple-700",
      };
    }
    if (n.includes("manager")) {
      return {
        border: "border-emerald-500",
        badge: "bg-emerald-100 text-emerald-700",
        icon: "text-emerald-600",
        btn: "bg-emerald-600 hover:bg-emerald-700",
      };
    }
    if (n.includes("chef")) {
      return {
        border: "border-orange-500",
        badge: "bg-orange-100 text-orange-700",
        icon: "text-orange-600",
        btn: "bg-orange-500 hover:bg-orange-600",
      };
    }
    if (n.includes("waiter")) {
      return {
        border: "border-amber-500",
        badge: "bg-amber-100 text-amber-700",
        icon: "text-amber-600",
        btn: "bg-amber-500 hover:bg-amber-600",
      };
    }
    if (n.includes("staff")) {
      return {
        border: "border-cyan-500",
        badge: "bg-cyan-100 text-cyan-700",
        icon: "text-cyan-600",
        btn: "bg-cyan-600 hover:bg-cyan-700",
      };
    }
    // Default
    return {
      border: "border-slate-500",
      badge: "bg-slate-100 text-slate-700",
      icon: "text-slate-600",
      btn: "bg-slate-600 hover:bg-slate-700",
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading roles...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load Roles
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-4">
          {(rolesError as Error)?.message ||
            "An error occurred while loading roles."}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header Section matching reference style */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        {/* Accent lines/decorations */}
        <div className="absolute top-0 left-0 w-2 h-full bg-orange-500" />

        <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <ShieldCheck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-500">
                Role & Access Management
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl text-lg pl-14">
              Manage user roles, define permissions, and secure your
              restaurant's operations.
            </p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="lg"
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 px-8"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Role
          </Button>
        </div>

        {/* Metrics Row integrated in header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pl-2">
          <div className="flex items-center gap-4 border-l-4 border-orange-200 pl-4">
            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/10 rounded-full">
              <LayoutGrid className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Total Roles
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 border-l-4 border-blue-200 pl-4">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/10 rounded-full">
              <Server className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                System Roles
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.system}
              </h3>
              <p className="text-xs text-blue-600 font-medium">Predefined</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-l-4 border-purple-200 pl-4">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/10 rounded-full">
              <UserCog className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Custom Roles
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.custom}
              </h3>
              <p className="text-xs text-purple-600 font-medium">
                User Created
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-l-4 border-emerald-200 pl-4">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-full">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Active Users
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.activeUsers}
              </h3>
              <p className="text-xs text-emerald-600 font-medium">Assigned</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-6 bg-orange-50/50 dark:bg-gray-800/50 p-2 rounded-xl">
          <TabsList className="bg-transparent border-0 gap-2">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg px-6"
            >
              All Roles
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg px-6"
            >
              System Roles
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg px-6"
            >
              Custom Roles
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoles?.map((role) => {
              const theme = getRoleTheme(role);

              return (
                <Card
                  key={role.id}
                  className={`group border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden relative bg-white dark:bg-gray-800 ${theme.border} border-t-[6px] rounded-xl`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2">
                        {role.is_system && (
                          <Badge
                            className={`${theme.badge} border-0 rounded-md font-semibold px-2.5`}
                          >
                            System
                          </Badge>
                        )}
                        {role.has_full_access ? (
                          <Badge className="bg-amber-100 text-amber-700 border-0 rounded-md font-semibold px-2.5">
                            Full Access
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-gray-500 border-gray-200 rounded-md font-medium px-2.5"
                          >
                            Restricted
                          </Badge>
                        )}
                      </div>
                    </div>

                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {role.name}
                    </CardTitle>

                    <p className="text-sm text-gray-500 h-10 line-clamp-2 leading-relaxed">
                      {role.description || "No description provided."}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Metrics Row */}
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{userCounts?.[role.id] || 0} Active Users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <span>
                          {role.has_full_access ? "All" : "Limited"} Permissions
                        </span>
                      </div>
                    </div>

                    {/* Data Block - Gray Box */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 flex items-center justify-between group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${theme.icon}`}
                        >
                          {getRoleIcon(role)}
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                            Access Level
                          </span>
                          <p className="font-bold text-gray-900 dark:text-gray-100">
                            {role.has_full_access
                              ? "Administrator"
                              : role.is_system
                              ? "Operational"
                              : "Custom"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                          Type
                        </span>
                        <p className={`font-bold ${theme.icon}`}>
                          {role.is_system ? "Fixed" : "Editable"}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setEditingRole(role)}
                        className={`flex-1 ${theme.btn} text-white font-semibold py-6 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]`}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Manage Role
                      </Button>

                      {role.is_deletable && (
                        <Button
                          onClick={() => setDeletingRole(role)}
                          variant="outline"
                          className="flex-1 border-2 border-red-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-red-500 font-semibold py-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Empty State */}
            {filteredRoles?.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <SearchX className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Roles Found
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {activeTab === "custom"
                    ? "No custom roles have been created yet. Click 'New Role' to create one."
                    : activeTab === "system"
                    ? "No system roles are available."
                    : "No roles match your current view."}
                </p>
                {activeTab !== "system" && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Role
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CreateRoleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleRoleCreated}
      />

      {editingRole && (
        <EditRoleDialog
          role={editingRole}
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
          onSuccess={handleRoleUpdated}
        />
      )}

      {deletingRole && (
        <DeleteRoleDialog
          role={deletingRole}
          open={!!deletingRole}
          onOpenChange={(open) => !open && setDeletingRole(null)}
          onSuccess={handleRoleDeleted}
        />
      )}
    </div>
  );
};
