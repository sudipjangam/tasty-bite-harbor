
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase, RoomFoodOrder } from "@/integrations/supabase/client";

export interface Room {
  id: string;
  name: string;
  capacity: number;
  status: string;
  price: number;
  restaurant_id: string;
}

interface ReservationFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  start_date: Date;
  end_date: Date;
  notes: string;
  special_occasion: string;
  special_occasion_date: Date | null;
  marketing_consent: boolean;
}

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [roomFoodOrders, setRoomFoodOrders] = useState<Record<string, RoomFoodOrder[]>>({});
  const { toast } = useToast();
  
  // Fetch restaurant ID
  useEffect(() => {
    const fetchRestaurantId = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          setAuthError("Authentication error. Please log in again.");
          throw userError;
        }
        
        if (!userData.user) {
          setAuthError("You must be logged in to view rooms.");
          return;
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", userData.user.id)
          .single();
        
        if (profileError) {
          setAuthError("Could not fetch your restaurant profile.");
          throw profileError;
        }
        
        if (!profileData.restaurant_id) {
          setAuthError("No restaurant associated with your account.");
          return;
        }
        
        setRestaurantId(profileData.restaurant_id);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to authenticate. Please log in again."
        });
        setLoading(false);
      }
    };
    
    fetchRestaurantId();
  }, [toast]);

  // Fetch rooms based on restaurant ID
  useEffect(() => {
    const fetchRooms = async () => {
      if (!restaurantId) return;
      
      try {
        let { data, error } = await supabase
          .from("rooms")
          .select("*")
          .eq("restaurant_id", restaurantId);

        if (error) throw error;
        
        const roomsWithPrice = (data || []).map(room => {
          if (typeof room.price === 'undefined') {
            return { ...room, price: 0 };
          }
          return room;
        });
        
        setRooms(roomsWithPrice as Room[]);

        const occupiedRooms = roomsWithPrice.filter(room => room.status === 'occupied');
        if (occupiedRooms.length > 0) {
          await fetchRoomFoodOrders(occupiedRooms.map(room => room.id));
        }
      } catch (error) {
        console.error("Error fetching rooms:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch rooms. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [restaurantId, toast]);

  // Fetch room food orders
  const fetchRoomFoodOrders = async (roomIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('room_food_orders')
        .select('*')
        .in('room_id', roomIds);

      if (error) throw error;

      const ordersByRoom: Record<string, RoomFoodOrder[]> = {};
      (data || []).forEach(order => {
        if (!ordersByRoom[order.room_id]) {
          ordersByRoom[order.room_id] = [];
        }
        ordersByRoom[order.room_id].push(order as RoomFoodOrder);
      });

      setRoomFoodOrders(ordersByRoom);
    } catch (error) {
      console.error("Error fetching room food orders:", error);
    }
  };

  // Add a new room
  const addRoom = async (newRoomData: Omit<Room, 'id' | 'restaurant_id'>) => {
    if (!restaurantId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No restaurant ID available. Please log in again.",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase.from("rooms").insert([
        {
          ...newRoomData,
          restaurant_id: restaurantId,
        },
      ]).select();

      if (error) throw error;

      setRooms([...rooms, data[0] as Room]);
      toast({
        title: "Room Added",
        description: "New room has been added successfully.",
      });
      return true;
    } catch (error) {
      console.error("Error adding room:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add room. Please try again.",
      });
      return false;
    }
  };

  // Edit a room
  const editRoom = async (editedRoom: Room) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          name: editedRoom.name,
          capacity: editedRoom.capacity,
          price: editedRoom.price,
          status: editedRoom.status,
        })
        .eq("id", editedRoom.id);

      if (error) throw error;

      setRooms(
        rooms.map((room) =>
          room.id === editedRoom.id ? { ...room, ...editedRoom } : room
        )
      );

      toast({
        title: "Room Updated",
        description: "Room details have been updated successfully.",
      });
      return true;
    } catch (error) {
      console.error("Error updating room:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update room. Please try again.",
      });
      return false;
    }
  };

  // Create a reservation
  const createReservation = async (room: Room, reservationData: ReservationFormData) => {
    if (!restaurantId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No restaurant ID available. Please log in again.",
      });
      return false;
    }
    
    try {
      const startTime = new Date(reservationData.start_date);
      startTime.setHours(12, 0, 0, 0); // Check-in at 12 PM

      const endTime = new Date(reservationData.end_date);
      endTime.setHours(11, 0, 0, 0); // Check-out at 11 AM

      const { data, error } = await supabase.from("reservations").insert([
        {
          customer_name: reservationData.customer_name,
          customer_email: reservationData.customer_email || null,
          customer_phone: reservationData.customer_phone || null,
          room_id: room.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: reservationData.notes || null,
          status: "confirmed",
          restaurant_id: restaurantId,
          special_occasion: reservationData.special_occasion || null,
          special_occasion_date: reservationData.special_occasion_date ? reservationData.special_occasion_date.toISOString().split('T')[0] : null,
          marketing_consent: reservationData.marketing_consent
        },
      ]).select();

      if (error) throw error;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", room.id);

      if (roomError) throw roomError;

      setRooms(
        rooms.map((r) =>
          r.id === room.id
            ? { ...r, status: "occupied" }
            : r
        )
      );

      toast({
        title: "Reservation Created",
        description: "Room reservation has been created successfully.",
      });
      return true;
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create reservation. Please try again.",
      });
      return false;
    }
  };

  // Get food orders total for a room
  const getRoomFoodOrdersTotal = (roomId: string) => {
    const orders = roomFoodOrders[roomId] || [];
    return orders.reduce((sum, order) => sum + (order.total || 0), 0);
  };

  // Refresh rooms after checkout
  const refreshRooms = async () => {
    if (!restaurantId) return;
    
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      
      const roomsWithPrice = (data || []).map(room => {
        if (typeof room.price === 'undefined') {
          return { ...room, price: 0 };
        }
        return room;
      });
      
      setRooms(roomsWithPrice as Room[]);
    } catch (error) {
      console.error("Error refreshing rooms:", error);
    }
  };

  return {
    rooms,
    loading,
    restaurantId,
    authError,
    addRoom,
    editRoom,
    createReservation,
    getRoomFoodOrdersTotal,
    refreshRooms,
    fetchRoomFoodOrders
  };
};
