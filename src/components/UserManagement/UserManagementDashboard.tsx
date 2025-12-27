import { useState } from "react";
import { UserList } from "./UserList";
import { CreateUserDialog } from "./CreateUserDialog";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Users,
  UserCheck,
  ShieldAlert,
  AlertCircle,
  UserX,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserWithMetadata } from "@/types/auth";

export const UserManagementDashboard = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user: currentUser } = useAuth();

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

  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users", "admin-dashboard", currentUser?.restaurant_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "user-management",
        {
          body: { action: "list_users" },
        }
      );

      if (error) throw error;

      if (data?.users) {
        return data.users.map((profile: any) => ({
          ...profile,
          role:
            profile.roles?.name ||
            profile.role_name_text ||
            profile.role ||
            "staff",
        })) as UserWithMetadata[];
      }

      return [] as UserWithMetadata[];
    },
    enabled: !!currentUser?.restaurant_id,
  });

  const handleUserCreated = () => {
    refetch();
    setShowCreateDialog(false);
  };

  // Calculate stats, filtering admin users for non-admins
  const visibleUsers = isCurrentUserAdmin
    ? users
    : users.filter((u) => {
        const roleLower = (u.role_name_text || u.role || "").toLowerCase();
        return !roleLower.includes("admin") && roleLower !== "owner";
      });

  const stats = {
    total: visibleUsers.length,
    active: visibleUsers.filter((u) => u.is_active !== false).length,
    inactive: visibleUsers.filter((u) => u.is_active === false).length,
    admins: isCurrentUserAdmin
      ? users.filter((u) => {
          const r = (u.role_name_text || u.role || "").toLowerCase();
          return r === "admin" || r === "owner" || r.includes("admin");
        }).length
      : 0,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="mt-4 text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-14 w-14 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load Users
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {(error as Error)?.message ||
            "An error occurred while loading users."}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Modern Header Section - Matching Recipe Management Style */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50/30 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 shadow-sm border border-blue-100/50 dark:border-gray-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233B82F6' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="flex flex-col md:flex-row justify-between md:items-start gap-6 relative z-10">
          <div className="flex items-start gap-4">
            {/* Icon Container */}
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 text-white flex-shrink-0">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                User Management
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Manage user accounts, assign roles, and control access
                permissions
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 px-8 font-semibold"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add New User
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {/* Total Users */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <LayoutGrid className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Total Users
              </p>
            </div>
            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-3">
              {stats.total}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.active} active
            </p>
          </div>

          {/* Active Users */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Active
              </p>
            </div>
            <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-3">
              {stats.active}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Online & Active
            </p>
          </div>

          {/* Inactive Users */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gray-100 dark:bg-gray-900/30 rounded-xl">
                <UserX className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Inactive
              </p>
            </div>
            <h3 className="text-3xl font-bold text-gray-600 dark:text-gray-400 mt-3">
              {stats.inactive}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Disabled accounts
            </p>
          </div>

          {/* Admins - Only show for admin users */}
          {isCurrentUserAdmin && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Admins
                </p>
              </div>
              <h3 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-3">
                {stats.admins}
              </h3>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                High privilege
              </p>
            </div>
          )}

          {/* Show different stat for non-admins */}
          {!isCurrentUserAdmin && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-white/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Team Size
                </p>
              </div>
              <h3 className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-3">
                {stats.total}
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Team members
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <UserList users={users} isLoading={isLoading} onUserUpdated={refetch} />

      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
};
