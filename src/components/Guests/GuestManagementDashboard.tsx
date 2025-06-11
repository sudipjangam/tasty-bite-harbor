
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Users, 
  LogIn, 
  LogOut, 
  Search, 
  Filter,
  Star,
  Clock,
  Phone,
  Mail,
  CreditCard,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { useGuestManagement } from "@/hooks/useGuestManagement";
import GuestCheckInDialog from "./GuestCheckInDialog";
import GuestCheckOutDialog from "./GuestCheckOutDialog";

const GuestManagementDashboard = () => {
  const {
    guestProfiles,
    currentCheckIns,
    isLoadingGuests,
    isLoadingCheckIns,
    createGuestProfile,
    checkInGuest,
    checkOutGuest,
  } = useGuestManagement();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [checkInDialog, setCheckInDialog] = useState(false);
  const [checkOutDialog, setCheckOutDialog] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState(null);

  // Mock reservations for demo - in real app, this would come from API
  const pendingReservations = [
    {
      id: "1",
      customer_name: "John Doe",
      customer_email: "john@example.com",
      customer_phone: "+1234567890",
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 86400000 * 2).toISOString(),
      room: { id: "1", name: "Deluxe Room 101", price: 2500 }
    }
  ];

  const handleCheckIn = async (data: any) => {
    try {
      // First create guest profile
      const guestProfile = await createGuestProfile.mutateAsync(data.guestData);
      
      // Then check in the guest
      await checkInGuest.mutateAsync({
        ...data.checkInDetails,
        guest_profile_id: guestProfile.id,
      });
    } catch (error) {
      console.error("Check-in process failed:", error);
    }
  };

  const handleCheckOut = async (data: any) => {
    await checkOutGuest.mutateAsync(data);
  };

  const openCheckInDialog = (reservation: any) => {
    setSelectedGuest(reservation);
    setCheckInDialog(true);
  };

  const openCheckOutDialog = (checkIn: any) => {
    setSelectedCheckIn(checkIn);
    setCheckOutDialog(true);
  };

  const filteredGuests = guestProfiles.filter(guest =>
    guest.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.guest_phone?.includes(searchTerm)
  );

  if (isLoadingGuests || isLoadingCheckIns) {
    return <div className="p-6">Loading guest management...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Guest Management</h1>
          <p className="text-muted-foreground">Manage check-ins, check-outs, and guest profiles</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold">{guestProfiles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <LogIn className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Current Check-ins</p>
                <p className="text-2xl font-bold">{currentCheckIns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Check-ins</p>
                <p className="text-2xl font-bold">{pendingReservations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">VIP Guests</p>
                <p className="text-2xl font-bold">{guestProfiles.filter(g => g.vip_status).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="check-ins" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="check-ins">Current Check-ins</TabsTrigger>
          <TabsTrigger value="pending">Pending Check-ins</TabsTrigger>
          <TabsTrigger value="guests">Guest Profiles</TabsTrigger>
          <TabsTrigger value="history">Check-out History</TabsTrigger>
        </TabsList>

        {/* Current Check-ins */}
        <TabsContent value="check-ins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Current Check-ins ({currentCheckIns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentCheckIns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No guests currently checked in</p>
              ) : (
                <div className="space-y-4">
                  {currentCheckIns.map((checkIn: any) => (
                    <div key={checkIn.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {checkIn.guest_profiles?.guest_name?.split(' ').map((n: string) => n[0]).join('') || 'G'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{checkIn.guest_profiles?.guest_name}</h3>
                          <p className="text-sm text-muted-foreground">{checkIn.rooms?.name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              In: {format(new Date(checkIn.check_in_time), "MMM dd, HH:mm")}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Out: {format(new Date(checkIn.expected_check_out), "MMM dd, HH:mm")}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {checkIn.total_guests} guest{checkIn.total_guests > 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="outline">
                          ₹{checkIn.room_rate}/night
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openCheckOutDialog(checkIn)}
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Check Out
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Check-ins */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Check-ins ({pendingReservations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReservations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending check-ins</p>
              ) : (
                <div className="space-y-4">
                  {pendingReservations.map((reservation) => (
                    <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {reservation.customer_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{reservation.customer_name}</h3>
                          <p className="text-sm text-muted-foreground">{reservation.room.name}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {reservation.customer_phone}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {reservation.customer_email}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          ₹{reservation.room.price}/night
                        </Badge>
                        <Button 
                          size="sm"
                          onClick={() => openCheckInDialog(reservation)}
                        >
                          <LogIn className="h-4 w-4 mr-1" />
                          Check In
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guest Profiles */}
        <TabsContent value="guests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest Profiles ({guestProfiles.length})
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredGuests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No guest profiles found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGuests.map((guest) => (
                    <div key={guest.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {guest.guest_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium">{guest.guest_name}</h3>
                          <p className="text-sm text-muted-foreground">{guest.guest_email}</p>
                        </div>
                        {guest.vip_status && (
                          <Badge variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            VIP
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {guest.guest_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{guest.guest_phone}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Stays:</span>
                          <span className="font-medium">{guest.total_stays}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Spent:</span>
                          <span className="font-medium">₹{guest.total_spent}</span>
                        </div>
                        
                        {guest.last_stay && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Stay:</span>
                            <span className="font-medium">{format(new Date(guest.last_stay), "MMM yyyy")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-out History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Recent Check-outs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">Check-out history will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {checkInDialog && selectedGuest && (
        <GuestCheckInDialog
          open={checkInDialog}
          onOpenChange={setCheckInDialog}
          reservation={selectedGuest}
          room={selectedGuest.room}
          onCheckIn={handleCheckIn}
        />
      )}

      {checkOutDialog && selectedCheckIn && (
        <GuestCheckOutDialog
          open={checkOutDialog}
          onOpenChange={setCheckOutDialog}
          checkIn={selectedCheckIn}
          onCheckOut={handleCheckOut}
        />
      )}
    </div>
  );
};

export default GuestManagementDashboard;
