
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { useReservations } from "@/hooks/useReservations";
import { useTables } from "@/hooks/useTables";
import { useRooms } from "@/hooks/useRooms";
import UnifiedReservationsList from "@/components/Reservations/UnifiedReservationsList";
import UnifiedReservationDialog from "@/components/UnifiedReservationDialog";
import { WaitlistManager } from "@/components/Reservations/WaitlistManager";
import { TableAvailabilityHeatMap } from "@/components/Reservations/TableAvailabilityHeatMap";
import { ReservationConfirmations } from "@/components/Reservations/ReservationConfirmations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Users, Clock, CalendarCheck, Sparkles, UtensilsCrossed, Building } from "lucide-react";
import { useState } from "react";

const Reservations = () => {
  const { user } = useAuth();
  const { 
    reservations, 
    roomReservations,
    isLoading, 
    createReservation, 
    updateReservationStatus,
    updateRoomReservationStatus,
    deleteReservation,
    deleteRoomReservation
  } = useReservations();
  const { tables } = useTables();
  const { rooms, createReservation: roomCreateReservation } = useRooms();
  
  const [openReservationDialog, setOpenReservationDialog] = useState(false);
  const [reservationType, setReservationType] = useState<'table' | 'room'>('table');

  const handleCreateReservation = async (data) => {
    try {
      if (reservationType === 'table') {
        await createReservation.mutateAsync({
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          party_size: data.party_size,
          reservation_date: data.reservation_date,
          reservation_time: data.reservation_time,
          duration_minutes: data.duration_minutes,
          special_requests: data.special_requests,
          table_id: data.table_id,
        });
      } else {
        const room = rooms.find(r => r.id === data.room_id);
        if (!room) {
          console.error('Room not found');
          return;
        }
        
        await roomCreateReservation(room, {
          customer_name: data.customer_name,
          customer_email: data.customer_email || '',
          customer_phone: data.customer_phone,
          start_date: new Date(data.reservation_date),
          end_date: new Date(data.end_date),
          notes: data.special_requests || '',
          special_occasion: '',
          special_occasion_date: null,
          marketing_consent: false,
        });
      }
      setOpenReservationDialog(false);
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  };

  const handleUpdateTableStatus = (id: string, status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show') => {
    updateReservationStatus.mutateAsync({ id, status });
  };

  const handleUpdateRoomStatus = (id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out', room_id: string) => {
    updateRoomReservationStatus.mutateAsync({ id, status, room_id });
  };

  const handleDeleteTable = (id: string) => {
    deleteReservation.mutateAsync(id);
  };

  const handleDeleteRoom = (id: string) => {
    deleteRoomReservation.mutateAsync(id);
  };

  // Calculate stats
  const todayTableReservations = reservations.filter(
    r => r.reservation_date === new Date().toISOString().split('T')[0]
  );
  const seatedToday = todayTableReservations.filter(r => r.status === 'seated').length;

  const todayRoomReservations = roomReservations.filter(r => {
    const startDate = new Date(r.start_time).toISOString().split('T')[0];
    return startDate === new Date().toISOString().split('T')[0];
  });
  const checkedInToday = roomReservations.filter(r => r.status === 'checked_in').length;

  const totalTodayReservations = todayTableReservations.length + todayRoomReservations.length;
  const upcomingTableReservations = reservations.filter(
    r => new Date(r.reservation_date) > new Date()
  );
  const upcomingRoomReservations = roomReservations.filter(
    r => new Date(r.start_time) > new Date()
  );
  const totalUpcoming = upcomingTableReservations.length + upcomingRoomReservations.length;

  // Available resources
  const availableTables = tables.filter(t => t.status === 'available').length;
  const availableRooms = rooms.filter(r => r.status === 'available').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-6">
      {/* Header */}
      <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
            <CalendarCheck className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Reservations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg mt-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Manage all your table & room bookings in one place
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Today</p>
              <p className="text-3xl font-bold">{totalTodayReservations}</p>
              <p className="text-blue-200 text-xs">{todayTableReservations.length} tables • {todayRoomReservations.length} rooms</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Active</p>
              <p className="text-3xl font-bold">{seatedToday + checkedInToday}</p>
              <p className="text-green-200 text-xs">{seatedToday} seated • {checkedInToday} checked in</p>
            </div>
            <Users className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Upcoming</p>
              <p className="text-3xl font-bold">{totalUpcoming}</p>
              <p className="text-purple-200 text-xs">{upcomingTableReservations.length} tables • {upcomingRoomReservations.length} rooms</p>
            </div>
            <Clock className="h-8 w-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Available</p>
              <p className="text-3xl font-bold">{availableTables + availableRooms}</p>
              <p className="text-orange-200 text-xs">{availableTables} tables • {availableRooms} rooms</p>
            </div>
            <Building className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6">
          <Tabs defaultValue="reservations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-1 rounded-xl">
              <TabsTrigger value="reservations" className="rounded-lg">All Bookings</TabsTrigger>
              <TabsTrigger value="waitlist" className="rounded-lg">Waitlist</TabsTrigger>
              <TabsTrigger value="availability" className="rounded-lg">Availability</TabsTrigger>
              <TabsTrigger value="communications" className="rounded-lg">Messages</TabsTrigger>
            </TabsList>

            <TabsContent value="reservations" className="space-y-4">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <StandardizedButton
                  onClick={() => {
                    setReservationType('table');
                    setOpenReservationDialog(true);
                  }}
                  className="bg-gradient-to-r from-slate-50/80 via-white to-blue-50/80 hover:from-blue-50 hover:to-indigo-100 text-gray-800 font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg border border-blue-200/50 transition-all duration-300 flex items-center gap-2"
                >
                  <UtensilsCrossed className="h-4 w-4 text-blue-600" />
                  Book Table
                </StandardizedButton>
                <StandardizedButton
                  onClick={() => {
                    setReservationType('room');
                    setOpenReservationDialog(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                >
                  <Building className="h-4 w-4" />
                  Book Room
                </StandardizedButton>
              </div>

              {/* Unified Reservations List */}
              <UnifiedReservationsList
                tableReservations={reservations}
                roomReservations={roomReservations}
                onUpdateTableStatus={handleUpdateTableStatus}
                onUpdateRoomStatus={handleUpdateRoomStatus}
                onDeleteTable={handleDeleteTable}
                onDeleteRoom={handleDeleteRoom}
              />
            </TabsContent>

            <TabsContent value="waitlist">
              <WaitlistManager />
            </TabsContent>

            <TabsContent value="availability">
              <TableAvailabilityHeatMap />
            </TabsContent>

            <TabsContent value="communications">
              <ReservationConfirmations />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Reservation Dialog */}
      <UnifiedReservationDialog
        isOpen={openReservationDialog}
        onOpenChange={setOpenReservationDialog}
        type={reservationType}
        onSubmit={handleCreateReservation}
      />
    </div>
  );
};

export default Reservations;

