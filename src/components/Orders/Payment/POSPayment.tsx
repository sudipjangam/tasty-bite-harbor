import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PaymentMethodSelector from "@/components/Shared/PaymentMethodSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Receipt } from 'lucide-react';
import { useCurrencyContext } from '@/contexts/CurrencyContext';

interface POSPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  orderItems: any[];
  onSuccess: () => void;
}

export const POSPayment = ({ isOpen, onClose, orderItems, onSuccess }: POSPaymentProps) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showQRPayment, setShowQRPayment] = useState(false);

  // Calculate subtotal considering weight-based pricing
  const subtotal = orderItems.reduce((sum, item) => {
    // Use calculatedPrice for weight-based items, otherwise price * quantity
    if (item.calculatedPrice !== undefined) {
      return sum + item.calculatedPrice;
    }
    return sum + (item.price * item.quantity);
  }, 0);
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
                {orderItems.map((item) => {
                  const itemTotal = item.calculatedPrice ?? (item.price * item.quantity);
                  const isWeightBased = item.pricingType && item.pricingType !== 'fixed';
                  
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {isWeightBased && item.actualQuantity ? (
                          <>{item.actualQuantity} {item.unit} {item.name}</>
                        ) : (
                          <>{item.quantity}x {item.name}</>
                        )}
                        {item.isCustomExtra && <span className="text-purple-600 ml-1">[Custom]</span>}
                      </span>
                      <span>{currencySymbol}{itemTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {/* <div className="flex justify-between text-sm">
                  <span>Tax (5%):</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div> */}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{currencySymbol}{total.toFixed(2)}</span>
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
              Pay {currencySymbol}{total.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
