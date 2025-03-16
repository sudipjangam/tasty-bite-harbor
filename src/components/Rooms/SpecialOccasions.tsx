
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, Gift, MessageSquare, RefreshCw } from 'lucide-react';

interface SpecialOccasionsProps {
  restaurantId: string;
}

interface SpecialOccasion {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  special_occasion: string | null;
  special_occasion_date: string | null;
  reservation_id: string;
  room_name: string;
  marketing_consent: boolean;
  status: string | null;
}

const SpecialOccasions: React.FC<SpecialOccasionsProps> = ({ restaurantId }) => {
  const { toast } = useToast();
  const [occasions, setOccasions] = useState<SpecialOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSpecialOccasions();
  }, [restaurantId]);

  const fetchSpecialOccasions = async () => {
    try {
      setLoading(true);

      // Fetch reservations with special occasions
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          customer_name,
          customer_phone,
          special_occasion,
          special_occasion_date,
          marketing_consent,
          status,
          room_id
        `)
        .eq('restaurant_id', restaurantId)
        .not('special_occasion', 'is', null)
        .not('special_occasion_date', 'is', null)
        .order('special_occasion_date', { ascending: true });

      if (error) throw error;

      // Fetch room names for each reservation
      const occasionsWithRoomNames = await Promise.all(
        data.map(async (occasion) => {
          try {
            const { data: roomData, error: roomError } = await supabase
              .from('rooms')
              .select('name')
              .eq('id', occasion.room_id)
              .single();

            if (roomError) throw roomError;

            return {
              ...occasion,
              room_name: roomData?.name || 'Unknown Room',
              reservation_id: occasion.id
            };
          } catch (error) {
            console.error('Error fetching room:', error);
            return {
              ...occasion,
              room_name: 'Unknown Room',
              reservation_id: occasion.id
            };
          }
        })
      );

      setOccasions(occasionsWithRoomNames as SpecialOccasion[]);
    } catch (error) {
      console.error('Error fetching special occasions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load special occasions data.'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendWishesMessage = async (occasion: SpecialOccasion) => {
    if (!occasion.customer_phone || !occasion.marketing_consent) {
      toast({
        variant: 'destructive',
        title: 'Cannot Send Message',
        description: 'Customer has no phone number or has not consented to marketing.'
      });
      return;
    }

    setSendingMessage(occasion.id);
    try {
      const message = `Hello ${occasion.customer_name},\n\nWe wanted to wish you a wonderful ${occasion.special_occasion}! We're honored you chose to spend this special time with us.\n\nBest wishes,\nOur Restaurant Team`;

      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: occasion.customer_phone.replace(/\D/g, ''),
          message: message,
          recipientId: occasion.reservation_id,
          recipientType: 'reservation'
        }
      });

      if (response.error) throw new Error(response.error);

      toast({
        title: 'Message Sent',
        description: `Successfully sent wishes to ${occasion.customer_name}.`
      });
    } catch (error) {
      console.error('Error sending wishes message:', error);
      toast({
        variant: 'destructive',
        title: 'Message Failed',
        description: 'Failed to send wishes message. Please try again.'
      });
    } finally {
      setSendingMessage(null);
    }
  };

  const getOccasionStatus = (occasion: SpecialOccasion) => {
    // Get the special occasion date
    const occasionDate = new Date(occasion.special_occasion_date || '');
    occasionDate.setHours(0, 0, 0, 0);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate days difference
    const diffTime = occasionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'past', label: 'Past' };
    } else if (diffDays === 0) {
      return { status: 'today', label: 'Today' };
    } else if (diffDays <= 7) {
      return { status: 'upcoming', label: `In ${diffDays} day${diffDays > 1 ? 's' : ''}` };
    } else {
      return { status: 'future', label: `In ${diffDays} days` };
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Special Occasions</CardTitle>
          <CardDescription>
            Track and manage guest special occasions and send personalized messages
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSpecialOccasions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">Loading occasions...</div>
        ) : occasions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No special occasions found. Guests can select special occasions when making reservations.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {occasions.map((occasion) => {
                const { status, label } = getOccasionStatus(occasion);
                
                return (
                  <TableRow key={occasion.id}>
                    <TableCell className="font-medium">
                      {occasion.customer_name}
                      {occasion.customer_phone && (
                        <div className="text-xs text-muted-foreground">
                          {occasion.customer_phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {occasion.special_occasion}
                    </TableCell>
                    <TableCell>
                      {occasion.special_occasion_date && 
                        new Date(occasion.special_occasion_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        status === 'today' 
                          ? 'bg-green-100 text-green-800' 
                          : status === 'upcoming' 
                            ? 'bg-blue-100 text-blue-800' 
                            : status === 'past'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {label}
                      </div>
                    </TableCell>
                    <TableCell>{occasion.room_name}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendWishesMessage(occasion)}
                        disabled={!occasion.customer_phone || !occasion.marketing_consent || sendingMessage === occasion.id}
                        className="mr-2"
                      >
                        {sendingMessage === occasion.id ? (
                          "Sending..."
                        ) : (
                          <>
                            <MessageSquare className="h-4 w-4 mr-1" /> Wishes
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialOccasions;
