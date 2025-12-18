import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import type { QRPaymentStepProps } from './types';
import { useCurrencyContext } from '@/contexts/CurrencyContext';

const QRPaymentStep: React.FC<QRPaymentStepProps> = ({
  total,
  qrCodeUrl,
  isProcessing,
  onMarkAsPaid,
  onBack,
}) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  return (
    <div className="space-y-6 p-2">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-2"
        disabled={isProcessing}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Methods
      </Button>

      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Scan to Pay</h2>
        <p className="text-muted-foreground">
          Ask the customer to scan the QR code using any UPI app
          <br />
          (Google Pay, PhonePe, etc.)
        </p>

        {qrCodeUrl ? (
          <div className="flex justify-center my-6">
            <div className="bg-white p-4 rounded-lg shadow-lg border-4 border-gray-200">
              <img src={qrCodeUrl} alt="UPI QR Code" className="w-64 h-64" />
            </div>
          </div>
        ) : (
          <div className="flex justify-center my-6">
            <div className="bg-muted p-4 rounded-lg w-64 h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Generating QR code...</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Amount to be Paid:</p>
          <p className="text-4xl font-bold text-blue-600">{currencySymbol}{total.toFixed(2)}</p>
        </div>
      </div>

      <Button 
        onClick={onMarkAsPaid}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        size="lg"
        disabled={isProcessing}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Verifying Payment...
          </div>
        ) : (
          'Mark as Paid'
        )}
      </Button>
    </div>
  );
};

export default QRPaymentStep;
