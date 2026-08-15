import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, CheckCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  billingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string; // Email from reservation
  roomName: string;
  checkoutDate: string;
  totalAmount: number;
  restaurantId: string;
  restaurantPhone: string;
  roomCharges?: number;
  daysStayed?: number;
  foodOrders?: any[];
  additionalCharges?: {name: string, amount: number}[];
  discountAmount?: number;
  serviceCharge?: number;
  subtotal?: number;
  promotionName?: string;
  manualDiscountPercent?: number;
  whatsappSent?: boolean;
}

const CheckoutSuccessDialog: React.FC<CheckoutSuccessDialogProps> = ({
  open,
  onClose,
  billingId,
  customerName,
  customerPhone,
  customerEmail: initialEmail,
  roomName,
  checkoutDate,
  totalAmount,
  restaurantId,
  restaurantPhone,
  roomCharges = 0,
  daysStayed = 1,
  foodOrders = [],
  additionalCharges = [],
  discountAmount = 0,
  serviceCharge = 0,
  subtotal = 0,
  promotionName,
  manualDiscountPercent,
  whatsappSent = false,
}) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(initialEmail || "");
  const [autoSendAttempted, setAutoSendAttempted] = useState(false);

  const { toast } = useToast();


  // Use ref to track if auto-send was already triggered (to survive re-renders)
  const autoSendTriggeredRef = React.useRef(false);

  // Auto-send email when dialog opens if customer email is available
  useEffect(() => {

    if (open && initialEmail && !autoSendTriggeredRef.current && !emailSent) {
      autoSendTriggeredRef.current = true;
      setAutoSendAttempted(true);

      // Call sendEmail function directly (defined below)
      sendEmailNow();
    } else {
    }
  }, [open, initialEmail, emailSent]);

  // Separate function that can be called immediately
  const sendEmailNow = async () => {
    const emailToSend = initialEmail || customerEmail;

    if (!emailToSend) {
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSend)) {
      return;
    }


    setIsSendingEmail(true);

    try {
      // Fetch restaurant details
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("name, address, phone")
        .eq("id", restaurantId)
        .single();

      if (restaurantError) {
        console.error(
          "📧 [sendEmailNow] Error fetching restaurant:",
          restaurantError
        );
      }

      const restaurantName = restaurantData?.name || "Our Hotel";


      // Call the Email edge function
      const response = await supabase.functions.invoke("send-email-bill", {
        body: {
          orderId: billingId,
          email: emailToSend,
          customerName,
          restaurantId,
          restaurantName,
          restaurantAddress: restaurantData?.address || "",
          restaurantPhone: restaurantData?.phone || "",
          total: totalAmount,
          items: [
            { name: `Room: ${roomName}`, quantity: 1, price: totalAmount },
          ],
          tableNumber: roomName,
          orderDate: checkoutDate,
          includeEnrollment: true,
        },
      });


      if (response.error) {
        console.error(
          "📧 [sendEmailNow] ❌ Edge function error:",
          response.error
        );
        toast({
          variant: "destructive",
          title: "Error Sending Email",
          description: response.error.message || "Failed to send email",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Bill Sent",
          description: `Bill has been sent to ${emailToSend} via Email`,
        });
      }
    } catch (error) {
      console.error("📧 [sendEmailNow] ❌ Exception:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Failed to send email: " +
          (error instanceof Error ? error.message : "Unknown error"),
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendEmail = async () => {

    if (!customerEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter an email address to send the bill",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      // Fetch restaurant details
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("name, address, phone")
        .eq("id", restaurantId)
        .single();

      if (restaurantError) {
        console.error("Error fetching restaurant data:", restaurantError);
      }

      const restaurantName = restaurantData?.name || "Our Hotel";


      // Call the Email edge function
      const response = await supabase.functions.invoke("send-email-bill", {
        body: {
          orderId: billingId,
          email: customerEmail,
          customerName,
          restaurantId, // Include restaurant ID for enrollment link
          restaurantName,
          restaurantAddress: restaurantData?.address || "",
          restaurantPhone: restaurantData?.phone || "",
          total: totalAmount,
          items: [
            { name: `Room: ${roomName}`, quantity: 1, price: totalAmount },
          ],
          tableNumber: roomName,
          orderDate: checkoutDate,
          includeEnrollment: true, // Enable enrollment invitation
        },
      });


      if (response.error) {
        console.error(
          "📧 [handleSendEmail] ❌ Edge function returned error:",
          response.error
        );
        throw new Error(response.error);
      }


      setEmailSent(true);
      toast({
        title: "Bill Sent",
        description: `Bill has been sent to ${customerEmail} via Email`,
      });
    } catch (error) {
      console.error("Error sending Email bill:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          "Failed to send bill via Email. " +
          (error instanceof Error ? error.message : "Unknown error"),
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-background border-border shadow-2xl">
        <DialogHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Checkout Successful!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                {customerName}
              </span>{" "}
              has been checked out successfully from{" "}
              <span className="font-semibold text-foreground">{roomName}</span>.
            </p>
          </div>

          <div className="standardized-card p-6 space-y-4">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Checkout Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium text-foreground">
                  {customerName}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Room:</span>
                <span className="font-medium text-foreground">{roomName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Checkout Date:</span>
                <span className="font-medium text-foreground">
                  {checkoutDate}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold text-lg text-primary">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Email Section */}
            <div className="space-y-3">
              {emailSent ? (
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 font-medium">
                    <CheckCircle className="h-5 w-5" />
                    Bill sent via Email successfully
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block text-muted-foreground">
                      Send bill to email:
                    </label>
                    <Input
                      type="email"
                      placeholder="Enter customer email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-blue-500/30 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-200"
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Bill via Email
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* WhatsApp Section */}
            {(whatsappSent || customerPhone) && (
              <div className="space-y-3 pt-3 border-t border-border/50">
                {whatsappSent ? (
                  <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 font-medium">
                      <CheckCircle className="h-5 w-5" />
                      Bill sent via WhatsApp automatically
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2 text-sm font-medium">
                      Customer phone number not available for WhatsApp.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-6">
          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg"
          >
            Return to Rooms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutSuccessDialog;
