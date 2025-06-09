
import React from "react";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { PageHeader } from "@/components/Layout/PageHeader";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { useReservations } from "@/hooks/useReservations";
import { useTables } from "@/hooks/useTables";
import ReservationsList from "@/components/Tables/ReservationsList";
import ReservationDialog from "@/components/Tables/ReservationDialog";
import { Plus, Calendar, Users, Clock } from "lucide-react";
import { useState } from "react";

const Reservations = () => {
  const { user } = useSimpleAuth();
  const { 
    reservations, 
    isLoading, 
    createReservation, 
    updateReservationStatus, 
    deleteReservation 
  } = useReservations();
  const { tables } = useTables();
  
  const [openReservationDialog, setOpenReservationDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  const handleCreateReservation = async (data) => {
    if (!selectedTable) return;
    
    try {
      await createReservation.mutateAsync({
        ...data,
        table_id: selectedTable.id,
      });
      setOpenReservationDialog(false);
      setSelectedTable(null);
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
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <PageHeader
        title="Reservations Management"
        description="Manage table reservations and track customer bookings"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StandardizedCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Reservations</p>
              <p className="text-2xl font-bold text-blue-600">{todayReservations.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </StandardizedCard>
        
        <StandardizedCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Currently Seated</p>
              <p className="text-2xl font-bold text-green-600">{seatedToday}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </StandardizedCard>
        
        <StandardizedCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Upcoming</p>
              <p className="text-2xl font-bold text-purple-600">{upcomingReservations.length}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </StandardizedCard>
        
        <StandardizedCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available Tables</p>
              <p className="text-2xl font-bold text-orange-600">
                {tables.filter(t => t.status === 'available').length}
              </p>
            </div>
            <Plus className="h-8 w-8 text-orange-500" />
          </div>
        </StandardizedCard>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <StandardizedButton
          onClick={() => {
            if (tables.length > 0) {
              setSelectedTable(tables[0]);
              setOpenReservationDialog(true);
            }
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Reservation
        </StandardizedButton>
      </div>

      {/* Reservations List */}
      <StandardizedCard>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">All Reservations</h2>
          <ReservationsList
            reservations={reservations}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDelete}
          />
        </div>
      </StandardizedCard>

      {/* Reservation Dialog */}
      {selectedTable && (
        <ReservationDialog
          isOpen={openReservationDialog}
          onOpenChange={setOpenReservationDialog}
          table={selectedTable}
          onSubmit={handleCreateReservation}
        />
      )}
    </div>
  );
};

export default Reservations;
