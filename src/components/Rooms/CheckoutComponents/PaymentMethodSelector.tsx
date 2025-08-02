
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, QrCode, Smartphone, Wallet } from 'lucide-react';

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  onQRPayment?: () => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ 
  selectedMethod, 
  onMethodChange,
  onQRPayment
}) => {
  const handleQRPayment = () => {
    onMethodChange('qr');
    if (onQRPayment) {
      onQRPayment();
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Payment Method</h3>
      <div className="space-y-3">
        {/* Cash Payment */}
        <Button
          type="button"
          variant={selectedMethod === 'cash' ? 'default' : 'outline'}
          className="w-full justify-start gap-3 h-auto p-4"
          onClick={() => onMethodChange('cash')}
        >
          <Banknote className="h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">Cash Payment</div>
            <div className="text-xs text-gray-500">Pay with cash at checkout</div>
          </div>
        </Button>

        {/* Card Payment */}
        <Button
          type="button"
          variant={selectedMethod === 'card' ? 'default' : 'outline'}
          className="w-full justify-start gap-3 h-auto p-4"
          onClick={() => onMethodChange('card')}
        >
          <CreditCard className="h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">Card Payment</div>
            <div className="text-xs text-gray-500">Credit/Debit card or POS</div>
          </div>
        </Button>

        {/* QR/UPI Payment */}
        <Button
          type="button"
          variant={selectedMethod === 'qr' ? 'default' : 'outline'}
          className="w-full justify-start gap-3 h-auto p-4"
          onClick={handleQRPayment}
        >
          <QrCode className="h-5 w-5" />
          <div className="text-left flex-1">
            <div className="font-medium">UPI/QR Payment</div>
            <div className="text-xs text-gray-500 mb-2">Scan QR code or use UPI apps</div>
            <div className="flex gap-1">
              <Badge variant="secondary" className="text-xs px-2 py-0">
                <Smartphone className="h-3 w-3 mr-1" />
                GPay
              </Badge>
              <Badge variant="secondary" className="text-xs px-2 py-0">
                <Smartphone className="h-3 w-3 mr-1" />
                PhonePe
              </Badge>
              <Badge variant="secondary" className="text-xs px-2 py-0">
                <Wallet className="h-3 w-3 mr-1" />
                Paytm
              </Badge>
            </div>
          </div>
        </Button>

        {/* Online Banking */}
        <Button
          type="button"
          variant={selectedMethod === 'online' ? 'default' : 'outline'}
          className="w-full justify-start gap-3 h-auto p-4"
          onClick={() => onMethodChange('online')}
        >
          <Wallet className="h-5 w-5" />
          <div className="text-left">
            <div className="font-medium">Online Banking</div>
            <div className="text-xs text-gray-500">Net banking or digital wallets</div>
          </div>
        </Button>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
