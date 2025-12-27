import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Search,
  Mail,
  Calendar,
  Building2,
  UserCog,
  Users,
  UserCheck,
  UserX,
  Loader2,
  SearchX,
} from "lucide-react";
import { EditUserDialog } from "./EditUserDialog";
import { PermissionManager } from "./PermissionManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserWithMetadata } from "@/types/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserListProps {
  users: UserWithMetadata[];
  isLoading: boolean;
  onUserUpdated: () => void;
}

export const UserList = ({
  users,
  isLoading,
  onUserUpdated,
}: UserListProps) => {
  const { user: currentUser } = useAuth();
  const [editingUser, setEditingUser] = useState<UserWithMetadata | null>(null);
  const [permissionUser, setPermissionUser] = useState<UserWithMetadata | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  // Check if a user is an admin-level user
  const isAdminUser = (user: UserWithMetadata) => {
    const roleLower = (user.role_name_text || user.role || "").toLowerCase();
    return roleLower.includes("admin") || roleLower === "owner";
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }

    const targetUser = users.find((u) => u.id === userId);
    if (targetUser && isAdminUser(targetUser) && !isCurrentUserAdmin) {
      toast.error("Only administrators can delete admin-level users");
      return;
    }

    setIsDeleting(userId);
    try {
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: { action: "delete_user", userId },
        }
      );

      if (error) throw error;
      if (!data?.success)
        throw new Error(data?.error || "Failed to delete user");

      toast.success("User deleted successfully");
      onUserUpdated();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setIsDeleting(null);
    }
  };

  const getRoleTheme = (role: string) => {
    const roleLower = role.toLowerCase();
    switch (roleLower) {
      case "owner":
        return {
          border: "border-purple-500",
          badge: "bg-purple-100 text-purple-700",
          icon: "text-purple-600",
          btn: "bg-purple-600 hover:bg-purple-700",
          gradient: "from-purple-500 to-violet-600",
        };
      case "admin":
        return {
          border: "border-blue-500",
          badge: "bg-blue-100 text-blue-700",
          icon: "text-blue-600",
          btn: "bg-blue-600 hover:bg-blue-700",
          gradient: "from-blue-500 to-indigo-600",
        };
      case "manager":
        return {
          border: "border-emerald-500",
          badge: "bg-emerald-100 text-emerald-700",
          icon: "text-emerald-600",
          btn: "bg-emerald-600 hover:bg-emerald-700",
          gradient: "from-emerald-500 to-green-600",
        };
      case "chef":
        return {
          border: "border-orange-500",
          badge: "bg-orange-100 text-orange-700",
          icon: "text-orange-600",
          btn: "bg-orange-500 hover:bg-orange-600",
          gradient: "from-orange-500 to-amber-600",
        };
      case "waiter":
        return {
          border: "border-amber-500",
          badge: "bg-amber-100 text-amber-700",
          icon: "text-amber-600",
          btn: "bg-amber-500 hover:bg-amber-600",
          gradient: "from-amber-500 to-yellow-600",
        };
      case "staff":
        return {
          border: "border-slate-500",
          badge: "bg-slate-100 text-slate-700",
          icon: "text-slate-600",
          btn: "bg-slate-600 hover:bg-slate-700",
          gradient: "from-slate-500 to-gray-600",
        };
      default:
        return {
          border: "border-teal-500",
          badge: "bg-teal-100 text-teal-700",
          icon: "text-teal-600",
          btn: "bg-teal-600 hover:bg-teal-700",
          gradient: "from-teal-500 to-cyan-600",
        };
    }
  };

  const getInitials = (
    firstName?: string,
    lastName?: string,
    email?: string
  ) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (email && email !== "Email hidden (Admin only)")
      return email[0].toUpperCase();
    return "U";
  };

  // Filter users based on search, role, status, and admin visibility
  const filteredUsers = users.filter((user) => {
    if (!isCurrentUserAdmin && isAdminUser(user)) {
      return false;
    }

    const matchesSearch =
      (user.first_name?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      (user.last_name?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) ||
      (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active !== false) ||
      (statusFilter === "inactive" && user.is_active === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = Array.from(new Set(users.map((u) => u.role)));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground text-sm">Loading team members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Tabs with Orange Theme */}
      <Tabs
        defaultValue="all"
        value={statusFilter}
        onValueChange={setStatusFilter}
        className="w-full"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-blue-50/50 dark:bg-gray-800/50 p-3 rounded-2xl">
          <TabsList className="bg-transparent border-0 gap-2">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl px-6 py-2.5 font-medium"
            >
              <Users className="h-4 w-4 mr-2" />
              All Users
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl px-6 py-2.5 font-medium"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger
              value="inactive"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl px-6 py-2.5 font-medium"
            >
              <UserX className="h-4 w-4 mr-2" />
              Inactive
            </TabsTrigger>
          </TabsList>

          {/* Search and Filters */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 rounded-xl"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px] bg-white dark:bg-gray-900 rounded-xl">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value={statusFilter} className="mt-6">
          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => {
              const theme = getRoleTheme(user.role);
              const isCurrentUser = user.id === currentUser?.id;

              return (
                <Card
                  key={user.id}
                  className={`group border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden relative bg-white dark:bg-gray-800 ${theme.border} border-t-[6px] rounded-xl`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <Badge
                          className={`${theme.badge} border-0 rounded-md font-semibold px-2.5`}
                        >
                          {user.role_name_text ||
                            user.role.charAt(0).toUpperCase() +
                              user.role.slice(1)}
                        </Badge>
                        {user.is_active !== false ? (
                          <Badge className="bg-green-100 text-green-700 border-0 rounded-md font-semibold px-2.5">
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-gray-500 border-gray-200 rounded-md font-medium px-2.5"
                          >
                            Inactive
                          </Badge>
                        )}
                        {isCurrentUser && (
                          <Badge className="bg-amber-100 text-amber-700 border-0 rounded-md font-semibold px-2.5">
                            You
                          </Badge>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => setEditingUser(user)}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4 text-blue-500" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPermissionUser(user)}
                            className="cursor-pointer"
                          >
                            <Shield className="mr-2 h-4 w-4 text-purple-500" />
                            Permissions
                          </DropdownMenuItem>
                          {!isCurrentUser && (
                            <>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete User Account
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete{" "}
                                      <strong>
                                        {user.first_name} {user.last_name}
                                      </strong>
                                      ? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={isDeleting === user.id}
                                    >
                                      {isDeleting === user.id ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        "Delete Account"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
                        <AvatarImage
                          src={user.avatar_url}
                          alt={user.first_name || "User"}
                        />
                        <AvatarFallback
                          className={`bg-gradient-to-br ${theme.gradient} text-white font-bold text-lg`}
                        >
                          {getInitials(
                            user.first_name,
                            user.last_name,
                            user.email
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                          {user.first_name || user.last_name
                            ? `${user.first_name || ""} ${
                                user.last_name || ""
                              }`.trim()
                            : "Unnamed User"}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email || "No email"}
                        </p>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div
                          className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${theme.icon}`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                          {user.email || "No email provided"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div
                          className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${theme.icon}`}
                        >
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {user.restaurants?.name || "Main Branch"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div
                          className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${theme.icon}`}
                        >
                          <Calendar className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Joined{" "}
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )
                            : "Unknown"}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => setEditingUser(user)}
                      className={`w-full ${theme.btn} text-white font-semibold py-5 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage User
                    </Button>
                  </CardContent>
                </Card>
              );
            })}

            {/* Empty State */}
            {filteredUsers.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <SearchX className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Users Found
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {searchQuery || roleFilter !== "all"
                    ? "No users match your current filters. Try adjusting your search or filter criteria."
                    : statusFilter === "inactive"
                    ? "No inactive users found."
                    : "No users have been added yet."}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onUserUpdated={() => {
            onUserUpdated();
            setEditingUser(null);
          }}
        />
      )}

      {permissionUser && (
        <PermissionManager
          userId={permissionUser.id}
          userName={
            `${permissionUser.first_name || ""} ${
              permissionUser.last_name || ""
            }`.trim() ||
            permissionUser.email ||
            "User"
          }
          open={!!permissionUser}
          onOpenChange={(open) => !open && setPermissionUser(null)}
          onSuccess={() => {
            onUserUpdated();
          }}
        />
      )}
    </div>
  );
};
