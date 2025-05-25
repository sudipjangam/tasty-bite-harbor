
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { format, parseISO, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import LeaveRequestDialog from "./LeaveRequestDialog";
import type { StaffLeaveRequest, StaffMember } from "@/types/staff";

interface StaffLeaveManagerProps {
  // Optional restaurantId - will be fetched if not provided
}

const StaffLeaveManager: React.FC<StaffLeaveManagerProps> = () => {
  const [isLeaveRequestDialogOpen, setIsLeaveRequestDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<StaffLeaveRequest | null>(null);
  const { toast } = useToast();

  // Get restaurant ID from the profile
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

  // Fetch staff members - Fix: correctly type the returned data
  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ["staff", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, first_name, last_name, restaurant_id, created_at, updated_at")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data as StaffMember[];
    },
  });

  // Fetch all leave requests
  const { 
    data: leaveRequests = [], 
    refetch: refetchLeaveRequests 
  } = useQuery<StaffLeaveRequest[]>({
    queryKey: ["staff-leave-requests", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_leave_requests")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as StaffLeaveRequest[];
    },
  });

  // Handle leave request status change
  const handleStatusChange = async (leaveId: string, newStatus: "approved" | "denied", comments?: string) => {
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { error } = await supabase
        .from("staff_leave_requests")
        .update({ 
          status: newStatus, 
          approved_by: profile.user.id, 
          manager_comments: comments || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", leaveId);

      if (error) throw error;

      // If approved, update leave balance
      if (newStatus === "approved") {
        const leave = leaveRequests.find(l => l.id === leaveId);
        if (leave) {
          const days = differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1;
          
          // Get current balance
          const { data: balances } = await supabase
            .from("staff_leave_balances")
            .select("*")
            .eq("staff_id", leave.staff_id)
            .eq("leave_type", leave.leave_type);
          
          if (balances && balances.length > 0) {
            const balance = balances[0];
            await supabase
              .from("staff_leave_balances")
              .update({ 
                used_days: balance.used_days + days,
                updated_at: new Date().toISOString()
              })
              .eq("id", balance.id);
          }
        }
      }

      toast({
        title: `Leave request ${newStatus}`,
        description: newStatus === "approved" ? 
          "The leave request has been approved." : 
          "The leave request has been denied.",
      });
      
      refetchLeaveRequests();
      
    } catch (error: any) {
      console.error("Error updating leave status:", error);
      toast({
        title: "Error",
        description: `Failed to update leave status: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : "Unknown Staff";
  };

  const getLeaveDuration = (start: string, end: string) => {
    const days = differenceInDays(new Date(end), new Date(start)) + 1;
    return days === 1 ? "1 day" : `${days} days`;
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    denied: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Leave Requests</h2>
        <Button 
          onClick={() => {
            setSelectedLeave(null);
            setIsLeaveRequestDialogOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New Leave Request
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-lg">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leaveRequests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No leave requests found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{getStaffName(leave.staff_id)}</TableCell>
                      <TableCell>{leave.leave_type}</TableCell>
                      <TableCell>
                        {format(parseISO(leave.start_date), "MMM d, yyyy")} - {format(parseISO(leave.end_date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{getLeaveDuration(leave.start_date, leave.end_date)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[leave.status as keyof typeof statusColors]}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{leave.reason || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedLeave(leave);
                              setIsLeaveRequestDialogOpen(true);
                            }}
                            title="View Details"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {leave.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleStatusChange(leave.id, "approved")}
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleStatusChange(leave.id, "denied")}
                                title="Deny"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <LeaveRequestDialog
        isOpen={isLeaveRequestDialogOpen}
        onClose={() => setIsLeaveRequestDialogOpen(false)}
        leave={selectedLeave}
        restaurantId={restaurantId || ""}
        staffOptions={staff}
        onSuccess={() => {
          refetchLeaveRequests();
          setIsLeaveRequestDialogOpen(false);
        }}
      />
    </div>
  );
};

export default StaffLeaveManager;
