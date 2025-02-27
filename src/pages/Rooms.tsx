import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  Mail,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: string;
  restaurant_id: string;
}

interface Reservation {
  id: string;
  room_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
}

const Rooms = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const { toast } = useToast();
  const [userName, setUserName] = useState<string>("");

  useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data?.first_name) {
        setUserName(data.first_name);
      }
      return data;
    },
  });

  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      console.log("Fetching rooms...");
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("restaurant_id", userProfile.restaurant_id)
        .order("name");

      if (error) {
        console.error("Error fetching rooms:", error);
        throw error;
      }
      return data as Room[];
    },
  });

  const { data: reservations = [], refetch: refetchReservations } = useQuery({
    queryKey: ["reservations", selectedRoom],
    enabled: !!selectedRoom,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!selectedRoom) return [];

      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("room_id", selectedRoom)
        .gte("start_time", new Date().toISOString())
        .order("start_time");

      if (error) {
        console.error("Error fetching reservations:", error);
        throw error;
      }
      return data as Reservation[];
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomData = {
      name: formData.get("name") as string,
      capacity: parseInt(formData.get("capacity") as string),
      status: formData.get("status") as string || "available",
    };

    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      if (editingRoom) {
        const { error } = await supabase
          .from("rooms")
          .update({ ...roomData })
          .eq("id", editingRoom.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Room updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert([{ ...roomData, restaurant_id: userProfile.restaurant_id }]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Room added successfully",
        });
      }

      refetchRooms();
      setIsAddDialogOpen(false);
      setEditingRoom(null);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
      refetchRooms();
      if (selectedRoom === id) {
        setSelectedRoom(null);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReservation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRoom) return;

    const formData = new FormData(e.currentTarget);
    const reservationData = {
      room_id: selectedRoom,
      customer_name: formData.get("customer_name") as string,
      customer_email: formData.get("customer_email") as string,
      customer_phone: formData.get("customer_phone") as string,
      start_time: formData.get("start_time") as string,
      end_time: formData.get("end_time") as string,
      notes: formData.get("notes") as string,
      status: "confirmed",
    };

    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      if (!userProfile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { error: reservationError } = await supabase
        .from("reservations")
        .insert([{ ...reservationData, restaurant_id: userProfile.restaurant_id }]);

      if (reservationError) throw reservationError;

      toast({
        title: "Success",
        description: "Reservation added successfully",
      });
      
      refetchReservations();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "occupied":
        return "bg-red-500";
      case "available":
        return "bg-green-500";
      case "reserved":
        return "bg-yellow-500";
      case "maintenance":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Rooms & Reservations
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome {userName || "User"}!
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingRoom(null)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRoom ? "Edit Room" : "Add New Room"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingRoom?.name}
                  placeholder="e.g., VIP Room 1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  defaultValue={editingRoom?.capacity}
                  placeholder="Number of people"
                  required
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingRoom?.status || "available"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingRoom ? "Update" : "Add"} Room
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold">Rooms</h2>
          <div className="space-y-4">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className={cn(
                  "p-4 cursor-pointer transition-all",
                  selectedRoom === room.id
                    ? "ring-2 ring-purple-500"
                    : "hover:shadow-md"
                )}
                onClick={() => setSelectedRoom(room.id)}
              >
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{room.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Capacity: {room.capacity}
                        </span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(room.status)}>
                      {room.status}
                    </Badge>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRoom(room);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(room.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">
            {selectedRoom
              ? `Reservations for ${
                  rooms.find((r) => r.id === selectedRoom)?.name
                }`
              : "Select a room to manage reservations"}
          </h2>
          {selectedRoom && (
            <>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">New Reservation</h3>
                <form onSubmit={handleReservation} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_name">Customer Name</Label>
                      <Input
                        id="customer_name"
                        name="customer_name"
                        required
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer_email">Email</Label>
                      <Input
                        id="customer_email"
                        name="customer_email"
                        type="email"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer_phone">Phone</Label>
                      <Input
                        id="customer_phone"
                        name="customer_phone"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        name="start_time"
                        type="datetime-local"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        name="end_time"
                        type="datetime-local"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        name="notes"
                        placeholder="Any special requests..."
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Add Reservation
                  </Button>
                </form>
              </Card>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Upcoming Reservations</h3>
                {reservations.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    No upcoming reservations for this room
                  </Card>
                ) : (
                  reservations.map((reservation) => (
                    <Card key={reservation.id} className="p-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold">
                            {reservation.customer_name}
                          </h4>
                          <Badge
                            className={
                              reservation.status === "confirmed"
                                ? "bg-green-500"
                                : "bg-yellow-500"
                            }
                          >
                            {reservation.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Start: {formatDateTime(reservation.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>End: {formatDateTime(reservation.end_time)}</span>
                          </div>
                          {reservation.customer_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{reservation.customer_email}</span>
                            </div>
                          )}
                          {reservation.customer_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{reservation.customer_phone}</span>
                            </div>
                          )}
                        </div>
                        {reservation.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Notes: {reservation.notes}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rooms;
