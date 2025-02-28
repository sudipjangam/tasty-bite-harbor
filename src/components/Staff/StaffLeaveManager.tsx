
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Calendar, FileText, Edit, Trash2 } from "lucide-react";
import { format, differenceInDays, isAfter } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface StaffLeave {
  id: string;
  staff_id: string;
  restaurant_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  created_at: string;
  staff?: {
    first_name: string;
    last_name: string;
    position: string;
  };
}

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
}

const StaffLeaveManager: React.FC = () => {
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [editingLeave, setEditingLeave] = useState<StaffLeave | null>(null);
  const [deletingLeaveId, setDeletingLeaveId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: restaurantId } = useQuery({
    queryKey: ["restaurant-id"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      return userProfile?.restaurant_id;
    },
  });

  const { data: staff = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ["staff", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, first_name, last_name, position")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data as Staff[];
    },
  });

  const { 
    data: leaves = [], 
    isLoading: isLeavesLoading,
    refetch: refetchLeaves
  } = useQuery({
    queryKey: ["staff-leaves", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_leaves")
        .select(`
          *,
          staff:staff_id (
            first_name,
            last_name,
            position
          )
        `)
        .eq("restaurant_id", restaurantId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as StaffLeave[];
    },
  });

  const resetForm = () => {
    setSelectedStaffId("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setEditingLeave(null);
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStaffId || !startDate || !endDate || !restaurantId) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate dates
    if (isAfter(new Date(startDate), new Date(endDate))) {
      toast({
        title: "Invalid date range",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingLeave) {
        // Update existing leave
        const { error } = await supabase
          .from("staff_leaves")
          .update({
            staff_id: selectedStaffId,
            start_date: startDate,
            end_date: endDate,
            reason,
          })
          .eq("id", editingLeave.id);

        if (error) throw error;

        toast({
          title: "Leave request updated",
          description: "The leave request has been updated successfully",
        });
      } else {
        // Add new leave
        const { error } = await supabase
          .from("staff_leaves")
          .insert({
            staff_id: selectedStaffId,
            restaurant_id: restaurantId,
            start_date: startDate,
            end_date: endDate,
            reason,
            status: "pending"
          });

        if (error) throw error;

        toast({
          title: "Leave request submitted",
          description: "The leave request has been added successfully",
        });
      }

      // Reset form
      resetForm();
      setIsAddLeaveOpen(false);
      refetchLeaves();
    } catch (error) {
      console.error("Error adding/updating leave:", error);
      toast({
        title: "Error",
        description: "Failed to save leave request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditLeave = (leave: StaffLeave) => {
    setEditingLeave(leave);
    setSelectedStaffId(leave.staff_id);
    setStartDate(leave.start_date);
    setEndDate(leave.end_date);
    setReason(leave.reason || "");
    setIsAddLeaveOpen(true);
  };

  const handleDeleteLeave = (leaveId: string) => {
    setDeletingLeaveId(leaveId);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteLeave = async () => {
    if (!deletingLeaveId) return;

    try {
      const { error } = await supabase
        .from("staff_leaves")
        .delete()
        .eq("id", deletingLeaveId);

      if (error) throw error;

      toast({
        title: "Leave deleted",
        description: "The leave request has been deleted successfully",
      });

      setIsConfirmDeleteOpen(false);
      refetchLeaves();
    } catch (error) {
      console.error("Error deleting leave:", error);
      toast({
        title: "Error",
        description: "Failed to delete leave request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateLeaveStatus = async (leaveId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from("staff_leaves")
        .update({ status })
        .eq("id", leaveId);

      if (error) throw error;

      toast({
        title: `Leave ${status}`,
        description: `The leave request has been ${status}`,
      });

      refetchLeaves();
    } catch (error) {
      console.error("Error updating leave status:", error);
      toast({
        title: "Error",
        description: "Failed to update leave status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Staff Leave Management</h2>
        
        <Dialog open={isAddLeaveOpen} onOpenChange={setIsAddLeaveOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Calendar className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLeave ? "Edit Leave Request" : "Request Staff Leave"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddLeave} className="space-y-4">
              <div>
                <Label htmlFor="staff">Staff Member</Label>
                <Select 
                  value={selectedStaffId} 
                  onValueChange={setSelectedStaffId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name} - {member.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    min={startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for leave"
                  rows={3}
                />
              </div>
              
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                {editingLeave ? "Update Request" : "Submit Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="overflow-hidden">
        {isLeavesLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading leave requests...</p>
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-lg font-medium">No leave requests</h3>
            <p className="text-muted-foreground">
              There are no leave requests to display.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell className="font-medium">
                    {leave.staff?.first_name} {leave.staff?.last_name}
                    <div className="text-xs text-muted-foreground mt-1">{leave.staff?.position}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(new Date(leave.start_date), 'MMM dd, yyyy')}</span>
                      <span className="text-muted-foreground">to</span>
                      <span>{format(new Date(leave.end_date), 'MMM dd, yyyy')}</span>
                      <Badge variant="outline" className="mt-1 text-xs justify-center">
                        {differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1} days
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-xs overflow-hidden text-ellipsis">
                      {leave.reason || "No reason provided"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(leave.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {leave.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => updateLeaveStatus(leave.id, 'approved')}
                            size="sm"
                            variant="outline"
                            className="border-green-500 text-green-600 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => updateLeaveStatus(leave.id, 'rejected')}
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => handleEditLeave(leave)}
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteLeave(leave.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Confirm Delete Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this leave request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteLeave}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffLeaveManager;
