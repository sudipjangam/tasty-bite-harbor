
import React, { useState, useEffect, useRef } from 'react';
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
  QrCode,
  Printer,
  Eye
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatIndianCurrency } from "@/utils/formatters";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BillPrint from "./CheckoutComponents/BillPrint";

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
  check_in_time: string;
  room_rate: number;
  additional_charges?: any;
  guest_profile_id: string;
  restaurant_id: string;
}

interface RestaurantData {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  gst_number?: string;
}

interface GuestData {
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
}

const BillingHistory: React.FC<BillingHistoryProps> = ({ restaurantId }) => {
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<BillingRecord | null>(null);
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [foodOrders, setFoodOrders] = useState<any[]>([]);
  const [loadingBillData, setLoadingBillData] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBillings = async () => {
      try {
        // Fetch check-ins data for billing history
        const { data, error } = await supabase
          .from('check_ins')
          .select(`
            *,
            rooms(name),
            guest_profiles(guest_name, guest_phone, guest_email),
            reservations(*)
          `)
          .eq('restaurant_id', restaurantId)
          .eq('status', 'checked_out')
          .not('actual_check_out', 'is', null)
          .order('actual_check_out', { ascending: false });

        if (error) throw error;

        // Transform data to match BillingRecord interface
        const formattedData = data.map(item => ({
          id: item.id,
          reservation_id: item.reservation_id,
          room_id: item.room_id,
          customer_name: item.guest_profiles?.guest_name || 'Unknown Guest',
          checkout_date: item.actual_check_out,
          total_amount: item.room_rate * Math.ceil((new Date(item.actual_check_out).getTime() - new Date(item.check_in_time).getTime()) / (1000 * 60 * 60 * 24)),
          payment_method: 'cash', // Default since we don't have this in check_ins
          payment_status: 'completed', // Default since checkout is completed
          room_name: item.rooms?.name,
          check_in_time: item.check_in_time,
          room_rate: item.room_rate,
          additional_charges: item.additional_charges,
          guest_profile_id: item.guest_profile_id,
          restaurant_id: item.restaurant_id
        }));

        setBillings(formattedData);
      } catch (error) {
        console.error('Error fetching billing history:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRestaurantData = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('name, address, phone, email, gst_number')
          .eq('id', restaurantId)
          .single();

        if (error) throw error;
        setRestaurantData(data);
      } catch (error) {
        console.error('Error fetching restaurant data:', error);
      }
    };

    fetchBillings();
    fetchRestaurantData();
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

  const fetchBillData = async (billing: BillingRecord) => {
    setLoadingBillData(true);
    try {
      // Fetch guest data
      const { data: guestData, error: guestError } = await supabase
        .from('guest_profiles')
        .select('*')
        .eq('id', billing.guest_profile_id)
        .single();

      if (guestError) throw guestError;
      setGuestData(guestData);

      // Fetch food orders for this room/guest during the stay
      const { data: orders, error: ordersError } = await supabase
        .from('room_orders')
        .select('*')
        .eq('room_id', billing.room_id)
        .gte('created_at', billing.check_in_time)
        .lte('created_at', billing.checkout_date);

      if (!ordersError && orders) {
        setFoodOrders(orders);
      } else {
        setFoodOrders([]);
      }

      setSelectedBilling(billing);
    } catch (error) {
      console.error('Error fetching bill data:', error);
      setGuestData(null);
      setFoodOrders([]);
      setSelectedBilling(billing);
    } finally {
      setLoadingBillData(false);
    }
  };

  const handlePrintBill = () => {
    if (billRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Bill - ${selectedBilling?.customer_name}</title>
              <style>
                body { margin: 0; padding: 0; }
                @media print {
                  body { -webkit-print-color-adjust: exact; }
                }
              </style>
            </head>
            <body>
              ${billRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const calculateDaysStayed = (checkIn: string, checkOut: string) => {
    const days = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return days || 1;
  };

  const calculateRoomCharges = (billing: BillingRecord) => {
    const daysStayed = calculateDaysStayed(billing.check_in_time, billing.checkout_date);
    return billing.room_rate * daysStayed;
  };

  const getAdditionalCharges = (billing: BillingRecord) => {
    if (!billing.additional_charges) return [];
    
    try {
      const charges = Array.isArray(billing.additional_charges) 
        ? billing.additional_charges 
        : JSON.parse(billing.additional_charges);
      
      return charges.map((charge: any) => ({
        name: charge.name || charge.description || 'Additional Charge',
        amount: charge.amount || 0
      }));
    } catch {
      return [];
    }
  };

  return (
    <TooltipProvider>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billings.map((billing) => {
                  const { formatted, actual } = formatIndianCurrency(billing.total_amount);
                  return (
                    <TableRow key={billing.id}>
                      <TableCell>{format(new Date(billing.checkout_date), 'PPP')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{billing.room_name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{billing.customer_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(billing.payment_method)}
                          <span className="capitalize">{billing.payment_method}</span>
                          <Badge 
                            variant={billing.payment_status === 'completed' ? 'default' : 'secondary'}
                            className="ml-2"
                          >
                            {billing.payment_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-semibold cursor-help text-emerald-600 dark:text-emerald-400">
                              {formatted}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Exact amount: {actual}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => fetchBillData(billing)}
                                disabled={loadingBillData}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {loadingBillData ? 'Loading...' : 'View'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
                              <DialogHeader>
                                <div className="flex items-center justify-between">
                                  <DialogTitle>Bill Preview</DialogTitle>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm">
                                      Save as PDF
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={handlePrintBill}
                                      disabled={!selectedBilling}
                                    >
                                      <Printer className="h-4 w-4 mr-1" />
                                      Print
                                    </Button>
                                  </div>
                                </div>
                              </DialogHeader>
                              <div className="overflow-auto max-h-[calc(90vh-120px)]">
                                {selectedBilling && restaurantData && guestData && (
                                  <div className="scale-75 origin-top-left w-[133%]">
                                    <BillPrint
                                      ref={billRef}
                                      restaurantName={restaurantData.name}
                                      restaurantAddress={restaurantData.address}
                                      restaurantPhone={restaurantData.phone}
                                      restaurantEmail={restaurantData.email}
                                      gstNumber={restaurantData.gst_number}
                                      customerName={selectedBilling.customer_name}
                                      customerPhone={guestData.guest_phone || ''}
                                      customerEmail={guestData.guest_email}
                                      roomName={selectedBilling.room_name || 'N/A'}
                                      checkInDate={format(new Date(selectedBilling.check_in_time), 'MMMM do, yyyy')}
                                      checkOutDate={format(new Date(selectedBilling.checkout_date), 'MMMM do, yyyy')}
                                      daysStayed={calculateDaysStayed(selectedBilling.check_in_time, selectedBilling.checkout_date)}
                                      roomPrice={selectedBilling.room_rate}
                                      roomCharges={calculateRoomCharges(selectedBilling)}
                                      foodOrders={foodOrders}
                                      additionalCharges={getAdditionalCharges(selectedBilling)}
                                      serviceCharge={0}
                                      discount={0}
                                      grandTotal={selectedBilling.total_amount}
                                      paymentMethod={selectedBilling.payment_method}
                                      billId={selectedBilling.id}
                                      billDate={format(new Date(selectedBilling.checkout_date), 'dd/MM/yyyy')}
                                    />
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center">No billing records found.</p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default BillingHistory;
