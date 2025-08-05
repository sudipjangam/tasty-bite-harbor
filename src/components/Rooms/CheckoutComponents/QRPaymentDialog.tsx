import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import QRCode from 'qrcode';
import { 
  QrCode, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  Copy,
  Smartphone,
  Wallet,
  Timer
} from "lucide-react";

interface QRPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentComplete: () => void;
  amount: number;
  customerName: string;
  roomName: string;
  invoiceNumber: string;
  restaurantName: string;
  restaurantPhone?: string;
  restaurantId: string;
}

const QRPaymentDialog: React.FC<QRPaymentDialogProps> = ({
  open,
  onClose,
  onPaymentComplete,
  amount,
  customerName,
  roomName,
  invoiceNumber,
  restaurantName,
  restaurantPhone,
  restaurantId
}) => {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [qrData, setQrData] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const { toast } = useToast();

  // Fetch payment settings
  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings', restaurantId],
    enabled: !!restaurantId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Generate UPI payment URL and QR code
  useEffect(() => {
    if (open && paymentSettings?.upi_id) {
      const upiId = paymentSettings.upi_id;
      const payeeName = paymentSettings.upi_name || restaurantName;
      // Format amount to 2 decimal places and ensure it's a valid number
      const formattedAmount = parseFloat(amount.toFixed(2));
      const paymentUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(`Room bill payment - ${invoiceNumber}`)}`;
      
      setQrData(paymentUrl);
      setPaymentStatus('pending');
      setTimeLeft(300);

      // Generate QR code
      QRCode.toDataURL(paymentUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => {
          setQrCodeUrl(url);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [open, amount, restaurantName, invoiceNumber, paymentSettings]);

  // Timer countdown
  useEffect(() => {
    if (open && timeLeft > 0 && paymentStatus === 'pending') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [open, timeLeft, paymentStatus]);

  // Mock payment verification (replace with actual payment gateway integration)
  useEffect(() => {
    if (paymentStatus === 'processing') {
      const verificationTimer = setTimeout(() => {
        // Simulate payment success (replace with actual payment verification)
        setPaymentStatus('completed');
        toast({
          title: "Payment Successful",
          description: `Payment of ₹${amount} completed successfully`,
        });
        setTimeout(() => {
          onPaymentComplete();
        }, 2000);
      }, 3000);
      return () => clearTimeout(verificationTimer);
    }
  }, [paymentStatus, amount, onPaymentComplete, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyUPIId = () => {
    const upiId = paymentSettings?.upi_id || 'merchant@upi';
    navigator.clipboard.writeText(upiId);
    toast({
      title: "UPI ID Copied",
      description: "UPI ID has been copied to clipboard",
    });
  };

  const handleCheckPayment = () => {
    setPaymentStatus('processing');
    toast({
      title: "Checking Payment",
      description: "Verifying your payment...",
    });
  };

  const renderQRCode = () => {
    if (!qrCodeUrl) {
      return (
        <div className="w-48 h-48 bg-white border-4 border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4">
          <div className="text-center">
            <QrCode className="h-20 w-20 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Generating QR Code...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-48 h-48 bg-white border-4 border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4 p-2">
        <img 
          src={qrCodeUrl} 
          alt="UPI Payment QR Code" 
          className="w-full h-full object-contain"
        />
      </div>
    );
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-orange-600';
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing': return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed': return <QrCode className="h-5 w-5 text-red-600" />;
      default: return <QrCode className="h-5 w-5 text-orange-600" />;
    }
  };

  if (!paymentSettings?.upi_id) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Wallet className="h-6 w-6 text-red-600" />
              UPI Payment Not Available
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">
              UPI payment is not configured for this restaurant. Please contact the manager to set up UPI payment settings.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wallet className="h-6 w-6 text-blue-600" />
            UPI/QR Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Amount:</span>
              <span className="font-bold text-lg">₹{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Customer:</span>
              <span className="font-medium">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Room:</span>
              <span className="font-medium">{roomName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Invoice:</span>
              <span className="font-medium">{invoiceNumber}</span>
            </div>
          </div>

          {/* Payment Status */}
          <div className="text-center">
            <div className={`flex items-center justify-center gap-2 mb-2 ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="font-medium capitalize">{paymentStatus}</span>
            </div>
            
            {paymentStatus === 'pending' && (
              <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                <Timer className="h-4 w-4" />
                Time remaining: {formatTime(timeLeft)}
              </div>
            )}
          </div>

          {/* QR Code */}
          {(paymentStatus === 'pending' || paymentStatus === 'processing') && (
            <div className="text-center">
              {renderQRCode()}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Scan QR code with any UPI app to pay
              </p>
              
              {/* UPI Apps */}
              <div className="flex justify-center gap-3 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  GPay
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  PhonePe
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Paytm
                </Badge>
              </div>

              <Separator className="my-4" />

              {/* Manual UPI Payment */}
              <div className="text-left">
                <p className="text-sm font-medium mb-2">Or pay manually using UPI ID:</p>
                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded border">
                  <span className="text-sm font-mono flex-1">
                    {paymentSettings?.upi_id || 'merchant@upi'}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyUPIId}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Amount: ₹{amount.toFixed(2)} • Note: {invoiceNumber}
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {paymentStatus === 'completed' && (
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-600 mb-2">Payment Successful!</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your payment of ₹{amount.toFixed(2)} has been processed successfully.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {paymentStatus === 'pending' && (
              <>
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCheckPayment}
                  className="flex-1"
                  disabled={timeLeft <= 0}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Check Payment
                </Button>
              </>
            )}
            
            {paymentStatus === 'processing' && (
              <Button 
                variant="outline" 
                onClick={onClose}
                className="w-full"
                disabled
              >
                Verifying Payment...
              </Button>
            )}
            
            {paymentStatus === 'completed' && (
              <Button 
                onClick={onPaymentComplete}
                className="w-full"
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRPaymentDialog;