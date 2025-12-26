import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Key,
  Layers,
  Lock,
  AlertTriangle,
} from "lucide-react";

interface AppComponent {
  id: string;
  name: string;
  description: string | null;
}

interface ComponentPermission {
  id: string;
  component_id: string;
  permission: string;
  description: string | null;
  component?: AppComponent;
}

const PermissionManagement = () => {
  const { user, hasPermission, isRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("components");
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null
  );
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({
    permission: "",
    description: "",
  });
  const [editingPermission, setEditingPermission] =
    useState<ComponentPermission | null>(null);

  // Check if user has access - ONLY admin role (not owner)
  const isAdmin = isRole("admin");
  const canManage = isAdmin;

  // Fetch all app components
  const { data: components = [], isLoading: componentsLoading } = useQuery({
    queryKey: ["app-components"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_components")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as AppComponent[];
    },
    enabled: canManage,
  });

  // Fetch all component permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["component-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("component_permissions")
        .select(
          `
          *,
          component:component_id (
            id,
            name,
            description
          )
        `
        )
        .order("permission");
      if (error) throw error;
      return data as ComponentPermission[];
    },
    enabled: canManage,
  });

  // Get permissions for selected component
  const selectedComponentPermissions = permissions.filter(
    (p) => p.component_id === selectedComponent
  );

  // Add permission mutation
  const addPermissionMutation = useMutation({
    mutationFn: async (data: {
      component_id: string;
      permission: string;
      description: string;
    }) => {
      const { error } = await supabase
        .from("component_permissions")
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-permissions"] });
      toast.success("Permission added successfully");
      setIsAddPermissionOpen(false);
      setNewPermission({ permission: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(`Failed to add permission: ${error.message}`);
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async (data: { id: string; description: string }) => {
      const { error } = await supabase
        .from("component_permissions")
        .update({ description: data.description })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-permissions"] });
      toast.success("Permission updated");
      setEditingPermission(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Delete permission mutation
  const deletePermissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("component_permissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component-permissions"] });
      toast.success("Permission deleted");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleAddPermission = () => {
    if (!selectedComponent || !newPermission.permission.trim()) {
      toast.error("Please select a component and enter a permission name");
      return;
    }
    addPermissionMutation.mutate({
      component_id: selectedComponent,
      permission: newPermission.permission.trim().toLowerCase(),
      description: newPermission.description.trim(),
    });
  };

  // Group permissions by component for overview
  const permissionsByComponent = permissions.reduce((acc, perm) => {
    const componentName = perm.component?.name || "Unknown";
    if (!acc[componentName]) {
      acc[componentName] = [];
    }
    acc[componentName].push(perm);
    return acc;
  }, {} as Record<string, ComponentPermission[]>);

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
        <PageHeader title="Permission Management" description="Access denied" />
        <div className="p-6">
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-red-200 dark:border-red-800">
            <CardContent className="flex items-center gap-4 p-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-600">Access Denied</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have permission to manage component permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <PageHeader
        title="Permission Management"
        description="Manage component permissions and access controls"
      />

      <div className="p-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
            <TabsTrigger value="components" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              By Component
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              All Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="components" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Component List */}
              <Card className="lg:col-span-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-500" />
                    Components
                  </CardTitle>
                  <CardDescription>
                    Select a component to manage its permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {componentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {components.map((component) => {
                          const permCount = permissions.filter(
                            (p) => p.component_id === component.id
                          ).length;
                          return (
                            <button
                              key={component.id}
                              onClick={() => setSelectedComponent(component.id)}
                              className={`w-full p-3 rounded-lg text-left transition-all ${
                                selectedComponent === component.id
                                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                                  : "bg-white/50 dark:bg-gray-900/50 hover:bg-white/80 dark:hover:bg-gray-800/80 border border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {component.name}
                                </span>
                                <Badge
                                  variant={
                                    selectedComponent === component.id
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className={
                                    selectedComponent === component.id
                                      ? "bg-white/20 text-white border-0"
                                      : ""
                                  }
                                >
                                  {permCount} permissions
                                </Badge>
                              </div>
                              {component.description && (
                                <p
                                  className={`text-xs mt-1 ${
                                    selectedComponent === component.id
                                      ? "text-white/70"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {component.description}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Component Permissions */}
              <Card className="lg:col-span-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-purple-500" />
                        Permissions
                      </CardTitle>
                      <CardDescription>
                        {selectedComponent
                          ? `Manage permissions for ${
                              components.find((c) => c.id === selectedComponent)
                                ?.name
                            }`
                          : "Select a component to view its permissions"}
                      </CardDescription>
                    </div>
                    {selectedComponent && (
                      <Dialog
                        open={isAddPermissionOpen}
                        onOpenChange={setIsAddPermissionOpen}
                      >
                        <DialogTrigger asChild>
                          <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Permission
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Permission</DialogTitle>
                            <DialogDescription>
                              Add a new permission to{" "}
                              {
                                components.find(
                                  (c) => c.id === selectedComponent
                                )?.name
                              }
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="permission">Permission Key</Label>
                              <Input
                                id="permission"
                                placeholder="e.g., orders.approve"
                                value={newPermission.permission}
                                onChange={(e) =>
                                  setNewPermission((prev) => ({
                                    ...prev,
                                    permission: e.target.value,
                                  }))
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Use format: resource.action (e.g.,
                                orders.create, menu.delete)
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Input
                                id="description"
                                placeholder="What does this permission allow?"
                                value={newPermission.description}
                                onChange={(e) =>
                                  setNewPermission((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsAddPermissionOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddPermission}
                              disabled={addPermissionMutation.isPending}
                              className="bg-gradient-to-r from-indigo-500 to-purple-600"
                            >
                              {addPermissionMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Add Permission
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedComponent ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Lock className="h-12 w-12 mb-4 opacity-50" />
                      <p>
                        Select a component from the left to manage its
                        permissions
                      </p>
                    </div>
                  ) : permissionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    </div>
                  ) : selectedComponentPermissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Shield className="h-12 w-12 mb-4 opacity-50" />
                      <p>No permissions defined for this component</p>
                      <p className="text-sm">
                        Click "Add Permission" to create one
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {selectedComponentPermissions.map((perm) => (
                          <div
                            key={perm.id}
                            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50"
                          >
                            {editingPermission?.id === perm.id ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
                                    {perm.permission}
                                  </Badge>
                                </div>
                                <Input
                                  value={editingPermission.description || ""}
                                  onChange={(e) =>
                                    setEditingPermission((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            description: e.target.value,
                                          }
                                        : null
                                    )
                                  }
                                  placeholder="Permission description"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      updatePermissionMutation.mutate({
                                        id: perm.id,
                                        description:
                                          editingPermission.description || "",
                                      })
                                    }
                                    disabled={
                                      updatePermissionMutation.isPending
                                    }
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingPermission(null)}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div>
                                  <Badge className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
                                    {perm.permission}
                                  </Badge>
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {perm.description || "No description"}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => setEditingPermission(perm)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          "Are you sure you want to delete this permission?"
                                        )
                                      ) {
                                        deletePermissionMutation.mutate(
                                          perm.id
                                        );
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-purple-500" />
                  All Permissions Overview
                </CardTitle>
                <CardDescription>
                  View all permissions grouped by component (
                  {permissions.length} total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {permissionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(permissionsByComponent).map(
                      ([componentName, perms]) => (
                        <div key={componentName}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                              <Layers className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="font-semibold">{componentName}</h3>
                            <Badge variant="outline">{perms.length}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 ml-8">
                            {perms.map((perm) => (
                              <Badge
                                key={perm.id}
                                variant="secondary"
                                className="bg-white/50 dark:bg-gray-800/50"
                                title={perm.description || undefined}
                              >
                                {perm.permission}
                              </Badge>
                            ))}
                          </div>
                          <Separator className="mt-4" />
                        </div>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PermissionManagement;
