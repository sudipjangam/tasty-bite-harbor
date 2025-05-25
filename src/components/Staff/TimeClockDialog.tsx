
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock } from "lucide-react";
import type { StaffMember, StaffTimeClockEntry } from "@/types/staff";

interface TimeClockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  staffId?: string;
  restaurantId: string | null;
  onSuccess: () => void;
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
      // Direct interaction with Supabase instead of the Edge function that's causing issues
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

        // Create clock-in record
        const { error } = await supabase
          .from("staff_time_clock")
          .insert([{
            staff_id: staffToUse,
            restaurant_id: restaurantId,
            clock_in: new Date().toISOString(),
            notes
          }]);

        if (error) {
          throw new Error(`Error clocking in: ${error.message}`);
        }

        // Update staff status to indicate they're working
        await supabase
          .from("staff")
          .update({ status: "working" })
          .eq("id", staffToUse);

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
      }

      toast({
        title: `Clock ${action} successful`,
        description: `Staff member has been clocked ${action} successfully.`,
      });

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Clock {action.charAt(0).toUpperCase() + action.slice(1)}
          </DialogTitle>
          <DialogDescription>
            {action === "in" 
              ? "Record the start of a work shift."
              : "Record the end of a work shift."}
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
            <Button type="submit" disabled={isSubmitting}>
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
