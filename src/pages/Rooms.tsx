import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { format, addHours, isAfter, parseISO, addDays, differenceInDays } from "date-fns";
import { Plus, Calendar as CalendarIcon, Clock, Edit, Trash2, Users, DoorOpen, Check, X, LogOut, CreditCard, Coins, Wallet, QrCode } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
}

interface Reservation {
  id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string;
  status: string;
}

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const defaultServices = [
  { id: "1", name: "Breakfast", price: 15 },
  { id: "2", name: "Lunch", price: 25 },
  { id: "3", name: "Dinner", price: 35 },
  { id: "4", name: "Room Service", price: 10 },
  { id: "5", name: "Laundry", price: 20 },
  { id: "6", name: "Mini Bar", price: 30 },
  { id: "7", name: "Spa Service", price: 50 },
];

// Create time options for the time selector
const timeOptions = [];
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 30) {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    timeOptions.push(`${formattedHour}:${formattedMinute}`);
  }
}

const paymentMethods = [
  { id: "card", name: "Credit/Debit Card", icon: <CreditCard className="h-4 w-4" /> },
  { id: "cash", name: "Cash", icon: <Coins className="h-4 w-4" /> },
  { id: "online", name: "Online Transfer", icon: <Wallet className="h-4 w-4" /> },
  { id: "qr", name: "QR Payment", icon: <QrCode className="h-4 w-4" /> },
];

const roomStatusOptions = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "cleaning", label: "In Cleaning" },
  { value: "maintenance", label: "Maintenance" },
];

