
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { 
  Calendar, 
  Filter, 
  Download, 
  Eye, 
  MapPin, 
  Users, 
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Globe
} from "lucide-react";

interface ConsolidatedBooking {
  id: string;
  channel_name: string;
  channel_type: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  room_type: string;
  guests: number;
  total_amount: number;
  status: string;
  booking_reference: string;
  commission_amount: number;
  created_at: string;
}

const BookingConsolidation = () => {
  const { restaurantId } = useRestaurantId();
  const [filters, setFilters] = useState({
    dateRange: "today",
    channel: "all",
    status: "all"
  });

  // Simulated data - in real implementation, this would come from your booking sources table
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["consolidated-bookings", restaurantId, filters],
    queryFn: async () => {
      // This would be a complex query joining booking_sources, reservations, and booking_channels
      const mockBookings: ConsolidatedBooking[] = [
        {
          id: "1",
          channel_name: "Booking.com",
          channel_type: "ota",
          guest_name: "John Smith",
          check_in: "2025-06-15",
          check_out: "2025-06-17",
          room_type: "Deluxe Suite",
          guests: 2,
          total_amount: 6000,
          status: "confirmed",
          booking_reference: "BDC123456",
          commission_amount: 900,
          created_at: "2025-06-14T10:30:00Z"
        },
        {
          id: "2",
          channel_name: "Direct Website",
          channel_type: "direct",
          guest_name: "Sarah Johnson",
          check_in: "2025-06-16",
          check_out: "2025-06-18",
          room_type: "Standard Room",
          guests: 1,
          total_amount: 4500,
          status: "pending",
          booking_reference: "DIR789012",
          commission_amount: 0,
          created_at: "2025-06-14T14:15:00Z"
        },
        {
          id: "3",
          channel_name: "Agoda",
          channel_type: "ota",
          guest_name: "Mike Chen",
          check_in: "2025-06-17",
          check_out: "2025-06-19",
          room_type: "Premium Suite",
          guests: 3,
          total_amount: 8000,
          status: "confirmed",
          booking_reference: "AGO345678",
          commission_amount: 1440,
          created_at: "2025-06-14T16:45:00Z"
        }
      ];
      
      return mockBookings;
    },
    enabled: !!restaurantId
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "cancelled": return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getChannelBadgeColor = (type: string) => {
    switch (type) {
      case "ota": return "bg-blue-500 text-white";
      case "direct": return "bg-green-500 text-white";
      case "gds": return "bg-purple-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_amount, 0);
  const totalCommission = bookings.reduce((sum, booking) => sum + booking.commission_amount, 0);
  const netRevenue = totalRevenue - totalCommission;

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{bookings.length}</div>
            <div className="text-sm text-muted-foreground">Total Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Gross Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">₹{totalCommission.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Commission</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">₹{netRevenue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Net Revenue</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Booking Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Date Range</label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Channel</label>
              <Select value={filters.channel} onValueChange={(value) => setFilters({...filters, channel: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="ota">OTA Only</SelectItem>
                  <SelectItem value="direct">Direct Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Consolidated Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(booking.status)}
                      <Badge className={getChannelBadgeColor(booking.channel_type)}>
                        {booking.channel_name}
                      </Badge>
                      <span className="font-semibold">{booking.guest_name}</span>
                      <span className="text-sm text-muted-foreground">
                        Ref: {booking.booking_reference}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{booking.room_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{booking.guests} guests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">₹{booking.total_amount.toLocaleString()}</span>
                        {booking.commission_amount > 0 && (
                          <span className="text-red-500 text-xs">(-₹{booking.commission_amount.toLocaleString()})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingConsolidation;
