import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Shield, Lock, ShieldCheck, Crown, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateRoleDialog } from './CreateRoleDialog';
import { EditRoleDialog } from './EditRoleDialog';
import { DeleteRoleDialog } from './DeleteRoleDialog';
import { useToast } from '@/hooks/use-toast';

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

  // Fetch roles for the restaurant
  const { data: roles, isLoading, refetch } = useQuery({
    queryKey: ['roles', user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return [];

      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .order('is_system', { ascending: false })
        .order('has_full_access', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as Role[];
    },
    enabled: !!user?.restaurant_id,
  });

  const handleRoleCreated = () => {
    refetch();
    toast({ title: 'Role Created', description: 'The role has been created successfully.' });
  };

  const handleRoleUpdated = () => {
    refetch();
    setEditingRole(null);
  };

  const handleRoleDeleted = () => {
    refetch();
    setDeletingRole(null);
    toast({ title: 'Role Deleted', description: 'The role has been deleted successfully.' });
  };

  const getRoleIcon = (role: Role) => {
    const n = role.name.toLowerCase();
    if (role.has_full_access || n.includes('admin')) return <Crown className="h-5 w-5 text-white" />;
    if (n.includes('owner')) return <ShieldCheck className="h-5 w-5 text-white" />;
    if (n.includes('manager')) return <Shield className="h-5 w-5 text-white" />;
    if (n.includes('staff') || n.includes('user')) return <Users className="h-5 w-5 text-white" />;
    return <Lock className="h-5 w-5 text-white" />;
  };

  const getGradient = (role: Role) => {
    if (role.has_full_access) return "from-amber-500 to-orange-600 shadow-amber-500/30";
    const n = role.name.toLowerCase();
    if (n.includes('owner')) return "from-purple-500 to-violet-600 shadow-purple-500/30";
    if (n.includes('admin')) return "from-blue-500 to-indigo-600 shadow-blue-500/30";
    if (n.includes('manager')) return "from-emerald-500 to-green-600 shadow-emerald-500/30";
    if (n.includes('chef')) return "from-orange-500 to-red-600 shadow-orange-500/30";
    if (n.includes('staff')) return "from-slate-500 to-gray-600 shadow-slate-500/30";
    return "from-teal-500 to-cyan-600 shadow-teal-500/30";
  };

  const getCardBackground = (role: Role) => {
    if (role.has_full_access) return "bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10";
    const n = role.name.toLowerCase();
    if (n.includes('owner')) return "bg-gradient-to-br from-purple-50 to-violet-50/50 dark:from-purple-950/20 dark:to-violet-950/10";
    if (n.includes('admin')) return "bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10";
    return "bg-white dark:bg-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Vibrant Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Role Management</h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
              <span>Create and manage custom roles with specific component access</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="relative z-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 border-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles?.map((role) => (
          <Card 
            key={role.id} 
            className={`border shadow-lg group hover:shadow-xl transition-all duration-300 overflow-hidden relative hover:-translate-y-1 ${getCardBackground(role)}`}
          >
            <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${getGradient(role)}`} />
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${getGradient(role)} flex items-center justify-center shadow-lg`}>
                    {getRoleIcon(role)}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {role.is_system && (
                        <Badge className="text-xs font-normal bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0">
                          System Role
                        </Badge>
                      )}
                      {role.has_full_access && (
                        <Badge className="text-xs font-normal bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0">
                          Full Access
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {role.description ? (
                <p className="text-sm text-muted-foreground mb-6 line-clamp-2 h-10">
                  {role.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic mb-6 h-10 flex items-center">
                  No description provided
                </p>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRole(role)}
                  className="flex-1 hover:bg-primary/5 hover:text-primary border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Edit
                </Button>
                {role.is_deletable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingRole(role)}
                    className="flex-1 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 hover:border-red-200 dark:hover:border-red-800 border-gray-200 dark:border-gray-700 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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