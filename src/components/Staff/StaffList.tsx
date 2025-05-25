import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Filter, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
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
  const { toast } = useToast();

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
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'on_leave':
        return <Badge className="bg-amber-100 text-amber-800">On Leave</Badge>;
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 w-full max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-950">
                <div className="p-2 space-y-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent>
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
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
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
            <Button onClick={onAddStaff} className="bg-primary hover:bg-primary/90">Add Staff</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filterStaff(staff).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No staff members found
                  </TableCell>
                </TableRow>
              ) : (
                filterStaff(staff).map((staffMember) => (
                  <TableRow 
                    key={staffMember.id} 
                    onClick={() => onSelectStaff(staffMember)}
                    className={`hover:bg-muted/50 cursor-pointer ${selectedStaffId === staffMember.id ? 'bg-muted/30' : ''}`}
                  >
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={staffMember.photo_url || ''} alt={`${staffMember.first_name} ${staffMember.last_name}`} />
                        <AvatarFallback>
                          {getInitials(staffMember.first_name, staffMember.last_name)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {staffMember.first_name} {staffMember.last_name}
                    </TableCell>
                    <TableCell>{staffMember.position || 'Not assigned'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {staffMember.email && (
                          <a
                            href={`mailto:${staffMember.email}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {staffMember.email}
                          </a>
                        )}
                        {staffMember.phone && (
                          <a
                            href={`tel:${staffMember.phone}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {staffMember.phone}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(staffMember.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                          onClick={(e) => { 
                            e.stopPropagation();
                            onSelectStaff(staffMember);
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};

export default StaffList;
