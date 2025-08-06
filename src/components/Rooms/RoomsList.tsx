import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoomCard from "@/components/Rooms/RoomCard";
import RoomDialog from "@/components/Rooms/RoomDialog";
import ReservationDialog from "@/components/Rooms/ReservationDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Room } from "@/hooks/useRooms";
import { Search, Filter } from "lucide-react";

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
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  occupied: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cleaning: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  maintenance: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
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
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
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

  // Filter rooms based on search query and status filter
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || room.status === statusFilter;
    return matchesSearch && matchesStatus;
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
          open={openFoodOrder}
          onClose={() => setOpenFoodOrder(false)}
          onSuccess={() => {
            setOpenFoodOrder(false);
          }}
          restaurantId={currentRoom.restaurant_id}
          customerName={reservation.customer_name}
        />
      </React.Suspense>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Rooms Management</h1>
        <Button 
          onClick={() => setOpenAddRoom(true)}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          Add New Room
        </Button>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="flex-1 h-10">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="cleaning">Cleaning</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-muted-foreground text-center mb-2">
            {rooms.length === 0 ? 
              "No rooms found. Add your first room to get started." : 
              "No rooms match your search criteria."}
          </p>
          {rooms.length > 0 && (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
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

      {/* Keep existing dialogs */}
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
