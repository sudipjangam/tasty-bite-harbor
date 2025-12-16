import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaymentMethodSelector from "@/components/Shared/PaymentMethodSelector";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface OrderPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  orderAmount: number;
  orderId: string;
  onPaymentComplete: () => void;
}

export const OrderPayment: React.FC<OrderPaymentProps> = ({
  isOpen,
  onClose,
  orderAmount,
  orderId,
  onPaymentComplete
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method to continue",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here you would integrate with your payment processing logic
      // For now, we'll just simulate a successful payment
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Payment Successful",
        description: `Order #${orderId} has been paid successfully`,
      });

      onPaymentComplete();
      onClose();
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span>Order Total:</span>
              <span className="font-semibold">₹{orderAmount.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Order ID: {orderId}
            </div>
          </div>

          {/* Payment Method Selection */}
          {/* <PaymentMethodSelector
            selectedMethod={selectedMethod}
            onMethodChange={setSelectedMethod}
          /> */}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handlePayment}>
              Pay Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
