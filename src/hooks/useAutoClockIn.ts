import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseAutoClockInProps {
  isLoadingStaff: boolean;
  isStaff: boolean;
  staff: any;
  activeClockEntry: any;
  hasCompletedShiftToday: boolean;
  restaurantId: string | null;
  refetchTimeEntries: () => void;
}

export const useAutoClockIn = ({
  isLoadingStaff,
  isStaff,
  staff,
  activeClockEntry,
  hasCompletedShiftToday,
  restaurantId,
  refetchTimeEntries,
}: UseAutoClockInProps) => {
  const { toast } = useToast();

  useEffect(() => {
    const autoClockInStaff = async () => {
      if (
        !isLoadingStaff &&
        isStaff &&
        staff &&
        !activeClockEntry &&
        !hasCompletedShiftToday &&
        restaurantId
      ) {
        // Use a generic session flag instead of client-side local date string to avoid timezone issues.
        const autoClockedKey = `auto-clocked-in-${staff.id}`;

        if (!sessionStorage.getItem(autoClockedKey)) {
          try {
            // Mark as attempted to prevent duplicate calls
            sessionStorage.setItem(autoClockedKey, "true");

            // Check if already clocked in to prevent race conditions
            const { data: activeSessions, error: sessionError } = await supabase
              .from("staff_time_clock")
              .select("*")
              .eq("staff_id", staff.id)
              .is("clock_out", null)
              .limit(1);

            if (sessionError) throw sessionError;

            if (activeSessions && activeSessions.length > 0) {
              return; // Already clocked in
            }

            // Create clock-in record
            const { error: insertError } = await supabase.from("staff_time_clock").insert([
              {
                staff_id: staff.id,
                restaurant_id: restaurantId,
                clock_in: new Date().toISOString(),
                notes: "Auto clock-in on login",
                clock_in_status: "no_shift",
              },
            ]);

            if (insertError) throw insertError;

            // Update staff status
            const { error: updateError } = await supabase
              .from("staff")
              .update({ status: "working" })
              .eq("id", staff.id);
              
            if (updateError) throw updateError;

            toast({
              title: "✓ Shift Started",
              description: `Automatically clocked in at ${new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}. Have a great shift!`,
            });

            refetchTimeEntries();
          } catch (error: any) {
            console.error("Auto clock-in failed:", error);
            // Revert session flag so it can retry on next navigation/mount if it failed
            sessionStorage.removeItem(autoClockedKey);
            toast({
              title: "Auto Clock-in Failed",
              description: error.message || "Could not start shift automatically. Please clock in manually.",
              variant: "destructive",
            });
          }
        }
      }
    };

    autoClockInStaff();
  }, [
    isLoadingStaff,
    isStaff,
    staff,
    activeClockEntry,
    hasCompletedShiftToday,
    restaurantId,
    refetchTimeEntries,
    toast,
  ]);
};
