import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  addDays,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  format,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
} from "date-fns";

export interface Room {
  id: string;
  name: string;
  capacity: number;
  status: string;
  price: number;
  restaurant_id: string;
}

export interface Reservation {
  id: string;
  room_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled";
  notes?: string;
  rooms?: { name: string; price: number };
}

export type CellStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "cleaning"
  | "maintenance"
  | "past"
  | "checkout";

export interface CalendarCell {
  date: Date;
  room: Room;
  status: CellStatus;
  reservation?: Reservation;
  isSpanStart?: boolean;
  isSpanMiddle?: boolean;
  isSpanEnd?: boolean;
  spanLength?: number;
}

export type ViewMode = "week" | "twoWeek" | "month";

interface UseAvailabilityCalendarOptions {
  initialDate?: Date;
  initialViewMode?: ViewMode;
}

export const useAvailabilityCalendar = (
  options: UseAvailabilityCalendarOptions = {}
) => {
  const { initialDate = new Date(), initialViewMode = "twoWeek" } = options;

  const [startDate, setStartDate] = useState<Date>(startOfDay(initialDate));
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();

  // Calculate end date based on view mode
  const endDate = useMemo(() => {
    switch (viewMode) {
      case "week":
        return addDays(startDate, 6);
      case "twoWeek":
        return addDays(startDate, 13);
      case "month":
        return addDays(startDate, 29);
      default:
        return addDays(startDate, 13);
    }
  }, [startDate, viewMode]);

  // Generate array of dates for the current view
  const dates = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  // Fetch restaurant ID
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", userData.user.id)
          .single();

        if (profileData?.restaurant_id) {
          setRestaurantId(profileData.restaurant_id);
        }
      } catch (error) {
        console.error("Error fetching restaurant ID:", error);
      }
    };

    fetchRestaurantId();
  }, []);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      if (!restaurantId) return;

      try {
        const { data, error } = await supabase
          .from("rooms")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("name");

        if (error) throw error;
        setRooms(data || []);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch rooms",
        });
      }
    };

    fetchRooms();
  }, [restaurantId, toast]);

  // Fetch reservations for the date range
  useEffect(() => {
    const fetchReservations = async () => {
      if (!restaurantId) return;
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("reservations")
          .select(
            `
            *,
            rooms(name, price)
          `
          )
          .eq("restaurant_id", restaurantId)
          .gte("end_time", startDate.toISOString())
          .lte("start_time", endDate.toISOString())
          .not("status", "in", '("cancelled","checked_out")');

        if (error) throw error;
        setReservations(data || []);
      } catch (error) {
        console.error("Error fetching reservations:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch reservations",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, [restaurantId, startDate, endDate, toast]);

  // Calculate cell status for a specific room and date
  const getCellStatus = (room: Room, date: Date): CalendarCell => {
    const today = startOfDay(new Date());
    const cellDate = startOfDay(date);

    // Check if date is in the past
    if (isBefore(cellDate, today)) {
      return {
        date,
        room,
        status: "past",
      };
    }

    // Find reservation for this room on this date
    const reservation = reservations.find((res) => {
      if (res.room_id !== room.id) return false;

      const resStart = startOfDay(new Date(res.start_time));
      const resEnd = startOfDay(new Date(res.end_time));

      return (
        isWithinInterval(cellDate, { start: resStart, end: resEnd }) ||
        isSameDay(cellDate, resStart) ||
        isSameDay(cellDate, resEnd)
      );
    });

    if (reservation) {
      const resStart = startOfDay(new Date(reservation.start_time));
      const resEnd = startOfDay(new Date(reservation.end_time));

      // Determine span position
      const isSpanStart = isSameDay(cellDate, resStart);
      const isSpanEnd = isSameDay(cellDate, resEnd);
      const isSpanMiddle = !isSpanStart && !isSpanEnd;

      // Calculate span length (days from start to end)
      const spanLength =
        Math.ceil(
          (resEnd.getTime() - resStart.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

      // Determine status based on reservation status
      let status: CellStatus = "reserved";
      if (reservation.status === "checked_in") {
        status = "occupied";
      } else if (isSameDay(cellDate, resEnd)) {
        status = "checkout";
      }

      return {
        date,
        room,
        status,
        reservation,
        isSpanStart,
        isSpanMiddle,
        isSpanEnd,
        spanLength,
      };
    }

    // Check current room status (for today only)
    if (isSameDay(cellDate, today)) {
      if (room.status === "cleaning") {
        return { date, room, status: "cleaning" };
      }
      if (room.status === "maintenance") {
        return { date, room, status: "maintenance" };
      }
    }

    return { date, room, status: "available" };
  };

  // Build the calendar grid data
  const calendarGrid = useMemo(() => {
    return rooms.map((room) => ({
      room,
      cells: dates.map((date) => getCellStatus(room, date)),
    }));
  }, [rooms, dates, reservations]);

  // Navigation functions
  const goToToday = () => {
    setStartDate(startOfDay(new Date()));
  };

  const goToPrevious = () => {
    switch (viewMode) {
      case "week":
        setStartDate(addDays(startDate, -7));
        break;
      case "twoWeek":
        setStartDate(addDays(startDate, -14));
        break;
      case "month":
        setStartDate(addDays(startDate, -30));
        break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case "week":
        setStartDate(addDays(startDate, 7));
        break;
      case "twoWeek":
        setStartDate(addDays(startDate, 14));
        break;
      case "month":
        setStartDate(addDays(startDate, 30));
        break;
    }
  };

  // Refresh data
  const refresh = async () => {
    if (!restaurantId) return;
    setLoading(true);

    try {
      const [roomsData, reservationsData] = await Promise.all([
        supabase
          .from("rooms")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("name"),
        supabase
          .from("reservations")
          .select(`*, rooms(name, price)`)
          .eq("restaurant_id", restaurantId)
          .gte("end_time", startDate.toISOString())
          .lte("start_time", endDate.toISOString())
          .not("status", "in", '("cancelled","checked_out")'),
      ]);

      if (roomsData.data) setRooms(roomsData.data);
      if (reservationsData.data) setReservations(reservationsData.data);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    // Data
    rooms,
    dates,
    calendarGrid,
    reservations,
    loading,

    // Navigation
    startDate,
    endDate,
    viewMode,
    setViewMode,
    goToToday,
    goToPrevious,
    goToNext,

    // Actions
    refresh,
    restaurantId,
  };
};
