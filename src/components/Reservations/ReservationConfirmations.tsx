import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useReservations } from '@/hooks/useReservations';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Send, Clock } from 'lucide-react';

export const ReservationConfirmations = () => {
  const { reservations } = useReservations();
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);

  const sendConfirmation = async (reservationId: string, method: 'email' | 'sms' | 'both') => {
    setSending(reservationId);
    try {
      const { data, error } = await supabase.functions.invoke('send-reservation-confirmation', {
        body: { reservationId, method }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Confirmation sent via ${method}`,
      });

      // Update reservation to mark confirmation as sent
      await supabase
        .from('table_reservations')
        .update({
          confirmation_sent: true,
          confirmation_sent_at: new Date().toISOString(),
          confirmation_method: method,
        })
        .eq('id', reservationId);

    } catch (error) {
      console.error('Error sending confirmation:', error);
      toast({
        title: 'Error',
        description: 'Failed to send confirmation',
        variant: 'destructive',
      });
    } finally {
      setSending(null);
    }
  };

  const sendReminder = async (reservationId: string) => {
    setSending(reservationId);
    try {
      const { data, error } = await supabase.functions.invoke('send-reservation-reminder', {
        body: { reservationId }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reminder sent successfully',
      });

      // Update reservation to mark reminder as sent
      await supabase
        .from('table_reservations')
        .update({
          reminder_sent: true,
          reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setSending(null);
    }
  };

  const upcomingReservations = reservations.filter(r => 
    r.status === 'confirmed' && 
    new Date(r.reservation_date) >= new Date()
  ).slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Reservation Communications</h2>
        <p className="text-muted-foreground">Send confirmations and reminders</p>
      </div>

      <div className="grid gap-4">
        {upcomingReservations.map((reservation: any) => (
          <Card key={reservation.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{reservation.customer_name}</h3>
                    {reservation.confirmation_sent && (
                      <Badge variant="outline" className="text-green-600">
                        <Mail className="w-3 h-3 mr-1" />
                        Confirmed
                      </Badge>
                    )}
                    {reservation.reminder_sent && (
                      <Badge variant="outline" className="text-blue-600">
                        <Clock className="w-3 h-3 mr-1" />
                        Reminded
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(reservation.reservation_date).toLocaleDateString()} at {reservation.reservation_time}
                  </div>
                  <div className="text-sm">
                    {reservation.customer_phone && <div>Phone: {reservation.customer_phone}</div>}
                    {reservation.customer_email && <div>Email: {reservation.customer_email}</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!reservation.confirmation_sent && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendConfirmation(reservation.id, 'email')}
                        disabled={sending === reservation.id || !reservation.customer_email}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Email
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendConfirmation(reservation.id, 'sms')}
                        disabled={sending === reservation.id || !reservation.customer_phone}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        SMS
                      </Button>
                    </>
                  )}
                  {!reservation.reminder_sent && reservation.confirmation_sent && (
                    <Button
                      size="sm"
                      onClick={() => sendReminder(reservation.id)}
                      disabled={sending === reservation.id}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Send Reminder
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {upcomingReservations.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No upcoming reservations to manage
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
