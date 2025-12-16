
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { RoomReservation } from '@/hooks/useReservations';
import { Calendar, Clock, Phone, Mail, Trash2, Building } from 'lucide-react';
import { format } from 'date-fns';

interface RoomReservationsListProps {
  reservations: RoomReservation[];
  onUpdateStatus: (id: string, status: RoomReservation['status']) => void;
  onDelete: (id: string) => void;
}

const RoomReservationsList: React.FC<RoomReservationsListProps> = ({
  reservations,
  onUpdateStatus,
  onDelete,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const getStatusColor = (status: RoomReservation['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    const startDate = new Date(reservation.start_time).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && startDate === today) ||
      (dateFilter === 'upcoming' && new Date(reservation.start_time) >= new Date());
    
    return matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No room reservations found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} className="border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">{reservation.customer_name}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(reservation.status)}>
                    {reservation.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(new Date(reservation.start_time), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      to {format(new Date(reservation.end_time), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="text-sm font-medium col-span-2">
                    Room: {reservation.rooms?.name || 'N/A'} 
                    {reservation.rooms?.price && ` (₹${reservation.rooms.price}/night)`}
                  </div>
                </div>

                {(reservation.customer_phone || reservation.customer_email) && (
                  <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
                    {reservation.customer_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {reservation.customer_phone}
                      </div>
                    )}
                    {reservation.customer_email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {reservation.customer_email}
                      </div>
                    )}
                  </div>
                )}

                {reservation.notes && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">Notes:</p>
                    <p className="text-sm text-muted-foreground">{reservation.notes}</p>
                  </div>
                )}

                {reservation.special_occasion && (
                  <div className="mb-4">
                    <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                      🎉 {reservation.special_occasion}
                    </Badge>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {reservation.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => onUpdateStatus(reservation.id, 'checked_in')}
                    >
                      Check In
                    </Button>
                  )}
                  {reservation.status === 'checked_in' && (
                    <Button
                      size="sm"
                      onClick={() => onUpdateStatus(reservation.id, 'checked_out')}
                    >
                      Check Out
                    </Button>
                  )}
                  {['pending', 'confirmed'].includes(reservation.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateStatus(reservation.id, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Room Reservation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this room reservation? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(reservation.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomReservationsList;
