import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  User,
  Phone,
  MessageSquare,
  CreditCard,
  Loader2,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface CustomerInfo {
  name: string;
  phone: string;
  specialInstructions?: string;
}

interface CheckoutFormProps {
  orderData: any;
  onBack: () => void;
  onSubmit: (customerInfo: CustomerInfo) => Promise<void>;
}

export const CheckoutForm = ({
  orderData,
  onBack,
  onSubmit,
}: CheckoutFormProps) => {
  const { items, subtotal, serviceCharge, total } = useCart();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    phone: "",
    specialInstructions: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!customerInfo.name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!customerInfo.phone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    if (!/^\d{10}$/.test(customerInfo.phone.replace(/\s/g, ""))) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(customerInfo);
    } catch (err: any) {
      setError(err.message || "Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      {/* Order Location Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {orderData.entityType === "table" ? "Table" : "Room"}:
            </span>
            <span className="font-semibold">{orderData.entityName}</span>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="w-4 h-4 inline mr-2" />
                Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={customerInfo.name}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, name: e.target.value })
                }
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={customerInfo.phone}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, phone: e.target.value })
                }
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label htmlFor="instructions">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Special Instructions (Optional)
              </Label>
              <Textarea
                id="instructions"
                placeholder="Any dietary preferences or special requests..."
                value={customerInfo.specialInstructions}
                onChange={(e) =>
                  setCustomerInfo({
                    ...customerInfo,
                    specialInstructions: e.target.value,
                  })
                }
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service Charge</span>
                <span className="font-medium">₹{serviceCharge.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-purple-600">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Notice */}
      <Alert>
        <CreditCard className="w-4 h-4" />
        <AlertDescription>
          You will be redirected to payment gateway to complete the payment
          securely.
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <Button
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Proceed to Payment (₹{total.toFixed(2)})
          </>
        )}
      </Button>
    </div>
  );
};
