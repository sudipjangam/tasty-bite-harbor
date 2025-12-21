
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
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        
        {/* Gradient Header Section */}
        <div className={`relative px-6 pt-10 pb-8 text-center ${
          action === "in" 
            ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600" 
            : "bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600"
        }`}>
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          {/* Icon */}
          <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 mb-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-xl">
            <Clock className="w-10 h-10 text-white" />
          </div>
          
          <DialogTitle className="relative z-10 text-2xl font-bold text-white">
            {action === "in" ? "Start Your Shift" : "End Your Shift"}
          </DialogTitle>
          <DialogDescription className="relative z-10 text-white/80 mt-1">
            {format(currentTime, "EEEE, MMMM do, yyyy")}
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white dark:bg-gray-900">
          
          {/* Live Clock Display */}
          <div className={`relative py-5 rounded-xl text-center border-2 ${
            action === "in" 
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" 
              : "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
          }`}>
            <div className={`text-4xl font-black tabular-nums tracking-tight ${
              action === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}>
              {format(currentTime, "h:mm:ss")}
              <span className="text-base font-semibold ml-1 opacity-70">{format(currentTime, "a")}</span>
            </div>
          </div>

          {/* Staff Selection (if needed) */}
          {!staffId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Staff Member</Label>
              <Select
                value={selectedStaffId}
                onValueChange={(value) => {
                  setSelectedStaffId(value);
                  setTimeout(() => refetchActiveSession(), 100);
                }}
                required
              >
                <SelectTrigger className="h-12 rounded-xl border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select yourself" />
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

          {/* Shift Info (Only for Clock In) */}
          {action === "in" && effectiveStaffId && todayShift && (
            <div className={`p-4 rounded-xl border-2 ${
              clockInValidation.status === 'late' 
                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
              : clockInValidation.status === 'early' 
                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
              : clockInValidation.status === 'on_time' 
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
                : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">{todayShift.name}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {todayShift.start_time.slice(0, 5)} - {todayShift.end_time.slice(0, 5)}
                  </p>
                </div>
                <Badge className={`px-3 py-1 font-semibold ${
                  clockInValidation.status === 'late' ? 'bg-red-500 text-white' : 
                  clockInValidation.status === 'early' ? 'bg-blue-500 text-white' : 
                  clockInValidation.status === 'on_time' ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {clockInValidation.message}
                </Badge>
              </div>
            </div>
          )}

          {/* Action Toggle Buttons - Now with color! */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAction("in")}
              disabled={!!activeSession}
              className={`relative h-12 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${
                action === "in"
                  ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30"
                  : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 hover:border-emerald-300"
              } ${activeSession ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Clock In
            </button>
            <button
              type="button"
              onClick={() => setAction("out")}
              disabled={!activeSession}
              className={`relative h-12 rounded-xl font-bold text-sm transition-all duration-200 border-2 ${
                action === "out"
                  ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30"
                  : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 hover:border-rose-300"
              } ${!activeSession ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Clock Out
            </button>
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === "in" ? "Any notes for starting?" : "Handover notes..."}
              className="resize-none rounded-xl border-gray-200 dark:border-gray-700"
              rows={2}
            />
          </div>

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
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={`flex-[2] h-12 rounded-xl font-bold text-base shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] ${
                action === 'in' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-rose-500/30'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                action === "in" ? "Start Shift" : "End Shift"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TimeClockDialog;


