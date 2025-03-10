
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
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
import { format } from 'date-fns';
import { 
  CreditCard, 
  Banknote, 
  QrCode 
} from 'lucide-react';

interface BillingHistoryProps {
  restaurantId: string;
}

interface BillingRecord {
  id: string;
  reservation_id: string;
  room_id: string;
  customer_name: string;
  checkout_date: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  room_name?: string;
}

const BillingHistory: React.FC<BillingHistoryProps> = ({ restaurantId }) => {
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBillings = async () => {
      try {
        const { data, error } = await supabase
          .from('room_billings')
          .select(`
            *,
            rooms(name)
          `)
          .eq('restaurant_id', restaurantId)
          .order('checkout_date', { ascending: false });

        if (error) throw error;

        // Transform data to include room_name
        const formattedData = data.map(item => ({
          ...item,
          room_name: item.rooms?.name
        }));

        setBillings(formattedData);
      } catch (error) {
        console.error('Error fetching billing history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillings();
  }, [restaurantId]);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'online':
        return <QrCode className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Billing History</CardTitle>
        <CardDescription>
          View all past checkout transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center">Loading billing history...</p>
        ) : billings.length > 0 ? (
          <Table>
            <TableCaption>A list of your past checkouts and payments</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billings.map((billing) => (
                <TableRow key={billing.id}>
                  <TableCell>{format(new Date(billing.checkout_date), 'PPP')}</TableCell>
                  <TableCell>{billing.room_name}</TableCell>
                  <TableCell>{billing.customer_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getPaymentMethodIcon(billing.payment_method)}
                      <span className="capitalize">{billing.payment_method}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">₹{billing.total_amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center">No billing records found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingHistory;
