
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, CheckCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  billingId: string;
  customerName: string;
  customerPhone: string;
  roomName: string;
  checkoutDate: string;
  totalAmount: number;
  restaurantId: string;
  restaurantPhone: string;
}

const CheckoutSuccessDialog: React.FC<CheckoutSuccessDialogProps> = ({
  open,
  onClose,
  billingId,
  customerName,
  customerPhone,
  roomName,
  checkoutDate,
  totalAmount,
  restaurantId,
  restaurantPhone
}) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const { toast } = useToast();

  const handleSendEmail = async () => {
    if (!customerEmail) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter an email address to send the bill'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Email',
        description: 'Please enter a valid email address'
      });
      return;
    }
    
    setIsSendingEmail(true);
    
    try {
      // Fetch restaurant details
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('name, address, phone')
        .eq('id', restaurantId)
        .single();
      
      if (restaurantError) {
        console.error('Error fetching restaurant data:', restaurantError);
      }
      
      const restaurantName = restaurantData?.name || 'Our Hotel';
      
      console.log('Sending Email bill:', {
        billingId,
        email: customerEmail,
        restaurantName,
        customerName,
        total: totalAmount,
        roomName,
        checkoutDate
      });
      
      // Call the Email edge function
      const response = await supabase.functions.invoke('send-email-bill', {
        body: {
          orderId: billingId,
          email: customerEmail,
          customerName,
          restaurantName,
          restaurantAddress: restaurantData?.address || '',
          restaurantPhone: restaurantData?.phone || '',
          total: totalAmount,
          items: [
            { name: `Room: ${roomName}`, quantity: 1, price: totalAmount }
          ],
          tableNumber: roomName,
          orderDate: checkoutDate
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }
      
      console.log('Email bill response:', response.data);
      
      setEmailSent(true);
      toast({
        title: 'Bill Sent',
        description: `Bill has been sent to ${customerEmail} via Email`
      });
    } catch (error) {
      console.error('Error sending Email bill:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send bill via Email. ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  /* FROZEN: WhatsApp sending - Uncomment when Twilio credentials are available
  const handleSendWhatsApp = async () => {
    const phoneToUse = customerPhone || restaurantPhone;
    
    if (!phoneToUse) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No phone number available to send WhatsApp message'
      });
      return;
    }
    
    try {
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single();
      
      const restaurantName = restaurantData?.name || 'Our Restaurant';
      
      const response = await supabase.functions.invoke('send-whatsapp-bill', {
        body: {
          billingId,
          phoneNumber: phoneToUse,
          restaurantName,
          customerName,
          total: totalAmount,
          roomName,
          checkoutDate
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }
      
      toast({
        title: 'Bill Sent',
        description: `Bill has been sent to ${phoneToUse} via WhatsApp`
      });
    } catch (error) {
      console.error('Error sending WhatsApp bill:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send bill via WhatsApp.'
      });
    }
  };
  */

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-background border-border shadow-2xl">
        <DialogHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Checkout Successful!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{customerName}</span> has been checked out successfully from{' '}
              <span className="font-semibold text-foreground">{roomName}</span>.
            </p>
          </div>
          
          <div className="standardized-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Checkout Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium text-foreground">{customerName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Room:</span>
                <span className="font-medium text-foreground">{roomName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Checkout Date:</span>
                <span className="font-medium text-foreground">{checkoutDate}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold text-lg text-primary">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            {emailSent ? (
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300 flex items-center justify-center gap-2 font-medium">
                  <CheckCircle className="h-5 w-5" />
                  Bill sent via Email successfully
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">
                    Send bill to email:
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter customer email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary hover:text-white transition-all duration-200"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Bill via Email
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
        
        <DialogFooter className="pt-6">
          <Button 
            onClick={onClose} 
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg"
          >
            Return to Rooms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutSuccessDialog;
