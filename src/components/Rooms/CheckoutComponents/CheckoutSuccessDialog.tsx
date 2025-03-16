
import React from 'react';
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CheckoutSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  hasSpecialOccasion: boolean;
  hasMarketingConsent: boolean;
  specialOccasionType: string | null;
  customerPhone: string | null;
  sendWhatsappBill: boolean;
  whatsappSending: boolean;
  onSendWhatsAppBill: () => void;
}

const CheckoutSuccessDialog: React.FC<CheckoutSuccessDialogProps> = ({
  open,
  onOpenChange,
  onDone,
  hasSpecialOccasion,
  hasMarketingConsent,
  specialOccasionType,
  customerPhone,
  sendWhatsappBill,
  whatsappSending,
  onSendWhatsAppBill
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checkout Completed</DialogTitle>
          <DialogDescription>
            The room has been checked out successfully and marked for cleaning.
            {hasSpecialOccasion && hasMarketingConsent && (
              <p className="mt-2">
                A special promotion has been created for the guest's {specialOccasionType}.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {customerPhone && sendWhatsappBill && (
          <div className="py-4">
            <Button 
              onClick={onSendWhatsAppBill} 
              disabled={whatsappSending}
              className="w-full"
              variant="secondary"
            >
              <Send className="mr-2 h-4 w-4" />
              {whatsappSending ? "Sending..." : "Send Bill to WhatsApp"}
            </Button>
          </div>
        )}
        
        <DialogFooter>
          <Button onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutSuccessDialog;
