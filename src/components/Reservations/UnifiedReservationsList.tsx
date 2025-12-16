import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TableReservation } from '@/types/reservations';
import { RoomReservation } from '@/hooks/useReservations';
import { 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  Trash2, 
  Building, 
  Users,
  UtensilsCrossed,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

// Unified type for both reservations
type UnifiedReservation = 
  | (TableReservation & { type: 'table'; restaurant_tables?: { name: string; capacity: number } })
  | (RoomReservation & { type: 'room' });

interface UnifiedReservationsListProps {
  tableReservations: (TableReservation & { restaurant_tables?: { name: string; capacity: number } })[];
  roomReservations: RoomReservation[];
  onUpdateTableStatus: (id: string, status: TableReservation['status']) => void;
  onUpdateRoomStatus: (id: string, status: RoomReservation['status'], room_id: string) => void;
  onDeleteTable: (id: string) => void;
  onDeleteRoom: (id: string) => void;
}

const UnifiedReservationsList: React.FC<UnifiedReservationsListProps> = ({
  tableReservations,
  roomReservations,
  onUpdateTableStatus,
  onUpdateRoomStatus,
  onDeleteTable,
  onDeleteRoom,
}) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');

  // Combine and sort reservations
  const combinedReservations = useMemo(() => {
    const tables: UnifiedReservation[] = tableReservations.map(r => ({ ...r, type: 'table' as const }));
    const rooms: UnifiedReservation[] = roomReservations.map(r => ({ ...r, type: 'room' as const }));
    
    const all = [...tables, ...rooms];
    
    // Sort by date (most recent first for today, upcoming first for future)
    return all.sort((a, b) => {
      const dateA = a.type === 'table' ? parseISO(a.reservation_date) : parseISO(a.start_time);
      const dateB = b.type === 'table' ? parseISO(b.reservation_date) : parseISO(b.start_time);
      return dateA.getTime() - dateB.getTime();
    });
  }, [tableReservations, roomReservations]);

  // Filter reservations
  const filteredReservations = useMemo(() => {
    return combinedReservations.filter(r => {
      // Type filter
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      
      // Date filter
      const reservationDate = r.type === 'table' 
        ? parseISO(r.reservation_date) 
        : parseISO(r.start_time);
      
      if (dateFilter === 'today' && !isToday(reservationDate)) return false;
      if (dateFilter === 'tomorrow' && !isTomorrow(reservationDate)) return false;
      if (dateFilter === 'upcoming' && isPast(reservationDate) && !isToday(reservationDate)) return false;
      
      return true;
    });
  }, [combinedReservations, typeFilter, statusFilter, dateFilter]);

  const getStatusBadge = (status: string, type: 'table' | 'room') => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
      seated: 'bg-green-50 text-green-700 border-green-200',
      checked_in: 'bg-green-50 text-green-700 border-green-200',
      completed: 'bg-gray-50 text-gray-600 border-gray-200',
      checked_out: 'bg-gray-50 text-gray-600 border-gray-200',
      cancelled: 'bg-red-50 text-red-600 border-red-200',
      no_show: 'bg-orange-50 text-orange-600 border-orange-200',
    };

    return (
      <Badge variant="outline" className={`${statusColors[status] || 'bg-gray-50'} font-medium`}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatReservationTime = (reservation: UnifiedReservation) => {
    if (reservation.type === 'table') {
      return `${format(parseISO(reservation.reservation_date), 'MMM dd')} at ${reservation.reservation_time}`;
    } else {
      const start = parseISO(reservation.start_time);
      const end = parseISO(reservation.end_time);
      return `${format(start, 'MMM dd')} → ${format(end, 'MMM dd')}`;
    }
  };

  const renderTableReservation = (reservation: TableReservation & { type: 'table'; restaurant_tables?: { name: string; capacity: number } }) => (
    <Card 
      key={reservation.id} 
      className="border-0 bg-gradient-to-r from-slate-50/80 via-white/60 to-blue-50/40 dark:from-slate-800/50 dark:via-gray-800/30 dark:to-blue-900/20 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 dark:border-gray-700/30"
    >
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Section - Customer Info */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40">
              <UtensilsCrossed className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{reservation.customer_name}</h3>
                {getStatusBadge(reservation.status, 'table')}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatReservationTime(reservation)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {reservation.party_size} guests
                </span>
                {reservation.restaurant_tables && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                    {reservation.restaurant_tables.name}
                  </Badge>
                )}
              </div>
              {(reservation.customer_phone || reservation.customer_email) && (
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  {reservation.customer_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {reservation.customer_phone}
                    </span>
                  )}
                  {reservation.customer_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {reservation.customer_email}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {reservation.status === 'confirmed' && (
              <Button
                size="sm"
                onClick={() => onUpdateTableStatus(reservation.id, 'seated')}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <LogIn className="h-4 w-4 mr-1" />
                Seat
              </Button>
            )}
            {reservation.status === 'seated' && (
              <Button
                size="sm"
                onClick={() => onUpdateTableStatus(reservation.id, 'completed')}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
            {['pending', 'confirmed'].includes(reservation.status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateTableStatus(reservation.id, 'cancelled')}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this table reservation? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteTable(reservation.id)} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderRoomReservation = (reservation: RoomReservation & { type: 'room' }) => (
    <Card 
      key={reservation.id} 
      className="border-0 bg-gradient-to-r from-purple-50/80 via-pink-50/60 to-fuchsia-50/40 dark:from-purple-900/30 dark:via-pink-900/20 dark:to-fuchsia-900/20 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100/50 dark:border-purple-700/30"
    >
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Section - Guest Info */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{reservation.customer_name}</h3>
                {getStatusBadge(reservation.status, 'room')}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatReservationTime(reservation)}
                </span>
                {reservation.rooms && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    {reservation.rooms.name}
                  </Badge>
                )}
                {reservation.rooms?.price && (
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    ₹{reservation.rooms.price}/night
                  </span>
                )}
              </div>
              {(reservation.customer_phone || reservation.customer_email) && (
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  {reservation.customer_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {reservation.customer_phone}
                    </span>
                  )}
                  {reservation.customer_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {reservation.customer_email}
                    </span>
                  )}
                </div>
              )}
              {reservation.special_occasion && (
                <Badge variant="outline" className="mt-2 bg-pink-50 text-pink-700 border-pink-200">
                  🎉 {reservation.special_occasion}
                </Badge>
              )}
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {reservation.status === 'confirmed' && (
              <Button
                size="sm"
                onClick={() => onUpdateRoomStatus(reservation.id, 'checked_in', reservation.room_id)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <LogIn className="h-4 w-4 mr-1" />
                Check In
              </Button>
            )}
            {reservation.status === 'checked_in' && (
              <Button
                size="sm"
                onClick={() => onUpdateRoomStatus(reservation.id, 'checked_out', reservation.room_id)}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Check Out
              </Button>
            )}
            {['pending', 'confirmed'].includes(reservation.status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateRoomStatus(reservation.id, 'cancelled', reservation.room_id)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this room reservation? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteRoom(reservation.id)} className="bg-red-500 hover:bg-red-600">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl backdrop-blur-sm">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="table">🍽️ Tables</SelectItem>
            <SelectItem value="room">🏨 Rooms</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="seated">Seated</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="tomorrow">Tomorrow</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="all">All Dates</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="px-2 py-1 bg-blue-100/50 dark:bg-blue-900/30 rounded">
            🍽️ {tableReservations.length} tables
          </span>
          <span className="px-2 py-1 bg-purple-100/50 dark:bg-purple-900/30 rounded">
            🏨 {roomReservations.length} rooms
          </span>
        </div>
      </div>

      {/* Reservations List */}
      {filteredReservations.length === 0 ? (
        <Card className="border-0 bg-white/50 dark:bg-gray-800/50">
          <CardContent className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <Calendar className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              No reservations found for the selected filters.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your filters or create a new reservation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredReservations.map(reservation => 
            reservation.type === 'table' 
              ? renderTableReservation(reservation)
              : renderRoomReservation(reservation)
          )}
        </div>
      )}
    </div>
  );
};

export default UnifiedReservationsList;
