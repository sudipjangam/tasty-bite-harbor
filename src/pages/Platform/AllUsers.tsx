import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Users,
  Search,
  MoreVertical,
  Mail,
  Building2,
  Shield,
  RefreshCw,
  Loader2,
  Eye,
  Edit,
  UserCheck,
  UserX,
  Calendar,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
  role: string;
  phone: string | null;
  restaurant_id: string | null;
  created_at: string;
  restaurants?: {
    name: string;
  } | null;
}

const AllUsers = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRole, setEditRole] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["all"]),
  );

  // Fetch all users
  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["platform-all-users", searchQuery, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(
          `
          *,
          restaurants (name)
        `,
        )
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`,
        );
      }

      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Group users by restaurant
  const groupedUsers = useMemo(() => {
    const groups: Record<string, { name: string; users: Profile[] }> = {};
    users.forEach((user) => {
      const restaurantName = user.restaurants?.name || "Unassigned";
      const restaurantId = user.restaurant_id || "unassigned";
      if (!groups[restaurantId]) {
        groups[restaurantId] = { name: restaurantName, users: [] };
      }
      groups[restaurantId].users.push(user);
    });
    return Object.entries(groups).sort((a, b) =>
      a[1].name.localeCompare(b[1].name),
    );
  }, [users]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groupedUsers.map(([id]) => id)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Capitalize the role for display (e.g., "staff" → "Staff", "owner" → "Owner")
      const roleNameText = role.charAt(0).toUpperCase() + role.slice(1);
      const { error } = await supabase
        .from("profiles")
        .update({ role, role_name_text: roleNameText })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-all-users"] });
      toast.success("User role updated");
      setIsEditOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin:
        "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
      owner:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
      manager:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
      staff:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30",
      waiter:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
      chef: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30",
    };
    return (
      <Badge variant="outline" className={styles[role] || styles.staff}>
        <Shield className="h-3 w-3 mr-1" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const roles = [
    "admin",
    "owner",
    "manager",
    "staff",
    "waiter",
    "chef",
    "receptionist",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            All Users
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View and manage platform users across all restaurants
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Users by Restaurant */}
      <Card className="border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Platform Users
            <Badge variant="secondary" className="ml-2">
              {users.length}
            </Badge>
            <Badge variant="outline" className="ml-1 text-xs">
              {groupedUsers.length} restaurants
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No users found</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {groupedUsers.map(([groupId, group]) => (
                  <div
                    key={groupId}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white/50 dark:bg-slate-800/50"
                  >
                    {/* Restaurant Header - Clickable */}
                    <button
                      onClick={() => toggleGroup(groupId)}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 hover:from-violet-100 hover:to-purple-100 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                          {group.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-slate-800 dark:text-white">
                            {group.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {group.users.length} user
                            {group.users.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {expandedGroups.has(groupId) ? (
                        <ChevronUp className="h-5 w-5 text-violet-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </button>

                    {/* Users Table - Collapsible */}
                    {expandedGroups.has(groupId) && (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.users.map((user) => (
                            <TableRow
                              key={user.id}
                              className="hover:bg-violet-50/50 dark:hover:bg-violet-900/10"
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                                    {(user.first_name || "U")
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                  <p className="font-medium text-sm">
                                    {user.first_name && user.last_name
                                      ? `${user.first_name} ${user.last_name}`
                                      : user.first_name ||
                                        user.last_name ||
                                        "No name"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="truncate max-w-[180px]">
                                    {user.email || "N/A"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{getRoleBadge(user.role)}</TableCell>
                              <TableCell className="text-sm text-slate-500">
                                {new Date(user.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setIsViewOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" /> View
                                      Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setEditRole(user.role);
                                        setIsEditOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" /> Change
                                      Role
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              User Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-medium">
                {(selectedUser?.first_name || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium text-lg">
                  {selectedUser?.first_name && selectedUser?.last_name
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`
                    : selectedUser?.first_name ||
                      selectedUser?.last_name ||
                      "No name"}
                </h3>
                {getRoleBadge(selectedUser?.role || "staff")}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-500">Email</Label>
                <p className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {selectedUser?.email || "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Phone</Label>
                <p className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-slate-400" />
                  {selectedUser?.phone || "Not provided"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Restaurant</Label>
                <p className="flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {selectedUser?.restaurants?.name || "Not assigned"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Joined</Label>
                <p className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {selectedUser?.created_at
                    ? new Date(selectedUser.created_at).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update role for{" "}
              {selectedUser?.first_name && selectedUser?.last_name
                ? `${selectedUser.first_name} ${selectedUser.last_name}`
                : selectedUser?.email || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Select New Role</Label>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser && editRole) {
                  updateRoleMutation.mutate({
                    userId: selectedUser.id,
                    role: editRole,
                  });
                }
              }}
              disabled={updateRoleMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllUsers;
