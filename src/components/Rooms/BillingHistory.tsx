
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
  QrCode,
  Printer,
  Eye
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatIndianCurrency } from "@/utils/formatters";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const handlePrintBill = (billing: BillingRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const { formatted: formattedAmount, actual: actualAmount } = formatIndianCurrency(billing.total_amount);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill - ${billing.customer_name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .bill-details { margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { font-weight: bold; }
            .amount { font-size: 18px; font-weight: bold; color: #2563eb; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            .payment-method { display: inline-flex; align-items: center; gap: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Hotel Bill Receipt</h1>
            <p>Bill ID: ${billing.id}</p>
          </div>
          
          <div class="bill-details">
            <div class="row">
              <span class="label">Guest Name:</span>
              <span>${billing.customer_name}</span>
            </div>
            <div class="row">
              <span class="label">Room:</span>
              <span>${billing.room_name || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Checkout Date:</span>
              <span>${format(new Date(billing.checkout_date), 'PPP')}</span>
            </div>
            <div class="row">
              <span class="label">Payment Method:</span>
              <span class="payment-method">${billing.payment_method.charAt(0).toUpperCase() + billing.payment_method.slice(1)}</span>
            </div>
            <div class="row">
              <span class="label">Payment Status:</span>
              <span>${billing.payment_status.charAt(0).toUpperCase() + billing.payment_status.slice(1)}</span>
            </div>
            <hr>
            <div class="row">
              <span class="label">Total Amount:</span>
              <span class="amount">${actualAmount}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for staying with us!</p>
            <p>Generated on ${format(new Date(), 'PPP')}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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
                                  onClick={() => handlePrintBill(billing)} 
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
                            onClick={() => handlePrintBill(billing)}
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
    </TooltipProvider>
  );
};

export default BillingHistory;
