import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useBillSharing } from "@/hooks/useBillSharing";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { useCRMSync } from "@/hooks/useCRMSync";
import { useSpeechAnnouncement } from "@/hooks/useSpeechAnnouncement";
import { usePaymentNotification } from "@/hooks/usePaymentNotification";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Receipt,
  CreditCard,
  Wallet,
  QrCode,
  Check,
  Printer,
  Trash2,
  Plus,
  X,
  Search,
  Loader2,
  Share2,
  MessageSquare,
  Smartphone,
  Copy,
  Mail,
  Link,
} from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import type { OrderItem } from "@/types/orders";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { formatOrderItemString } from "@/lib/order-utils";
import { CustomItemDialog, CustomItem } from "./CustomItemDialog";
import { PaymentDialogProps } from "./PaymentDialog/types";

// Removed local PaymentStep type definition as it's not used in the props anymore
// and we can infer or import if needed, but for now we just need PaymentDialogProps

const PaymentDialog = ({
  isOpen,
  onClose,
  orderItems,
  onSuccess,
  tableNumber = "",
  onEditOrder,
  orderId,
  onOrderUpdated,
  itemCompletionStatus: initialItemCompletionStatus,
  isNonChargeable = false,
}: PaymentDialogProps) => {
  const [currentStep, setCurrentStep] = useState<
    "confirm" | "method" | "qr" | "success" | "edit" | "split"
  >("confirm");

  // Split payment state
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitUpi, setSplitUpi] = useState<string>("");
  const [splitCard, setSplitCard] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendBillToEmail, setSendBillToEmail] = useState(false);
  const [sendBillToMobile, setSendBillToMobile] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  // Paytm Integration State
  const [paytmOrderId, setPaytmOrderId] = useState<string | null>(null);
  const [isPaytmQR, setIsPaytmQR] = useState(false);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [paymentAutoDetected, setPaymentAutoDetected] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [newItemsBuffer, setNewItemsBuffer] = useState<OrderItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState<any>(null);
  const [manualDiscountPercent, setManualDiscountPercent] = useState<number>(0);
  const [manualDiscountCash, setManualDiscountCash] = useState<number>(0);
  const [localDiscountPctStr, setLocalDiscountPctStr] = useState("");
  const [localDiscountCashStr, setLocalDiscountCashStr] = useState("");

  // Sync POS manual discount inputs
  useEffect(() => {
    setLocalDiscountPctStr(manualDiscountPercent > 0 ? manualDiscountPercent.toString() : "");
  }, [manualDiscountPercent]);

  useEffect(() => {
    setLocalDiscountCashStr(manualDiscountCash > 0 ? manualDiscountCash.toString() : "");
  }, [manualDiscountCash]);
  const [detectedReservation, setDetectedReservation] = useState<{
    reservation_id: string;
    room_id: string;
    roomName: string;
    customerName: string;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemCompletionStatus, setItemCompletionStatus] = useState<boolean[]>(
    initialItemCompletionStatus || [],
  );
  const [isSendingWhatsAppBill, setIsSendingWhatsAppBill] = useState(false);
  const { toast } = useToast();

  // Paytm hooks
  const { announcePayment } = useSpeechAnnouncement();
  const { notifyPaymentSuccess, notifyPaymentFailure, requestPermission } =
    usePaymentNotification();

  // Request browser notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);
  const queryClient = useQueryClient();
  const invalidateOrderQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["all-orders"] });
    queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
    queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
    queryClient.invalidateQueries({ queryKey: ["active-orders"] });
    queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
  };
  const { symbol: currencySymbol } = useCurrencyContext();

  // CRM auto-sync hook - upserts customer & awards loyalty points on payment
  const { syncCustomerToCRM } = useCRMSync();

  // Free bill sharing hook (wa.me links, Web Share API, Email, Bill Link)
  const {
    isMobileDevice,
    shareViaWhatsApp,
    shareViaSms,
    shareViaEmail,
    shareViaLink,
    getBillUrl,
    shareViaWebShareAPI,
    getBillText,
    isWebShareSupported,
  } = useBillSharing();

  // NC (Non-Chargeable) Reason State
  const [ncReason, setNcReason] = useState<string>("");

  // Order Type State - to determine if customer name is mandatory
  const [orderType, setOrderType] = useState<string | null>(null);

  // Custom Item State
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);

  // Fetch restaurant info
  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) return null;

      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", profile.restaurant_id)
        .single();

      return data;
    },
  });

  // Fetch menu items for edit mode
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menu-items-for-edit"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) return [];

      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id)
        .eq("is_available", true)
        .order("name");

      return data || [];
    },
    enabled: isOpen,
  });

  // Fetch payment settings
  const { data: paymentSettings } = useQuery({
    queryKey: [
      "payment-settings",
      restaurantInfo?.restaurantId || restaurantInfo?.id,
    ],
    queryFn: async () => {
      const restaurantIdToUse =
        restaurantInfo?.restaurantId || restaurantInfo?.id;
      if (!restaurantIdToUse) return null;

      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("restaurant_id", restaurantIdToUse)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching payment settings:", error);
        return null;
      }

      return data;
    },
    enabled: !!(restaurantInfo?.restaurantId || restaurantInfo?.id),
  });

  // Fetch active promotions
  const { data: activePromotions = [] } = useQuery({
    queryKey: [
      "active-promotions",
      restaurantInfo?.restaurantId || restaurantInfo?.id,
    ],
    queryFn: async () => {
      const restaurantIdToUse =
        restaurantInfo?.restaurantId || restaurantInfo?.id;
      if (!restaurantIdToUse) return [];

      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", restaurantIdToUse)
        .eq("is_active", true)
        .not("promotion_code", "is", null)
        .lte("start_date", today)
        .gte("end_date", today);

      if (error) {
        console.error("Error fetching promotions:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!(restaurantInfo?.restaurantId || restaurantInfo?.id),
  });

  // Calculate totals with promotion discount and manual discount
  // Handle weight-based pricing by using calculatedPrice when available
  const subtotal = orderItems.reduce((sum, item) => {
    if (item.calculatedPrice !== undefined) {
      return sum + item.calculatedPrice;
    }
    return sum + item.price * item.quantity;
  }, 0);

  // Calculate promotion discount amount if promotion is applied
  const promotionDiscountAmount = appliedPromotion
    ? appliedPromotion.discount_percentage
      ? (subtotal * appliedPromotion.discount_percentage) / 100
      : appliedPromotion.discount_amount || 0
    : 0;

  // Calculate manual discount amount (percentage + cash)
  const manualDiscountPercentAmount =
    manualDiscountPercent > 0 ? (subtotal * manualDiscountPercent) / 100 : 0;
  const manualDiscountAmount = manualDiscountPercentAmount + manualDiscountCash;

  // Total discount is sum of promotion + manual discounts
  const totalDiscountAmount = promotionDiscountAmount + manualDiscountAmount;

  const totalAfterDiscount = subtotal - totalDiscountAmount;
  const total = totalAfterDiscount;

  // Generate QR code when UPI method is selected
  // Paytm Dynamic QR (if configured) or Static UPI QR (fallback)
  const generatePaytmDynamicQR = useCallback(async () => {
    const restaurantId = restaurantInfo?.restaurantId || restaurantInfo?.id;
    if (!restaurantId || !total || total <= 0) return;

    setIsGeneratingQR(true);
    setQrCodeUrl("");
    setPaymentAutoDetected(false);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-paytm-qr",
        {
          body: {
            restaurantId,
            orderId: orderId || undefined,
            amount: total,
            tableNumber: tableNumber || undefined,
            orderDescription: `Table ${tableNumber || "POS"} Order`,
          },
        },
      );

      if (error) throw error;

      if (data?.success && data?.payment) {
        const payment = data.payment;
        if (payment.isPaytm) {
          // Paytm Dynamic QR
          setQrCodeUrl(
            payment.qrImage ? `data:image/png;base64,${payment.qrImage}` : "",
          );
          setPaytmOrderId(payment.paytmOrderId);
          setIsPaytmQR(true);
          setQrExpiresAt(payment.expiresAt);
        } else {
          // Static UPI QR fallback
          setQrCodeUrl(payment.qrImage || "");
          setIsPaytmQR(false);
          setPaytmOrderId(null);
        }
      }
    } catch (err) {
      console.error("Error generating Paytm QR:", err);
      // Fallback to static UPI QR
      if (paymentSettings?.upi_id) {
        const upiUrl = `upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(
          restaurantInfo?.name || "Restaurant",
        )}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
          `Order ${tableNumber || "POS"}`,
        )}`;
        const url = await QRCode.toDataURL(upiUrl, { width: 300, margin: 2 });
        setQrCodeUrl(url);
        setIsPaytmQR(false);
      }
    } finally {
      setIsGeneratingQR(false);
    }
  }, [restaurantInfo, total, orderId, tableNumber, paymentSettings]);

  useEffect(() => {
    if (currentStep === "qr") {
      // Check if Paytm is configured
      if (
        paymentSettings?.gateway_type === "paytm" &&
        paymentSettings?.paytm_mid
      ) {
        generatePaytmDynamicQR();
      } else if (paymentSettings?.upi_id) {
        // Static UPI QR fallback
        const upiUrl = `upi://pay?pa=${
          paymentSettings.upi_id
        }&pn=${encodeURIComponent(
          restaurantInfo?.name || "Restaurant",
        )}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
          `Order ${tableNumber || "POS"}`,
        )}`;
        QRCode.toDataURL(upiUrl, { width: 300, margin: 2 })
          .then((url) => setQrCodeUrl(url))
          .catch((err) => console.error("QR generation error:", err));
        setIsPaytmQR(false);
      }
    }
  }, [
    currentStep,
    paymentSettings,
    total,
    restaurantInfo,
    tableNumber,
    generatePaytmDynamicQR,
  ]);

  // Paytm real-time payment detection
  const handlePaytmSuccess = useCallback(
    (transaction: any) => {
      console.log("Payment SUCCESS detected:", transaction);
      setPaymentAutoDetected(true);

      // Voice announcement
      announcePayment({
        amount: total,
        tableNumber: tableNumber || undefined,
        language:
          (paymentSettings as any)?.voice_announcement_language === "hi"
            ? "hi"
            : "en",
        template:
          ((paymentSettings as any)?.voice_announcement_template as
            | "simple"
            | "detailed") || "detailed",
      });

      // Popup notification
      notifyPaymentSuccess({
        amount: total,
        tableNumber: tableNumber || undefined,
        currencySymbol,
      });

      // Auto-mark as paid after a brief delay for the user to see the success state
      setTimeout(() => {
        handleMarkAsPaid("upi");
      }, 6000);
    },
    [
      total,
      tableNumber,
      currencySymbol,
      paymentSettings,
      announcePayment,
      notifyPaymentSuccess,
    ],
  );

  const handlePaytmFailure = useCallback(
    (transaction: any) => {
      console.log("Payment FAILED:", transaction);
      notifyPaymentFailure({
        amount: total,
        tableNumber: tableNumber || undefined,
        currencySymbol,
      });
    },
    [total, tableNumber, currencySymbol, notifyPaymentFailure],
  );

  // Real-time payment status listener (only active when Paytm QR is showing)
  const { status: paymentStatus } = usePaymentStatus({
    paytmOrderId: isPaytmQR ? paytmOrderId : null,
    restaurantId: restaurantInfo?.restaurantId || restaurantInfo?.id || "",
    onSuccess: handlePaytmSuccess,
    onFailure: handlePaytmFailure,
    enablePolling: isPaytmQR && currentStep === "qr",
  });

  // Fetch existing customer details and discount if orderId exists
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (orderId && isOpen) {
        try {
          const { data: kitchenOrder } = await supabase
            .from("kitchen_orders")
            .select("order_id, customer_name, customer_phone, order_type")
            .eq("id", orderId)
            .single();

          // Set order type for conditional validation
          if (kitchenOrder) {
            setOrderType(kitchenOrder.order_type || null);
          }

          if (kitchenOrder?.order_id) {
            // Try fetching from orders with both naming conventions AND discount fields
            const { data: order } = await supabase
              .from("orders")
              .select(
                "Customer_Name, Customer_MobileNumber, customer_name, customer_phone, discount_percentage, discount_amount, promotion_code, promotion_name",
              )
              .eq("id", kitchenOrder.order_id)
              .maybeSingle();

            if (order) {
              const name =
                (order as any).Customer_Name || (order as any).customer_name;
              const phone =
                (order as any).Customer_MobileNumber ||
                (order as any).customer_phone;

              // Only set customer name if it's not a generic value
              // Skip: Nc, NC, Delivery, Takeaway, Dine-in, etc.
              const genericNames = [
                "nc",
                "delivery",
                "takeaway",
                "dine-in",
                "dine in",
                "pos order",
                "qsr order",
                "qsr-order",
              ];
              if (name && !genericNames.includes(name.toLowerCase().trim())) {
                setCustomerName(name);
              }

              if (phone) {
                setCustomerMobile(String(phone));
                setSendBillToEmail(true);
              }

              // Load existing discount percentage from DB, or reset to 0 if no discount
              const discountPercent =
                parseFloat((order as any).discount_percentage) || 0;
              setManualDiscountPercent(discountPercent);

              // Also restore cash discount: stored discount_amount minus the %-based portion
              const storedDiscountAmount =
                parseFloat((order as any).discount_amount) || 0;
              const percentBasedAmount = discountPercent > 0
                ? (subtotal * discountPercent) / 100
                : 0;
              const cashDiscount = Math.max(
                0,
                storedDiscountAmount - percentBasedAmount,
              );
              if (cashDiscount > 0) {
                setManualDiscountCash(cashDiscount);
              }

              // Restore promotion state if present, otherwise clear it
              const storedPromoCode = (order as any).promotion_code;
              const storedPromoName = (order as any).promotion_name;
              
              if (storedPromoCode) {
                setPromotionCode(storedPromoCode);
                setAppliedPromotion({
                  name: storedPromoName || "Applied Promotion",
                  code: storedPromoCode,
                  promotion_code: storedPromoCode,
                  discount_percentage: discountPercent,
                  discount_amount: cashDiscount > 0 ? cashDiscount : undefined,
                });
                setManualDiscountPercent(0);
                setManualDiscountCash(0);
              } else if (discountPercent === 0 && cashDiscount === 0) {
                setAppliedPromotion(null);
                setPromotionCode("");
              } else {
                setAppliedPromotion(null);
                setPromotionCode("");
              }
            } else {
              // No order found - reset discount state
              setManualDiscountPercent(0);
              setAppliedPromotion(null);
              setPromotionCode("");
            }
          } else {
            // Fall back to details stored on the kitchen order
            const genericNames = [
              "nc",
              "delivery",
              "takeaway",
              "dine-in",
              "dine in",
              "pos order",
              "qsr order",
              "qsr-order",
            ];
            if (
              kitchenOrder?.customer_name &&
              !genericNames.includes(
                kitchenOrder.customer_name.toLowerCase().trim(),
              )
            ) {
              setCustomerName(kitchenOrder.customer_name);
            }
            if ((kitchenOrder as any)?.customer_phone) {
              setCustomerMobile(String((kitchenOrder as any).customer_phone));
              setSendBillToEmail(true);
            } else {
              setSendBillToEmail(false);
            }
            // No linked order - reset discount state
            setManualDiscountPercent(0);
            setAppliedPromotion(null);
            setPromotionCode("");
          }
        } catch (error) {
          console.error("Error fetching customer details:", error);
          // Reset discount state on error
          setManualDiscountPercent(0);
          setAppliedPromotion(null);
          setPromotionCode("");
        }
      } else if (isOpen && !orderId) {
        // New order (no orderId) - reset discount state
        setManualDiscountPercent(0);
        setAppliedPromotion(null);
        setPromotionCode("");
      }
    };

    fetchCustomerDetails();
  }, [orderId, isOpen]);

  // Fetch item completion status from KDS (synced with kitchen display)
  useEffect(() => {
    const fetchItemCompletionStatus = async () => {
      if (orderId && isOpen) {
        try {
          const { data, error } = await supabase
            .from("kitchen_orders")
            .select("item_completion_status")
            .eq("id", orderId)
            .single();

          if (!error && data?.item_completion_status) {
            setItemCompletionStatus(data.item_completion_status);
          } else {
            setItemCompletionStatus([]);
          }
        } catch (err) {
          console.error("Error fetching item completion status:", err);
          setItemCompletionStatus([]);
        }
      } else {
        setItemCompletionStatus([]);
      }
    };

    fetchItemCompletionStatus();
  }, [orderId, isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep("confirm");
      setCustomerName("");
      setCustomerMobile("");
      setCustomerEmail("");
      setSendBillToEmail(false);
      setQrCodeUrl("");
      setMenuSearchQuery("");
      setNewItemsBuffer([]);
      setIsSaving(false);
      setDetectedReservation(null);
      // Reset discount state to prevent stale values persisting between orders
      setManualDiscountPercent(0);
      setManualDiscountCash(0);
      setAppliedPromotion(null);
      setPromotionCode("");
      setItemCompletionStatus([]);
      setOrderType(null); // Reset order type
      // Reset Paytm state
      setPaytmOrderId(null);
      setIsPaytmQR(false);
      setQrExpiresAt(null);
      setIsGeneratingQR(false);
      setPaymentAutoDetected(false);
      // Reset split state
      setSplitCash("");
      setSplitUpi("");
      setSplitCard("");
    }
  }, [isOpen]);

  const handleEditOrder = () => {
    setCurrentStep("edit");
    setNewItemsBuffer([]);
    setMenuSearchQuery("");
  };

  const handleDeleteOrder = async () => {
    // This is now triggered after confirming from the AlertDialog
    setShowDeleteConfirm(false);

    try {
      if (orderId) {
        // First, get the order_id from kitchen_orders to delete related order
        const { data: kitchenOrder } = await supabase
          .from("kitchen_orders")
          .select("order_id")
          .eq("id", orderId)
          .single();

        // Delete from kitchen_orders table
        const { error: kitchenError } = await supabase
          .from("kitchen_orders")
          .delete()
          .eq("id", orderId);

        if (kitchenError) throw kitchenError;

        // Delete corresponding order from orders table if it exists
        if (kitchenOrder?.order_id) {
          const { error: orderError } = await supabase
            .from("orders")
            .delete()
            .eq("id", kitchenOrder.order_id);

          if (orderError)
            console.error("Error deleting from orders table:", orderError);
        }

        invalidateOrderQueries();
      }

      toast({
        title: "Order Deleted Successfully",
        description: "The order has been permanently deleted.",
      });

      onClose();
      onSuccess(); // Refresh the order list
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddMenuItem = (item: any) => {
    // Check if item already exists in buffer
    const existingIndex = newItemsBuffer.findIndex(
      (bufferItem) => bufferItem.name === item.name,
    );

    if (existingIndex >= 0) {
      // Increase quantity if item exists
      setNewItemsBuffer((prev) =>
        prev.map((bufferItem, idx) =>
          idx === existingIndex
            ? { ...bufferItem, quantity: bufferItem.quantity + 1 }
            : bufferItem,
        ),
      );
      toast({
        title: "Quantity Increased",
        description: `${item.name} quantity increased to ${
          newItemsBuffer[existingIndex].quantity + 1
        }.`,
      });
    } else {
      // Add new item
      const newItem: OrderItem = {
        id: `new-${Date.now()}-${Math.random()}`,
        menuItemId: item.id, // Will be undefined for custom items if we reuse this logic? No, item.id is from menu.
        name: item.name,
        price: item.price,
        quantity: 1,
        modifiers: [],
      };
      setNewItemsBuffer((prev) => [...prev, newItem]);
      toast({
        title: "Item Added",
        description: `${item.name} added to new items list.`,
      });
    }
  };

  const handleAddCustomItem = (item: CustomItem) => {
    const newItem: OrderItem = {
      id: `custom-${Date.now()}-${Math.random()}`,
      // No menuItemId for custom items
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      modifiers: [],
    };

    setNewItemsBuffer((prev) => [...prev, newItem]);
    toast({
      title: "Custom Item Added",
      description: `${item.quantity}x ${item.name} added to order.`,
    });
  };

  const handleRemoveNewItem = (itemId: string) => {
    setNewItemsBuffer((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleRemoveExistingItem = async (itemIndex: number) => {
    if (!orderId) return;

    try {
      // Get current kitchen order including order_id for syncing
      const { data: currentOrder, error: fetchError } = await supabase
        .from("kitchen_orders")
        .select("items, order_id")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Remove the item at the specified index
      const updatedItems = [...(currentOrder?.items || [])];
      updatedItems.splice(itemIndex, 1);

      // Calculate new total from remaining items
      const newTotal = updatedItems.reduce((sum, item: any) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);

      // Update the kitchen_orders table
      const { error: updateError } = await supabase
        .from("kitchen_orders")
        .update({
          items: updatedItems,
          status: "new",
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Also update the linked orders table to keep Orders Management in sync
      if (currentOrder?.order_id) {
        // Format items for orders table (string array format: "2x Item Name @price")
        const ordersTableItems = updatedItems.map((item: any) => {
          const itemName = item.name || "Unknown Item";
          const itemQty = item.quantity || 1;
          const itemPrice = item.price || 0;
          return formatOrderItemString(itemQty, itemName, itemPrice, item.notes);
        });

        const { error: ordersUpdateError } = await supabase
          .from("orders")
          .update({
            items: ordersTableItems,
            total: newTotal,
          })
          .eq("id", currentOrder.order_id);

        if (ordersUpdateError) {
          console.error("Error updating orders table:", ordersUpdateError);
          // Don't fail the whole operation - kitchen order is already updated
        }
      }

      toast({
        title: "Item Removed",
        description: "Item has been removed from the order.",
      });

      // Refresh the order data immediately
      if (onOrderUpdated) {
        onOrderUpdated();
      }
      onSuccess();
    } catch (error) {
      console.error("Error removing item:", error);
      toast({
        title: "Failed to Remove Item",
        description: "There was an error removing the item.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateNewItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveNewItem(itemId);
      return;
    }
    setNewItemsBuffer((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  const handleUpdateExistingItemQuantity = async (
    itemIndex: number,
    newQuantity: number,
  ) => {
    if (!orderId) return;

    if (newQuantity < 1) {
      // If quantity drops to 0 or less, confirm removal?
      // For now, let's just trigger the remove flow which is safer
      handleRemoveExistingItem(itemIndex);
      return;
    }

    try {
      // Get current kitchen order
      const { data: currentOrder, error: fetchError } = await supabase
        .from("kitchen_orders")
        .select("items, order_id")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Deep copy items
      const updatedItems = [...(currentOrder?.items || [])];

      // Update quantity of specific item
      // Need to handle string format vs object format
      const targetItem = updatedItems[itemIndex];
      if (typeof targetItem === "string") {
        // Parse "1x Name" if needed, but ideally we should normalize first.
        // If it's a string, we might need to parse it to update quantity.
        const match = targetItem.match(/^(\d+)x\s+(.+)$/);
        if (match) {
          const name = match[2];
          updatedItems[itemIndex] = { name, quantity: newQuantity, price: 0 };
        } else {
          // Fallback if parsing fails, assume name only
          updatedItems[itemIndex] = {
            name: targetItem,
            quantity: newQuantity,
            price: 0,
          };
        }
      } else {
        // It's an object
        updatedItems[itemIndex] = { ...targetItem, quantity: newQuantity };
      }

      // Calculate new total
      const newTotal = updatedItems.reduce((sum, item: any) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);

      // Update kitchen_orders
      const { error: updateError } = await supabase
        .from("kitchen_orders")
        .update({
          items: updatedItems,
          // CRITICAL: Reset status to 'new' so kitchen sees the change
          status: "new",
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Update linked orders table
      if (currentOrder?.order_id) {
        const ordersTableItems = updatedItems.map((item: any) => {
          const itemName = item.name || "Unknown Item";
          const itemQty = item.quantity || 1;
          const itemPrice = item.price || 0;
          return formatOrderItemString(itemQty, itemName, itemPrice, item.notes);
        });

        const { error: ordersUpdateError } = await supabase
          .from("orders")
          .update({
            items: ordersTableItems,
            total: newTotal,
          })
          .eq("id", currentOrder.order_id);

        if (ordersUpdateError) {
          console.error("Error updating orders table:", ordersUpdateError);
        }
      }

      toast({
        title: "Order Updated",
        description: `Item quantity updated to ${newQuantity}.`,
      });

      if (onOrderUpdated) {
        onOrderUpdated();
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating item quantity:", error);
      toast({
        title: "Update Failed",
        description: "Could not update item quantity.",
        variant: "destructive",
      });
    }
  };

  const handleSaveNewItems = async () => {
    if (newItemsBuffer.length === 0) {
      toast({
        title: "No Items to Add",
        description: "Please add at least one item from the menu.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!orderId) {
        toast({
          title: "Error",
          description: "Order ID not found. Cannot add items.",
          variant: "destructive",
        });
        return;
      }

      // Get restaurant ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("Restaurant not found");

      // Get current kitchen order to update items and get linked order_id
      const { data: currentOrder, error: fetchError } = await supabase
        .from("kitchen_orders")
        .select("items, order_id")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Normalize old items to ensure they are objects
      const normalizedOldItems = (currentOrder?.items || []).map((item) => {
        if (typeof item === "string") {
          // Parse string format "1x Item Name" to object
          const match = item.match(/^(\d+)x\s+(.+)$/);
          if (match) {
            return { name: match[2], quantity: parseInt(match[1]), price: 0 };
          }
          return { name: item, quantity: 1, price: 0 };
        }
        return item;
      });

      // Convert newItemsBuffer to proper format
      const formattedNewItems = newItemsBuffer.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      // Combine old items with new items as objects
      const combinedItems = [...normalizedOldItems, ...formattedNewItems];

      // Calculate new total from combined items
      const newTotal = combinedItems.reduce((sum, item: any) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);

      // Update the kitchen_orders table
      const { error: updateError } = await supabase
        .from("kitchen_orders")
        .update({
          items: combinedItems,
          status: "new",
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Also update the linked orders table to keep Orders Management in sync
      if (currentOrder?.order_id) {
        // Format items for orders table (string array format: "2x Item Name @price")
        const ordersTableItems = combinedItems.map((item: any) => {
          const itemName = item.name || "Unknown Item";
          const itemQty = item.quantity || 1;
          const itemPrice = item.price || 0;
          return formatOrderItemString(itemQty, itemName, itemPrice, item.notes);
        });

        const { error: ordersUpdateError } = await supabase
          .from("orders")
          .update({
            items: ordersTableItems,
            total: newTotal,
          })
          .eq("id", currentOrder.order_id);

        if (ordersUpdateError) {
          console.error("Error updating orders table:", ordersUpdateError);
          // Don't fail the whole operation - kitchen order is already updated
        }
      }

      toast({
        title: "Items Added Successfully",
        description: `${newItemsBuffer.length} new item(s) have been sent to the kitchen.`,
      });

      // Update the local orderItems and go back to confirm step
      setCurrentStep("confirm");
      setNewItemsBuffer([]);

      // Refresh order data to show updated items immediately
      if (onOrderUpdated) {
        onOrderUpdated();
      }
      onSuccess(); // Refresh the order list
    } catch (error) {
      console.error("Error adding items to order:", error);
      toast({
        title: "Failed to Add Items",
        description: "There was an error adding items to the order.",
        variant: "destructive",
      });
    }
  };

  // Filter menu items based on search
  const filteredMenuItems = menuItems.filter(
    (item) =>
      item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
      (item.category &&
        item.category.toLowerCase().includes(menuSearchQuery.toLowerCase())),
  );

  const saveCustomerDetails = async (): Promise<boolean> => {
    // If checkbox not checked, return success
    if (!sendBillToEmail) {
      return true;
    }

    if (!orderId) {
      console.error("❌ No orderId provided");
      toast({
        title: "Error",
        description: "Order ID not found. Cannot save customer details.",
        variant: "destructive",
      });
      return false;
    }

    // Validate inputs
    if (!customerName.trim()) {
      toast({
        title: "Customer Name Required",
        description: "Please enter customer name to send bill.",
        variant: "destructive",
      });
      return false;
    }

    // Email is optional - only validate format if provided
    const emailStr = String(customerEmail).trim();
    if (emailStr) {
      // Validate email format only if email is provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStr)) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return false;
      }
    }

    setIsSaving(true);

    try {
      // Try to find the order_id from kitchen_orders
      const { data: kitchenOrder, error: kitchenError } = await supabase
        .from("kitchen_orders")
        .select("order_id")
        .eq("id", orderId)
        .maybeSingle();

      let targetOrderId = null;

      if (kitchenOrder?.order_id) {
        // Found a linked order_id
        targetOrderId = kitchenOrder.order_id;
      } else {
        // Maybe orderId is directly the orders table ID

        const { data: directOrder, error: directError } = await supabase
          .from("orders")
          .select("id")
          .eq("id", orderId)
          .maybeSingle();

        if (directOrder) {
          targetOrderId = orderId;
        } else {
          console.error("❌ No order found with ID:", orderId, { directError });
        }
      }

      if (targetOrderId) {
        // Use snake_case column names (standardized)
        const { data: updateData, error: updateError } = await supabase
          .from("orders")
          .update({
            customer_name: customerName.trim(),
            customer_phone: String(customerMobile).trim(),
          })
          .eq("id", targetOrderId)
          .select();

        if (updateError) {
          console.error("❌ Update error:", updateError);
          throw updateError;
        }

        toast({
          title: "Details Saved",
          description: "Customer details saved successfully.",
        });
      } else {
        console.warn(
          "⚠️ No linked order found. Saving name on kitchen order and proceeding.",
        );
        // Fallback: store the customer name on the kitchen order so it is visible to staff
        try {
          const { error: koUpdateError } = await supabase
            .from("kitchen_orders")
            .update({
              customer_name: customerName.trim(),
              customer_phone: customerMobile.trim(),
            })
            .eq("id", orderId);

          if (koUpdateError) {
            console.error(
              "⚠️ Failed to save on kitchen_orders:",
              koUpdateError,
            );
            toast({
              title: "Proceeding without DB save",
              description:
                "Could not link order yet. We'll still proceed and include details on the bill.",
            });
          } else {
            toast({
              title: "Details Saved (Temporary)",
              description:
                "Name saved for this order. It will be attached when the order is created.",
            });
          }
        } catch (e) {
          console.error("⚠️ Kitchen order fallback failed:", e);
        }
        setIsSaving(false);
        return true;
      }

      setIsSaving(false);
      return true;
    } catch (error) {
      console.error("❌ Error saving customer details:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save customer details. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
      return false;
    }
  };

  // Build bill text for sharing (free — no API keys needed)
  const currentBillText = useMemo(() => {
    return getBillText({
      restaurantName:
        restaurantInfo?.name || restaurantInfo?.restaurantName || "Restaurant",
      restaurantAddress: restaurantInfo?.address,
      restaurantPhone: restaurantInfo?.phone,
      gstin: restaurantInfo?.gstin,
      items: orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      total,
      discount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
      promotionName: appliedPromotion?.name,
      manualDiscountPercent:
        manualDiscountPercent > 0 ? manualDiscountPercent : undefined,
      tableNumber: tableNumber || undefined,
      customerName: customerName || undefined,
      orderDate: new Date().toLocaleString("en-IN"),
      currencySymbol,
      isNonChargeable,
    });
  }, [
    restaurantInfo,
    orderItems,
    subtotal,
    total,
    totalDiscountAmount,
    appliedPromotion,
    manualDiscountPercent,
    tableNumber,
    customerName,
    currencySymbol,
    isNonChargeable,
    getBillText,
  ]);

  // Share bill via WhatsApp (free — uses wa.me link)
  const handleShareWhatsApp = useCallback(() => {
    if (customerMobile) {
      shareViaWhatsApp(customerMobile, currentBillText);
    }
  }, [customerMobile, currentBillText, shareViaWhatsApp]);

  // Share bill via SMS (free — uses sms: URI)
  const handleShareSms = useCallback(() => {
    if (customerMobile) {
      shareViaSms(customerMobile, currentBillText);
    }
  }, [customerMobile, currentBillText, shareViaSms]);

  // Share bill via Web Share API or clipboard (free)
  const handleShareGeneric = useCallback(async () => {
    const restaurantName =
      restaurantInfo?.name || restaurantInfo?.restaurantName || "Restaurant";
    await shareViaWebShareAPI(currentBillText, restaurantName);
  }, [currentBillText, restaurantInfo, shareViaWebShareAPI]);

  // Share bill via Email (mailto: link — works great on desktop)
  const handleShareEmail = useCallback(() => {
    const restaurantName =
      restaurantInfo?.name || restaurantInfo?.restaurantName || "Restaurant";
    shareViaEmail(customerEmail || "", currentBillText, restaurantName);
  }, [customerEmail, currentBillText, restaurantInfo, shareViaEmail]);

  // Bill params for generating shareable link
  const currentBillParams = useMemo(
    () => ({
      restaurantName:
        restaurantInfo?.name || restaurantInfo?.restaurantName || "Restaurant",
      restaurantAddress: restaurantInfo?.address,
      restaurantPhone: restaurantInfo?.phone,
      gstin: restaurantInfo?.gstin,
      logoUrl: restaurantInfo?.logo_url || (() => {
        try {
          return localStorage.getItem("restaurant_logo_url") || undefined;
        } catch {
          return undefined;
        }
      })(),
      items: orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      total,
      discount: totalDiscountAmount > 0 ? totalDiscountAmount : undefined,
      promotionName: appliedPromotion?.name,
      manualDiscountPercent:
        manualDiscountPercent > 0 ? manualDiscountPercent : undefined,
      tableNumber: tableNumber || undefined,
      customerName: customerName || undefined,
      orderDate: new Date().toLocaleString("en-IN"),
      currencySymbol,
      isNonChargeable,
    }),
    [
      restaurantInfo,
      orderItems,
      subtotal,
      total,
      totalDiscountAmount,
      appliedPromotion,
      manualDiscountPercent,
      tableNumber,
      customerName,
      currencySymbol,
      isNonChargeable,
    ],
  );

  // Share bill via link (sends short WhatsApp message with premium bill page URL)
  const handleShareBillLink = useCallback(async () => {
    if (customerMobile) {
      await shareViaLink(customerMobile, currentBillParams);
    }
  }, [customerMobile, currentBillParams, shareViaLink]);

  // Copy bill link to clipboard
  const handleCopyBillLink = useCallback(async () => {
    const url = await getBillUrl(currentBillParams);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Bill Link Copied!",
        description: "Paste this link in any messaging app.",
      });
    } catch {
      toast({ title: "Could Not Copy", variant: "destructive" });
    }
  }, [currentBillParams, getBillUrl, toast]);

  // Send bill via WhatsApp API (automated — routes via unified gateway based on restaurant settings)
  const handleSendWhatsAppBill = useCallback(async () => {
    if (!customerMobile || !restaurantInfo) return;
    setIsSendingWhatsAppBill(true);
    try {
      const restaurantName =
        restaurantInfo?.name || restaurantInfo?.restaurantName || "Restaurant";

      // 1. Generate bill URL
      const billUrl = await getBillUrl(currentBillParams);
      const billUrlSuffix = billUrl
        ? billUrl.split("/bill/").pop() ?? billUrl
        : undefined;

      // 2. Format amount and date
      const formattedAmount = `${currencySymbol === "₹" ? "Rs." : currencySymbol}${total.toFixed(2)}`;
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

      // 3. Call unified WhatsApp edge function
      const cleanPhone = customerMobile.replace(/[\+\-\s]/g, "");
      const phoneWithCountryCode =
        cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone;

      const { data: waResponse, error: waError } =
        await supabase.functions.invoke("send-whatsapp-unified", {
          body: {
            phoneNumber: phoneWithCountryCode,
            restaurantId: restaurantInfo?.id,
            customerName: customerName || "Customer",
            restaurantName,
            templateName: "invoice_with_review",
            amount: formattedAmount,
            billDate: formattedDate,
            contactNumber: restaurantInfo?.phone || "N/A",
            // Instagram URL goes into body as {{6}} — tappable link (Meta 2-button limit)
            instagramUrl: (restaurantInfo?.social_media as any)?.instagram_url || "-",
            buttons: [
              // Button 0: View Bill (dynamic suffix)
              { type: "url", value: billUrlSuffix || "pending" },
              // Button 1: Google Review (full URL)
              ...((restaurantInfo?.social_media as any)?.google_review_url
                ? [{ type: "url", value: (restaurantInfo?.social_media as any).google_review_url }]
                : []),
            ],
          },
        });

      if (waError || !waResponse?.success) {
        throw new Error(
          waError?.message || waResponse?.error || "WhatsApp API failure",
        );
      }

      toast({
        title: "Bill Sent!",
        description: `Bill sent to ${customerMobile} via WhatsApp.`,
      });
      onClose(); // Close the dialog after successful send
    } catch (error) {
      console.error("Failed to send WhatsApp bill:", error);
      toast({
        title: "Failed to Send Bill",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSendingWhatsAppBill(false);
    }
  }, [
    customerMobile,
    customerName,
    restaurantInfo,
    currentBillParams,
    total,
    currencySymbol,
    getBillUrl,
    toast,
    onClose,
  ]);

  const handlePrintBill = async (navigateAfter: boolean = false) => {
    // Save customer details first
    const saved = await saveCustomerDetails();
    if (!saved) {
      return;
    }

    // ── Persist discount to orders table on Print ─────────────────────────
    // Covers all 3 discount types:
    //  1. % manual discount   → discount_percentage=N,  discount_amount=calculated
    //  2. ₹ cash flat         → discount_percentage=0,  discount_amount=N
    //  3. Promo code (% type) → discount_percentage=N,  discount_amount=calculated
    //  4. Promo code (₹ type) → discount_percentage=0,  discount_amount=N
    if (orderId && totalDiscountAmount > 0) {
      try {
        const { data: kitchenOrder } = await supabase
          .from("kitchen_orders")
          .select("order_id")
          .eq("id", orderId)
          .maybeSingle();

        const targetOrderId = kitchenOrder?.order_id ?? null;

        if (targetOrderId) {
          // Determine effective discount_percentage:
          // manual % wins → else promo % → else 0 (flat cash / flat promo)
          const effectiveDiscountPct =
            manualDiscountPercent > 0
              ? manualDiscountPercent
              : (appliedPromotion?.discount_percentage ?? 0);

          await supabase
            .from("orders")
            .update({
              discount_percentage: effectiveDiscountPct,
              discount_amount: totalDiscountAmount,   // always the full ₹ value saved
              promotion_code: (appliedPromotion as any)?.promotion_code || (appliedPromotion as any)?.code || null,
              promotion_name: appliedPromotion?.name || null,
              total: total,                            // discounted total persisted
            })
            .eq("id", targetOrderId);
        }
      } catch (discountSaveError) {
        // Non-fatal — log but don't block printing
        console.error("Failed to persist discount on print:", discountSaveError);
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    try {
      const doc = new jsPDF({
        format: [58, 297], // 58mm thermal printer width
        unit: "mm",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 0.5; // Reduced side margins for better readability

      // Use Rs. for PDF since Helvetica doesn't support ₹ symbol
      const printSymbol = currencySymbol === "₹" ? "Rs." : currencySymbol;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 5; // Increased top margin to prevent cutting

      // Restaurant Logo
      try {
        const savedLogo = localStorage.getItem("restaurant_logo_url");
        if (savedLogo) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            img.onload = () => {
              const logoSize = 12;
              doc.addImage(
                img,
                "PNG",
                (pageWidth - logoSize) / 2,
                yPos,
                logoSize,
                logoSize,
              );
              yPos += logoSize + 2;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = savedLogo;
          });
        }
      } catch {}

      // Restaurant Header - Larger and prominent
      doc.setFontSize(16); // Increased from 14
      doc.setFont("helvetica", "bold");
      const restaurantName =
        restaurantInfo?.name || restaurantInfo?.restaurantName || "Restaurant";
      const nameLines = doc.splitTextToSize(restaurantName, contentWidth);
      doc.text(nameLines, pageWidth / 2, yPos, { align: "center" });
      yPos += nameLines.length * 5 + 2;

      doc.setFontSize(10); // Increased from 9
      doc.setFont("helvetica", "normal");
      if (restaurantInfo?.address) {
        const addressLines = doc.splitTextToSize(
          restaurantInfo.address,
          contentWidth,
        );
        doc.text(addressLines, pageWidth / 2, yPos, { align: "center" });
        yPos += addressLines.length * 4;
      }
      if (restaurantInfo?.phone) {
        doc.text(`Ph: ${restaurantInfo.phone}`, pageWidth / 2, yPos, {
          align: "center",
        });
        yPos += 4;
      }
      if (restaurantInfo?.gstin) {
        doc.text(`GSTIN: ${restaurantInfo.gstin}`, pageWidth / 2, yPos, {
          align: "center",
        });
        yPos += 4;
      }

      // // Dashed line
      // yPos += 1;
      // for (let i = margin; i < pageWidth - margin; i += 2) {
      //   doc.line(i, yPos, i + 1, yPos);
      // }
      // yPos += 4;

      // Invoice Title - Only show if GSTIN is present
      if (restaurantInfo?.gstin) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("TAX INVOICE", pageWidth / 2, yPos, { align: "center" });
        yPos += 4;
      }

      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Bill details - increased font size
      doc.setFontSize(10); // Increased from 9
      doc.setFont("helvetica", "normal");
      const billNumber = `#${Date.now().toString().slice(-6)}`;
      const currentDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const currentTime = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      doc.text(`Bill#: ${billNumber}`, margin, yPos);
      yPos += 4;

      if (tableNumber) {
        doc.text(`To: ${tableNumber}`, margin, yPos);
      } else if (customerName) {
        doc.text(`To: ${customerName}`, margin, yPos);
      } else {
        doc.text("To: POS Order", margin, yPos);
      }
      yPos += 4;

      doc.text(`Date: ${currentDate}  Time: ${currentTime}`, margin, yPos);
      yPos += 4;

      // Guest details if available
      if (customerName) {
        doc.text(`Guest: ${customerName}`, margin, yPos);
        yPos += 4;
      }
      if (customerMobile) {
        doc.text(`Phone: ${customerMobile}`, margin, yPos);
        yPos += 4;
      }

      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Items header
      doc.setFontSize(11); // Increased from 10
      doc.setFont("helvetica", "bold");
      doc.text("Particulars", pageWidth / 2, yPos, { align: "center" });
      yPos += 4;

      // Column headers - increased font with better spacing
      doc.setFontSize(9.5);
      doc.text("Item", margin, yPos);
      doc.text("Qty", pageWidth - 32, yPos, { align: "right" });
      doc.text("Rate", pageWidth - 18, yPos, { align: "right" });
      doc.text("Amt", pageWidth - margin, yPos, { align: "right" });
      yPos += 1;

      // Line under headers
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 3.5;

      // Items - increased font with better column spacing
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      orderItems.forEach((item, index) => {
        const itemName = doc.splitTextToSize(item.name, 22);
        doc.text(itemName, margin, yPos);
        doc.text(item.quantity.toString(), pageWidth - 32, yPos, {
          align: "right",
        });
        doc.text(item.price.toFixed(0), pageWidth - 18, yPos, {
          align: "right",
        });
        doc.text(
          (item.price * item.quantity).toFixed(0),
          pageWidth - margin,
          yPos,
          { align: "right" },
        );
        yPos += Math.max(itemName.length * 4, 4);
        // Add space between items for better readability
        if (index < orderItems.length - 1) {
          yPos += 2;
        }
      });

      // Dashed line
      yPos += 1;
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Totals - increased font
      doc.setFontSize(10); // Increased from 9
      doc.text("Sub Total:", margin, yPos);
      doc.text(subtotal.toFixed(2), pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 4;

      const cgstRate = 0;
      const sgstRate = 0;
      const cgst = 0;
      const sgst = 0;

      if (cgst > 0 || sgst > 0) {
        doc.text(`CGST @ ${(cgstRate * 100).toFixed(1)}%:`, margin, yPos);
        doc.text(cgst.toFixed(2), pageWidth - margin, yPos, { align: "right" });
        yPos += 4;

        doc.text(`SGST @ ${(sgstRate * 100).toFixed(1)}%:`, margin, yPos);
        doc.text(sgst.toFixed(2), pageWidth - margin, yPos, { align: "right" });
        yPos += 4;
      }

      // Promotion discount if applied
      if (appliedPromotion && promotionDiscountAmount > 0) {
        doc.setFont("helvetica", "normal");
        doc.text(`Promo Discount (${appliedPromotion.name}):`, margin, yPos);
        doc.text(
          `-${promotionDiscountAmount.toFixed(2)}`,
          pageWidth - margin,
          yPos,
          { align: "right" },
        );
        yPos += 4;
        if (appliedPromotion.promotion_code) {
          doc.setFontSize(9);
          doc.text(`Code: ${appliedPromotion.promotion_code}`, margin, yPos);
          yPos += 3.5;
          doc.setFontSize(10);
        }
      }

      // Manual discount if applied
      if (manualDiscountPercent > 0) {
        doc.setFont("helvetica", "normal");
        doc.text(`Discount (${manualDiscountPercent}%):`, margin, yPos);
        doc.text(
          `-${manualDiscountAmount.toFixed(2)}`,
          pageWidth - margin,
          yPos,
          { align: "right" },
        );
        yPos += 4;
      }

      // Total discount
      if (totalDiscountAmount > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Total Discount:", margin, yPos);
        doc.text(
          `-${totalDiscountAmount.toFixed(2)}`,
          pageWidth - margin,
          yPos,
          { align: "right" },
        );
        yPos += 4;
      }

      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Net Amount - larger font
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14); // Increased from 12
      doc.text("Net Amount:", margin, yPos);
      doc.text(`${printSymbol}${total.toFixed(2)}`, pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 6;

      // Add QR code if UPI is configured — always generate fresh for print
      if (paymentSettings?.upi_id) {
        try {
          const upiUrl = `upi://pay?pa=${paymentSettings.upi_id}&pn=${encodeURIComponent(
            restaurantInfo?.name || "Restaurant",
          )}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
            `Order ${tableNumber || "POS"}`,
          )}`;
          const printQrUrl =
            qrCodeUrl ||
            (await QRCode.toDataURL(upiUrl, { width: 300, margin: 2 }));

          for (let i = margin; i < pageWidth - margin; i += 2) {
            doc.line(i, yPos, i + 1, yPos);
          }
          yPos += 3;

          const qrSize = 32;
          doc.addImage(
            printQrUrl,
            "PNG",
            (pageWidth - qrSize) / 2,
            yPos,
            qrSize,
            qrSize,
          );
          yPos += qrSize + 3;

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text("Scan QR to pay", pageWidth / 2, yPos, { align: "center" });
          yPos += 4;
        } catch (qrErr) {
          console.error("QR code generation for print failed:", qrErr);
        }
      }

      // Dashed line
      for (let i = margin; i < pageWidth - margin; i += 2) {
        doc.line(i, yPos, i + 1, yPos);
      }
      yPos += 4;

      // Footer - larger font
      doc.setFontSize(12); // Increased from 10
      doc.setFont("helvetica", "bold");
      doc.text("Thank You!", pageWidth / 2, yPos, { align: "center" });
      yPos += 4;
      doc.setFontSize(10); // Increased from 8
      doc.setFont("helvetica", "normal");
      doc.text("Please visit again", pageWidth / 2, yPos, { align: "center" });

      // Save and print
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, "_blank");

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      // Auto-share bill via WhatsApp if checkbox is checked (free — wa.me link)
      if (sendBillToMobile && customerMobile) {
        console.log("📱 Sharing bill via WhatsApp (free wa.me link)");
        handleShareWhatsApp();
      }

      // Auto-share via generic share if email checkbox is checked (free)
      if (sendBillToEmail && customerEmail) {
        console.log("📤 Sharing bill via generic share API");
        await handleShareGeneric();
      }

      toast({
        title: "Bill Generated",
        description: "The bill has been generated and sent to printer.",
      });

      if (navigateAfter) {
        setCurrentStep("method");
      }
    } catch (error) {
      console.error("Error generating bill:", error);
      toast({
        title: "Print Error",
        description: "Failed to generate bill. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApplyPromotion = async (passedCode?: string) => {
    const codeToValidate = (passedCode ?? promotionCode).trim();
    if (!codeToValidate) {
      toast({
        title: "Enter Promotion Code",
        description: "Please enter a promotion code to apply.",
        variant: "destructive",
      });
      return;
    }

    try {
      const restaurantIdToUse =
        restaurantInfo?.restaurantId || restaurantInfo?.id;

      // Call backend validation function with the exact code we want to validate
      const { data, error } = await supabase.functions.invoke(
        "validate-promo-code",
        {
          body: {
            code: codeToValidate,
            orderSubtotal: subtotal,
            restaurantId: restaurantIdToUse,
          },
        },
      );

      if (error) throw error;

      if (data.valid && data.promotion) {
        setPromotionCode(codeToValidate);
        setAppliedPromotion(data.promotion);
        toast({
          title: "Promotion Applied!",
          description: `${data.promotion.name} - ${
            data.promotion.discount_percentage
              ? `${data.promotion.discount_percentage}% off`
              : `${currencySymbol}${data.promotion.discount_amount} off`
          }`,
        });
      } else {
        toast({
          title: "Invalid Code",
          description:
            data.error ||
            "The promotion code you entered is not valid or has expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error validating promo code:", error);
      toast({
        title: "Validation Error",
        description: "Failed to validate promotion code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode("");
    toast({
      title: "Promotion Removed",
      description: "The promotion code has been removed from this order.",
    });
  };

  const checkForActiveReservation = async () => {
    // Sanitize mobile number: extract last 10 digits
    const mobileStr = String(customerMobile || "").replace(/\D/g, "");
    const sanitizedMobile = mobileStr.slice(-10);

    // Only check if we have exactly 10 digits after sanitization
    if (!sanitizedMobile || sanitizedMobile.length !== 10) {
      console.log("❌ Invalid mobile number for reservation check:", {
        original: customerMobile,
        sanitized: sanitizedMobile,
      });
      setDetectedReservation(null);
      return;
    }

    try {
      console.log(
        "🔍 Checking for active reservation with sanitized mobile:",
        sanitizedMobile,
      );

      const { data, error } = await supabase.functions.invoke(
        "find-active-reservation",
        {
          body: { mobileNumber: sanitizedMobile },
        },
      );

      if (error) {
        console.error("❌ Error checking reservation:", error);
        return;
      }

      console.log("📊 Reservation check result:", data);

      if (data?.found) {
        console.log("✅ Found active reservation:", data);
        setDetectedReservation({
          reservation_id: data.reservation_id,
          room_id: data.room_id,
          roomName: data.roomName,
          customerName: data.customerName,
        });

        toast({
          title: "Guest Detected!",
          description: `This customer has an active reservation in ${data.roomName}`,
        });
      } else {
        console.log(
          "ℹ️ No active reservation found for mobile:",
          sanitizedMobile,
        );
        setDetectedReservation(null);
      }
    } catch (error) {
      console.error("❌ Error checking reservation:", error);
      setDetectedReservation(null);
    }
  };

  const handleMethodSelect = (method: string) => {
    if (method === "upi") {
      // Check if Paytm is configured OR static UPI is configured
      const hasPaytm =
        (paymentSettings as any)?.gateway_type === "paytm" &&
        (paymentSettings as any)?.paytm_mid;
      const hasUPI = paymentSettings?.upi_id;

      if (!hasPaytm && !hasUPI) {
        toast({
          title: "Payment Not Configured",
          description:
            "Please configure Paytm or UPI settings in the Payment Settings tab first.",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep("qr");
    } else if (method === "split") {
      // Show split payment entry UI
      setSplitCash("");
      setSplitUpi("");
      setSplitCard("");
      setCurrentStep("split");
    } else if (method === "room") {
      // Handle charge to room
      handleChargeToRoom();
    } else {
      // For cash/card, mark as paid immediately
      handleMarkAsPaid(method);
    }
  };

  const handleChargeToRoom = async () => {
    if (!detectedReservation) {
      toast({
        title: "No Reservation Found",
        description:
          "Unable to charge to room. No active reservation detected.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update order with reservation_id and payment status
      if (orderId) {
        // First get the order_id from kitchen_orders
        const { data: kitchenOrder } = await supabase
          .from("kitchen_orders")
          .select("order_id")
          .eq("id", orderId)
          .single();

        if (kitchenOrder?.order_id) {
          // Update the order with reservation link, payment status, and discount info
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              reservation_id: detectedReservation.reservation_id,
              payment_status: "Pending - Room Charge",
              payment_method: "room",
              status: "completed",
              total: total, // Save final amount after discount
              discount_amount: totalDiscountAmount,
              discount_percentage:
                manualDiscountPercent > 0
                  ? manualDiscountPercent
                  : appliedPromotion?.discount_percentage || 0,
              promotion_code: (appliedPromotion as any)?.promotion_code || (appliedPromotion as any)?.code || null,
              promotion_name: appliedPromotion?.name || null,
            })
            .eq("id", kitchenOrder.order_id);

          if (updateError) throw updateError;
        }

        // Update kitchen order status
        const { error: kitchenError } = await supabase
          .from("kitchen_orders")
          .update({ status: "completed" })
          .eq("id", orderId);

        if (kitchenError) throw kitchenError;

        // Create room food order entry
        const { error: roomOrderError } = await supabase
          .from("room_food_orders")
          .insert({
            room_id: detectedReservation.room_id,
            order_id: kitchenOrder?.order_id,
            total: total,
            status: "pending",
          });

        if (roomOrderError) {
          console.error("Error creating room food order:", roomOrderError);
          // Don't fail the whole operation if this fails
        }
      }

      toast({
        title: "Charged to Room",
        description: `Order charged to ${detectedReservation.roomName}. Will be settled at checkout.`,
      });

      setCurrentStep("success");

      // Auto-close after 6 seconds (gives user time to share bill)
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 6000);
    } catch (error) {
      console.error("Error charging to room:", error);
      toast({
        title: "Charge Failed",
        description:
          "Failed to charge order to room. Please try another payment method.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async (paymentMethod: string = "upi", splitPaymentsData?: Array<{method: string; amount: number}>) => {
    // ✅ Prevent double-click: if already processing, bail out
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    try {
      // Here you would integrate with your payment verification system
      // For now, we'll simulate a successful payment

      await new Promise((resolve) => setTimeout(resolve, 500));

      const restaurantIdToUse =
        restaurantInfo?.restaurantId || restaurantInfo?.id;

      // For NC orders, the total is 0 and order_type is non-chargeable
      const finalTotal = isNonChargeable ? 0 : total;
      const finalOrderType = isNonChargeable ? "non-chargeable" : undefined;
      const finalPaymentMethod = isNonChargeable ? "nc" : paymentMethod;

      // Get current user for staff_id
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Update order status to completed in database if orderId is provided
      if (orderId) {
        // First get the kitchen order to find linked order_id
        const { data: kitchenOrder } = await supabase
          .from("kitchen_orders")
          .select("order_id")
          .eq("id", orderId)
          .single();

        // Update kitchen order status
        const { error } = await supabase
          .from("kitchen_orders")
          .update({
            status: "completed",
            ...(customerName.trim() && { customer_name: customerName.trim() }),
            ...(customerMobile && { customer_phone: customerMobile }),
          })
          .eq("id", orderId);

        if (error) {
          console.error("Error updating order status:", error);
          toast({
            title: "Warning",
            description: "Payment received but order status update failed.",
            variant: "destructive",
          });
        }

        // Build discount notes for owner visibility
        const discountNotesParts: string[] = [];
        if (manualDiscountPercent > 0) {
          discountNotesParts.push(`${manualDiscountPercent}% off (₹${manualDiscountPercentAmount.toFixed(2)})`);
        }
        if (manualDiscountCash > 0) {
          discountNotesParts.push(`Manual ₹${manualDiscountCash.toFixed(2)} off`);
        }
        if (appliedPromotion) {
          const promoLabel = appliedPromotion.promotion_code || appliedPromotion.name || 'Promo';
          discountNotesParts.push(`${promoLabel} (₹${promotionDiscountAmount.toFixed(2)})`);
        }
        const discountNotes = discountNotesParts.join(' + ');
        const effectiveDiscountPct = subtotal > 0 && totalDiscountAmount > 0
          ? Math.round((totalDiscountAmount / subtotal) * 100)
          : 0;

        // Update the linked order with payment status and discount info
        if (kitchenOrder?.order_id) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({
              payment_status: isNonChargeable ? "nc" : "paid",
              payment_method: finalPaymentMethod,
              status: "completed",
              total: finalTotal, // Save final amount (0 for NC orders)
              discount_amount: isNonChargeable ? subtotal : totalDiscountAmount, // For NC, discount is the full subtotal
              discount_percentage: isNonChargeable
                ? 100
                : effectiveDiscountPct,
              promotion_code: isNonChargeable ? null : ((appliedPromotion as any)?.promotion_code || (appliedPromotion as any)?.code || null),
              promotion_name: isNonChargeable ? null : (appliedPromotion?.name || null),
              ...(discountNotes && { discount_notes: isNonChargeable ? 'Non-Chargeable (100% off)' : discountNotes }),
              ...(finalOrderType && { order_type: finalOrderType }),
              // Save NC reason for non-chargeable orders
              ...(isNonChargeable && ncReason && { nc_reason: ncReason }),
              // Save split payments breakdown for reporting
              ...(splitPaymentsData && { split_payments: splitPaymentsData }),
              // Update customer details if provided
              ...(customerName.trim() && {
                customer_name: customerName.trim(),
              }),
              ...(customerMobile && { customer_phone: customerMobile }),
            })
            .eq("id", kitchenOrder.order_id);

          if (orderError) {
            console.error("Error updating order payment status:", orderError);
          }
        } else {
          // No linked order_id — FIRST search for an existing orphaned order
          // that matches this kitchen order (prevents creating duplicates)
          try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const finalCustName = customerName.trim() || tableNumber || "QSR-Order";

            // Look for an existing order with same customer + restaurant + today + similar total
            const { data: existingOrders } = await supabase
              .from("orders")
              .select("id")
              .eq("restaurant_id", restaurantIdToUse)
              .ilike("customer_name", finalCustName)
              .gte("created_at", todayStart.toISOString())
              .in("status", ["preparing", "ready", "pending", "served"])
              .order("created_at", { ascending: false })
              .limit(1);

            if (existingOrders && existingOrders.length > 0) {
              // Found orphaned order — update it instead of creating duplicate
              const orphanedId = existingOrders[0].id;
              console.log("✅ Found orphaned order, updating instead of creating duplicate:", orphanedId);

              await supabase
                .from("orders")
                .update({
                  payment_status: isNonChargeable ? "nc" : "paid",
                  payment_method: finalPaymentMethod,
                  status: "completed",
                  total: finalTotal,
                  discount_amount: isNonChargeable ? subtotal : totalDiscountAmount,
                  discount_percentage: isNonChargeable ? 100 : effectiveDiscountPct,
                  promotion_code: isNonChargeable ? null : ((appliedPromotion as any)?.promotion_code || (appliedPromotion as any)?.code || null),
                  promotion_name: isNonChargeable ? null : (appliedPromotion?.name || null),
                  ...(discountNotes && { discount_notes: isNonChargeable ? 'Non-Chargeable (100% off)' : discountNotes }),
                  ...(finalOrderType && { order_type: finalOrderType }),
                  ...(isNonChargeable && ncReason && { nc_reason: ncReason }),
                  ...(splitPaymentsData && { split_payments: splitPaymentsData }),
                  ...(customerName.trim() && { customer_name: customerName.trim() }),
                  ...(customerMobile && { customer_phone: customerMobile }),
                })
                .eq("id", orphanedId);

              // Link it back
              await supabase
                .from("kitchen_orders")
                .update({ order_id: orphanedId })
                .eq("id", orderId);
            } else {
              // Truly no existing order — create one
              const formattedItems = orderItems.map(
                (item) => formatOrderItemString(item.quantity, item.name, item.price, item.notes)
              );

              const { data: newOrder, error: insertError } = await supabase
                .from("orders")
                .insert({
                  restaurant_id: restaurantIdToUse,
                  customer_name: finalCustName,
                  items: formattedItems,
                  total: finalTotal,
                  status: "completed",
                  payment_status: isNonChargeable ? "nc" : "paid",
                  payment_method: finalPaymentMethod,
                  source: "qsr",
                  order_type: finalOrderType || "dine-in",
                  discount_amount: isNonChargeable
                    ? subtotal
                    : totalDiscountAmount,
                  discount_percentage: isNonChargeable
                    ? 100
                    : effectiveDiscountPct,
                  promotion_code: isNonChargeable ? null : ((appliedPromotion as any)?.promotion_code || (appliedPromotion as any)?.code || null),
                  promotion_name: isNonChargeable ? null : (appliedPromotion?.name || null),
                  ...(discountNotes && { discount_notes: isNonChargeable ? 'Non-Chargeable (100% off)' : discountNotes }),
                  ...(isNonChargeable && ncReason && { nc_reason: ncReason }),
                  ...(customerMobile && { customer_phone: customerMobile }),
                })
                .select()
                .single();

              if (insertError) {
                console.error("Error creating order record:", insertError);
              } else if (newOrder) {
                // Link the new order back to the kitchen_order
                await supabase
                  .from("kitchen_orders")
                  .update({ order_id: newOrder.id })
                  .eq("id", orderId);
              }
            }
          } catch (createOrderError) {
            console.error("Error creating/finding order for QSR:", createOrderError);
            // Don't fail the payment if order creation fails
          }
        }

        // Log promotion usage if promotion was applied
        if (appliedPromotion && restaurantIdToUse) {
          try {
            await supabase.functions.invoke("log-promotion-usage", {
              body: {
                orderId: orderId,
                promotionId: appliedPromotion.id,
                restaurantId: restaurantIdToUse,
                customerName: customerName || "Walk-in Customer",
                customerPhone: customerMobile || null,
                orderTotal: total,
                discountAmount: promotionDiscountAmount,
              },
            });
          } catch (promoError) {
            console.error("Error logging promotion usage:", promoError);
            // Don't fail the payment if logging fails
          }
        }

        // Log transaction to pos_transactions table (skip for NC orders as they have no payment)
        if (!isNonChargeable) {
          try {
            await supabase.from("pos_transactions").insert({
              restaurant_id: restaurantIdToUse,
              order_id: kitchenOrder?.order_id || null,
              kitchen_order_id: orderId,
              amount: finalTotal,
              payment_method: finalPaymentMethod,
              status: "completed",
              customer_name: customerName || null,
              customer_phone: customerMobile || null,
              staff_id: user?.id || null,
              discount_amount: totalDiscountAmount,
              promotion_id: appliedPromotion?.id || null,
              ...(splitPaymentsData && { split_payments: splitPaymentsData }),
            });
          } catch (transactionError) {
            console.error("Error logging transaction:", transactionError);
            // Don't fail the payment if transaction logging fails
          }
        }
      }

      // --- CRM Auto-Sync: upsert customer & award loyalty points ---
      if (customerName.trim()) {
        try {
          await syncCustomerToCRM({
            customerName: customerName.trim(),
            customerPhone: customerMobile || undefined,
            orderTotal: finalTotal,
            orderId: orderId || undefined,
            source: tableNumber ? "pos" : "qsr",
          });
        } catch (crmError) {
          console.error("CRM sync error (non-blocking):", crmError);
          // CRM sync is best-effort, don't fail payment
        }
      }

      // Skip success screen — close immediately with toast
      const isDirectClose = true;

      const splitDesc = splitPaymentsData?.length
        ? splitPaymentsData
            .filter(s => s.amount > 0)
            .map(s => `${currencySymbol}${s.amount.toFixed(2)} ${s.method.toUpperCase()}`)
            .join(" + ")
        : null;

      toast({
        title: isNonChargeable ? "NC Order Completed" : "Payment Complete ✓",
        description: isNonChargeable
          ? "Complimentary order has been completed successfully."
          : splitDesc
            ? `Split: ${splitDesc}`
            : `${currencySymbol}${finalTotal.toFixed(2)} received via ${finalPaymentMethod.toUpperCase()}`,
      });

      if (isDirectClose) {
        // Fire WhatsApp bill in background if opted in
        if (sendBillToEmail && customerMobile && restaurantInfo) {
          handleSendWhatsAppBill();
        }
        invalidateOrderQueries();
        onSuccess();
        onClose();
      } else {
        setCurrentStep("success");
        // Auto-close after 6 seconds for UPI/room flows
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 6000);
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an error processing the payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleItemToggle = async (index: number) => {
    if (!orderId) return;

    // Create a copy of current status or initialize new array
    const newCompletionStatus = [
      ...(itemCompletionStatus || new Array(orderItems.length).fill(false)),
    ];

    // Ensure array is long enough
    while (newCompletionStatus.length <= index) {
      newCompletionStatus.push(false);
    }

    // Toggle status
    newCompletionStatus[index] = !newCompletionStatus[index];

    try {
      const { error } = await supabase
        .from("kitchen_orders")
        .update({ item_completion_status: newCompletionStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state (like KDS pattern)
      setItemCompletionStatus(newCompletionStatus);
    } catch (error) {
      console.error("Error toggling item status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item status",
      });
    }
  };

  const renderConfirmStep = () => (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Compact Header */}
      <div className="text-center py-2.5 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-md">
        <h2 className="text-lg font-bold text-white mb-0.5 drop-shadow-sm">
          Confirm Order
        </h2>
        <p className="text-white/80 text-xs">
          Review the details for{" "}
          <span className="font-semibold text-white">
            {tableNumber ? `Table ${tableNumber}` : "POS Order"}
            {orderType && orderType !== "dine-in" && (
              <span className="ml-1">
                (
                {orderType === "nc"
                  ? "Non-Chargeable"
                  : orderType.charAt(0).toUpperCase() + orderType.slice(1)}
                )
              </span>
            )}
          </span>
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* LEFT COLUMN - Order Items & Totals */}
        <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[60vh]">
          {/* Order Items Card */}
          <Card className="p-0 overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-slate-100 to-gray-50 dark:from-gray-800 dark:to-gray-750 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
                  Order Items
                </span>
                <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2.5 py-1 rounded-full font-medium">
                  {orderItems.length} item{orderItems.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
              {orderItems.map((item, idx) => {
                const isWeightBased =
                  item.pricingType && item.pricingType !== "fixed";
                const itemTotal =
                  item.calculatedPrice ?? item.price * item.quantity;
                const isCompleted = itemCompletionStatus[idx] === true;

                return (
                  <div
                    key={idx}
                    onClick={() => handleItemToggle(idx)}
                    className={`flex justify-between items-center cursor-pointer transition-all duration-200 p-3 rounded-xl group ${
                      isCompleted
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border border-green-200 dark:border-green-700"
                        : "hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Completion indicator */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isCompleted
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                            : "border-2 border-gray-300 dark:border-gray-600 group-hover:border-indigo-400"
                        }`}
                      >
                        {isCompleted && <span className="text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`font-medium block truncate ${
                            isCompleted
                              ? "line-through text-gray-400 dark:text-gray-500"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {isWeightBased && item.actualQuantity ? (
                            <>
                              {item.actualQuantity} {item.unit} {item.name}
                            </>
                          ) : (
                            <>
                              <span className="text-indigo-600 dark:text-indigo-400">
                                {item.quantity}x
                              </span>{" "}
                              {item.name}
                            </>
                          )}
                        </span>
                        {item.isCustomExtra && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full ml-2">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isCompleted && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                          Ready
                        </span>
                      )}
                      <span
                        className={`font-bold ${
                          isCompleted
                            ? "line-through text-gray-400 dark:text-gray-500"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {currencySymbol}
                        {itemTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals Section */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-4 mt-4 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {currencySymbol}
                  {subtotal.toFixed(2)}
                </span>
              </div>

              {appliedPromotion && promotionDiscountAmount > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Promo Discount ({appliedPromotion.name})
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    -{currencySymbol}
                    {promotionDiscountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {manualDiscountPercent > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Discount ({manualDiscountPercent}%)
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    -{currencySymbol}
                    {manualDiscountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {totalDiscountAmount > 0 && (
                <div className="flex justify-between text-sm font-semibold mb-3">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Total Discount
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    -{currencySymbol}
                    {totalDiscountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800 dark:text-white">
                    {isNonChargeable ? "NC Total" : "Total Due"}
                  </span>
                  {isNonChargeable ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-400 line-through">
                        {currencySymbol}
                        {subtotal.toFixed(2)}
                      </span>
                      <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
                        {currencySymbol}0.00
                      </span>
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                        🎁 Non-Chargeable
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {currencySymbol}
                      {total.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN - Payment Controls (Modernized) */}
        <div className="p-3 space-y-2 overflow-y-auto max-h-[60vh] bg-white dark:bg-gray-900">

          {/* Premium Unified Customer & Receipt Options Card */}
          <div className="p-3 rounded-xl border border-purple-100 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/40 to-indigo-50/20 dark:from-purple-950/10 dark:to-indigo-950/5 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                <span>👤 Customer Details</span>
                {(orderType === "takeaway" || orderType === "delivery" || orderType === "nc") && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider">Required</span>
                )}
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={(orderType === "takeaway" || orderType === "delivery" || orderType === "nc") ? "Name *" : "Name (optional)"}
                  className={`h-8 text-xs rounded-lg transition-all ${
                    (orderType === "takeaway" || orderType === "delivery" || orderType === "nc") && !customerName.trim()
                      ? "border-red-300 focus-visible:ring-red-400 bg-red-50/20"
                      : "border-gray-200 dark:border-gray-800 focus-visible:ring-purple-400"
                  }`}
                />
                {(orderType === "takeaway" || orderType === "delivery" || orderType === "nc") && !customerName.trim() && (
                  <p className="text-[9px] text-red-500 mt-0.5 ml-1">Required</p>
                )}
              </div>
              <div>
                <Input
                  id="customer-phone"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="Phone number"
                  className="h-8 text-xs rounded-lg border-gray-200 dark:border-gray-800 focus-visible:ring-purple-400"
                  type="tel"
                />
              </div>
            </div>

            {/* Elegant WhatsApp Bill Toggle within Customer Panel */}
            <div className="pt-2 border-t border-purple-100/50 dark:border-purple-900/30">
              <label className="flex items-center gap-2 px-1 py-0.5 rounded cursor-pointer select-none group">
                <input
                  type="checkbox"
                  id="send-bill-checkbox"
                  checked={sendBillToEmail}
                  onChange={(e) => setSendBillToEmail(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
                />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  📲 Send receipt via WhatsApp
                </span>
                {sendBillToEmail && customerMobile && customerMobile.replace(/\D/g, "").length >= 10 && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-bold shrink-0 animate-in fade-in">✓</span>
                )}
              </label>
              {sendBillToEmail && !customerMobile && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 ml-5 animate-in slide-in-from-top-1">
                  ⚠️ Enter phone number above to receive WhatsApp bill
                </p>
              )}
            </div>
          </div>

          {/* 3. NC Reason — compact (NC orders only) */}
          {(isNonChargeable || orderType === "nc") && (
            <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 space-y-1.5">
              <h3 className="text-xs font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                🎁 NC Reason <span className="text-red-500">*</span>
              </h3>
              <Select
                value={ncReason}
                onValueChange={(value) => setNcReason(value)}
              >
                <SelectTrigger
                  id="nc-reason"
                  className={`h-8 text-sm ${
                    !ncReason
                      ? "border-red-300 focus-visible:ring-red-500"
                      : "border-green-300 focus-visible:ring-green-500"
                  }`}
                >
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff_meal">Staff Meal</SelectItem>
                  <SelectItem value="owner_complimentary">Owner Complimentary</SelectItem>
                  <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                  <SelectItem value="promotional_giveaway">Promotional Giveaway</SelectItem>
                  <SelectItem value="wastage">Wastage/Spoilage</SelectItem>
                  <SelectItem value="testing">Testing/Quality Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {!ncReason && (
                <p className="text-[10px] text-red-500">Select a reason</p>
              )}
            </div>
          )}

          {/* 4. Promo + Discount — MERGED into one card */}
          <div className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 space-y-2">
            {/* Promotion */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300">Promo & Discount</h3>

              {!appliedPromotion ? (
                <div className="space-y-1.5">
                  <Select
                    value={promotionCode}
                    onValueChange={(value) => {
                      setPromotionCode(value);
                      if (value && value !== "manual") {
                        handleApplyPromotion(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue placeholder="Select promo code" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {activePromotions.length > 0 ? (
                        <>
                          {activePromotions.map((promo) => (
                            <SelectItem
                              key={promo.id}
                              value={promo.promotion_code || ""}
                            >
                              <div className="flex items-center justify-between w-full gap-3 pr-2">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs">
                                      {promo.promotion_code}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {promo.name}
                                    </span>
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 text-xs whitespace-nowrap"
                                >
                                  {promo.discount_percentage
                                    ? `${promo.discount_percentage}% off`
                                    : `₹${promo.discount_amount} off`}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                          <Separator className="my-1" />
                          <SelectItem value="manual">
                            ✏️ Enter code manually...
                          </SelectItem>
                        </>
                      ) : (
                        <SelectItem value="manual">
                          Enter code manually...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {(promotionCode === "manual" ||
                    activePromotions.length === 0) && (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={promotionCode === "manual" ? "" : promotionCode}
                        onChange={(e) =>
                          setPromotionCode(e.target.value.toUpperCase())
                        }
                        placeholder="Enter code"
                        className="flex-1 h-7 text-xs"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleApplyPromotion();
                          }
                        }}
                      />
                      <Button onClick={() => handleApplyPromotion()} size="sm" className="h-7 text-xs px-3">
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="default" className="bg-green-600 text-xs shrink-0">
                      {appliedPromotion.code}
                    </Badge>
                    <span className="text-xs text-green-700 dark:text-green-300 truncate">
                      -{currencySymbol}{promotionDiscountAmount.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    onClick={handleRemovePromotion}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Manual Discount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Discount %</label>
                <div className="flex items-center gap-1 mt-0.5">
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    max="100"
                    value={localDiscountPctStr}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      setLocalDiscountPctStr(valStr);
                      const value = parseFloat(valStr) || 0;
                      if (value >= 0 && value <= 100) {
                        setManualDiscountPercent(value);
                      } else if (valStr === "") {
                        setManualDiscountPercent(0);
                      }
                    }}
                    className="flex-1 h-7 text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">%</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cash Off</label>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{currencySymbol}</span>
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={localDiscountCashStr}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      setLocalDiscountCashStr(valStr);
                      const value = parseFloat(valStr) || 0;
                      if (value >= 0 && value <= subtotal) {
                        setManualDiscountCash(value);
                      } else if (valStr === "") {
                        setManualDiscountCash(0);
                      }
                    }}
                    className="flex-1 h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {(manualDiscountPercent > 0 || manualDiscountCash > 0) && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                  ✓ Save {currencySymbol}{manualDiscountAmount.toFixed(2)}
                </span>
                <button
                  onClick={() => {
                    setManualDiscountPercent(0);
                    setManualDiscountCash(0);
                    setLocalDiscountPctStr("");
                    setLocalDiscountCashStr("");
                  }}
                  className="text-[10px] text-red-500 hover:text-red-700 underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* 5. Action Buttons — compact row */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant="outline"
              onClick={handleEditOrder}
              className="w-full h-8 text-[11px]"
              size="sm"
            >
              <Receipt className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePrintBill(true)}
              className="w-full h-8 text-[11px]"
              size="sm"
              disabled={isSaving}
            >
              <Printer className="w-3 h-3 mr-1" />
              {isSaving ? "..." : "Print"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full h-8 text-[11px]"
              size="sm"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Order</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this order permanently? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteOrder}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Sticky Footer - Always visible */}
      <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/80 pt-4 pb-3 px-4 border-t border-gray-200/50 dark:border-gray-700/50">
        {isNonChargeable ? (
          /* NC Order - Complete directly without payment */
          <Button
            onClick={async () => {
              // Validate customer name for NC orders
              if (!customerName.trim()) {
                toast({
                  title: "Customer name required",
                  description: "Please enter a customer name for this NC order",
                  variant: "destructive",
                });
                return;
              }
              // Validate NC reason
              if (!ncReason) {
                toast({
                  title: "NC reason required",
                  description: "Please select a reason for this NC order",
                  variant: "destructive",
                });
                return;
              }
              await handleMarkAsPaid("nc");
            }}
            className={`w-full bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white shadow-lg shadow-purple-300/50 dark:shadow-purple-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] font-semibold ${
              !customerName.trim() || !ncReason
                ? "opacity-60 cursor-not-allowed"
                : ""
            }`}
            size="lg"
            disabled={isProcessingPayment || !customerName.trim() || !ncReason}
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : !customerName.trim() ? (
              "⚠️ Enter Customer Name First"
            ) : !ncReason ? (
              "⚠️ Select NC Reason First"
            ) : (
              "🎁 Complete Non-Chargeable Order"
            )}
          </Button>
        ) : (
          /* Regular Order - Proceed to payment methods */
          <Button
            onClick={async () => {
              // Validate customer name for takeaway/delivery/NC
              if (
                (orderType === "takeaway" ||
                  orderType === "delivery" ||
                  orderType === "nc") &&
                !customerName.trim()
              ) {
                toast({
                  title: "Customer Name Required",
                  description:
                    "Please enter customer name before proceeding to payment.",
                  variant: "destructive",
                });
                return;
              }
              const saved = await saveCustomerDetails();
              if (saved) {
                // Check for active reservation before proceeding to payment
                await checkForActiveReservation();
                setCurrentStep("method");
              }
            }}
            className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-green-300/50 dark:shadow-green-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] font-semibold"
            size="lg"
            disabled={
              isSaving ||
              ((orderType === "takeaway" ||
                orderType === "delivery" ||
                orderType === "nc") &&
                !customerName.trim())
            }
          >
            {isSaving ? "Saving Details..." : "Proceed to Payment Methods →"}
          </Button>
        )}
      </div>
    </div>
  );

  const renderMethodStep = () => (
    <div className="space-y-4 p-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setCurrentStep("confirm")}
        className="mb-1 h-8 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        size="sm"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        Back
      </Button>

      {/* NC Order - Complimentary View */}
      {isNonChargeable ? (
        <>
          {/* NC Header */}
          <div className="text-center py-6 px-8 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30">
            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-sm">
              🎁 Complimentary Order
            </h2>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-white/80 text-sm">Amount:</span>
              <span className="text-xl font-extrabold text-white line-through opacity-60">
                {currencySymbol}
                {subtotal.toFixed(2)}
              </span>
              <span className="text-2xl font-extrabold text-white">
                {currencySymbol}0.00
              </span>
            </div>
          </div>

          {/* NC Explanation */}
          <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-2 border-amber-300 dark:border-amber-600">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-lg">🎁</span>
              </div>
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Non-Chargeable Order
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  This order will be marked as complimentary. No payment will be
                  collected and the amount will not be added to revenue.
                </p>
              </div>
            </div>
          </Card>

          {/* Complete Non-Chargeable Order Button */}
          <Button
            onClick={() => handleMethodSelect("nc")}
            className="w-full h-16 text-lg bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 text-white shadow-lg shadow-purple-300/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
            disabled={isProcessingPayment}
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-3" />
                Complete Non-Chargeable Order
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          {/* Compact Header - Normal Orders */}
          <div className="text-center py-3 px-6 rounded-xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 shadow-md">
            <h2 className="text-lg font-bold text-white mb-1 drop-shadow-sm">
              Select Payment Method
            </h2>
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-white/80 text-xs">Total:</span>
              <span className="text-lg font-extrabold text-white">
                {currencySymbol}
                {total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Show room charge option if guest is detected */}
          {detectedReservation && (
            <Card className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-2 border-emerald-400 dark:border-emerald-600 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-300/50">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300">
                    In-House Guest Detected
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {detectedReservation.customerName} -{" "}
                    {detectedReservation.roomName}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleMethodSelect("room")}
                className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-300/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              >
                <Receipt className="w-5 h-5 mr-3" />
                Charge to {detectedReservation.roomName}
              </Button>
            </Card>
          )}

          {/* Payment Methods Grid */}
          <div className="space-y-2">
            {/* Cash */}
            <button
              onClick={() => handleMethodSelect("cash")}
              className="w-full h-14 rounded-xl flex items-center px-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-200">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3 text-left">
                <span className="text-base font-bold text-gray-800 dark:text-white">
                  Cash
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pay with cash
                </p>
              </div>
            </button>

            {/* Card */}
            <button
              onClick={() => handleMethodSelect("card")}
              className="w-full h-14 rounded-xl flex items-center px-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-200">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3 text-left">
                <span className="text-base font-bold text-gray-800 dark:text-white">
                  Card
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Credit or Debit card
                </p>
              </div>
            </button>

            {/* UPI */}
            <button
              onClick={() => handleMethodSelect("upi")}
              className="w-full h-14 rounded-xl flex items-center px-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30 border border-purple-200 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-200">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3 text-left">
                <span className="text-base font-bold text-gray-800 dark:text-white">
                  UPI / QR Code
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Scan QR to pay
                </p>
              </div>
            </button>

            {/* Split Payment */}
            <button
              onClick={() => handleMethodSelect("split")}
              className="w-full h-14 rounded-xl flex items-center px-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 border border-orange-200 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-500 group"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-200">
                <span className="text-white font-bold text-base">&#8361;</span>
              </div>
              <div className="ml-3 text-left flex-1">
                <span className="text-base font-bold text-gray-800 dark:text-white">Split Payment</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pay with Cash + UPI + Card mix</p>
              </div>
              <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 px-2 py-0.5 rounded-full ml-2">NEW</span>
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderSplitStep = () => {
    const cashAmt = parseFloat(splitCash) || 0;
    const upiAmt = parseFloat(splitUpi) || 0;
    const cardAmt = parseFloat(splitCard) || 0;
    const splitSum = cashAmt + upiAmt + cardAmt;
    const remaining = parseFloat((total - splitSum).toFixed(2));
    const isValid = Math.abs(remaining) < 0.01 && splitSum > 0 && (cashAmt > 0 || upiAmt > 0 || cardAmt > 0);

    const handleConfirmSplit = async () => {
      if (!isValid) return;
      const splits = [
        ...(cashAmt > 0 ? [{ method: "cash", amount: cashAmt }] : []),
        ...(upiAmt > 0 ? [{ method: "upi", amount: upiAmt }] : []),
        ...(cardAmt > 0 ? [{ method: "card", amount: cardAmt }] : []),
      ];
      await handleMarkAsPaid("split", splits);
    };

    return (
      <div className="flex flex-col h-full max-h-[80vh] overflow-y-auto p-5 space-y-4">
        {/* Back */}
        <button
          onClick={() => setCurrentStep("method")}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payment Methods
        </button>

        {/* Header */}
        <div className="text-center py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-1">Split Payment</h2>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
            <span className="text-white/80 text-xs">Total to split:</span>
            <span className="text-xl font-extrabold text-white">{currencySymbol}{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Split Inputs */}
        <div className="space-y-3">
          {/* Cash */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 transition-all focus-within:border-green-500">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Cash</label>
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mr-1.5">{currencySymbol}</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={splitCash}
                  onChange={e => setSplitCash(e.target.value)}
                  className="h-8 text-base font-bold border-0 bg-transparent focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* UPI */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 transition-all focus-within:border-purple-500">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-1">UPI</label>
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mr-1.5">{currencySymbol}</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={splitUpi}
                  onChange={e => setSplitUpi(e.target.value)}
                  className="h-8 text-base font-bold border-0 bg-transparent focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 transition-all focus-within:border-blue-500">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm flex-shrink-0">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">Card</label>
              <div className="flex items-center">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mr-1.5">{currencySymbol}</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={splitCard}
                  onChange={e => setSplitCard(e.target.value)}
                  className="h-8 text-base font-bold border-0 bg-transparent focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Balance Indicator */}
        <div className={`rounded-xl p-3 text-center border-2 transition-all duration-200 ${
          Math.abs(remaining) < 0.01 && splitSum > 0
            ? "border-green-400 bg-green-50 dark:bg-green-900/20"
            : remaining > 0
              ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
              : "border-red-400 bg-red-50 dark:bg-red-900/20"
        }`}>
          {Math.abs(remaining) < 0.01 && splitSum > 0 ? (
            <p className="text-green-700 dark:text-green-400 font-bold text-sm">&#10003; Amounts balance perfectly!</p>
          ) : remaining > 0 ? (
            <p className="text-orange-700 dark:text-orange-400 font-semibold text-sm">
              Still needed: <span className="font-black">{currencySymbol}{remaining.toFixed(2)}</span>
            </p>
          ) : (
            <p className="text-red-700 dark:text-red-400 font-semibold text-sm">
              Over by: <span className="font-black">{currencySymbol}{Math.abs(remaining).toFixed(2)}</span>
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {currencySymbol}{splitSum.toFixed(2)} entered / {currencySymbol}{total.toFixed(2)} required
          </p>
        </div>

        {/* Confirm Button */}
        <Button
          onClick={handleConfirmSplit}
          disabled={!isValid || isProcessingPayment}
          className="w-full h-12 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-600 hover:via-amber-600 hover:to-yellow-600 text-white font-bold shadow-lg shadow-orange-200/60 dark:shadow-orange-900/30 disabled:opacity-50 transition-all"
          size="lg"
        >
          {isProcessingPayment ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
          ) : (
            <>Confirm Split — {currencySymbol}{total.toFixed(2)}</>
          )}
        </Button>
      </div>
    );
  };

  const renderQRStep = () => (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 p-2 pb-4">
        <Button
          variant="ghost"
          onClick={() => {
            setCurrentStep("method");
            setPaytmOrderId(null);
            setIsPaytmQR(false);
            setPaymentAutoDetected(false);
          }}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Methods
        </Button>

        <div className="text-center space-y-4">
          {/* Success State */}
          {paymentAutoDetected ? (
            <>
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-300/50 animate-bounce">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-green-600">
                Payment Received!
              </h2>
              <p className="text-muted-foreground">
                {currencySymbol}
                {total.toFixed(2)} received successfully
                {tableNumber ? ` from Table ${tableNumber}` : ""}
              </p>
              <div className="text-sm text-muted-foreground animate-pulse">
                Completing order automatically...
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground">
                Scan to Pay
              </h2>
              <p className="text-muted-foreground">
                {isPaytmQR ? (
                  <>
                    Ask the customer to scan the QR code using any UPI app
                    <br />
                    <span className="text-xs text-purple-500 font-medium">
                      ⚡ Powered by Paytm • Auto-detection enabled
                    </span>
                  </>
                ) : (
                  <>
                    Ask the customer to scan the QR code using any UPI app
                    <br />
                    (Google Pay, PhonePe, etc.)
                  </>
                )}
              </p>

              {/* QR Code Display */}
              {isGeneratingQR ? (
                <div className="flex justify-center my-6">
                  <div className="bg-muted p-4 rounded-lg w-64 h-64 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    <p className="text-muted-foreground text-sm">
                      Generating Dynamic QR...
                    </p>
                  </div>
                </div>
              ) : qrCodeUrl ? (
                <div className="flex justify-center my-6">
                  <div
                    className={`bg-white p-4 rounded-lg shadow-lg border-4 ${
                      paymentStatus === "waiting"
                        ? "border-purple-300 animate-pulse"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={qrCodeUrl}
                      alt="Payment QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center my-6">
                  <div className="bg-muted p-4 rounded-lg w-64 h-64 flex items-center justify-center">
                    <p className="text-muted-foreground">
                      Generating QR code...
                    </p>
                  </div>
                </div>
              )}

              {/* Waiting Indicator (Paytm only) */}
              {isPaytmQR && paymentStatus === "waiting" && (
                <div className="flex items-center justify-center gap-2 text-purple-600">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    Waiting for payment...
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Amount to be Paid:
                </p>
                <p className="text-4xl font-bold text-blue-600">
                  {currencySymbol}
                  {total.toFixed(2)}
                </p>
              </div>

              {/* Paytm badge */}
              {isPaytmQR && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    🔒 Secure Paytm Payment
                  </Badge>
                  {qrExpiresAt && (
                    <Badge variant="outline" className="text-xs">
                      Expires in 10 min
                    </Badge>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      {!paymentAutoDetected && (
        <div className="sticky bottom-0 bg-background pt-3 pb-2 px-2 border-t shadow-lg">
          <Button
            onClick={() => handleMarkAsPaid("upi")}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
            disabled={isProcessingPayment}
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : isPaytmQR ? (
              "Manual Override: Mark as Paid"
            ) : (
              "Mark as Paid"
            )}
          </Button>
          {isPaytmQR && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Payment will be auto-detected. Use manual override only if
              auto-detection fails.
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center justify-center py-8 px-6">
      {/* Animated Success Icon */}
      <div className="relative mb-4">
        <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-ping opacity-25"></div>
        <div className="relative w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-green-300/50">
          <Check className="w-12 h-12 text-white drop-shadow-sm" strokeWidth={3} />
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-extrabold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
        Payment Successful!
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        The order for{" "}
        <span className="font-semibold text-gray-800 dark:text-white">
          {tableNumber ? `Table ${tableNumber}` : "POS"}
        </span>{" "}
        is now complete.
      </p>

      {/* Simple Action Buttons */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-green-300/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
          size="lg"
        >
          Close
        </Button>

        <Button
          variant="outline"
          onClick={() => handlePrintBill(false)}
          className="w-full border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 transition-all duration-300"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Bill
        </Button>

        {/* Send Bill via WhatsApp (MSG91 API — automated, no browser needed) */}
        {customerMobile && (
          <Button
            onClick={handleSendWhatsAppBill}
            disabled={isSendingWhatsAppBill}
            className="w-full h-11 bg-[#25D366] hover:bg-[#1DA851] text-white font-semibold text-sm rounded-xl shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-95"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {isSendingWhatsAppBill ? "Sending via WhatsApp..." : "Send Bill via WhatsApp"}
          </Button>
        )}

        {/* Free Share (wa.me link or clipboard) */}
        <Button
          variant="outline"
          onClick={customerMobile ? handleShareWhatsApp : handleShareGeneric}
          className="w-full h-11 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-semibold text-sm transition-all active:scale-95"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {customerMobile ? "Share Text Bill (Free)" : "Copy Bill Text"}
        </Button>
      </div>
    </div>
  );

  const renderEditStep = () => (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Vibrant Header */}
      <div className="text-center py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep("confirm")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Order
          </Button>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
        <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-sm">
          Edit Order
        </h2>
        <p className="text-white/80 text-sm">
          Add new items to{" "}
          <span className="font-semibold text-white">
            {tableNumber ? `Table ${tableNumber}` : "this order"}
          </span>
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Previously Sent Items */}
        <Card className="p-0 overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="bg-gradient-to-r from-slate-100 to-gray-50 dark:from-gray-800 dark:to-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-500" />
              Previously Sent Items
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full ml-auto">
                {orderItems.length} items
              </span>
            </h3>
          </div>
          <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
            {orderItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="flex-1 font-medium text-sm text-gray-700 dark:text-gray-200 truncate">
                  {item.name}
                </span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUpdateExistingItemQuantity(idx, item.quantity - 1)
                      }
                      className="h-8 w-8 p-0 rounded-none hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      -
                    </Button>
                    <span className="text-sm font-bold w-8 text-center text-gray-800 dark:text-white">
                      {item.quantity}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        handleUpdateExistingItemQuantity(idx, item.quantity + 1)
                      }
                      className="h-8 w-8 p-0 rounded-none hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      +
                    </Button>
                  </div>

                  <span className="font-bold text-sm w-20 text-right text-gray-800 dark:text-white">
                    {currencySymbol}
                    {(item.price * item.quantity).toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveExistingItem(idx)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* New Items to Add */}
        {newItemsBuffer.length > 0 && (
          <Card className="p-0 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 shadow-lg">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Items to Add
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full ml-auto">
                  {newItemsBuffer.length} new
                </span>
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
              {newItemsBuffer.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700"
                >
                  <span className="text-sm flex-1 font-medium text-gray-700 dark:text-gray-200">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleUpdateNewItemQuantity(
                            item.id,
                            item.quantity - 1,
                          )
                        }
                        className="h-7 w-7 p-0 rounded-none"
                      >
                        -
                      </Button>
                      <span className="text-sm font-bold w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleUpdateNewItemQuantity(
                            item.id,
                            item.quantity + 1,
                          )
                        }
                        className="h-7 w-7 p-0 rounded-none"
                      >
                        +
                      </Button>
                    </div>
                    <span className="text-sm font-bold w-16 text-right">
                      {currencySymbol}
                      {(item.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveNewItem(item.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Custom Item Button */}
        <Button
          variant="outline"
          onClick={() => setShowCustomItemDialog(true)}
          className="w-full border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Item
        </Button>

        {/* Search Menu Items */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search menu items..."
              value={menuSearchQuery}
              onChange={(e) => setMenuSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-xl"
            />
          </div>

          {/* Menu Items List */}
          <Card className="max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-2 space-y-1">
              {filteredMenuItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {menuSearchQuery
                    ? "No items found matching your search"
                    : "No menu items available"}
                </p>
              ) : (
                filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddMenuItem(item)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 rounded-xl transition-all group border border-transparent hover:border-green-200 dark:hover:border-green-700"
                  >
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm text-gray-800 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-400">
                        {item.name}
                      </p>
                      {item.category && (
                        <p className="text-xs text-gray-400">{item.category}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-gray-700 dark:text-gray-300">
                        {currencySymbol}
                        {item.price.toFixed(2)}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center group-hover:bg-green-500 group-hover:scale-110 transition-all">
                        <Plus className="w-4 h-4 text-green-600 group-hover:text-white" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="bg-gradient-to-t from-white via-white to-white/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/80 pt-3 pb-3 px-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <Button
          onClick={handleSaveNewItems}
          disabled={newItemsBuffer.length === 0}
          className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-green-300/50 dark:shadow-green-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          size="lg"
        >
          <Check className="w-4 h-4 mr-2" />
          Save & Send New Items to Kitchen
        </Button>
        <Button
          onClick={() => setCurrentStep("confirm")}
          variant="outline"
          className="w-full border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>
            {currentStep === "confirm" && "Confirm Order"}
            {currentStep === "method" && "Select Payment Method"}
            {currentStep === "qr" && "UPI Payment"}
            {currentStep === "success" && "Payment Successful"}
            {currentStep === "edit" && "Edit Order"}
            {currentStep === "split" && "Split Payment"}
          </DialogTitle>
        </VisuallyHidden>
        {currentStep === "confirm" && renderConfirmStep()}
        {currentStep === "method" && renderMethodStep()}
        {currentStep === "qr" && renderQRStep()}
        {currentStep === "success" && renderSuccessStep()}
        {currentStep === "edit" && renderEditStep()}
        {currentStep === "split" && renderSplitStep()}
      </DialogContent>

      <CustomItemDialog
        isOpen={showCustomItemDialog}
        onClose={() => setShowCustomItemDialog(false)}
        onAddItem={handleAddCustomItem}
      />
    </Dialog>
  );
};

export default PaymentDialog;
