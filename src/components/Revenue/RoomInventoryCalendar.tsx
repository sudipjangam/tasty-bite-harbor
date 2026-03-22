
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, UserPlus, BedDouble, CreditCard } from "lucide-react";

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: string;
  price: number;
}

interface Reservation {
  id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_name: string;
}

type CellStatus = "available" | "booked" | "blocked" | "maintenance";

const RoomInventoryCalendar = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // ─── Booking Dialog State ─────────────────────────────────────
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookingForm, setBookingForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    check_out: '',
    notes: '',
    nights: 1,
  });

  const VISIBLE_DAYS = 14;

  // Generate date range
  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < VISIBLE_DAYS; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [startDate]);

  const endDate = dateRange[dateRange.length - 1];

  // Fetch rooms
  const { data: rooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms-calendar", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, capacity, status, price")
        .eq("restaurant_id", restaurantId)
        .order("name");
      if (error) throw error;
      return data as Room[];
    },
    enabled: !!restaurantId,
  });

  // Fetch reservations for the visible date range
  const { data: reservations = [], isLoading: isLoadingReservations, refetch } = useQuery({
    queryKey: ["reservations-calendar", restaurantId, startDate.toISOString()],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("reservations")
        .select("id, room_id, start_time, end_time, status, customer_name")
        .eq("restaurant_id", restaurantId)
        .gte("end_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString())
        .not("status", "eq", "cancelled");
      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Also pull OTA bookings from the new table
  const { data: otaBookings = [] } = useQuery({
    queryKey: ["ota-bookings-calendar", restaurantId, startDate.toISOString()],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("ota_bookings")
        .select("id, room_type, check_in, check_out, booking_status, ota_name, guest_name")
        .eq("restaurant_id", restaurantId)
        .gte("check_out", startDate.toISOString().split("T")[0])
        .lte("check_in", endDate.toISOString().split("T")[0])
        .not("booking_status", "eq", "cancelled");
      if (error) return [];
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // ─── Create Booking Mutation ──────────────────────────────────
  const createBooking = useMutation({
    mutationFn: async () => {
      if (!restaurantId || !selectedRoom || !selectedDate) throw new Error("Missing data");

      const checkInDate = selectedDate.toISOString();
      const checkOutDate = new Date(selectedDate);
      checkOutDate.setDate(checkOutDate.getDate() + bookingForm.nights);

      const { data, error } = await supabase
        .from("reservations")
        .insert([{
          restaurant_id: restaurantId,
          room_id: selectedRoom.id,
          customer_name: bookingForm.customer_name,
          customer_phone: bookingForm.customer_phone,
          customer_email: bookingForm.customer_email,
          start_time: checkInDate,
          end_time: checkOutDate.toISOString(),
          status: 'confirmed',
          notes: bookingForm.notes,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations-calendar"] });
      toast({
        title: "✅ Booking Created!",
        description: `${selectedRoom?.name} booked for ${bookingForm.customer_name} — ${bookingForm.nights} night(s)`,
      });
      setBookingDialogOpen(false);
      resetBookingForm();
      refetch();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: error.message,
      });
    },
  });

  const resetBookingForm = () => {
    setBookingForm({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      check_out: '',
      notes: '',
      nights: 1,
    });
    setSelectedRoom(null);
    setSelectedDate(null);
  };

  // ─── Handle cell click ────────────────────────────────────────
  const handleCellClick = (room: Room, date: Date, status: CellStatus) => {
    if (status !== "available") return; // only available cells open booking
    setSelectedRoom(room);
    setSelectedDate(date);

    // Pre-calculate checkout (1 night default)
    const checkout = new Date(date);
    checkout.setDate(checkout.getDate() + 1);

    setBookingForm({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      check_out: checkout.toISOString().split('T')[0],
      notes: '',
      nights: 1,
    });
    setBookingDialogOpen(true);
  };

  // Update checkout when nights change
  const handleNightsChange = (nights: number) => {
    if (!selectedDate) return;
    const checkout = new Date(selectedDate);
    checkout.setDate(checkout.getDate() + nights);
    setBookingForm(prev => ({
      ...prev,
      nights,
      check_out: checkout.toISOString().split('T')[0],
    }));
  };

  // ─── Cell status & color helpers ──────────────────────────────
  const getCellStatus = (room: Room, date: Date): { status: CellStatus; tooltip: string } => {
    const dateStr = date.toISOString().split("T")[0];
    
    if (room.status === "maintenance" || room.status === "out_of_order") {
      return { status: "blocked", tooltip: "Room under maintenance" };
    }

    const booking = reservations.find(r => {
      if (r.room_id !== room.id) return false;
      const checkIn = new Date(r.start_time).toISOString().split("T")[0];
      const checkOut = new Date(r.end_time).toISOString().split("T")[0];
      return dateStr >= checkIn && dateStr < checkOut;
    });

    if (booking) {
      return { status: "booked", tooltip: `Booked: ${booking.customer_name || 'Guest'} (${booking.status})` };
    }

    const otaBooking = otaBookings.find((ob: any) => {
      if (!ob.room_type) return false;
      const nameMatch = room.name.toLowerCase().includes(ob.room_type.toLowerCase()) ||
                        ob.room_type.toLowerCase().includes(room.name.toLowerCase());
      if (!nameMatch) return false;
      return dateStr >= ob.check_in && dateStr < ob.check_out;
    });

    if (otaBooking) {
      return { status: "booked", tooltip: `OTA: ${(otaBooking as any).guest_name || 'Guest'} via ${(otaBooking as any).ota_name}` };
    }

    return { status: "available", tooltip: "Click to book" };
  };

  const getCellColor = (status: CellStatus) => {
    switch (status) {
      case "available": return "bg-emerald-500 hover:bg-emerald-400 hover:scale-110 hover:shadow-lg";
      case "booked": return "bg-amber-500 hover:bg-amber-400";
      case "blocked": return "bg-gray-400 hover:bg-gray-300";
      case "maintenance": return "bg-red-400 hover:bg-red-300";
    }
  };

  const getCellBorder = (status: CellStatus) => {
    switch (status) {
      case "available": return "border-emerald-600";
      case "booked": return "border-amber-600";
      case "blocked": return "border-gray-500";
      case "maintenance": return "border-red-500";
    }
  };

  // ─── Navigation ───────────────────────────────────────────────
  const goBack = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  const goForward = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  const formatDateHeader = (date: Date) => {
    const day = date.toLocaleDateString("en-US", { weekday: "short" });
    const num = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "short" });
    return { day, num, month };
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6;
  };

  // Summary stats
  const todayBooked = rooms.filter(r => getCellStatus(r, new Date()).status === "booked").length;
  const todayAvailable = rooms.filter(r => getCellStatus(r, new Date()).status === "available").length;
  const todayBlocked = rooms.filter(r => getCellStatus(r, new Date()).status === "blocked").length;

  // Calculate total for booking dialog
  const totalAmount = selectedRoom ? Number(selectedRoom.price) * bookingForm.nights : 0;

  if (isLoadingRooms) {
    return (
      <Card className="standardized-card-glass">
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="standardized-card-glass overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5">
                <CalendarIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Availability Calendar</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  {startDate.getMonth() !== endDate.getMonth() && 
                    ` — ${endDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                  }
                  <span className="ml-2 text-xs text-primary font-medium">· Click green cells to book</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 mr-4">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1.5" /> {todayAvailable} Available
                </Badge>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800">
                  <div className="w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1.5" /> {todayBooked} Booked
                </Badge>
                <Badge className="bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gray-400 mr-1.5" /> {todayBlocked} Blocked
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={goBack}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToday} className="text-xs">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goForward}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-1">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card border-b border-r p-0 w-[200px] min-w-[200px]">
                    <div className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-primary">
                      Room Category
                    </div>
                  </th>
                  {dateRange.map((date, i) => {
                    const { day, num, month } = formatDateHeader(date);
                    const today = isToday(date);
                    const weekend = isWeekend(date);
                    return (
                      <th 
                        key={i}
                        className={`border-b border-r p-0 min-w-[52px] ${
                          today ? 'bg-primary/10' : weekend ? 'bg-muted/50' : 'bg-card'
                        }`}
                      >
                        <div className="px-1 py-1.5 text-center">
                          <div className={`text-[10px] font-medium ${today ? 'text-primary' : 'text-muted-foreground'}`}>
                            {day}
                          </div>
                          <div className={`text-sm font-bold ${today ? 'text-primary' : 'text-foreground'}`}>
                            {num}
                          </div>
                          <div className={`text-[9px] ${today ? 'text-primary' : 'text-muted-foreground'}`}>
                            {month}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {rooms.map((room) => (
                  <React.Fragment key={room.id}>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-card border-b border-r p-0" rowSpan={1}>
                        <div className="px-4 py-3">
                          <div className="font-semibold text-foreground text-sm">{room.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Cap: {room.capacity} · ₹{Number(room.price).toLocaleString()}
                          </div>
                        </div>
                      </td>
                      {dateRange.map((date, i) => {
                        const { status, tooltip } = getCellStatus(room, date);
                        const weekend = isWeekend(date);
                        const today = isToday(date);
                        return (
                          <td 
                            key={i}
                            className={`border-b border-r p-1 ${today ? 'bg-primary/5' : weekend ? 'bg-muted/20' : ''}`}
                            title={tooltip}
                          >
                            <div 
                              className={`w-full h-8 rounded-sm ${getCellColor(status)} ${getCellBorder(status)} border cursor-pointer transition-all duration-200 flex items-center justify-center`}
                              onClick={() => handleCellClick(room, date, status)}
                            >
                              {status === "available" && (
                                <span className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100">+</span>
                              )}
                              {status === "booked" && (
                                <span className="text-white text-[10px] font-bold">B</span>
                              )}
                              {status === "blocked" && (
                                <span className="text-white text-[10px] font-bold">✕</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 py-3 border-t bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-4 h-4 rounded-sm bg-emerald-500 border border-emerald-600" />
              Available (click to book)
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-4 h-4 rounded-sm bg-amber-500 border border-amber-600" />
              Booked
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-4 h-4 rounded-sm bg-gray-400 border border-gray-500" />
              Blocked
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-4 h-4 rounded-sm bg-red-400 border border-red-500" />
              Maintenance
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── QUICK BOOKING DIALOG ────────────────────────────────── */}
      <Dialog open={bookingDialogOpen} onOpenChange={(open) => { setBookingDialogOpen(open); if (!open) resetBookingForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="w-6 h-6 text-primary" />
              Quick Book
            </DialogTitle>
            <DialogDescription>
              Create a reservation directly from the calendar
            </DialogDescription>
          </DialogHeader>

          {selectedRoom && selectedDate && (
            <div className="space-y-5 py-2">
              {/* Room & Date Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-primary" />
                    <span className="font-bold text-foreground text-lg">{selectedRoom.name}</span>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Cap: {selectedRoom.capacity}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium">Check-in</div>
                    <div className="font-semibold text-foreground">
                      {selectedDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium">Check-out</div>
                    <div className="font-semibold text-foreground">{bookingForm.check_out && 
                      new Date(bookingForm.check_out).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
                    }</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-medium">Rate/Night</div>
                    <div className="font-semibold text-foreground">₹{Number(selectedRoom.price).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Nights selector */}
              <div className="space-y-2">
                <Label className="font-semibold">Number of Nights</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleNightsChange(Math.max(1, bookingForm.nights - 1))}
                    disabled={bookingForm.nights <= 1}
                    className="w-10 h-10 p-0"
                  >
                    −
                  </Button>
                  <Input 
                    type="number" 
                    min={1} 
                    max={30}
                    value={bookingForm.nights}
                    onChange={e => handleNightsChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center font-bold text-lg"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleNightsChange(bookingForm.nights + 1)}
                    disabled={bookingForm.nights >= 30}
                    className="w-10 h-10 p-0"
                  >
                    +
                  </Button>
                  <div className="ml-auto flex items-center gap-1.5 text-lg font-bold text-primary">
                    <CreditCard className="w-5 h-5" />
                    ₹{totalAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Guest Details */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Guest Name <span className="text-red-500">*</span></Label>
                  <Input 
                    value={bookingForm.customer_name}
                    onChange={e => setBookingForm(p => ({ ...p, customer_name: e.target.value }))}
                    placeholder="Enter guest name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Phone</Label>
                    <Input 
                      value={bookingForm.customer_phone}
                      onChange={e => setBookingForm(p => ({ ...p, customer_phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="font-semibold">Email</Label>
                    <Input 
                      type="email"
                      value={bookingForm.customer_email}
                      onChange={e => setBookingForm(p => ({ ...p, customer_email: e.target.value }))}
                      placeholder="guest@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Special Requests</Label>
                  <Textarea 
                    value={bookingForm.notes}
                    onChange={e => setBookingForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Early check-in, extra pillows, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createBooking.mutate()}
              disabled={createBooking.isPending || !bookingForm.customer_name.trim()}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg"
            >
              {createBooking.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Booking...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Confirm Booking — ₹{totalAmount.toLocaleString()}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RoomInventoryCalendar;
