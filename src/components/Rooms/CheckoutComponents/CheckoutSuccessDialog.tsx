
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Send } from "lucide-react";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <Check className="h-6 w-6 text-green-500" />
            <span>Checkout Successful</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          <div className="space-y-4">
            <p className="text-center">
              <span className="font-semibold">{customerName}</span> has been checked out successfully from <span className="font-semibold">{roomName}</span>.
            </p>
            
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm mb-2">Checkout Summary:</p>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-medium">{customerName}</span>
                </li>
                <li className="flex justify-between">
                  <span>Room:</span>
                  <span className="font-medium">{roomName}</span>
                </li>
                <li className="flex justify-between">
                  <span>Checkout Date:</span>
                  <span className="font-medium">{checkoutDate}</span>
                </li>
                <li className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                </li>
              </ul>
            </div>
            
            <div className="text-center">
              {whatsAppSent ? (
                <p className="text-green-600 flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  Bill sent via WhatsApp successfully
                </p>
              ) : (
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={handleSendWhatsApp}
                  disabled={isSendingWhatsApp}
                >
                  {isSendingWhatsApp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Bill via WhatsApp
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            Return to Rooms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutSuccessDialog;
