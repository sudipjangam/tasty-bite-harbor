
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInMinutes, parse } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, AlertTriangle, CheckCircle2, Timer, Sunrise, Sunset, Moon } from "lucide-react";
import type { StaffMember, StaffTimeClockEntry } from "@/types/staff";

interface TimeClockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffId?: string;
  restaurantId: string | null;
  onSuccess: () => void;
}

type ClockInStatus = 'early' | 'on_time' | 'late' | 'no_shift';

interface ShiftInfo {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
  grace_period_minutes: number;
}

const TimeClockDialog: React.FC<TimeClockDialogProps> = ({
  isOpen,
  onClose,
  staffId,
  restaurantId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [action, setAction] = useState<"in" | "out">("in");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update the clock time every second
  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  // Fetch staff list if no specific staff is provided
  const { data: staffMembers = [] } = useQuery<StaffMember[]>({
    queryKey: ["staff-for-timeclock", restaurantId],
    enabled: !!restaurantId && !staffId && isOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, first_name, last_name, position")
        .eq("restaurant_id", restaurantId)
        .eq("status", "active");

      if (error) throw error;
      return data as StaffMember[];
    },
  });

  // Fetch today's shift assignment for the staff member
  const effectiveStaffId = selectedStaffId || staffId;
  const dayOfWeek = currentTime.getDay(); // 0 = Sunday, 6 = Saturday

  const { data: todayShift } = useQuery<ShiftInfo | null>({
    queryKey: ["staff-today-shift", effectiveStaffId, dayOfWeek],
    enabled: !!effectiveStaffId && !!restaurantId && isOpen,
    queryFn: async () => {
      const today = format(currentTime, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('staff_shift_assignments')
        .select(`
          shift_id,
          shifts!inner(
            id,
            name,
            start_time,
            end_time,
            color,
            grace_period_minutes
          )
        `)
        .eq('staff_id', effectiveStaffId)
        .eq('restaurant_id', restaurantId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .lte('effective_from', today)
        .or(`effective_until.is.null,effective_until.gte.${today}`)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No shift assigned
        console.error('Error fetching shift:', error);
        return null;
      }

      return data?.shifts as ShiftInfo || null;
    },
  });

  // Calculate clock-in status based on shift
  const clockInValidation = useMemo(() => {
    if (!todayShift) {
      return {
        status: 'no_shift' as ClockInStatus,
        message: 'No shift assigned for today',
        minutesVariance: 0,
        color: 'gray'
      };
    }

    const now = currentTime;
    const todayDate = format(now, 'yyyy-MM-dd');
    const shiftStartTime = parse(`${todayDate} ${todayShift.start_time}`, 'yyyy-MM-dd HH:mm:ss', new Date());
    const gracePeriod = todayShift.grace_period_minutes || 15;
    
    const minutesFromShiftStart = differenceInMinutes(now, shiftStartTime);
    
    if (minutesFromShiftStart < -gracePeriod) {
      // Too early (more than grace period before shift)
      return {
        status: 'early' as ClockInStatus,
        message: `${Math.abs(minutesFromShiftStart)} min early`,
        minutesVariance: minutesFromShiftStart,
        color: 'blue'
      };
    } else if (minutesFromShiftStart <= gracePeriod) {
      // On time (within grace period)
      return {
        status: 'on_time' as ClockInStatus,
        message: 'On time',
        minutesVariance: minutesFromShiftStart,
        color: 'green'
      };
    } else {
      // Late (after grace period)
      return {
        status: 'late' as ClockInStatus,
        message: `${minutesFromShiftStart} min late`,
        minutesVariance: minutesFromShiftStart,
        color: 'red'
      };
    }
  }, [todayShift, currentTime]);

  // Get current time clock status for the staff member
  const { data: activeSession, refetch: refetchActiveSession } = useQuery<StaffTimeClockEntry | null>({
    queryKey: ["staff-active-session", selectedStaffId || staffId],
    enabled: !!(selectedStaffId || staffId) && isOpen,
    queryFn: async () => {
      const staffToCheck = selectedStaffId || staffId;
      
      const { data, error } = await supabase
        .from("staff_time_clock")
        .select("*")
        .eq("staff_id", staffToCheck)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data && data.length > 0 ? data[0] as StaffTimeClockEntry : null;
    },
  });

  // Set default action based on active session
  useEffect(() => {
    if (activeSession) {
      setAction("out");
    } else {
      setAction("in");
    }
  }, [activeSession]);

  // Set selected staff ID if provided
  useEffect(() => {
    if (staffId) {
      setSelectedStaffId(staffId);
    } else {
      setSelectedStaffId("");
    }
  }, [staffId, isOpen]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setNotes("");
    }
  }, [isOpen]);

  // Get shift icon based on time
  const getShiftIcon = (shiftName: string) => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning')) return <Sunrise className="h-4 w-4" />;
    if (name.includes('evening')) return <Sunset className="h-4 w-4" />;
    if (name.includes('night')) return <Moon className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const staffToUse = selectedStaffId || staffId;
    
    if (!staffToUse) {
      toast({
        title: "Staff required",
        description: "Please select a staff member.",
        variant: "destructive",
      });
      return;
    }

    if (!restaurantId) {
      toast({
        title: "Restaurant not found",
        description: "Could not determine restaurant ID.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (action === "in") {
        // Check if there's already an active session
        const { data: activeSessions } = await supabase
          .from("staff_time_clock")
          .select("*")
          .eq("staff_id", staffToUse)
          .is("clock_out", null)
          .limit(1);

        if (activeSessions && activeSessions.length > 0) {
          throw new Error("You already have an active clock-in session");
        }

        // Create clock-in record with shift validation data
        const clockInData: any = {
          staff_id: staffToUse,
          restaurant_id: restaurantId,
          clock_in: new Date().toISOString(),
          notes,
          clock_in_status: clockInValidation.status,
          minutes_variance: clockInValidation.minutesVariance,
        };

        // Add shift_id if a shift is assigned
        if (todayShift?.id) {
          clockInData.shift_id = todayShift.id;
        }

        const { error } = await supabase
          .from("staff_time_clock")
          .insert([clockInData]);

        if (error) {
          throw new Error(`Error clocking in: ${error.message}`);
        }

        // Update staff status to indicate they're working
        await supabase
          .from("staff")
          .update({ status: "working" })
          .eq("id", staffToUse);

        // Show appropriate toast based on clock-in status
        const statusMessages: Record<ClockInStatus, string> = {
          early: "You're early! Great job!",
          on_time: "Right on time! Have a great shift!",
          late: `You're ${clockInValidation.minutesVariance} minutes late. Please try to be on time.`,
          no_shift: "Clocked in successfully (no shift assigned for today)."
        };

        toast({
          title: `Clock in successful`,
          description: statusMessages[clockInValidation.status],
          variant: clockInValidation.status === 'late' ? 'destructive' : 'default',
        });

      } else if (action === "out") {
        // Find the active session to clock out
        const { data: activeSessions } = await supabase
          .from("staff_time_clock")
          .select("*")
          .eq("staff_id", staffToUse)
          .is("clock_out", null)
          .order("clock_in", { ascending: false })
          .limit(1);

        if (!activeSessions || activeSessions.length === 0) {
          throw new Error("No active clock-in session found to clock out from");
        }

        const activeSession = activeSessions[0];
        
        // Update the session with clock-out time
        const { error } = await supabase
          .from("staff_time_clock")
          .update({
            clock_out: new Date().toISOString(),
            notes: notes ? `${activeSession.notes || ''} ${notes}`.trim() : activeSession.notes
          })
          .eq("id", activeSession.id);

        if (error) {
          throw new Error(`Error clocking out: ${error.message}`);
        }

        // Reset staff status back to active
        await supabase
          .from("staff")
          .update({ status: "active" })
          .eq("id", staffToUse);

        toast({
          title: `Clock out successful`,
          description: `Staff member has been clocked out successfully.`,
        });
      }

      setNotes('');
      onSuccess();
      onClose();
      refetchActiveSession();

    } catch (error: any) {
      toast({
        title: `Clock ${action} failed`,
        description: error.message || `Failed to record clock ${action}.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Clock {action.charAt(0).toUpperCase() + action.slice(1)}
          </DialogTitle>
          <DialogDescription>
            {action === "in" 
              ? "Record the start of your work shift."
              : "Record the end of your work shift."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Only show staff selection if no specific staff is provided */}
          {!staffId && (
            <div>
              <Label htmlFor="staffId">Staff Member</Label>
              <Select
                value={selectedStaffId}
                onValueChange={(value) => {
                  setSelectedStaffId(value);
                  // Refetch active session for newly selected staff
                  setTimeout(() => refetchActiveSession(), 100);
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Today's Shift Info */}
          {action === "in" && effectiveStaffId && (
            <div className={`p-3 rounded-lg border ${
              clockInValidation.status === 'late' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
              clockInValidation.status === 'early' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
              clockInValidation.status === 'on_time' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
              'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'
            }`}>
              {todayShift ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getShiftIcon(todayShift.name)}
                      <span className="font-medium">{todayShift.name} Shift</span>
                    </div>
                    <Badge 
                      className="text-xs text-white"
                      style={{ backgroundColor: todayShift.color || '#3B82F6' }}
                    >
                      {todayShift.start_time.slice(0, 5)} - {todayShift.end_time.slice(0, 5)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {clockInValidation.status === 'on_time' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    {clockInValidation.status === 'late' && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    {clockInValidation.status === 'early' && (
                      <Timer className="h-4 w-4 text-blue-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      clockInValidation.status === 'on_time' ? 'text-green-700 dark:text-green-400' :
                      clockInValidation.status === 'late' ? 'text-red-700 dark:text-red-400' :
                      'text-blue-700 dark:text-blue-400'
                    }`}>
                      {clockInValidation.message}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Timer className="h-4 w-4" />
                  <span className="text-sm">No shift assigned for today</span>
                </div>
              )}
            </div>
          )}

          {/* Action selection (clock in/out) */}
          <div>
            <Label htmlFor="action">Action</Label>
            <div className="flex gap-4 pt-2">
              <Button
                type="button"
                variant={action === "in" ? "default" : "outline"}
                className={`flex-1 ${action === "in" ? "" : "text-muted-foreground"} ${activeSession ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => setAction("in")}
                disabled={!!activeSession}
              >
                Clock In
              </Button>
              <Button
                type="button"
                variant={action === "out" ? "default" : "outline"}
                className={`flex-1 ${action === "out" ? "" : "text-muted-foreground"} ${!activeSession ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => setAction("out")}
                disabled={!activeSession}
              >
                Clock Out
              </Button>
            </div>
          </div>
          
          {/* Current time */}
          <div className="py-2 flex items-center justify-center gap-2 bg-muted/50 rounded-md">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-medium">
              {format(currentTime, "h:mm:ss a")}
            </span>
            <span className="text-sm text-muted-foreground">
              {format(currentTime, "MMMM do, yyyy")}
            </span>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === "in" ? "Enter notes about starting your shift..." : "Enter notes about ending your shift..."}
              rows={3}
            />
          </div>

          {/* If there's an active session, show when it started */}
          {activeSession && action === "out" && (
            <div className="text-sm text-muted-foreground">
              <p>
                Clock in: {format(new Date(activeSession.clock_in), "MMM do, yyyy 'at' h:mm a")}
              </p>
              {activeSession.notes && (
                <p className="mt-1">
                  Notes: {activeSession.notes}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={
                action === 'in' && clockInValidation.status === 'late' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : ''
              }
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-1">●</span> 
                  {action === "in" ? "Clocking in..." : "Clocking out..."}
                </>
              ) : (
                `Clock ${action.charAt(0).toUpperCase() + action.slice(1)}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TimeClockDialog;
