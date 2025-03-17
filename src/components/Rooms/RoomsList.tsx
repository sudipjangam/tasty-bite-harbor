import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import RoomCard from "@/components/Rooms/RoomCard";
import RoomDialog from "@/components/Rooms/RoomDialog";
import ReservationDialog from "@/components/Rooms/ReservationDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/hooks/useRooms";

interface RoomsListProps {
  rooms: Room[];
  getRoomFoodOrdersTotal: (roomId: string) => number;
  onAddRoom: (room: Omit<Room, 'id' | 'restaurant_id'>) => Promise<boolean>;
  onEditRoom: (room: Room) => Promise<boolean>;
  onCreateReservation: (room: Room, reservationData: any) => Promise<boolean>;
  onCheckoutComplete: () => Promise<void>;
}

interface CheckoutRoomState {
  roomId: string;
  reservationId: string;
}

const statusColors = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  occupied: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cleaning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  maintenance: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const RoomsList: React.FC<RoomsListProps> = ({
  rooms,
  getRoomFoodOrdersTotal,
  onAddRoom,
  onEditRoom,
  onCreateReservation,
  onCheckoutComplete
}) => {
  const [openAddRoom, setOpenAddRoom] = useState(false);
  const [openEditRoom, setOpenEditRoom] = useState(false);
  const [openReservation, setOpenReservation] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [checkoutRoom, setCheckoutRoom] = useState<CheckoutRoomState | null>(null);
  const [openFoodOrder, setOpenFoodOrder] = useState(false);
  const { toast } = useToast();
  
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

  const handleAddRoom = async () => {
    const success = await onAddRoom(newRoom);
    if (success) {
      setOpenAddRoom(false);
      setNewRoom({
        name: "",
        capacity: 1,
        price: 0,
        status: "available",
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
    const success = await onEditRoom(editRoom as Room);
    if (success) {
      setOpenEditRoom(false);
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
    if (!currentRoom) return;
    
    const cleanReservation = {
      ...reservation,
      special_occasion: reservation.special_occasion === "none" ? "" : reservation.special_occasion
    };
    
    const success = await onCreateReservation(currentRoom, cleanReservation);
    if (success) {
      setOpenReservation(false);
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

      const { data: foodOrders, error: foodOrdersError } = await supabase
        .from("room_food_orders")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "delivered");
      
      if (foodOrdersError) {
        console.error("Error fetching food orders:", foodOrdersError);
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

  const getStatusClass = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  if (checkoutRoom) {
    const RoomCheckout = React.lazy(() => import("@/components/Rooms/RoomCheckout"));
    
    return (
      <React.Suspense fallback={<div>Loading checkout...</div>}>
        <RoomCheckout 
          roomId={checkoutRoom.roomId}
          reservationId={checkoutRoom.reservationId}
          onComplete={onCheckoutComplete}
        />
      </React.Suspense>
    );
  }

  if (openFoodOrder && currentRoom) {
    const RoomOrderForm = React.lazy(() => import("@/components/Rooms/RoomOrderForm"));
    
    return (
      <React.Suspense fallback={<div>Loading order form...</div>}>
        <RoomOrderForm
          roomId={currentRoom.id}
          customerName={reservation.customer_name}
          onSuccess={() => {
            setOpenFoodOrder(false);
          }}
          onCancel={() => setOpenFoodOrder(false)}
        />
      </React.Suspense>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rooms Management</h1>
        <Button onClick={() => setOpenAddRoom(true)}>Add New Room</Button>
      </div>

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

      {currentRoom && (
        <ReservationDialog
          open={openReservation}
          onOpenChange={setOpenReservation}
          room={currentRoom}
          reservation={reservation}
          setReservation={setReservation}
          handleCreateReservation={handleCreateReservation}
        />
      )}
    </>
  );
};

export default RoomsList;
