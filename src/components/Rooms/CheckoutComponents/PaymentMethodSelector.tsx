
import React from 'react';
import { Button } from "@/components/ui/button";
import { Banknote, CreditCard, QrCode } from 'lucide-react';

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ 
  selectedMethod, 
  onMethodChange 
}) => {
  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Payment Method</h3>
      <div className="flex gap-3">
        <Button
          type="button"
          variant={selectedMethod === 'cash' ? 'default' : 'outline'}
          className="flex items-center gap-2"
          onClick={() => onMethodChange('cash')}
        >
          <Banknote className="h-4 w-4" />
          Cash
        </Button>
        <Button
          type="button"
          variant={selectedMethod === 'card' ? 'default' : 'outline'}
          className="flex items-center gap-2"
          onClick={() => onMethodChange('card')}
        >
          <CreditCard className="h-4 w-4" />
          Card
        </Button>
        <Button
          type="button"
          variant={selectedMethod === 'online' ? 'default' : 'outline'}
          className="flex items-center gap-2"
          onClick={() => onMethodChange('online')}
        >
          <QrCode className="h-4 w-4" />
          Online/QR
        </Button>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
