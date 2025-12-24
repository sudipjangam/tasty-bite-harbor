/**
 * PaymentMethodSelector - Extracted from PaymentDialog
 * Displays payment method options (Cash, Card, UPI, Room Charge)
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  Wallet,
  QrCode,
  Check,
} from "lucide-react";

interface DetectedReservation {
  reservation_id: string;
  room_id: string;
  roomName: string;
  customerName: string;
}

interface PaymentMethodSelectorProps {
  total: number;
  currencySymbol: string;
  detectedReservation: DetectedReservation | null;
  onMethodSelect: (method: string) => void;
  onBack: () => void;
}

const PaymentMethodSelector = ({
  total,
  currencySymbol,
  detectedReservation,
  onMethodSelect,
  onBack,
}: PaymentMethodSelectorProps) => {
  return (
    <div className="space-y-6 p-2">
      <Button variant="ghost" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Order
      </Button>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Select Payment Method
        </h2>
        <p className="text-lg text-blue-600 dark:text-blue-400 font-semibold">
          Total Amount: {currencySymbol}
          {total.toFixed(2)}
        </p>
      </div>

      {/* Show room charge option if guest is detected */}
      {detectedReservation && (
        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-green-700 dark:text-green-300">
                In-House Guest Detected
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {detectedReservation.customerName} -{" "}
                {detectedReservation.roomName}
              </p>
            </div>
          </div>
          <Button
            onClick={() => onMethodSelect("room")}
            className="w-full h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
          >
            <Receipt className="w-6 h-6 mr-3" />
            Charge to {detectedReservation.roomName}
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        <Button
          variant="outline"
          onClick={() => onMethodSelect("cash")}
          className="w-full h-16 text-lg justify-start hover:bg-accent"
        >
          <Wallet className="w-6 h-6 mr-3" />
          Cash
        </Button>

        <Button
          variant="outline"
          onClick={() => onMethodSelect("card")}
          className="w-full h-16 text-lg justify-start hover:bg-accent"
        >
          <CreditCard className="w-6 h-6 mr-3" />
          Card
        </Button>

        <Button
          variant="outline"
          onClick={() => onMethodSelect("upi")}
          className="w-full h-16 text-lg justify-start border-2 border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
        >
          <QrCode className="w-6 h-6 mr-3" />
          UPI / QR Code
        </Button>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
