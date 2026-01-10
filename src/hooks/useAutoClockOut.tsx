import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { differenceInMinutes, parse, format } from "date-fns";
import type { StaffTimeClockEntry } from "@/types/staff";

interface ShiftWithAutoClockOut {
  id: string;
  end_time: string;
  auto_clock_out_minutes: number;
}

/**
 * Custom hook that automatically clocks out staff members when:
 * 1. Their shift ends + auto_clock_out_minutes threshold is exceeded
 * 2. They've been clocked in for more than 16 hours (max shift duration)
 *
 * This runs while the app is open. Backend Edge Function handles cleanup
 * when app is closed.
 */
export const useAutoClockOut = (
  staffId: string | undefined,
  activeClockEntry: StaffTimeClockEntry | null,
  restaurantId: string | null
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Maximum shift duration in hours (safety limit)
  const MAX_SHIFT_HOURS = 16;

  // Fetch today's assigned shift with auto_clock_out_minutes
  const { data: todayShift } = useQuery<ShiftWithAutoClockOut | null>({
    queryKey: ["staff-auto-clock-shift", staffId],
    enabled: !!staffId && !!activeClockEntry && !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      if (!staffId || !restaurantId) return null;

      const dayOfWeek = new Date().getDay();
      const today = format(new Date(), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("staff_shift_assignments")
        .select(
          `
          shift_id,
          shifts!inner(
            id, end_time, auto_clock_out_minutes
          )
        `
        )
        .eq("staff_id", staffId)
        .eq("restaurant_id", restaurantId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true)
        .lte("effective_from", today)
        .or(`effective_until.is.null,effective_until.gte.${today}`)
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const shift = data.shifts as unknown as ShiftWithAutoClockOut;
      return shift || null;
    },
  });

  // Auto clock-out function
  const performAutoClockOut = useCallback(
    async (reason: string) => {
      if (!activeClockEntry || !staffId) return;

      try {
        const { error } = await supabase
          .from("staff_time_clock")
          .update({
            clock_out: new Date().toISOString(),
            notes: `${activeClockEntry.notes || ""} [${reason}]`.trim(),
          })
          .eq("id", activeClockEntry.id);

        if (error) throw error;

        // Update staff status
        await supabase
          .from("staff")
          .update({ status: "active" })
          .eq("id", staffId);

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ["staff-active-clock"] });
        queryClient.invalidateQueries({
          queryKey: ["staff-recent-time-entries"],
        });

        toast({
          title: "⏰ Auto Clock-Out",
          description: reason,
          variant: "default",
        });
      } catch (error) {
        console.error("Auto clock-out failed:", error);
      }
    },
    [activeClockEntry, staffId, queryClient, toast]
  );

  // Check for auto clock-out conditions
  useEffect(() => {
    if (!activeClockEntry || !staffId) return;

    const checkAutoClockOut = () => {
      const now = new Date();
      const clockInTime = new Date(activeClockEntry.clock_in);

      // Check 1: Max shift duration exceeded (16 hours safety limit)
      const hoursWorked = differenceInMinutes(now, clockInTime) / 60;
      if (hoursWorked >= MAX_SHIFT_HOURS) {
        performAutoClockOut(
          `System auto clock-out: Exceeded ${MAX_SHIFT_HOURS}h max shift duration`
        );
        return;
      }

      // Check 2: Past shift end + auto_clock_out_minutes threshold
      if (todayShift) {
        const todayDate = format(now, "yyyy-MM-dd");
        const shiftEndTime = parse(
          `${todayDate} ${todayShift.end_time}`,
          "yyyy-MM-dd HH:mm:ss",
          new Date()
        );

        const minutesPastEnd = differenceInMinutes(now, shiftEndTime);
        const autoClockOutThreshold = todayShift.auto_clock_out_minutes || 120;

        if (minutesPastEnd >= autoClockOutThreshold) {
          performAutoClockOut(
            `Auto clock-out: ${autoClockOutThreshold} min after shift end`
          );
        }
      }
    };

    // Check immediately
    checkAutoClockOut();

    // Then check every minute
    const interval = setInterval(checkAutoClockOut, 60000);

    return () => clearInterval(interval);
  }, [activeClockEntry, staffId, todayShift, performAutoClockOut]);

  // Return shift info for UI display if needed
  return {
    todayShift,
    maxShiftHours: MAX_SHIFT_HOURS,
  };
};
