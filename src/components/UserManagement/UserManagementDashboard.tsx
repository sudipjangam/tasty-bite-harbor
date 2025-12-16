import { useState } from "react";
import { UserList } from "./UserList";
import { CreateUserDialog } from "./CreateUserDialog";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, UserCheck, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserWithMetadata } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const UserManagementDashboard = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users", "admin-dashboard", currentUser?.restaurant_id],
    queryFn: async () => {
      // 1. Fetch profiles with restaurant info
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          *,
          restaurants (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Map to UserWithMetadata and add placeholder emails
      // Note: In a real admin scenario, we might use an Edge Function to fetch real emails if needed,
      // but for now we follow the existing pattern.
      return profiles.map(profile => ({
        ...profile,
        email: 'Email hidden (Admin only)'
      })) as UserWithMetadata[];
    },
    enabled: !!currentUser?.restaurant_id,
  });

  const handleUserCreated = () => {
    refetch();
    setShowCreateDialog(false);
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active !== false).length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'owner').length
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Vibrant Header Section - Matches screenshot style */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">User Management</h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ShieldAlert className="h-3 w-3 text-indigo-500" />
              <span>Manage accounts, roles, and access permissions</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setShowCreateDialog(true)} 
          className="relative z-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 border-0"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Vibrant Stats Cards - Matches screenshot colors */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Users - Blue Gradient */}
        <Card className="border-0 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-blue-100">Total Members</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
            <p className="text-blue-100 text-xs">All registered accounts</p>
          </CardContent>
        </Card>

        {/* Active Users - Green Gradient */}
        <Card className="border-0 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-green-100">Active Now</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-white mb-1">{stats.active}</div>
            <p className="text-green-100 text-xs">Currently active accounts</p>
          </CardContent>
        </Card>

        {/* Admins - Purple Gradient */}
        <Card className="border-0 shadow-lg relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-purple-100">Admins & Owners</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-white mb-1">{stats.admins}</div>
            <p className="text-purple-100 text-xs">High privilege access</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <UserList 
        users={users}
        isLoading={isLoading}
        onUserUpdated={refetch}
      />

      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
};