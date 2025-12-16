import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaymentMethodSelector from "@/components/Shared/PaymentMethodSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Receipt } from 'lucide-react';

interface POSPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: any[];
  onSuccess: () => void;
}

export const POSPayment = ({ isOpen, onClose, orderItems, onSuccess }: POSPaymentProps) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showQRPayment, setShowQRPayment] = useState(false);

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05; // 5% tax
  const total = subtotal + tax;

  const handlePayment = async () => {
    // Handle payment processing here
    onSuccess();
    onClose();
  };

  const handleQRPayment = () => {
    setShowQRPayment(true);
    setPaymentMethod('qr');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {/* <div className="flex justify-between text-sm">
                  <span>Tax (5%):</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div> */}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          {/* <PaymentMethodSelector
            selectedMethod={paymentMethod}
            onMethodChange={setPaymentMethod}
            onQRPayment={handleQRPayment}
          /> */}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handlePayment}>
              Pay ₹{total.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
