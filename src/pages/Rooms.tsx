
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase, RoomFoodOrder } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoomCheckout from "@/components/Rooms/RoomCheckout";
import BillingHistory from "@/components/Rooms/BillingHistory";
import RoomOrderForm from "@/components/Rooms/RoomOrderForm";
import RoomCard from "@/components/Rooms/RoomCard";
import RoomDialog from "@/components/Rooms/RoomDialog";
import ReservationDialog from "@/components/Rooms/ReservationDialog";
import SpecialOccasions from "@/components/Rooms/SpecialOccasions";
import PromotionsManager from "@/components/Rooms/PromotionsManager";

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: string;
  price: number;
  restaurant_id: string;
}

const statusColors = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  occupied: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cleaning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  maintenance: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const Rooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddRoom, setOpenAddRoom] = useState(false);
  const [openEditRoom, setOpenEditRoom] = useState(false);
  const [openReservation, setOpenReservation] = useState(false);
  const [activeTab, setActiveTab] = useState("rooms");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [checkoutRoom, setCheckoutRoom] = useState<{ roomId: string, reservationId: string } | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [openFoodOrder, setOpenFoodOrder] = useState(false);
  const [roomFoodOrders, setRoomFoodOrders] = useState<Record<string, RoomFoodOrder[]>>({});

  const [newRoom, setNewRoom] = useState({
    name: "",
    capacity: 1,
    price: 0,
    status: "available",
  });
  
  const [editRoom, setEditRoom] = useState({
    id: "",
    name: "",
    capacity: 1,
    price: 0,
    status: "available",
  });
  
  const [reservation, setReservation] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    start_date: new Date(),
    end_date: new Date(),
    notes: "",
    special_occasion: "",
    special_occasion_date: null as Date | null,
    marketing_consent: false
  });

  const { toast } = useToast();

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

  const handleAddRoom = async () => {
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
          name: newRoom.name,
          capacity: newRoom.capacity,
          price: newRoom.price,
          status: newRoom.status,
          restaurant_id: restaurantId,
        },
      ]).select();

      if (error) throw error;

      setRooms([...rooms, data[0] as Room]);
      setOpenAddRoom(false);
      setNewRoom({
        name: "",
        capacity: 1,
        price: 0,
        status: "available",
      });

      toast({
        title: "Room Added",
        description: "New room has been added successfully.",
      });
    } catch (error) {
      console.error("Error adding room:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add room. Please try again.",
      });
    }
  };

  const openEditDialog = (room: Room) => {
    setEditRoom({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      price: room.price,
      status: room.status,
    });
    setOpenEditRoom(true);
  };

  const handleEditRoom = async () => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          name: editRoom.name,
          capacity: editRoom.capacity,
          price: editRoom.price,
          status: editRoom.status,
        })
        .eq("id", editRoom.id);

      if (error) throw error;

      setRooms(
        rooms.map((room) =>
          room.id === editRoom.id ? { ...room, ...editRoom } : room
        )
      );
      setOpenEditRoom(false);

      toast({
        title: "Room Updated",
        description: "Room details have been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating room:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update room. Please try again.",
      });
    }
  };

  const openReservationDialog = (room: Room) => {
    setCurrentRoom(room);
    setReservation({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      start_date: new Date(),
      end_date: new Date(),
      notes: "",
      special_occasion: "",
      special_occasion_date: null,
      marketing_consent: false
    });
    setOpenReservation(true);
  };

  const handleCreateReservation = async () => {
    if (!restaurantId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No restaurant ID available. Please log in again.",
      });
      return;
    }
    
    try {
      if (!currentRoom) return;

      const startTime = new Date(reservation.start_date);
      startTime.setHours(12, 0, 0, 0); // Check-in at 12 PM

      const endTime = new Date(reservation.end_date);
      endTime.setHours(11, 0, 0, 0); // Check-out at 11 AM

      const { data, error } = await supabase.from("reservations").insert([
        {
          customer_name: reservation.customer_name,
          customer_email: reservation.customer_email || null,
          customer_phone: reservation.customer_phone || null,
          room_id: currentRoom.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: reservation.notes || null,
          status: "confirmed",
          restaurant_id: restaurantId,
          special_occasion: reservation.special_occasion || null,
          special_occasion_date: reservation.special_occasion_date ? reservation.special_occasion_date.toISOString().split('T')[0] : null,
          marketing_consent: reservation.marketing_consent
        },
      ]).select();

      if (error) throw error;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", currentRoom.id);

      if (roomError) throw roomError;

      setOpenReservation(false);
      setReservation({
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        start_date: new Date(),
        end_date: new Date(),
        notes: "",
        special_occasion: "",
        special_occasion_date: null,
        marketing_consent: false
      });

      setRooms(
        rooms.map((room) =>
          room.id === currentRoom.id
            ? { ...room, status: "occupied" }
            : room
        )
      );

      toast({
        title: "Reservation Created",
        description: "Room reservation has been created successfully.",
      });
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create reservation. Please try again.",
      });
    }
  };

  const handleCheckout = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "confirmed")
        .order("start_time", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "No Active Reservation",
          description: "There is no active reservation for this room.",
        });
        return;
      }

      setCheckoutRoom({
        roomId,
        reservationId: data.id,
      });
    } catch (error) {
      console.error("Error fetching reservation for checkout:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to prepare checkout. Please try again.",
      });
    }
  };

  const handleCheckoutComplete = async () => {
    setCheckoutRoom(null);
    
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

  const openFoodOrderDialog = async (room: Room) => {
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("room_id", room.id)
        .eq("status", "confirmed")
        .order("start_time", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "No Active Reservation",
          description: "There is no active reservation for this room.",
        });
        return;
      }

      setCurrentRoom(room);
      setReservation(prev => ({
        ...prev,
        customer_name: data.customer_name,
      }));
      setOpenFoodOrder(true);
    } catch (error) {
      console.error("Error fetching reservation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to prepare food order. Please try again.",
      });
    }
  };

  const handleFoodOrderComplete = async () => {
    setOpenFoodOrder(false);
    
    if (currentRoom) {
      await fetchRoomFoodOrders([currentRoom.id]);
    }
  };

  const getStatusClass = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  const getRoomFoodOrdersTotal = (roomId: string) => {
    const orders = roomFoodOrders[roomId] || [];
    return orders.reduce((sum, order) => sum + (order.total || 0), 0);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (authError) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{authError}</h2>
        <p className="mb-4">You need to be logged in with a valid restaurant account to access this page.</p>
        <Button onClick={() => window.location.href = '/auth'}>
          Go to Login
        </Button>
      </div>
    );
  }

  if (checkoutRoom) {
    return (
      <RoomCheckout 
        roomId={checkoutRoom.roomId}
        reservationId={checkoutRoom.reservationId}
        onComplete={handleCheckoutComplete}
      />
    );
  }

  if (openFoodOrder && currentRoom) {
    return (
      <RoomOrderForm
        roomId={currentRoom.id}
        customerName={reservation.customer_name}
        onSuccess={handleFoodOrderComplete}
        onCancel={() => setOpenFoodOrder(false)}
      />
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rooms Management</h1>
        <Button onClick={() => setOpenAddRoom(true)}>Add New Room</Button>
      </div>

      <Tabs 
        defaultValue="rooms" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
          <TabsTrigger value="occasions">Special Occasions</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          {rooms.length === 0 ? (
            <p className="text-center py-8">No rooms found. Add your first room to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  foodOrdersTotal={getRoomFoodOrdersTotal(room.id)}
                  onEdit={openEditDialog}
                  onReserve={openReservationDialog}
                  onFoodOrder={openFoodOrderDialog}
                  onCheckout={handleCheckout}
                  getStatusClass={getStatusClass}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing">
          {restaurantId && <BillingHistory restaurantId={restaurantId} />}
        </TabsContent>

        <TabsContent value="occasions">
          {restaurantId && <SpecialOccasions restaurantId={restaurantId} />}
        </TabsContent>

        <TabsContent value="promotions">
          {restaurantId && <PromotionsManager restaurantId={restaurantId} />}
        </TabsContent>
      </Tabs>

      {/* Room Dialog (Add/Edit) */}
      <RoomDialog
        open={openAddRoom}
        onOpenChange={setOpenAddRoom}
        roomData={newRoom}
        setRoomData={setNewRoom}
        onSave={handleAddRoom}
        mode="add"
      />

      <RoomDialog
        open={openEditRoom}
        onOpenChange={setOpenEditRoom}
        roomData={editRoom}
        setRoomData={setEditRoom}
        onSave={handleEditRoom}
        mode="edit"
      />

      {/* Reservation Dialog */}
      <ReservationDialog
        open={openReservation}
        onOpenChange={setOpenReservation}
        room={currentRoom}
        reservation={reservation}
        setReservation={setReservation}
        handleCreateReservation={handleCreateReservation}
      />
    </div>
  );
};

export default Rooms;
