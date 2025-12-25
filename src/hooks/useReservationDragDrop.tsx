import React from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export interface DragReservation {
  id: string;
  roomId: string;
  roomName: string;
  customerName: string;
  startDate: Date;
  endDate: Date;
}

export interface DropTarget {
  roomId: string;
  date: Date;
}

export const useReservationDragDrop = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Move a reservation to a new room or date
  const moveReservation = async (
    reservationId: string,
    newRoomId: string,
    newStartDate: Date,
    originalStartDate: Date,
    originalEndDate: Date
  ): Promise<boolean> => {
    try {
      // Calculate the duration in days
      const duration = differenceInDays(originalEndDate, originalStartDate);
      const newEndDate = addDays(newStartDate, duration);

      // Check if the new slot is available
      const { data: conflicts, error: checkError } = await supabase
        .from("reservations")
        .select("id")
        .eq("room_id", newRoomId)
        .neq("id", reservationId)
        .not("status", "in", '("cancelled","checked_out")')
        .lt("start_time", newEndDate.toISOString())
        .gt("end_time", newStartDate.toISOString());

      if (checkError) throw checkError;

      if (conflicts && conflicts.length > 0) {
        toast({
          variant: "destructive",
          title: "Conflict Detected",
          description: "This room is already booked for the selected dates",
        });
        return false;
      }

      // Update the reservation
      const { error: updateError } = await supabase
        .from("reservations")
        .update({
          room_id: newRoomId,
          start_time: newStartDate.toISOString(),
          end_time: newEndDate.toISOString(),
        })
        .eq("id", reservationId);

      if (updateError) throw updateError;

      // Invalidate queries to refresh the calendar
      queryClient.invalidateQueries({ queryKey: ["room-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["availability-calendar"] });

      toast({
        title: "Reservation Moved",
        description: `Moved to ${format(newStartDate, "MMM d")} - ${format(
          newEndDate,
          "MMM d"
        )}`,
      });

      return true;
    } catch (error) {
      console.error("Error moving reservation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to move reservation",
      });
      return false;
    }
  };

  // Extend or shorten a reservation
  const resizeReservation = async (
    reservationId: string,
    newEndDate: Date
  ): Promise<boolean> => {
    try {
      // Get current reservation
      const { data: reservation, error: fetchError } = await supabase
        .from("reservations")
        .select("room_id, start_time")
        .eq("id", reservationId)
        .single();

      if (fetchError || !reservation) throw fetchError;

      // Check for conflicts with extended dates
      const { data: conflicts, error: checkError } = await supabase
        .from("reservations")
        .select("id")
        .eq("room_id", reservation.room_id)
        .neq("id", reservationId)
        .not("status", "in", '("cancelled","checked_out")')
        .lt("start_time", newEndDate.toISOString())
        .gt("end_time", reservation.start_time);

      if (checkError) throw checkError;

      if (conflicts && conflicts.length > 0) {
        toast({
          variant: "destructive",
          title: "Conflict Detected",
          description: "Cannot extend reservation - room is booked",
        });
        return false;
      }

      // Update the reservation
      const { error: updateError } = await supabase
        .from("reservations")
        .update({ end_time: newEndDate.toISOString() })
        .eq("id", reservationId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["room-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["availability-calendar"] });

      toast({
        title: "Reservation Updated",
        description: `Extended to ${format(newEndDate, "MMM d, yyyy")}`,
      });

      return true;
    } catch (error) {
      console.error("Error resizing reservation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resize reservation",
      });
      return false;
    }
  };

  return {
    moveReservation,
    resizeReservation,
  };
};
