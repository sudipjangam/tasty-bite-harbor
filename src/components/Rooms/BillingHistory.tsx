
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
  Eye,
  Download
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatIndianCurrency } from "@/utils/formatters";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import BillPrint from "./CheckoutComponents/BillPrint";
import { useToast } from "@/hooks/use-toast";

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
  days_stayed?: number;
  room_charges?: number;
  service_charge?: number;
  additional_charges?: any[];
  food_orders_total?: number;
  food_orders_ids?: string[];
  room_price?: number;
  guest_details?: any;
}

const BillingHistory: React.FC<BillingHistoryProps> = ({ restaurantId }) => {
  const [billings, setBillings] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBilling, setSelectedBilling] = useState<BillingRecord | null>(null);
  const [billPreviewOpen, setBillPreviewOpen] = useState(false);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [billData, setBillData] = useState<any>(null);
  const billPrintRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBillings = async () => {
      try {
        const { data, error } = await supabase
          .from('room_billings')
          .select(`
            *,
            rooms(name, price),
            reservations(
              check_in_date,
              guest_name,
              guest_phone,
              guest_email,
              guest_address
            )
          `)
          .eq('restaurant_id', restaurantId)
          .order('checkout_date', { ascending: false });

        if (error) throw error;

        // Transform data to include room_name
        const formattedData = data.map(item => ({
          ...item,
          room_name: item.rooms?.name,
          room_price: item.rooms?.price || 0,
          guest_details: item.reservations || {}
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
          .select('*')
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

  const prepareBillData = async (billing: BillingRecord) => {
    try {
      // Fetch food orders if available
      let foodOrders = [];
      if (billing.food_orders_ids && billing.food_orders_ids.length > 0) {
        const { data: foodOrdersData, error } = await supabase
          .from('orders')
          .select('*')
          .in('id', billing.food_orders_ids);
        
        if (!error && foodOrdersData) {
          foodOrders = foodOrdersData.map(order => ({
            id: order.id,
            created_at: order.created_at,
            items: Array.isArray(order.items) ? order.items : [],
            total: order.total || 0
          }));
        }
      }

      // Calculate check-in date
      const checkInDate = billing.guest_details?.check_in_date 
        ? format(new Date(billing.guest_details.check_in_date), 'dd/MM/yyyy')
        : format(new Date(new Date(billing.checkout_date).getTime() - (billing.days_stayed || 1) * 24 * 60 * 60 * 1000), 'dd/MM/yyyy');

      return {
        restaurantName: restaurantData?.name || 'Hotel/Restaurant',
        restaurantAddress: restaurantData?.address || 'Address not available',
        restaurantPhone: restaurantData?.phone,
        restaurantEmail: restaurantData?.email,
        gstNumber: restaurantData?.gst_number,
        customerName: billing.guest_details?.guest_name || billing.customer_name,
        customerPhone: billing.guest_details?.guest_phone || '',
        customerEmail: billing.guest_details?.guest_email || '',
        customerAddress: billing.guest_details?.guest_address || '',
        roomName: billing.room_name || 'N/A',
        checkInDate,
        checkOutDate: format(new Date(billing.checkout_date), 'dd/MM/yyyy'),
        daysStayed: billing.days_stayed || 1,
        roomPrice: billing.room_price || 0,
        roomCharges: billing.room_charges || 0,
        foodOrders,
        additionalCharges: billing.additional_charges || [],
        serviceCharge: billing.service_charge || 0,
        discount: 0, // Not stored in current billing record
        grandTotal: billing.total_amount,
        paymentMethod: billing.payment_method,
        billId: billing.id,
        billDate: format(new Date(billing.checkout_date), 'dd/MM/yyyy'),
        taxRate: 0, // Will be calculated based on GST
        taxAmount: 0 // Will be calculated based on GST
      };
    } catch (error) {
      console.error('Error preparing bill data:', error);
      return null;
    }
  };

  const handleViewBill = async (billing: BillingRecord) => {
    if (!restaurantData) {
      toast({
        title: "Error",
        description: "Restaurant data not loaded yet. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const billData = await prepareBillData(billing);
    if (billData) {
      setBillData(billData);
      setSelectedBilling(billing);
      setBillPreviewOpen(true);
    }
  };

  const handlePrintBill = () => {
    if (billPrintRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Bill - ${billData?.customerName}</title>
              <style>
                body { margin: 0; padding: 0; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${billPrintRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
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
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Bill Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Guest Name</label>
                                    <p className="font-medium">{billing.customer_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Room</label>
                                    <p className="font-medium">{billing.room_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Checkout Date</label>
                                    <p className="font-medium">{format(new Date(billing.checkout_date), 'PPP')}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                                    <div className="flex items-center gap-2">
                                      {getPaymentMethodIcon(billing.payment_method)}
                                      <span className="capitalize font-medium">{billing.payment_method}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Payment Status</label>
                                    <Badge variant={billing.payment_status === 'completed' ? 'default' : 'secondary'}>
                                      {billing.payment_status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{actual}</p>
                                  </div>
                                </div>
                                <Button 
                                  onClick={() => handleViewBill(billing)} 
                                  className="w-full"
                                  variant="outline"
                                >
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Bill
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewBill(billing)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
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

      {/* Bill Preview Dialog */}
      <Dialog open={billPreviewOpen} onOpenChange={setBillPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Bill Preview</DialogTitle>
            <div className="flex gap-2">
              <Button
                onClick={handlePrintBill}
                variant="outline"
                size="sm"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={() => setBillPreviewOpen(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            {billData && (
              <div className="bg-white rounded-lg" style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
                <BillPrint
                  ref={billPrintRef}
                  {...billData}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default BillingHistory;
