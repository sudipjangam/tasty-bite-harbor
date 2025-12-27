import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, addDays, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  StaffLeaveRequest,
  StaffMember,
  StaffLeaveType,
  StaffLeaveBalance,
} from "@/types/staff";

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
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [reason, setReason] = useState<string>("");

  // Default leave types to use when none are configured in DB
  const defaultLeaveTypes: StaffLeaveType[] = [
    {
      id: "default-casual",
      name: "Casual Leave",
      description: "General personal leave",
      days_per_year: 12,
      restaurant_id: restaurantId,
    },
    {
      id: "default-sick",
      name: "Sick Leave",
      description: "Medical or health-related leave",
      days_per_year: 10,
      restaurant_id: restaurantId,
    },
    {
      id: "default-earned",
      name: "Earned Leave",
      description: "Accumulated leave",
      days_per_year: 15,
      restaurant_id: restaurantId,
    },
    {
      id: "default-unpaid",
      name: "Unpaid Leave",
      description: "Leave without pay",
      days_per_year: 30,
      restaurant_id: restaurantId,
    },
  ];

  // Get all leave types
  const { data: fetchedLeaveTypes = [] } = useQuery<StaffLeaveType[]>({
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

  // Use fetched leave types, or fallback to defaults if none configured
  const leaveTypes =
    fetchedLeaveTypes.length > 0 ? fetchedLeaveTypes : defaultLeaveTypes;

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
          const { error } = await supabase.from("staff_leave_requests").insert({
            staff_id: leaveData.staff_id || "",
            leave_type: leaveData.leave_type || "",
            start_date: leaveData.start_date || "",
            end_date: leaveData.end_date || "",
            reason: leaveData.reason,
            status: "pending",
            restaurant_id: restaurantId,
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
    const daysDiff =
      differenceInDays(new Date(endDate), new Date(startDate)) + 1;

    // Check if leave balance is sufficient
    if (
      leaveBalance &&
      leaveBalance.total_days - leaveBalance.used_days < daysDiff
    ) {
      toast({
        title: "Insufficient leave balance",
        description: `You only have ${
          leaveBalance.total_days - leaveBalance.used_days
        } days available for this leave type.`,
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
      status: "pending",
    };

    saveLeaveRequestMutation.mutate(leaveData);
  };

  const getRemainingBalance = () => {
    if (!leaveBalance) return null;
    const remaining = leaveBalance.total_days - leaveBalance.used_days;
    return (
      <div className="text-sm text-muted-foreground">
        Available balance:{" "}
        <span className={remaining <= 0 ? "text-red-500" : "text-green-500"}>
          {remaining} days
        </span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Gradient Header Section */}
        <div className="relative px-6 pt-10 pb-8 text-center bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          {/* Icon */}
          <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 mb-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>

          <DialogTitle className="relative z-10 text-2xl font-bold text-white">
            {isEditMode ? "Edit Leave Request" : "Request Time Off"}
          </DialogTitle>
          <DialogDescription className="relative z-10 text-white/80 mt-1">
            Submit your leave request for approval
          </DialogDescription>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 bg-white dark:bg-gray-900"
        >
          {/* Staff Member */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Staff Member</Label>
            <Select
              value={staffId}
              onValueChange={setStaffId}
              disabled={isEditMode || staffOptions.length === 0 || !!staff_id}
            >
              <SelectTrigger className="h-12 rounded-xl border-gray-200 dark:border-gray-700">
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

          {/* Leave Type & Balance */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Leave Type</Label>
              {leaveBalance && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    leaveBalance.total_days - leaveBalance.used_days <= 0
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}
                >
                  {leaveBalance.total_days - leaveBalance.used_days} days left
                </span>
              )}
            </div>
            <Select
              value={leaveType}
              onValueChange={setLeaveType}
              disabled={leaveTypes.length === 0}
            >
              <SelectTrigger className="h-12 rounded-xl border-gray-200 dark:border-gray-700">
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
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                disabled={isEditMode && leave?.status !== "pending"}
                className="h-12 rounded-xl border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                disabled={isEditMode && leave?.status !== "pending"}
                className="h-12 rounded-xl border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          {/* Duration Preview */}
          {startDate && endDate && (
            <div className="py-4 px-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Total Duration
              </span>
              <Badge className="bg-violet-500 text-white font-bold px-3 py-1">
                {differenceInDays(new Date(endDate), new Date(startDate)) + 1}{" "}
                Days
              </Badge>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason (Optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a brief reason..."
              rows={2}
              disabled={isEditMode && leave?.status !== "pending"}
              className="resize-none rounded-xl border-gray-200 dark:border-gray-700"
            />
          </div>

          {/* Current Status (Edit Mode) */}
          {isEditMode && leave && (
            <div
              className={`p-4 rounded-xl border-2 ${
                leave.status === "approved"
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                  : leave.status === "denied"
                  ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                  : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Current Status
                </span>
                <Badge
                  className={`px-3 py-1 font-semibold ${
                    leave.status === "approved"
                      ? "bg-emerald-500 text-white"
                      : leave.status === "denied"
                      ? "bg-red-500 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {leave.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border-2 font-semibold"
            >
              Cancel
            </Button>
            {(!isEditMode || (isEditMode && leave?.status === "pending")) && (
              <Button
                type="submit"
                disabled={saveLeaveRequestMutation.isPending}
                className="flex-[2] h-12 rounded-xl font-bold text-base shadow-lg bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {saveLeaveRequestMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : isEditMode ? (
                  "Update Request"
                ) : (
                  "Submit Request"
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestDialog;
