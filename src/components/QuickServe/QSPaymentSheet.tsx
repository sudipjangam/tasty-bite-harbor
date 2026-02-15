import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Banknote,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { QSOrderItem } from "./QSOrderPanel";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useAuth } from "@/hooks/useAuth";
import { useCRMSync } from "@/hooks/useCRMSync";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { formatBillText, generateWhatsAppUrl } from "@/utils/billFormatter";
import { Button } from "@/components/ui/button";

interface QSPaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: QSOrderItem[];
  customerName: string;
  customerPhone: string;
  onSuccess: () => void;
}

const paymentMethods = [
  {
    id: "cash",
    label: "Cash",
    icon: Banknote,
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "upi",
    label: "UPI",
    icon: Smartphone,
    color: "from-purple-500 to-indigo-600",
  },
  {
    id: "card",
    label: "Card",
    icon: CreditCard,
    color: "from-blue-500 to-cyan-600",
  },
];

export const QSPaymentSheet: React.FC<QSPaymentSheetProps> = ({
  isOpen,
  onClose,
  items,
  customerName,
  customerPhone,
  onSuccess,
}) => {
  const [status, setStatus] = useState<"idle" | "processing" | "success">(
    "idle",
  );
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [billSent, setBillSent] = useState(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { symbol: currencySymbol } = useCurrencyContext();
  const { restaurantId } = useRestaurantId();
  const { user } = useAuth();
  const { syncCustomerToCRM } = useCRMSync();
  const { toast } = useToast();

  // Fetch restaurant name for bill header
  const { data: restaurantName = "Restaurant" } = useQuery({
    queryKey: ["restaurant-name", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return "Restaurant";
      const { data } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", restaurantId)
        .single();
      return data?.name || "Restaurant";
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 60,
  });

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Build bill text for WhatsApp sharing
  const getBillTextForOrder = () => {
    return formatBillText({
      restaurantName,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      total: subtotal,
      paymentMethod: selectedMethod || "cash",
      customerName: customerName.trim() || undefined,
      currencySymbol,
    });
  };

  const handleSendWhatsApp = () => {
    if (!customerPhone) return;
    const billText = getBillTextForOrder();
    const url = generateWhatsAppUrl(customerPhone, billText);
    window.open(url, "_blank", "noopener,noreferrer");
    setBillSent(true);
    toast({
      title: "WhatsApp Opened",
      description: `Bill ready to send to ${customerPhone}`,
    });
  };

  const handleCloseSuccess = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setStatus("idle");
    setSelectedMethod(null);
    setBillSent(false);
    onSuccess();
    onClose();
  };

  const handlePay = async (method: string) => {
    setSelectedMethod(method);
    setStatus("processing");

    try {
      if (!restaurantId) throw new Error("No restaurant ID");

      const attendantName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email
        : "Staff";

      const finalCustomerName = customerName.trim() || "Walk-in Customer";

      const formattedItems = items.map(
        (item) => `${item.quantity}x ${item.name} @${item.price}`,
      );

      const kitchenItems = items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: [],
      }));

      // 1. Create kitchen order
      const { data: kitchenOrder, error: kitchenError } = await supabase
        .from("kitchen_orders")
        .insert({
          restaurant_id: restaurantId,
          source: `QuickServe`,
          status: "completed",
          items: kitchenItems,
          order_type: "takeaway",
          customer_name: finalCustomerName,
          server_name: attendantName,
          priority: "normal",
        })
        .select()
        .single();

      if (kitchenError) throw kitchenError;

      // 2. Create order record
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          customer_name: finalCustomerName,
          items: formattedItems,
          total: subtotal,
          status: "completed",
          payment_status: "paid",
          source: "pos",
          order_type: "takeaway",
          attendant: attendantName,
          ...(customerPhone && { customer_phone: customerPhone }),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Link kitchen order to order
      if (order?.id && kitchenOrder?.id) {
        await supabase
          .from("kitchen_orders")
          .update({ order_id: order.id })
          .eq("id", kitchenOrder.id);
      }

      // 4. Log POS transaction
      await supabase.from("pos_transactions").insert({
        restaurant_id: restaurantId,
        order_id: order?.id || null,
        kitchen_order_id: kitchenOrder?.id || null,
        amount: subtotal,
        payment_method: method,
        status: "completed",
        customer_name: finalCustomerName || null,
        customer_phone: customerPhone || null,
        staff_id: user?.id || null,
        discount_amount: 0,
      });

      // 5. CRM auto-sync (only when customer name is explicitly provided)
      if (customerName.trim()) {
        try {
          await syncCustomerToCRM({
            customerName: finalCustomerName,
            customerPhone: customerPhone || undefined,
            orderTotal: subtotal,
            orderId: kitchenOrder?.id || undefined,
            source: "quickserve",
          });
        } catch (crmErr) {
          console.error("CRM sync error (non-blocking):", crmErr);
        }
      }

      setStatus("success");
      toast({
        title: "Payment Successful",
        description: `${currencySymbol}${subtotal.toFixed(2)} received via ${method}`,
      });

      // Auto-close after 6s (longer to allow WhatsApp sharing)
      autoCloseTimerRef.current = setTimeout(
        () => {
          handleCloseSuccess();
        },
        customerPhone ? 6000 : 2000,
      );
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: "Could not complete payment. Please try again.",
        variant: "destructive",
      });
      setStatus("idle");
      setSelectedMethod(null);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && status === "idle") onClose();
        if (!open && status === "success") handleCloseSuccess();
      }}
    >
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white p-0 overflow-hidden">
        <DialogTitle className="sr-only">Payment</DialogTitle>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-10 px-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mb-4 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="h-10 w-10 text-green-500 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Payment Complete!
            </h3>
            <p className="text-gray-500 dark:text-white/60 text-sm mb-5">
              {currencySymbol}
              {subtotal.toFixed(2)} via {selectedMethod?.toUpperCase()}
            </p>

            {/* WhatsApp Share Button — only when phone is provided */}
            {customerPhone && (
              <Button
                onClick={handleSendWhatsApp}
                className={cn(
                  "w-full max-w-xs h-12 rounded-xl font-semibold text-sm transition-all active:scale-95",
                  billSent
                    ? "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 border border-gray-200 dark:border-white/10"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25",
                )}
              >
                <MessageCircle className="h-4.5 w-4.5 mr-2" />
                {billSent
                  ? "✓ Bill Sent — Tap to Resend"
                  : `Send Bill via WhatsApp`}
              </Button>
            )}

            {/* Done button */}
            <button
              onClick={handleCloseSuccess}
              className="mt-3 text-xs text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 underline underline-offset-2"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center py-6 px-6 bg-gradient-to-r from-orange-500/10 to-pink-500/10 dark:from-orange-500/20 dark:to-pink-500/20 border-b border-gray-200 dark:border-white/10">
              <p className="text-gray-500 dark:text-white/50 text-xs uppercase tracking-wider mb-1">
                Amount Due
              </p>
              <p className="text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </p>
              <p className="text-gray-400 dark:text-white/40 text-xs mt-1">
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </p>
            </div>

            {/* Payment Methods */}
            <div className="p-6 space-y-3">
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40 font-medium mb-2">
                Select Payment Method
              </p>
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                const isSelected = selectedMethod === pm.id;
                const isProcessing = status === "processing" && isSelected;

                return (
                  <button
                    key={pm.id}
                    onClick={() => handlePay(pm.id)}
                    disabled={status === "processing"}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 active:scale-[0.98]",
                      isProcessing
                        ? "border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10"
                        : "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/15",
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl bg-gradient-to-r flex items-center justify-center shrink-0",
                        pm.color,
                      )}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      {pm.label}
                    </span>
                    {isProcessing && (
                      <Loader2 className="h-4 w-4 text-gray-400 dark:text-white/60 animate-spin ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
