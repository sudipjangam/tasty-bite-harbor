import PaymentMethodSelector from "@/components/Shared/PaymentMethodSelector";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard, QrCode, Smartphone, Wallet } from "lucide-react";

interface CheckoutProps {
  onPaymentSuccess: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ onPaymentSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
  };

  const handleQRPayment = () => {
    setSelectedMethod("qr");
    // Trigger QR payment flow
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Checkout</h2>

      {/* Payment Method Selector */}
      <PaymentMethodSelector
        selectedMethod={selectedMethod}
        onMethodChange={handleMethodChange}
        onQRPayment={handleQRPayment}
      />

      {/* Summary and Action Buttons */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Order Summary</h3>
        {/* Order summary details here */}

        <Button
          onClick={onPaymentSuccess}
          className="w-full mt-4"
          variant="default"
        >
          Complete Payment
        </Button>
      </div>
    </div>
  );
};

export default Checkout;