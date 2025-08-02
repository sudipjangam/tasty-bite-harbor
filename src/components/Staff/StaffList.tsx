
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Filter, ChevronDown, Users, UserPlus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StaffMember } from "@/types/staff";

interface StaffListProps {
  onSelectStaff: (staff: StaffMember) => void;
  selectedStaffId: string | null;
  restaurantId: string | null;
  onAddStaff: () => void;
}

const StaffList: React.FC<StaffListProps> = ({ 
  onSelectStaff, 
  selectedStaffId, 
  restaurantId,
  onAddStaff
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: staff = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["enhanced-staff", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) {
        toast({
          title: "Error loading staff",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      return data as StaffMember[];
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('staff-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, refetch]);

  // Get roles for filtering
  const { data: roles = [] } = useQuery({
    queryKey: ["staff-roles", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_roles")
        .select("id, name")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data;
    },
  });

  // Filter staff based on search term and filters
  const filterStaff = (staff: StaffMember[]) => {
    return staff.filter(member => {
      const matchesSearch = 
        member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === '' || roleFilter === 'all-roles' || member.position === roleFilter;
      const matchesStatus = statusFilter === '' || statusFilter === 'all-statuses' || member.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-200">Active</Badge>;
      case 'on_leave':
        return <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200">On Leave</Badge>;
      case 'inactive':
        return <Badge className="bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200">Inactive</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200">Active</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staffId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enhanced-staff"] });
      toast({
        title: "Staff deleted",
        description: "The staff member has been deleted successfully.",
      });
      setStaffToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete staff: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteStaff = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
  };

  const confirmDeleteStaff = () => {
    if (staffToDelete) {
      deleteStaffMutation.mutate(staffToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
          <p className="text-gray-600 animate-pulse">Loading staff members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Staff Members
            </h2>
            <p className="text-gray-600">Manage your team members</p>
          </div>
        </div>
        <Button 
          onClick={onAddStaff}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 w-full max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search staff members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-200"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-700 rounded-xl"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Filter by Role</label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="bg-white/80 border-2 border-gray-200 rounded-xl">
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl">
                        <SelectItem value="all-roles">All roles</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.name}>
                            {role.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Server">Server</SelectItem>
                        <SelectItem value="Chef">Chef</SelectItem>
                        <SelectItem value="Cleaner">Cleaner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Filter by Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-white/80 border-2 border-gray-200 rounded-xl">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-xl">
                        <SelectItem value="all-statuses">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl shadow-inner overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                <TableHead className="w-[50px] font-semibold text-purple-700"></TableHead>
                <TableHead className="font-semibold text-purple-700">Name</TableHead>
                <TableHead className="font-semibold text-purple-700">Position</TableHead>
                <TableHead className="font-semibold text-purple-700">Contact</TableHead>
                <TableHead className="font-semibold text-purple-700">Status</TableHead>
                <TableHead className="font-semibold text-purple-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterStaff(staff).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <Users className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-500 text-lg">No staff members found</p>
                      <p className="text-gray-400">Try adjusting your search or filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filterStaff(staff).map((staffMember) => (
                  <TableRow 
                    key={staffMember.id} 
                    onClick={() => onSelectStaff(staffMember)}
                    className={`hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 ${selectedStaffId === staffMember.id ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-l-purple-500' : ''}`}
                  >
                    <TableCell>
                      <Avatar className="h-10 w-10 border-2 border-purple-100">
                        <AvatarImage src={staffMember.photo_url || ''} alt={`${staffMember.first_name} ${staffMember.last_name}`} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 font-semibold">
                          {getInitials(staffMember.first_name, staffMember.last_name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-semibold text-gray-800">
                      {staffMember.first_name} {staffMember.last_name}
                    </TableCell>
                    <TableCell className="text-gray-600">{staffMember.position || 'Not assigned'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        {staffMember.email && (
                          <a
                            href={`mailto:${staffMember.email}`}
                            className="text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {staffMember.email}
                          </a>
                        )}
                        {staffMember.phone && (
                          <a
                            href={`tel:${staffMember.phone}`}
                            className="text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {staffMember.phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(staffMember.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                          onClick={(e) => { 
                            e.stopPropagation();
                            onSelectStaff(staffMember);
                          }}
                        >
                          View Details
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 hover:text-red-700 px-3 py-2 rounded-xl transition-all duration-300"
                          onClick={(e) => { 
                            e.stopPropagation();
                            handleDeleteStaff(staffMember);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!staffToDelete} onOpenChange={() => setStaffToDelete(null)}>
        <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              Delete Staff Member
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete {staffToDelete?.first_name} {staffToDelete?.last_name}? 
              This action cannot be undone and will permanently remove all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/80 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteStaff}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
            >
              Delete Staff
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffList;
