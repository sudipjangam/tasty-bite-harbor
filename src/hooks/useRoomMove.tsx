import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RoomMoveData {
  checkInId: string;
  fromRoomId: string;
  toRoomId: string;
  reason: "upgrade" | "maintenance" | "guest_request" | "other";
  rateAdjustment: number;
  isComplimentary: boolean;
  notes?: string;
}

export interface RoomMoveRecord {
  id: string;
  check_in_id: string;
  from_room_id: string;
  to_room_id: string;
  move_date: string;
  reason: string;
  rate_adjustment: number;
  is_complimentary: boolean;
  notes: string | null;
  performed_by: string | null;
}

export const useRoomMove = () => {
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

  // Move room mutation
  const moveRoomMutation = useMutation({
    mutationFn: async (data: RoomMoveData) => {
      if (!restaurantId) throw new Error("No restaurant ID");
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Create room move record
      const { error: moveError } = await supabase.from("room_moves").insert({
        restaurant_id: restaurantId,
        check_in_id: data.checkInId,
        from_room_id: data.fromRoomId,
        to_room_id: data.toRoomId,
        reason: data.reason,
        rate_adjustment: data.rateAdjustment,
        is_complimentary: data.isComplimentary,
        notes: data.notes,
        performed_by: user?.id,
      });

      if (moveError) throw moveError;

      // 2. Update check_in with new room
      const { error: checkInError } = await supabase
        .from("check_ins")
        .update({
          room_id: data.toRoomId,
          room_rate: data.isComplimentary ? undefined : undefined, // Keep rate or update
        })
        .eq("id", data.checkInId);

      if (checkInError) throw checkInError;

      // 3. Update old room status to cleaning
      const { error: oldRoomError } = await supabase
        .from("rooms")
        .update({ status: "cleaning" })
        .eq("id", data.fromRoomId);

      if (oldRoomError) throw oldRoomError;

      // 4. Update new room status to occupied
      const { error: newRoomError } = await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", data.toRoomId);

      if (newRoomError) throw newRoomError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["check-ins"] });
      toast({
        title: "Room Transfer Complete",
        description: "Guest has been moved to the new room successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Transfer Failed",
        description: "Failed to move guest to new room",
      });
      console.error("Room move error:", error);
    },
  });

  // Get available rooms for transfer
  const getAvailableRooms = async () => {
    if (!restaurantId) return [];

    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, price, capacity, status")
      .eq("restaurant_id", restaurantId)
      .eq("status", "available")
      .order("name");

    if (error) {
      console.error("Error fetching available rooms:", error);
      return [];
    }

    return data || [];
  };

  return {
    restaurantId,
    moveRoom: moveRoomMutation.mutateAsync,
    isMoving: moveRoomMutation.isPending,
    getAvailableRooms,
  };
};
