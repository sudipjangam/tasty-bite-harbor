
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, addDays, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { StaffLeaveRequest, StaffMember, StaffLeaveType, StaffLeaveBalance } from "@/types/staff";

interface LeaveRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leave?: StaffLeaveRequest | null;
  restaurantId: string;
  staffOptions?: StaffMember[];
  staff_id?: string; // Optional staff ID if pre-selected
  onSuccess: () => void;
}

const LeaveRequestDialog: React.FC<LeaveRequestDialogProps> = ({
  isOpen,
  onClose,
  leave,
  restaurantId,
  staffOptions = [],
  staff_id,
  onSuccess,
}) => {
  const isEditMode = !!leave;
  const { toast } = useToast();
  
  // Form state
  const [staffId, setStaffId] = useState<string>("");
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [reason, setReason] = useState<string>("");

  // Get all leave types
  const { data: leaveTypes = [] } = useQuery<StaffLeaveType[]>({
    queryKey: ["staff-leave-types", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_leave_types")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return data as StaffLeaveType[];
    },
  });

  // Fetch staff member leave balances when staff and leave type are selected
  const { data: leaveBalance } = useQuery<StaffLeaveBalance | null>({
    queryKey: ["staff-leave-balance", staffId, leaveType],
    enabled: !!(staffId && leaveType),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_leave_balances")
        .select("*")
        .eq("staff_id", staffId)
        .eq("leave_type", leaveType)
        .maybeSingle();

      if (error) throw error;
      return data as StaffLeaveBalance;
    },
  });

  // Set form values when editing an existing leave request or when staff_id is provided
  useEffect(() => {
    if (leave) {
      setStaffId(leave.staff_id);
      setLeaveType(leave.leave_type);
      setStartDate(leave.start_date);
      setEndDate(leave.end_date);
      setReason(leave.reason || "");
    } else {
      // If staff_id is provided, use it
      if (staff_id) {
        setStaffId(staff_id);
      } else {
        setStaffId(staffOptions.length > 0 ? staffOptions[0].id : "");
      }
      setLeaveType(leaveTypes.length > 0 ? leaveTypes[0].name : "");
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setEndDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
      setReason("");
    }
  }, [leave, isOpen, staffOptions, leaveTypes, staff_id]);

  // Save leave request mutation
  const saveLeaveRequestMutation = useMutation({
    mutationFn: async (leaveData: Partial<StaffLeaveRequest>) => {
      try {
        if (isEditMode && leave) {
          // Update existing leave request
          const { error } = await supabase
            .from("staff_leave_requests")
            .update(leaveData)
            .eq("id", leave.id);
          
          if (error) throw error;
        } else {
          // Add new leave request - Fix: passing a single object, not an array
          const { error } = await supabase
            .from("staff_leave_requests")
            .insert({
              staff_id: leaveData.staff_id || "", 
              leave_type: leaveData.leave_type || "",
              start_date: leaveData.start_date || "",
              end_date: leaveData.end_date || "",
              reason: leaveData.reason,
              status: "pending",
              restaurant_id: restaurantId
            });
          
          if (error) throw error;
        }
        
        return { success: true };
      } catch (error: any) {
        console.error("Error saving leave request:", error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Leave request updated" : "Leave request submitted",
        description: isEditMode
          ? "Leave request has been updated successfully."
          : "New leave request has been submitted successfully.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to save leave request: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!staffId || !leaveType || !startDate || !endDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid date range",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    // Calculate duration
    const daysDiff = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
    
    // Check if leave balance is sufficient
    if (leaveBalance && (leaveBalance.total_days - leaveBalance.used_days < daysDiff)) {
      toast({
        title: "Insufficient leave balance",
        description: `You only have ${leaveBalance.total_days - leaveBalance.used_days} days available for this leave type.`,
        variant: "destructive",
      });
      return;
    }
    
    const leaveData: Partial<StaffLeaveRequest> = {
      staff_id: staffId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
      status: "pending"
    };
    
    saveLeaveRequestMutation.mutate(leaveData);
  };

  const getRemainingBalance = () => {
    if (!leaveBalance) return null;
    const remaining = leaveBalance.total_days - leaveBalance.used_days;
    return (
      <div className="text-sm text-muted-foreground">
        Available balance: <span className={remaining <= 0 ? "text-red-500" : "text-green-500"}>
          {remaining} days
        </span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Leave Request" : "Request Leave"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your leave request."
              : "Submit a new leave request."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="staffId">Staff Member</Label>
            <Select 
              value={staffId} 
              onValueChange={setStaffId} 
              disabled={isEditMode || staffOptions.length === 0 || !!staff_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.first_name} {staff.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="leaveType">Leave Type</Label>
            <Select 
              value={leaveType} 
              onValueChange={setLeaveType}
              disabled={leaveTypes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getRemainingBalance()}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                disabled={isEditMode && leave?.status !== "pending"}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                disabled={isEditMode && leave?.status !== "pending"}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for your leave request..."
              rows={3}
              disabled={isEditMode && leave?.status !== "pending"}
            />
          </div>

          {/* Show current status if editing */}
          {isEditMode && leave && (
            <div className="text-sm">
              <div>Status: <span className="font-medium">{leave.status}</span></div>
              {leave.status !== "pending" && leave.approved_by && (
                <div>Reviewed by: {leave.approved_by}</div>
              )}
              {leave.manager_comments && (
                <div>Manager comments: {leave.manager_comments}</div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            {(!isEditMode || (isEditMode && leave?.status === "pending")) && (
              <Button 
                type="submit" 
                disabled={saveLeaveRequestMutation.isPending}
              >
                {saveLeaveRequestMutation.isPending ? (
                  <>
                    <span className="animate-spin mr-1">●</span> 
                    Submitting...
                  </>
                ) : (
                  isEditMode ? "Update Request" : "Submit Request"
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestDialog;
