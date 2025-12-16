
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { StaffMember, StaffTimeClockEntry, StaffLeaveBalance, StaffLeaveRequest } from "@/types/staff";

interface CurrentStaffData {
  staff: StaffMember | null;
  isLoading: boolean;
  isStaff: boolean;
  activeClockEntry: StaffTimeClockEntry | null;
  recentTimeEntries: StaffTimeClockEntry[];
  leaveBalances: StaffLeaveBalance[];
  upcomingLeave: StaffLeaveRequest[];
  refetch: () => void;
  refetchTimeEntries: () => void;
  refetchLeaveData: () => void;
}

/**
 * Custom hook to fetch the logged-in user's staff record
 * Matches the auth user's email to the staff.email field
 * Also fetches related data like time clock entries and leave information
 */
export const useCurrentStaff = (): CurrentStaffData => {
  const { user } = useAuth();

  // Fetch the staff record for the current user by matching email
  const { 
    data: staff = null, 
    isLoading: isLoadingStaff, 
    refetch 
  } = useQuery<StaffMember | null>({
    queryKey: ["current-staff", user?.email],
    enabled: !!user?.email && !!user?.restaurant_id,
    queryFn: async () => {
      if (!user?.email || !user?.restaurant_id) {
        return null;
      }

      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("email", user.email)
        .eq("restaurant_id", user.restaurant_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching staff record:", error);
        return null;
      }

      return data as StaffMember | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });


  // Fetch active clock entry (if currently clocked in)
  const { 
    data: activeClockEntry = null,
    refetch: refetchActive 
  } = useQuery<StaffTimeClockEntry | null>({
    queryKey: ["staff-active-clock", staff?.id],
    enabled: !!staff?.id,
    queryFn: async () => {
      if (!staff?.id) return null;

      const { data, error } = await supabase
        .from("staff_time_clock")
        .select("*")
        .eq("staff_id", staff.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching active clock entry:", error);
        return null;
      }

      return data && data.length > 0 ? (data[0] as StaffTimeClockEntry) : null;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent time clock entries (last 10)
  const { 
    data: recentTimeEntries = [],
    refetch: refetchTimeEntries 
  } = useQuery<StaffTimeClockEntry[]>({
    queryKey: ["staff-recent-time-entries", staff?.id],
    enabled: !!staff?.id,
    queryFn: async () => {
      if (!staff?.id) return [];

      const { data, error } = await supabase
        .from("staff_time_clock")
        .select("*")
        .eq("staff_id", staff.id)
        .order("clock_in", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching time entries:", error);
        return [];
      }

      return data as StaffTimeClockEntry[];
    },
  });

  // Fetch leave balances
  const { 
    data: leaveBalances = [],
    refetch: refetchLeaveBalances 
  } = useQuery<StaffLeaveBalance[]>({
    queryKey: ["staff-leave-balances", staff?.id],
    enabled: !!staff?.id,
    queryFn: async () => {
      if (!staff?.id) return [];

      const { data, error } = await supabase
        .from("staff_leave_balances")
        .select("*")
        .eq("staff_id", staff.id);

      if (error) {
        console.error("Error fetching leave balances:", error);
        return [];
      }

      return data as StaffLeaveBalance[];
    },
  });

  // Fetch upcoming/pending leave requests
  const { 
    data: upcomingLeave = [],
    refetch: refetchUpcomingLeave 
  } = useQuery<StaffLeaveRequest[]>({
    queryKey: ["staff-upcoming-leave", staff?.id],
    enabled: !!staff?.id,
    queryFn: async () => {
      if (!staff?.id) return [];

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("staff_leave_requests")
        .select("*")
        .eq("staff_id", staff.id)
        .gte("end_date", today)
        .order("start_date", { ascending: true });

      if (error) {
        console.error("Error fetching upcoming leave:", error);
        return [];
      }

      return data as StaffLeaveRequest[];
    },
  });

  const refetchLeaveData = () => {
    refetchLeaveBalances();
    refetchUpcomingLeave();
  };

  const refetchAllTimeEntries = () => {
    refetchActive();
    refetchTimeEntries();
  };

  return {
    staff,
    isLoading: isLoadingStaff,
    isStaff: !!staff,
    activeClockEntry,
    recentTimeEntries,
    leaveBalances,
    upcomingLeave,
    refetch,
    refetchTimeEntries: refetchAllTimeEntries,
    refetchLeaveData,
  };
};
