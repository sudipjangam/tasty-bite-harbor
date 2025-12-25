import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay } from "date-fns";

export interface NightAuditLog {
  id: string;
  restaurant_id: string;
  audit_date: string;
  status: "pending" | "in_progress" | "completed";
  total_revenue: number;
  room_revenue: number;
  food_revenue: number;
  other_revenue: number;
  rooms_charged: number;
  total_check_ins: number;
  total_check_outs: number;
  discrepancies: any[];
  notes: string | null;
  performed_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AuditSummary {
  occupiedRooms: number;
  totalRooms: number;
  expectedCheckouts: number;
  expectedArrivals: number;
  unpaidFolios: number;
  openCharges: number;
  todayRevenue: number;
  roomRevenue: number;
  foodRevenue: number;
}

export const useNightAudit = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch restaurant ID
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", user.id)
          .single();

        if (profile?.restaurant_id) {
          setRestaurantId(profile.restaurant_id);
        }
      } catch (error) {
        console.error("Error fetching restaurant ID:", error);
      }
    };

    fetchRestaurantId();
  }, []);

  // Fetch today's audit status
  const { data: todayAudit, isLoading: auditLoading } = useQuery({
    queryKey: ["night-audit-today", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const today = format(startOfDay(new Date()), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("night_audit_logs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("audit_date", today)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as NightAuditLog | null;
    },
    enabled: !!restaurantId,
  });

  // Fetch audit history
  const { data: auditHistory = [] } = useQuery({
    queryKey: ["night-audit-history", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("night_audit_logs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("audit_date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []) as NightAuditLog[];
    },
    enabled: !!restaurantId,
  });

  // Get audit summary for today
  const { data: auditSummary, refetch: refetchSummary } = useQuery({
    queryKey: ["audit-summary", restaurantId],
    queryFn: async (): Promise<AuditSummary> => {
      if (!restaurantId) {
        return {
          occupiedRooms: 0,
          totalRooms: 0,
          expectedCheckouts: 0,
          expectedArrivals: 0,
          unpaidFolios: 0,
          openCharges: 0,
          todayRevenue: 0,
          roomRevenue: 0,
          foodRevenue: 0,
        };
      }

      const today = format(startOfDay(new Date()), "yyyy-MM-dd");

      // Get room counts
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("restaurant_id", restaurantId);

      const totalRooms = rooms?.length || 0;
      const occupiedRooms =
        rooms?.filter((r) => r.status === "occupied").length || 0;

      // Get today's check-ins/outs
      const { data: checkIns } = await supabase
        .from("check_ins")
        .select(
          "id, check_in_date, expected_checkout_date, status, room_rate, total_food_charges"
        )
        .eq("restaurant_id", restaurantId);

      const expectedCheckouts =
        checkIns?.filter(
          (c) => c.expected_checkout_date === today && c.status === "checked_in"
        ).length || 0;

      // Get reservations for today
      const { data: reservations } = await supabase
        .from("reservations")
        .select("id, start_date, status")
        .eq("restaurant_id", restaurantId)
        .eq("start_date", today)
        .in("status", ["confirmed", "pending"]);

      const expectedArrivals = reservations?.length || 0;

      // Calculate revenue
      const activeCheckIns =
        checkIns?.filter((c) => c.status === "checked_in") || [];
      const roomRevenue = activeCheckIns.reduce(
        (sum, c) => sum + (c.room_rate || 0),
        0
      );
      const foodRevenue = activeCheckIns.reduce(
        (sum, c) => sum + (c.total_food_charges || 0),
        0
      );

      return {
        occupiedRooms,
        totalRooms,
        expectedCheckouts,
        expectedArrivals,
        unpaidFolios: 0, // Would need billing status check
        openCharges: 0,
        todayRevenue: roomRevenue + foodRevenue,
        roomRevenue,
        foodRevenue,
      };
    },
    enabled: !!restaurantId,
  });

  // Start night audit
  const startAuditMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("No restaurant ID");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const today = format(startOfDay(new Date()), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("night_audit_logs")
        .upsert(
          {
            restaurant_id: restaurantId,
            audit_date: today,
            status: "in_progress",
            performed_by: user?.id,
          },
          { onConflict: "restaurant_id,audit_date" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["night-audit-today"] });
      toast({
        title: "Night Audit Started",
        description: "Processing daily operations...",
      });
    },
  });

  // Complete night audit
  const completeAuditMutation = useMutation({
    mutationFn: async (summary: AuditSummary) => {
      if (!restaurantId || !todayAudit) throw new Error("No audit in progress");

      const { error } = await supabase
        .from("night_audit_logs")
        .update({
          status: "completed",
          total_revenue: summary.todayRevenue,
          room_revenue: summary.roomRevenue,
          food_revenue: summary.foodRevenue,
          rooms_charged: summary.occupiedRooms,
          total_check_ins: summary.expectedArrivals,
          total_check_outs: summary.expectedCheckouts,
          completed_at: new Date().toISOString(),
        })
        .eq("id", todayAudit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["night-audit-today"] });
      queryClient.invalidateQueries({ queryKey: ["night-audit-history"] });
      toast({
        title: "Night Audit Completed",
        description: "Day has been closed successfully",
      });
    },
  });

  // Post room charges to all occupied rooms
  const postRoomChargesMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error("No restaurant ID");

      // Get all active check-ins
      const { data: activeCheckIns, error } = await supabase
        .from("check_ins")
        .select("id, room_rate, total_room_charges")
        .eq("restaurant_id", restaurantId)
        .eq("status", "checked_in");

      if (error) throw error;

      // Update each check-in with additional night's charge
      for (const checkIn of activeCheckIns || []) {
        await supabase
          .from("check_ins")
          .update({
            total_room_charges:
              (checkIn.total_room_charges || 0) + (checkIn.room_rate || 0),
          })
          .eq("id", checkIn.id);
      }

      return activeCheckIns?.length || 0;
    },
    onSuccess: (count) => {
      toast({
        title: "Room Charges Posted",
        description: `Charged ${count} rooms for tonight's stay`,
      });
    },
  });

  return {
    restaurantId,
    todayAudit,
    auditHistory,
    auditSummary,
    auditLoading,
    refetchSummary,
    startAudit: startAuditMutation.mutate,
    isStarting: startAuditMutation.isPending,
    completeAudit: completeAuditMutation.mutate,
    isCompleting: completeAuditMutation.isPending,
    postRoomCharges: postRoomChargesMutation.mutate,
    isPostingCharges: postRoomChargesMutation.isPending,
  };
};
