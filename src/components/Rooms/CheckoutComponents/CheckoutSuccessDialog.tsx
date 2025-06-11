
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Send, CheckCircle, Phone } from "lucide-react";
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
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);
  const { toast } = useToast();

  const handleSendWhatsApp = async () => {
    // Use customer phone if available, otherwise use restaurant phone
    const phoneToUse = customerPhone || restaurantPhone;
    
    if (!phoneToUse) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No phone number available to send WhatsApp message'
      });
      return;
    }
    
    setIsSendingWhatsApp(true);
    
    try {
      // Fetch restaurant name
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('name, address')
        .eq('id', restaurantId)
        .single();
      
      if (restaurantError) {
        console.error('Error fetching restaurant data:', restaurantError);
      }
      
      const restaurantName = restaurantData?.name || 'Our Restaurant';
      
      console.log('Sending WhatsApp bill:', {
        billingId,
        phoneNumber: phoneToUse,
        restaurantName,
        customerName,
        total: totalAmount,
        roomName,
        checkoutDate
      });
      
      // Call the WhatsApp edge function
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
      
      console.log('WhatsApp bill response:', response.data);
      
      setWhatsAppSent(true);
      toast({
        title: 'Bill Sent',
        description: `Bill has been sent to ${phoneToUse} via WhatsApp`
      });
    } catch (error) {
      console.error('Error sending WhatsApp bill:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send bill via WhatsApp. ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

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
          
          <div className="text-center">
            {whatsAppSent ? (
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300 flex items-center justify-center gap-2 font-medium">
                  <CheckCircle className="h-5 w-5" />
                  Bill sent via WhatsApp successfully
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary hover:text-white transition-all duration-200"
                onClick={handleSendWhatsApp}
                disabled={isSendingWhatsApp}
              >
                {isSendingWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Send Bill via WhatsApp
                  </>
                )}
              </Button>
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
