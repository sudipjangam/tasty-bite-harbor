import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import RoomCheckout from "@/components/Rooms/RoomCheckout";
import BillingHistory from "@/components/Rooms/BillingHistory";

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: string;
  price: number;
  restaurant_id: string;
}

interface Reservation {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  room_id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  notes: string | null;
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

  const getStatusClass = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
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
        </TabsList>

        <TabsContent value="rooms">
          {rooms.length === 0 ? (
            <p className="text-center py-8">No rooms found. Add your first room to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <Card key={room.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {room.name}
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusClass(room.status)}`}
                      >
                        {room.status}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Capacity: {room.capacity} {room.capacity === 1 ? "person" : "people"}
                      <div>Price: ₹{room.price} / night</div>
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => openEditDialog(room)}>
                      Edit
                    </Button>
                    {room.status === "available" ? (
                      <Button
                        onClick={() => openReservationDialog(room)}
                      >
                        Reserve
                      </Button>
                    ) : room.status === "occupied" ? (
                      <Button
                        variant="secondary"
                        onClick={() => handleCheckout(room.id)}
                      >
                        Checkout
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={room.status !== "available"}
                      >
                        {room.status === "cleaning" ? "Cleaning" : "Maintenance"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="billing">
          {restaurantId && <BillingHistory restaurantId={restaurantId} />}
        </TabsContent>
      </Tabs>

      <Dialog open={openAddRoom} onOpenChange={setOpenAddRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>
              Create a new room for your property.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Room Name</Label>
              <Input
                id="name"
                value={newRoom.name}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={newRoom.capacity}
                onChange={(e) =>
                  setNewRoom({
                    ...newRoom,
                    capacity: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price per Night (₹)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={newRoom.price}
                onChange={(e) =>
                  setNewRoom({
                    ...newRoom,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={newRoom.status}
                onValueChange={(value) =>
                  setNewRoom({ ...newRoom, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddRoom(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRoom}>Add Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditRoom} onOpenChange={setOpenEditRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>
              Update room details and status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Room Name</Label>
              <Input
                id="edit-name"
                value={editRoom.name}
                onChange={(e) =>
                  setEditRoom({ ...editRoom, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-capacity">Capacity</Label>
              <Input
                id="edit-capacity"
                type="number"
                min="1"
                value={editRoom.capacity}
                onChange={(e) =>
                  setEditRoom({
                    ...editRoom,
                    capacity: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-price">Price per Night (₹)</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                value={editRoom.price}
                onChange={(e) =>
                  setEditRoom({
                    ...editRoom,
                    price: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editRoom.status}
                onValueChange={(value) =>
                  setEditRoom({ ...editRoom, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditRoom(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRoom}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openReservation} onOpenChange={setOpenReservation}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              New Reservation for {currentRoom?.name}
            </DialogTitle>
            <DialogDescription>
              Create a new reservation for this room.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customer-name">Guest Name</Label>
              <Input
                id="customer-name"
                value={reservation.customer_name}
                onChange={(e) =>
                  setReservation({
                    ...reservation,
                    customer_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-email">Guest Email (Optional)</Label>
              <Input
                id="customer-email"
                type="email"
                value={reservation.customer_email}
                onChange={(e) =>
                  setReservation({
                    ...reservation,
                    customer_email: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer-phone">Guest Phone (Optional)</Label>
              <Input
                id="customer-phone"
                value={reservation.customer_phone}
                onChange={(e) =>
                  setReservation({
                    ...reservation,
                    customer_phone: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Check-in Date</Label>
                <div className="border rounded-md p-2">
                  <Calendar
                    mode="single"
                    selected={reservation.start_date}
                    onSelect={(date) =>
                      date && setReservation({ ...reservation, start_date: date })
                    }
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Check-out Date</Label>
                <div className="border rounded-md p-2">
                  <Calendar
                    mode="single"
                    selected={reservation.end_date}
                    onSelect={(date) =>
                      date && setReservation({ ...reservation, end_date: date })
                    }
                    disabled={(date) =>
                      date < new Date() || date <= reservation.start_date
                    }
                    initialFocus
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={reservation.notes}
                onChange={(e) =>
                  setReservation({ ...reservation, notes: e.target.value })
                }
              />
            </div>
            <div className="pt-2">
              <p className="text-sm">
                Reservation summary: Check-in on{" "}
                <strong>{format(reservation.start_date, "PPP")}</strong> and
                check-out on{" "}
                <strong>{format(reservation.end_date, "PPP")}</strong>
              </p>
              <p className="text-sm mt-1">
                Total cost: <strong>₹{(currentRoom?.price || 0) * Math.max(1, Math.ceil((reservation.end_date.getTime() - reservation.start_date.getTime()) / (1000 * 60 * 60 * 24)))}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReservation(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateReservation}
              disabled={!reservation.customer_name}
            >
              Create Reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rooms;
