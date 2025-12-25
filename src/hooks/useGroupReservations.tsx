import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

export interface GroupReservation {
  id: string;
  group_id: string;
  group_name: string;
  room_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
  is_master_folio: boolean;
  rooms?: { id: string; name: string; price: number; capacity: number };
}

export interface GroupDetails {
  groupName: string;
  organizerName: string;
  organizerPhone: string;
  organizerEmail: string;
  companyName?: string;
  checkInDate: Date;
  checkOutDate: Date;
  notes?: string;
}

export interface RoomSelection {
  roomId: string;
  roomName: string;
  price: number;
  capacity: number;
  guestName?: string;
}

export const useGroupReservations = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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

  // Fetch available rooms for a date range
  const fetchAvailableRooms = async (checkInDate: Date, checkOutDate: Date) => {
    if (!restaurantId) return [];

    try {
      // Get all rooms
      const { data: allRooms, error: roomsError } = await supabase
        .from("rooms")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (roomsError) throw roomsError;

      // Get reservations that overlap with the date range
      const { data: reservations, error: resError } = await supabase
        .from("reservations")
        .select("room_id")
        .eq("restaurant_id", restaurantId)
        .not("status", "in", '("cancelled","checked_out")')
        .or(
          `and(start_time.lte.${checkOutDate.toISOString()},end_time.gte.${checkInDate.toISOString()})`
        );

      if (resError) throw resError;

      // Filter out occupied rooms
      const occupiedRoomIds = new Set(
        reservations?.map((r) => r.room_id) || []
      );
      const availableRooms = (allRooms || []).filter(
        (room) => !occupiedRoomIds.has(room.id) && room.status !== "maintenance"
      );

      return availableRooms;
    } catch (error) {
      console.error("Error fetching available rooms:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch available rooms",
      });
      return [];
    }
  };

  // Create a group reservation
  const createGroupReservation = async (
    groupDetails: GroupDetails,
    selectedRooms: RoomSelection[]
  ) => {
    if (!restaurantId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No restaurant ID available",
      });
      return false;
    }

    if (selectedRooms.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one room",
      });
      return false;
    }

    setLoading(true);

    try {
      const groupId = uuidv4();

      // Create reservations for each room
      const reservations = selectedRooms.map((room, index) => ({
        restaurant_id: restaurantId,
        room_id: room.roomId,
        customer_name: room.guestName || groupDetails.organizerName,
        customer_phone: groupDetails.organizerPhone,
        customer_email: groupDetails.organizerEmail || null,
        start_time: groupDetails.checkInDate.toISOString(),
        end_time: groupDetails.checkOutDate.toISOString(),
        status: "confirmed",
        notes: groupDetails.notes || `Group: ${groupDetails.groupName}`,
        group_id: groupId,
        group_name: groupDetails.groupName,
        is_master_folio: index === 0, // First room is master folio
      }));

      const { error: insertError } = await supabase
        .from("reservations")
        .insert(reservations);

      if (insertError) throw insertError;

      // Update room statuses to occupied
      const roomIds = selectedRooms.map((r) => r.roomId);
      const { error: updateError } = await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .in("id", roomIds);

      if (updateError) throw updateError;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room-reservations"] });

      toast({
        title: "Group Reservation Created",
        description: `Successfully booked ${selectedRooms.length} rooms for "${groupDetails.groupName}"`,
      });

      return true;
    } catch (error) {
      console.error("Error creating group reservation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create group reservation",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fetch group details by group_id
  const fetchGroupDetails = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select(
          `
          *,
          rooms(id, name, price, capacity)
        `
        )
        .eq("group_id", groupId)
        .order("is_master_folio", { ascending: false });

      if (error) throw error;
      return data as GroupReservation[];
    } catch (error) {
      console.error("Error fetching group details:", error);
      return [];
    }
  };

  // Get group info for a room
  const getGroupInfoForRoom = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("group_id, group_name")
        .eq("room_id", roomId)
        .eq("status", "confirmed")
        .not("group_id", "is", null)
        .single();

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  };

  // Checkout entire group
  const checkoutGroup = async (groupId: string) => {
    setLoading(true);

    try {
      // Get all reservations in the group
      const { data: reservations, error: fetchError } = await supabase
        .from("reservations")
        .select("id, room_id")
        .eq("group_id", groupId)
        .eq("status", "confirmed");

      if (fetchError) throw fetchError;
      if (!reservations || reservations.length === 0) {
        throw new Error("No active reservations found in this group");
      }

      // Update all reservations to checked_out
      const { error: updateError } = await supabase
        .from("reservations")
        .update({ status: "checked_out" })
        .eq("group_id", groupId);

      if (updateError) throw updateError;

      // Update all room statuses
      const roomIds = reservations.map((r) => r.room_id);
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "cleaning" })
        .in("id", roomIds);

      if (roomError) throw roomError;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room-reservations"] });

      toast({
        title: "Group Checkout Complete",
        description: `Successfully checked out ${reservations.length} rooms`,
      });

      return true;
    } catch (error) {
      console.error("Error during group checkout:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to checkout group",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    restaurantId,
    loading,
    fetchAvailableRooms,
    createGroupReservation,
    fetchGroupDetails,
    getGroupInfoForRoom,
    checkoutGroup,
  };
};
