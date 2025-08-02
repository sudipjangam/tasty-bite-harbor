
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { useReservations } from "@/hooks/useReservations";
import { useTables } from "@/hooks/useTables";
import { useRooms } from "@/hooks/useRooms";
import ReservationsList from "@/components/Tables/ReservationsList";
import UnifiedReservationDialog from "@/components/UnifiedReservationDialog";
import { Plus, Calendar, Users, Clock, CalendarCheck, Sparkles, Car, Building } from "lucide-react";
import { useState } from "react";

const Reservations = () => {
  const { user } = useAuth();
  const { 
    reservations, 
    isLoading, 
    createReservation, 
    updateReservationStatus, 
    deleteReservation 
  } = useReservations();
  const { tables } = useTables();
  const { rooms } = useRooms();
  
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
        // Handle room reservation here if needed
        console.log('Room reservation not implemented yet');
      }
      setOpenReservationDialog(false);
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  };

  const handleUpdateStatus = (id, status) => {
    updateReservationStatus.mutateAsync({ id, status });
  };

  const handleDelete = (id) => {
    deleteReservation.mutateAsync(id);
  };

  // Calculate stats
  const todayReservations = reservations.filter(
    r => r.reservation_date === new Date().toISOString().split('T')[0]
  );
  const upcomingReservations = reservations.filter(
    r => new Date(r.reservation_date) > new Date()
  );
  const seatedToday = todayReservations.filter(r => r.status === 'seated').length;

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
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
            <CalendarCheck className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Reservations Management
            </h1>
            <p className="text-gray-600 text-lg mt-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Manage table reservations and track customer bookings
            </p>
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Today's Reservations</p>
              <p className="text-3xl font-bold">{todayReservations.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Currently Seated</p>
              <p className="text-3xl font-bold">{seatedToday}</p>
            </div>
            <Users className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Upcoming</p>
              <p className="text-3xl font-bold">{upcomingReservations.length}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Available Tables</p>
              <p className="text-3xl font-bold">
                {tables.filter(t => t.status === 'available').length}
              </p>
            </div>
            <Plus className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <StandardizedButton
          onClick={() => {
            setReservationType('table');
            setOpenReservationDialog(true);
          }}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
        >
          <Car className="h-4 w-4" />
          New Table Reservation
        </StandardizedButton>
        <StandardizedButton
          onClick={() => {
            setReservationType('room');
            setOpenReservationDialog(true);
          }}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
        >
          <Building className="h-4 w-4" />
          New Room Reservation
        </StandardizedButton>
      </div>

      {/* Reservations List with Glass Effect */}
      <div className="bg-white/90 backdrop-blur-sm border border-white/30 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">All Reservations</h2>
          <ReservationsList
            reservations={reservations}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Unified Reservation Dialog */}
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
