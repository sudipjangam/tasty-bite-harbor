
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
import { TableReservation } from '@/types/reservations';
import { Calendar, Clock, Users, Phone, Mail, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReservationsListProps {
  reservations: (TableReservation & { restaurant_tables: { name: string; capacity: number } })[];
  onUpdateStatus: (id: string, status: TableReservation['status']) => void;
  onDelete: (id: string) => void;
}

const ReservationsList: React.FC<ReservationsListProps> = ({
  reservations,
  onUpdateStatus,
  onDelete,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const getStatusColor = (status: TableReservation['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'seated':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && reservation.reservation_date === new Date().toISOString().split('T')[0]) ||
      (dateFilter === 'upcoming' && new Date(reservation.reservation_date) >= new Date());
    
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
              <SelectItem value="seated">Seated</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No Show</SelectItem>
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
            <p className="text-muted-foreground">No reservations found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{reservation.customer_name}</CardTitle>
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
                      {format(new Date(reservation.reservation_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{reservation.reservation_time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{reservation.party_size} people</span>
                  </div>
                  <div className="text-sm font-medium">
                    Table: {reservation.restaurant_tables.name}
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

                {reservation.special_requests && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">Special Requests:</p>
                    <p className="text-sm text-muted-foreground">{reservation.special_requests}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {reservation.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => onUpdateStatus(reservation.id, 'seated')}
                    >
                      Mark as Seated
                    </Button>
                  )}
                  {reservation.status === 'seated' && (
                    <Button
                      size="sm"
                      onClick={() => onUpdateStatus(reservation.id, 'completed')}
                    >
                      Complete
                    </Button>
                  )}
                  {reservation.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateStatus(reservation.id, 'no_show')}
                    >
                      No Show
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
                        <AlertDialogTitle>Delete Reservation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this reservation? This action cannot be undone.
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

export default ReservationsList;
