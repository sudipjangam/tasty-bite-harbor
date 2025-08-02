
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QrCode, User, Clock, CheckCircle } from "lucide-react";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: string;
  special_requests: string;
  restaurant_tables: { name: string };
}

const GuestCheckIn = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();

  const { data: todayReservations = [], isLoading } = useQuery({
    queryKey: ["today-reservations", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("table_reservations")
        .select(`
          *,
          restaurant_tables(name)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("reservation_date", today)
        .order("reservation_time");

      if (error) throw error;
      return data as Reservation[];
    },
    enabled: !!restaurantId,
  });

  const checkInMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const { error } = await supabase
        .from("table_reservations")
        .update({ 
          status: "seated",
          arrival_time: new Date().toISOString()
        })
        .eq("id", reservationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-reservations"] });
      toast({ title: "Guest checked in successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error checking in guest",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredReservations = todayReservations.filter(reservation =>
    reservation.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reservation.customer_phone?.includes(searchQuery)
  );

  const generateQRCode = (reservationId: string) => {
    const qrData = `${window.location.origin}/checkin/${reservationId}`;
    setQrCodeData(qrData);
  };

  if (isLoading) {
    return <div>Loading reservations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Guest Check-In Kiosk</h2>
        <div className="flex gap-2">
          <StandardizedButton variant="secondary">
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Menu
          </StandardizedButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Search Reservations</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Customer Name or Phone</Label>
              <Input
                id="search"
                placeholder="Enter name or phone number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{reservation.customer_name}</h4>
                      <p className="text-sm text-gray-600">
                        {reservation.customer_phone}
                      </p>
                      <p className="text-sm">
                        Table: {reservation.restaurant_tables?.name} • Party of {reservation.party_size}
                      </p>
                      <p className="text-sm">
                        Time: {reservation.reservation_time}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        reservation.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        reservation.status === 'seated' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {reservation.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {reservation.special_requests && (
                    <p className="text-sm text-orange-600">
                      Special Request: {reservation.special_requests}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    {reservation.status === 'confirmed' && (
                      <StandardizedButton
                        size="sm"
                        onClick={() => checkInMutation.mutate(reservation.id)}
                      >
                        <User className="h-3 w-3 mr-1" />
                        Check In
                      </StandardizedButton>
                    )}
                    <StandardizedButton
                      size="sm"
                      variant="secondary"
                      onClick={() => generateQRCode(reservation.id)}
                    >
                      <QrCode className="h-3 w-3 mr-1" />
                      QR Code
                    </StandardizedButton>
                  </div>
                </div>
              ))}
              
              {filteredReservations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? "No reservations found matching your search." : "No reservations for today."}
                </div>
              )}
            </div>
          </div>
        </StandardizedCard>

        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Today's Schedule</h3>
          <div className="space-y-3">
            {todayReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded"
              >
                <div className="flex-shrink-0">
                  {reservation.status === 'seated' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-grow">
                  <p className="font-medium">{reservation.reservation_time}</p>
                  <p className="text-sm text-gray-600">
                    {reservation.customer_name} • Party of {reservation.party_size}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    reservation.status === 'seated' ? 'bg-green-100 text-green-800' :
                    reservation.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {reservation.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </StandardizedCard>
      </div>

      {qrCodeData && (
        <StandardizedCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">QR Code Generated</h3>
          <p className="text-sm text-gray-600">Share this QR code with guests for easy access:</p>
          <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-2">{qrCodeData}</p>
        </StandardizedCard>
      )}
    </div>
  );
};

export default GuestCheckIn;
