import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Shield, 
  Search,
  Filter,
  UserCog
} from "lucide-react";
import { EditUserDialog } from "./EditUserDialog";
import { PermissionManager } from "./PermissionManager";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

export const UserList = ({ users, isLoading, onUserUpdated }: UserListProps) => {
  const [editingUser, setEditingUser] = useState<UserWithMetadata | null>(null);
  const [permissionUser, setPermissionUser] = useState<UserWithMetadata | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) throw authError;
      
      toast.success('User deleted successfully');
      onUserUpdated();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const roleLower = role.toLowerCase();
    switch (roleLower) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
      case 'manager':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200';
      case 'chef':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200';
      case 'waiter':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
      case 'staff':
        return 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200';
      default:
        // Custom roles get a generic color
        return 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200';
    }
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (email && email !== 'Email hidden (Admin only)') return email[0].toUpperCase();
    return "U";
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.first_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.last_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(new Set(users.map(u => u.role)));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground text-sm">Loading team members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-gray-50 dark:bg-gray-900">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {uniqueRoles.map(role => (
                <SelectItem key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Modern Table */}
      <div className="rounded-lg border bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
            <TableRow>
              <TableHead className="w-[250px] font-semibold">User</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Restaurant</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">Joined</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No users found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarImage src={user.avatar_url} alt={user.first_name || 'User'} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(user.first_name, user.last_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'Unnamed User'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {user.email || 'No email'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.is_active !== false 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        user.is_active !== false ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      {user.is_active !== false ? 'Active' : 'Inactive'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getRoleBadgeColor(user.role)} font-normal`}
                    >
                      {user.role_name_text || (user.role.charAt(0).toUpperCase() + user.role.slice(1))}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {user.restaurants?.name || 'Main Branch'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => setEditingUser(user)} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4 text-blue-500" />
                          <span>Edit Details</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPermissionUser(user)} className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4 text-purple-500" />
                          <span>Manage Permissions</span>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete User</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete <strong>{user.first_name} {user.last_name}</strong>? 
                                This action cannot be undone and will remove all access for this user.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
          userName={`${permissionUser.first_name || ''} ${permissionUser.last_name || ''}`.trim() || permissionUser.email || 'User'}
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
