
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Reservation {
  id: string;
  customerName: string;
  date: string;
  time: string;
  guests: number;
  table: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface TodaysReservationsProps {
  reservations?: Reservation[];
}

const TodaysReservations = ({ reservations = [] }: TodaysReservationsProps) => {
  // Sample data if no props provided
  const sampleReservations: Reservation[] = [
    {
      id: "1",
      customerName: "Alex Johnson",
      date: "Mar 16, 2023",
      time: "12:30 PM",
      guests: 4,
      table: "#3",
      status: "confirmed"
    },
    {
      id: "2",
      customerName: "Emily Carter",
      date: "Mar 16, 2023",
      time: "1:00 PM",
      guests: 2,
      table: "#1",
      status: "pending"
    },
    {
      id: "3",
      customerName: "David Smith",
      date: "Mar 16, 2023",
      time: "7:30 PM",
      guests: 6,
      table: "#5",
      status: "confirmed"
    }
  ];

  const displayReservations = reservations.length > 0 ? reservations : sampleReservations;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Today's Reservations</CardTitle>
        <div className="flex space-x-1">
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Upcoming and current bookings</p>
        <div className="space-y-4">
          {displayReservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface ReservationCardProps {
  reservation: Reservation;
}

const ReservationCard = ({ reservation }: ReservationCardProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 border border-gray-100 rounded-md">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <h4 className="font-medium">{reservation.customerName}</h4>
            <div className="ml-2">{getStatusBadge(reservation.status)}</div>
          </div>
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <CalendarDays className="h-4 w-4 mr-1" />
            <span>{reservation.date} • {reservation.time}</span>
          </div>
          <div className="flex items-center mt-1 text-sm text-gray-500">
            <Users className="h-4 w-4 mr-1" />
            <span>{reservation.guests} guests</span>
            <span className="mx-2">•</span>
            <span>Table: {reservation.table}</span>
          </div>
        </div>
        <div className="flex items-center">
          <Button variant="outline" size="sm" className="text-blue-600 text-xs">
            More details
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-1">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TodaysReservations;
