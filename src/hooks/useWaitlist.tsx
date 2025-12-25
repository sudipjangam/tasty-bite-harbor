import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WaitlistEntry {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  preferred_room_type: string | null;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  status: "waiting" | "notified" | "converted" | "cancelled";
  notes: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWaitlistData {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  preferred_room_type?: string;
  check_in_date: Date;
  check_out_date: Date;
  guests_count?: number;
  notes?: string;
}

export const useWaitlist = () => {
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

  // Fetch waitlist entries
  const {
    data: waitlist = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["room-waitlist", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("room_waitlist")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("status", "waiting")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as WaitlistEntry[];
    },
    enabled: !!restaurantId,
  });

  // Add to waitlist mutation
  const addToWaitlistMutation = useMutation({
    mutationFn: async (entry: CreateWaitlistData) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      const { data, error } = await supabase
        .from("room_waitlist")
        .insert({
          restaurant_id: restaurantId,
          customer_name: entry.customer_name,
          customer_phone: entry.customer_phone,
          customer_email: entry.customer_email || null,
          preferred_room_type: entry.preferred_room_type || null,
          check_in_date: entry.check_in_date.toISOString().split("T")[0],
          check_out_date: entry.check_out_date.toISOString().split("T")[0],
          guests_count: entry.guests_count || 1,
          notes: entry.notes || null,
          status: "waiting",
          priority: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-waitlist"] });
      toast({
        title: "Added to Waitlist",
        description: "Guest has been added to the waitlist",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add to waitlist",
      });
      console.error("Waitlist error:", error);
    },
  });

  // Update waitlist status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: WaitlistEntry["status"];
    }) => {
      const { error } = await supabase
        .from("room_waitlist")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-waitlist"] });
    },
  });

  // Remove from waitlist
  const removeFromWaitlistMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("room_waitlist")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["room-waitlist"] });
      toast({
        title: "Removed",
        description: "Entry removed from waitlist",
      });
    },
  });

  // Get waitlist count for date range
  const getWaitlistCount = async (
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<number> => {
    if (!restaurantId) return 0;

    try {
      const { count, error } = await supabase
        .from("room_waitlist")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("status", "waiting")
        .lte("check_in_date", checkOutDate.toISOString().split("T")[0])
        .gte("check_out_date", checkInDate.toISOString().split("T")[0]);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error getting waitlist count:", error);
      return 0;
    }
  };

  return {
    restaurantId,
    waitlist,
    isLoading,
    refetch,
    addToWaitlist: addToWaitlistMutation.mutate,
    addToWaitlistAsync: addToWaitlistMutation.mutateAsync,
    isAdding: addToWaitlistMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    removeFromWaitlist: removeFromWaitlistMutation.mutate,
    getWaitlistCount,
  };
};