const Rooms = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null);
  const [selectedRoomForCheckout, setSelectedRoomForCheckout] = useState<Room | null>(null);
  const [checkoutReservation, setCheckoutReservation] = useState<Reservation | null>(null);
  
  // Updated calendar and time selection states
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [startTime, setStartTime] = useState<string>("14:00"); // 2:00 PM (check-in)
  const [endTime, setEndTime] = useState<string>("12:00"); // 12:00 PM (check-out)
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Form data state
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: ""
  });

  // Checkout states
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [serviceQuantity, setServiceQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");

  // Room status update state
  const [isStatusUpdateDialogOpen, setIsStatusUpdateDialogOpen] = useState(false);
  const [roomToUpdate, setRoomToUpdate] = useState<Room | null>(null);
  const [newRoomStatus, setNewRoomStatus] = useState<string>("");

  // Get restaurant ID
  const { data: restaurantId } = useQuery({
    queryKey: ["restaurant-id"],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error("No user found");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", profile.user.id)
        .single();

      return userProfile?.restaurant_id;
    },
  });

  // Fetch rooms
  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) throw error;
      return data as Room[];
    },
  });

  // Fetch reservations
  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ["reservations", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Reservation[];
    },
  });

  // Mutations
  const addRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      const { data, error } = await supabase
        .from("rooms")
        .insert([{ ...roomData, restaurant_id: restaurantId }]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setIsAddRoomOpen(false);
      toast({
        title: "Success",
        description: "Room added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add room",
        variant: "destructive",
      });
      console.error("Error adding room:", error);
    },
  });

  const addReservationMutation = useMutation({
    mutationFn: async (reservationData: any) => {
      const { data, error } = await supabase
        .from("reservations")
        .insert([{ ...reservationData, restaurant_id: restaurantId }]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      resetReservationForm();
      setIsAddReservationOpen(false);
      toast({
        title: "Success",
        description: "Reservation added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add reservation",
        variant: "destructive",
      });
      console.error("Error adding reservation:", error);
    },
  });

  const updateReservationMutation = useMutation({
    mutationFn: async (reservationData: any) => {
      const { id, ...updateData } = reservationData;
      const { data, error } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      resetReservationForm();
      setIsAddReservationOpen(false);
      toast({
        title: "Success",
        description: "Reservation updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update reservation",
        variant: "destructive",
      });
      console.error("Error updating reservation:", error);
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setIsConfirmDeleteOpen(false);
      toast({
        title: "Success",
        description: "Reservation deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete reservation",
        variant: "destructive",
      });
      console.error("Error deleting reservation:", error);
    },
  });

  // Update room status mutation
  const updateRoomStatusMutation = useMutation({
    mutationFn: async ({ roomId, status }: { roomId: string, status: string }) => {
      const { data, error } = await supabase
        .from("rooms")
        .update({ status })
        .eq("id", roomId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setIsStatusUpdateDialogOpen(false);
      toast({
        title: "Success",
        description: "Room status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update room status",
        variant: "destructive",
      });
      console.error("Error updating room status:", error);
    },
  });

  // Checkout reservation mutation - fixing the string escaping issue
  const checkoutReservationMutation = useMutation({
    mutationFn: async ({ reservationId, roomId, paymentDetails }: { reservationId: string, roomId: string, paymentDetails: any }) => {
      // In a real app, you would create a transaction record here
      // For now, we'll just update the room status to available
      const { error } = await supabase
        .from("rooms")
        .update({ status: "available" })
        .eq("id", roomId);

      if (error) throw error;
      
      // Update reservation status to 'completed' (optional)
      const { error: resError } = await supabase
        .from("reservations")
        .update({ status: "completed" })
        .eq("id", reservationId);
        
      if (resError) throw resError;
      
      return { success: true, paymentDetails };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setIsCheckoutDialogOpen(false);
      setIsSuccessDialogOpen(true);
      resetCheckoutForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete checkout",
        variant: "destructive",
      });
      console.error("Error during checkout:", error);
    },
  });

  // Handle room submission
  const handleRoomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomName = formData.get("roomName") as string;
    const roomCapacity = parseInt(formData.get("roomCapacity") as string);

    addRoomMutation.mutate({
      name: roomName,
      capacity: roomCapacity,
      status: "available",
    });
  };

  // Updated date and time selection handlers
  const handleStartDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setStartDate(date);
    // If end date is before start date, adjust it
    if (endDate && date > endDate) {
      setEndDate(addDays(date, 1));
    }
    validateReservation();
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setEndDate(date);
    validateReservation();
  };

  const handleStartTimeSelect = (time: string) => {
    setStartTime(time);
    validateReservation();
  };

  const handleEndTimeSelect = (time: string) => {
    setEndTime(time);
    validateReservation();
  };

  // Updated validation function
  const validateReservation = (): boolean => {
    if (!startDate || !endDate) {
      setValidationError("Please select both start and end dates");
      return false;
    }

    if (!selectedRoomId) {
      setValidationError("Please select a room");
      return false;
    }

    // Create full date-time objects for validation
    const startDateTime = new Date(startDate);
    const startHours = parseInt(startTime.split(":")[0]);
    const startMinutes = parseInt(startTime.split(":")[1]);
    startDateTime.setHours(startHours, startMinutes, 0, 0);
    
    const endDateTime = new Date(endDate);
    const endHours = parseInt(endTime.split(":")[0]);
    const endMinutes = parseInt(endTime.split(":")[1]);
    endDateTime.setHours(endHours, endMinutes, 0, 0);
    
    // Check if end date is after start date
    if (!isAfter(endDateTime, startDateTime)) {
      setValidationError("End date/time must be after start date/time");
      return false;
    }
    
    setValidationError(null);
    return true;
  };

  // Handle time selection
  

  

  // Handle reservation submission
  const handleReservationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateReservation()) {
      return;
    }

    // Create date objects for start and end times
    const startDateTime = new Date(startDate!);
    const startHours = parseInt(startTime.split(":")[0]);
    const startMinutes = parseInt(startTime.split(":")[1]);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(endDate!);
    const endHours = parseInt(endTime.split(":")[0]);
    const endMinutes = parseInt(endTime.split(":")[1]);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    const reservationData = {
      room_id: selectedRoomId,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      customer_name: formData.customerName,
      customer_email: formData.customerEmail || null,
      customer_phone: formData.customerPhone || null,
      notes: formData.notes || null,
      status: "confirmed",
    };

    if (editingReservation) {
      updateReservationMutation.mutate({
        id: editingReservation.id,
        ...reservationData,
      });
    } else {
      addReservationMutation.mutate(reservationData);
    }
  };

  // Edit reservation
  const handleEditReservation = (reservation: Reservation) => {
    setEditingReservation(reservation);
    
    // Parse date and time
    const startDate = new Date(reservation.start_time);
    const startHours = startDate.getHours().toString().padStart(2, '0');
    const startMinutes = startDate.getMinutes().toString().padStart(2, '0');
    
    const endDate = new Date(reservation.end_time);
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    // Set form state
    setStartDate(startDate);
    setEndDate(endDate);
    setStartTime(`${startHours}:${startMinutes}`);
    setEndTime(`${endHours}:${endMinutes}`);
    setSelectedRoomId(reservation.room_id);
    setFormData({
      customerName: reservation.customer_name,
      customerEmail: reservation.customer_email || "",
      customerPhone: reservation.customer_phone || "",
      notes: reservation.notes || ""
    });
    
    setIsAddReservationOpen(true);
  };

  // Handle delete reservation
  const handleDeleteReservation = (id: string) => {
    setDeletingReservationId(id);
    setIsConfirmDeleteOpen(true);
  };

  // Confirm delete reservation
  const confirmDeleteReservation = () => {
    if (deletingReservationId) {
      deleteReservationMutation.mutate(deletingReservationId);
    }
  };

  // Reset reservation form
  const resetReservationForm = () => {
    setStartDate(new Date());
    setEndDate(addDays(new Date(), 1));
    setStartTime("14:00");
    setEndTime("12:00");
    setSelectedRoomId(null);
    setFormData({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: ""
    });
    setEditingReservation(null);
    setValidationError(null);
  };

  // Open status update dialog
  const openStatusUpdateDialog = (room: Room) => {
    setRoomToUpdate(room);
    setNewRoomStatus(room.status);
    setIsStatusUpdateDialogOpen(true);
  };

  // Handle status update
  const handleStatusUpdate = () => {
    if (roomToUpdate && newRoomStatus) {
      updateRoomStatusMutation.mutate({
        roomId: roomToUpdate.id,
        status: newRoomStatus
      });
    }
  };

  // Open Add Reservation dialog
  const openAddReservation = (roomId?: string) => {
    resetReservationForm();
    if (roomId) {
      setSelectedRoomId(roomId);
    }
    setIsAddReservationOpen(true);
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Checkout functions
  const openCheckoutDialog = (room: Room) => {
    // Find active reservation for this room
    const reservation = reservations.find(
      res => res.room_id === room.id && 
      new Date(res.end_time) >= new Date() && 
      res.status === "confirmed"
    );
    
    if (!reservation) {
      toast({
        title: "Error",
        description: "No active reservation found for this room",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedRoomForCheckout(room);
    setCheckoutReservation(reservation);
    setBillItems([
      {
        id: "room-charge",
        name: `Room Charge (${room.name})`,
        price: calculateRoomCharge(reservation),
        quantity: 1
      }
    ]);
    setIsCheckoutDialogOpen(true);
  };

  const calculateRoomCharge = (reservation: Reservation) => {
    // Calculate the number of nights
    const startDate = new Date(reservation.start_time);
    const endDate = new Date(reservation.end_time);
    // Add 1 because we count both check-in and check-out days
    const nights = differenceInDays(endDate, startDate) + 1;
    
    // Base price per night - in a real app this would come from the room data
    const basePricePerNight = 150;
    
    return basePricePerNight * nights;
  };

  const resetCheckoutForm = () => {
    setSelectedRoomForCheckout(null);
    setCheckoutReservation(null);
    setBillItems([]);
    setSelectedService("");
    setServiceQuantity(1);
    setPaymentMethod("card");
    setAdditionalNotes("");
  };

  const addServiceToBill = () => {
    if (!selectedService) return;
    
    const service = defaultServices.find(s => s.id === selectedService);
    if (!service) return;
    
    // Check if service already exists in bill
    const existingItem = billItems.find(item => item.id === service.id);
    
    if (existingItem) {
      // Update quantity if service already exists
      setBillItems(billItems.map(item => 
        item.id === service.id 
          ? { ...item, quantity: item.quantity + serviceQuantity } 
          : item
      ));
    } else {
      // Add new service to bill
      setBillItems([
        ...billItems,
        {
          id: service.id,
          name: service.name,
          price: service.price,
          quantity: serviceQuantity
        }
      ]);
    }
    
    setSelectedService("");
    setServiceQuantity(1);
  };

  const removeItemFromBill = (itemId: string) => {
    // Don't allow removing the room charge
    if (itemId === "room-charge") return;
    
    setBillItems(billItems.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return billItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = () => {
    if (!selectedRoomForCheckout || !checkoutReservation) return;
    
    checkoutReservationMutation.mutate({
      reservationId: checkoutReservation.id,
      roomId: selectedRoomForCheckout.id,
      paymentDetails: {
        items: billItems,
        total: calculateTotal(),
        paymentMethod,
        additionalNotes,
        checkoutTime: new Date().toISOString()
      }
    });
  };

  // Filter upcoming reservations
  const upcomingReservations = reservations.filter(
    reservation => new Date(reservation.start_time) >= new Date()
  ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Filter past reservations
  const pastReservations = reservations.filter(
    reservation => new Date(reservation.start_time) < new Date()
  ).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  // Get room name by ID
  const getRoomName = (roomId: string) => {
    const room = rooms.find(room => room.id === roomId);
    return room ? room.name : 'Unknown Room';
  };

  // Get duration in days
  const getDurationInDays = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    // Add 1 because we count both the start and end days
    return differenceInDays(end, start) + 1;
  };

  if (roomsLoading || reservationsLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Room Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your rooms and reservations
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddReservationOpen} onOpenChange={setIsAddReservationOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => openAddReservation()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white">
              <DialogHeader>
                <DialogTitle>{editingReservation ? "Edit Reservation" : "Add New Reservation"}</DialogTitle>
                <DialogDescription>
                  {editingReservation 
                    ? "Update the reservation details below" 
                    : "Fill in the details to create a new reservation"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleReservationSubmit} className="space-y-4 mt-4">
                {/* Room selection */}
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <select
                    id="room"
                    value={selectedRoomId || ""}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full border rounded-md p-2 bg-white"
                    required
                  >
                    <option value="">Select a room</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} (Capacity: {room.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-In Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full justify-start text-left font-normal bg-white"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={handleStartDateSelect}
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={2023}
                          toYear={2030}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Check-Out Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full justify-start text-left font-normal bg-white"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={handleEndDateSelect}
                          disabled={(date) => 
                            (startDate && date < startDate)
                          }
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={2023}
                          toYear={2030}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Time selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-In Time</Label>
                    <Select value={startTime} onValueChange={handleStartTimeSelect}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select time">
                          {startTime}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]" position="popper">
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Check-Out Time</Label>
                    <Select value={endTime} onValueChange={handleEndTimeSelect}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select time">
                          {endTime}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]" position="popper">
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Validation error */}
                {validationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                    {validationError}
                  </div>
                )}

                {/* Duration info */}
                {startDate && endDate && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
                    Duration: {differenceInDays(endDate, startDate) + 1} days
                  </div>
                )}

                {/* Customer information */}
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className="bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Email (Optional)</Label>
                    <Input
                      id="customerEmail"
                      name="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone (Optional)</Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="min-h-[80px] bg-white"
                  />
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddReservationOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {editingReservation ? "Update Reservation" : "Add Reservation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white">
              <DialogHeader>
                <DialogTitle>Add New Room</DialogTitle>
                <DialogDescription>
                  Fill in the room details below
                </DialogDescription>
              </DialogHeader>
