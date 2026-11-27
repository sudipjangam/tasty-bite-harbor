import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Banknote,
  CreditCard,
  Smartphone,
  CheckCircle2,
  Loader2,
  MessageCircle,
  QrCode,
  Gift,
  MessageSquare,
  Share2,
  WifiOff,
  Clock,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { QSOrderItem } from "./QSOrderPanel";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useAuth } from "@/hooks/useAuth";
import { useCRMSync } from "@/hooks/useCRMSync";
import { useToast } from "@/hooks/use-toast";
import { formatOrderItemString } from "@/lib/order-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatBillText,
  generateWhatsAppUrl,
} from "@/utils/billFormatter";
import { Button } from "@/components/ui/button";
import QRCodeLib from "qrcode";
import { useBillSharing } from "@/hooks/useBillSharing";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import {
  allocateOfflineQuickServeToken,
  enqueueWrite,
  recordQuickServeOrderNumber,
} from "@/utils/syncManager";
import {
  getCachedPaymentSettings,
  getCachedRestaurant,
  getLocalOrder,
  commitLocalOrderAndWritesAtomic,
  saveLocalOrder,
} from "@/utils/offlineDB";
import { thermalPrinterService } from "@/services/thermalPrinterService";
import { nativePrinterBridge } from "@/services/nativePrinterBridge";
import { resolveInvoiceTemplate } from "@/utils/resolveInvoiceTemplate";

interface QSPaymentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: QSOrderItem[];
  customerName: string;
  customerPhone: string;
  onSuccess: (orderNumber?: number) => void;
  discountAmount?: number;
  discountPercentage?: number;
  loyaltyPointsUsed?: number;
  loyaltyDiscountAmount?: number;
  loyaltyCustomerId?: string;
  couponId?: string;
  couponDiscountAmount?: number;
  existingOrder?: {
    id: string;
    total: number;
    orderNumber: number | null;
    itemCompletionStatus?: boolean[];
    paidAmount?: number;
  };
  editingOrderItems?: QSOrderItem[];
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
  {
    id: "nc",
    label: "Non-Chargeable",
    icon: Gift,
    color: "from-pink-500 to-rose-600",
  },
];

// Payment methods available to ALL users
const allPaymentMethods = [
  {
    id: "cash",
    label: "Cash",
    icon: Banknote,
    color: "from-green-500 to-emerald-600",
    offlineOk: true,
  },
  {
    id: "upi",
    label: "UPI",
    icon: Smartphone,
    color: "from-purple-500 to-indigo-600",
    offlineOk: true,
  },
  {
    id: "card",
    label: "Card",
    icon: CreditCard,
    color: "from-blue-500 to-cyan-600",
    offlineOk: true,
  },
  {
    id: "nc",
    label: "Non-Chargeable",
    icon: Gift,
    color: "from-pink-500 to-rose-600",
    offlineOk: true,
  },
  {
    id: "pay_later",
    label: "Pay Later",
    icon: Clock,
    color: "from-amber-500 to-yellow-600",
    offlineOk: true,
  },
  {
    id: "split",
    label: "Split Payment",
    icon: Banknote,
    color: "from-orange-500 to-amber-600",
    offlineOk: true,
  },
];

export const QSPaymentSheet: React.FC<QSPaymentSheetProps> = ({
  isOpen,
  onClose,
  items,
  customerName,
  customerPhone,
  onSuccess,
  discountAmount = 0,
  discountPercentage = 0,
  loyaltyPointsUsed = 0,
  loyaltyDiscountAmount = 0,
  loyaltyCustomerId,
  couponId,
  couponDiscountAmount = 0,
  existingOrder,
  editingOrderItems = [],
}) => {
  const [isOpenLocal, setIsOpenLocal] = useState(isOpen);
  const [status, setStatus] = useState<"idle" | "processing" | "success">(
    "idle",
  );
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [billSent, setBillSent] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | string | null>(null);
  const [isOfflineOrder, setIsOfflineOrder] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const pendingOfflineIdsRef = useRef<{
    fingerprint: string;
    orderId: string;
    kitchenOrderId: string;
    orderNumber: number;
  } | null>(null);
  const pendingSplitLinkRef = useRef<{
    fingerprint: string;
    orderId: string;
    kitchenOrderId: string;
    orderNumber: number;
    splitPayments: Array<{ method: string; amount: number }>;
  } | null>(null);
  const pendingOnlineLinkRef = useRef<{
    fingerprint: string;
    orderId: string;
    kitchenOrderId: string;
    orderNumber: number;
    method: string;
  } | null>(null);
  // Split payment state
  const [showSplitUI, setShowSplitUI] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const { symbol: currencySymbol } = useCurrencyContext();
  const { restaurantId, restaurantName: hookRestaurantName } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [alreadyPaid, setAlreadyPaid] = useState(0);
  const [alreadyPaidLoading, setAlreadyPaidLoading] = useState(false);
  const [isPrintingBill, setIsPrintingBill] = useState(false);

  const isOfflineNow =
    !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

  // When offline, only show offline-capable payment methods
  const paymentMethods = !isOfflineNow
    ? allPaymentMethods
    : allPaymentMethods.filter((m) => m.offlineOk);

  // Fetch restaurant details for bills & receipts (with IDB offline fallback)
  const { data: restaurantDetails } = useQuery({
    queryKey: ["restaurant", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return null;
      if (isOfflineNow) {
        return (await getCachedRestaurant(restaurantId)) || null;
      }
      try {
        const { data, error } = await supabase
          .from("restaurants" as any)
          .select("*")
          .eq("id", restaurantId)
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        const cached = await getCachedRestaurant(restaurantId);
        if (cached) return cached;
        throw err;
      }
    },
    enabled: !!restaurantId,
  });
  const { user } = useAuth();
  const { syncCustomerToCRM } = useCRMSync();
  const { toast } = useToast();
  const { getBillUrl } = useBillSharing();

  const restaurantName = restaurantDetails?.name || hookRestaurantName || "Restaurant";

  // Fetch payment settings for UPI ID (with IDB offline fallback)
  const { data: paymentSettings } = useQuery({
    queryKey: ["payment-settings", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return null;
      if (isOfflineNow) {
        return (await getCachedPaymentSettings(restaurantId)) || null;
      }
      try {
        const { data, error } = await supabase
          .from("payment_settings")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .maybeSingle();
        if (error) return (await getCachedPaymentSettings(restaurantId)) || null;
        return data;
      } catch {
        return (await getCachedPaymentSettings(restaurantId)) || null;
      }
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (!isOpen) {
      pendingOfflineIdsRef.current = null;
      pendingSplitLinkRef.current = null;
      pendingOnlineLinkRef.current = null;
    }
  }, [isOpen]);

  // When in edit mode (existingOrder + editingOrderItems), compute total from current items
  // not from existingOrder.total (which is now just the cart total passed in)
  const isEditMode = !!existingOrder && editingOrderItems.length > 0;

  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountValue = (existingOrder && !isEditMode)
    ? 0
    : discountPercentage > 0
      ? (itemsSubtotal * discountPercentage) / 100
      : discountAmount;

  const afterDiscount = (existingOrder && !isEditMode)
    ? existingOrder.total
    : Math.max(0, itemsSubtotal - discountValue - couponDiscountAmount);

  const subtotal = (existingOrder && !isEditMode)
    ? existingOrder.total
    : Math.max(0, afterDiscount - loyaltyDiscountAmount);

  // Amount still due after prior payments (for "add items to paid order" flow)
  const additionalDue = Math.max(0, subtotal - alreadyPaid);

  // Fetch already-paid amount when opening with an existing order (supports offline mirror)
  useEffect(() => {
    if (!existingOrder?.id || !isOpen) {
      setAlreadyPaid(0);
      setAlreadyPaidLoading(false);
      return;
    }
    let cancelled = false;
    setAlreadyPaidLoading(true);
    (async () => {
      try {
        if (isOfflineNow) {
          const local = await getLocalOrder(existingOrder.id);
          if (cancelled) return;
          const passedPaid = (existingOrder as any).paidAmount;
          const paid =
            typeof local?.paidAmount === "number"
              ? local.paidAmount
              : typeof passedPaid === "number"
              ? passedPaid
              : local?.paymentStatus === "paid"
              ? Number(local.total) || 0
              : 0;
          setAlreadyPaid(paid);
          return;
        }
        const { data: paidTxns, error } = await supabase
          .from("pos_transactions")
          .select("amount")
          .eq("order_id", existingOrder.id)
          .eq("status", "completed");
        if (error) throw error;
        if (cancelled) return;
        const paid = (paidTxns || []).reduce(
          (s: number, t: any) => s + (Number(t.amount) || 0),
          0,
        );
        setAlreadyPaid(paid);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch paid amount:", err);
          const local = await getLocalOrder(existingOrder.id).catch(() => null);
          if (cancelled) return;
          setAlreadyPaid(
            typeof local?.paidAmount === "number" ? local.paidAmount : 0,
          );
        }
      } finally {
        if (!cancelled) {
          setAlreadyPaidLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existingOrder?.id, isOpen, isOfflineNow]);

  const upiId = paymentSettings?.upi_id || (restaurantDetails as any)?.upi_id || null;
  const upiName = (paymentSettings as any)?.upi_name || restaurantName;

  const handlePrintBill = async (explicitOrderNumber?: number | string | null) => {
    if (isPrintingBill) return;
    setIsPrintingBill(true);
    try {
      const cachedRestaurant =
        !restaurantDetails && restaurantId
          ? await getCachedRestaurant(restaurantId)
          : undefined;
      const meta: any = restaurantDetails || cachedRestaurant;
      const attendantName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email
        : "Staff";
      const isComp = selectedMethod === "nc";
      const baseAmount = itemsSubtotal > 0 ? itemsSubtotal : subtotal;
      const totalDiscount =
        discountValue + couponDiscountAmount + (loyaltyDiscountAmount || 0);
      const effectivePrintDiscount = isComp
        ? baseAmount
        : totalDiscount > 0
        ? totalDiscount
        : Math.max(0, itemsSubtotal - subtotal);
      const resolvedOrderNumber =
        explicitOrderNumber !== undefined ? explicitOrderNumber : orderNumber;
      const billNo =
        typeof resolvedOrderNumber === "number"
          ? `#${String(resolvedOrderNumber).padStart(3, "0")}`
          : resolvedOrderNumber
          ? `#${String(resolvedOrderNumber).slice(-4)}`
          : `#${Date.now().toString().slice(-6)}`;
      const now = new Date();
      await thermalPrinterService.printReceipt({
        restaurantName: meta?.name || restaurantName,
        address: meta?.address,
        phone: meta?.phone,
        gstin: meta?.gstin || undefined,
        billNumber: billNo,
        date: now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        customerName: customerName.trim() || undefined,
        customerMobile: customerPhone.trim() || undefined,
        serverName: attendantName,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: baseAmount,
        cgst: 0,
        sgst: 0,
        discount: effectivePrintDiscount,
        netAmount: isComp ? 0 : subtotal,
        currencySymbol,
        upiId: upiId || undefined,
      });
      toast({ title: "Bill printed ✓" });
    } catch (err: any) {
      toast({
        title: "Print Failed",
        description: err?.message || "Could not print bill",
        variant: "destructive",
      });
    } finally {
      setIsPrintingBill(false);
    }
  };

  // Build UPI deep link — uses additionalDue so QR is for the correct amount
  const getUpiLink = () => {
    if (!upiId) return null;
    const formattedAmount = parseFloat(additionalDue.toFixed(2));
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(`Order payment - ${restaurantName}`)}`;
  };

  // Generate UPI QR code when payment succeeds — only show QR when UPI ID is configured
  useEffect(() => {
    if (status === "success") {
      const upiLink = getUpiLink();
      if (!upiLink) {
        setQrCodeUrl("");
        return;
      }

      QRCodeLib.toDataURL(upiLink, {
        width: 300,
        margin: 3,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("QR generation error:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, upiId, additionalDue, subtotal]);

  // Build bill text for WhatsApp sharing
  const getBillTextForOrder = () => {
    let billText = formatBillText({
      restaurantName,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: itemsSubtotal,
      total: subtotal,
      discount: discountValue + couponDiscountAmount + (loyaltyDiscountAmount || 0),
      manualDiscountPercent: discountPercentage > 0 ? discountPercentage : undefined,
      paymentMethod: selectedMethod || "cash",
      customerName: customerName.trim() || undefined,
      currencySymbol,
    });

    // Append UPI payment link if configured
    const upiLink = getUpiLink();
    if (upiLink) {
      billText += `\n\n💳 *Pay via UPI* (tap below):\n${upiLink}`;
    }

    return billText;
  };

  const [isSendingBill, setIsSendingBill] = useState(false);

  // Free native share using navigator.share
  const handleShareGeneric = async () => {
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

  /** Send bill via MSG91 WhatsApp API — fire-and-forget for instant UI */
  const handleSendWhatsAppBill = () => {
    if (!customerPhone || !restaurantDetails) {
      toast({
        title: "Missing Information",
        description: "Customer phone number is required to send bill.",
        variant: "destructive",
      });
      return;
    }

    // M-27: Capture state snapshots synchronously before async execution so dialog close doesn't clear them
    const methodSnapshot = selectedMethod || "cash";
    const subtotalSnapshot = subtotal;
    const itemsSubtotalSnapshot = itemsSubtotal;
    const itemsSnapshot = items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    const discountPctSnapshot = discountPercentage;
    const discountValueSnapshot = discountValue;
    const couponDiscountSnapshot = couponDiscountAmount;
    const loyaltyDiscountSnapshot = loyaltyDiscountAmount;
    const loyaltyPointsUsedSnapshot = loyaltyPointsUsed;
    const customerNameSnapshot = customerName.trim() || undefined;
    const customerPhoneSnapshot = customerPhone;
    const restaurantDetailsSnapshot = restaurantDetails;
    const restaurantIdSnapshot = restaurantId;

    // Instant UI feedback - show loading state
    setIsSendingBill(true);
    setBillSent(true);
    toast({
      title: "Sending Bill...",
      description: `Bill is being sent to ${customerPhoneSnapshot} via WhatsApp.`,
    });

    // Fire-and-forget: run API call in background
    (async () => {
      try {
        const restaurantNameForMsg = restaurantDetailsSnapshot?.name || "Restaurant";

        // Calculate expected points earned for this order
        let pointsEarned = 0;
        let totalLoyaltyPoints: number | undefined;
        if (subtotalSnapshot > 0 && restaurantIdSnapshot) {
          try {
            const { data: loyaltyProgram } = await supabase
              .from("loyalty_programs")
              .select("is_enabled, points_per_amount, spend_threshold")
              .eq("restaurant_id", restaurantIdSnapshot)
              .maybeSingle();

            if (loyaltyProgram?.is_enabled !== false) {
              const pointsPerAmount = loyaltyProgram?.points_per_amount ?? 1;
              const spendThreshold = (loyaltyProgram as any)?.spend_threshold ?? 10;
              let multiplier = 1;

              // Try to get customer's tier multiplier if they exist
              let fetchedLoyaltyPoints = 0;
              if (customerPhoneSnapshot) {
                const { data: customerRows } = await supabase
                  .from("customers")
                  .select("loyalty_tier_id, loyalty_points")
                  .eq("restaurant_id", restaurantIdSnapshot)
                  .eq("phone", customerPhoneSnapshot.trim())
                  .limit(1);

                fetchedLoyaltyPoints = customerRows?.[0]?.loyalty_points || 0;
                const tierId = customerRows?.[0]?.loyalty_tier_id;
                if (tierId) {
                  const { data: tier } = await supabase
                    .from("loyalty_tiers")
                    .select("points_multiplier")
                    .eq("id", tierId)
                    .maybeSingle();
                  if (tier?.points_multiplier) {
                    multiplier = tier.points_multiplier;
                  }
                }
              }

              pointsEarned = Math.floor((subtotalSnapshot / spendThreshold) * pointsPerAmount * multiplier);
              if (customerPhoneSnapshot) {
                totalLoyaltyPoints = fetchedLoyaltyPoints - (loyaltyPointsUsedSnapshot || 0) + pointsEarned;
              }
            }
          } catch (err) {
            console.error("Points calculation error (non-blocking):", err);
          }
        }

        const billParams = {
          restaurantId: restaurantIdSnapshot,
          restaurantName: restaurantNameForMsg,
          restaurantAddress: (restaurantDetailsSnapshot as any)?.address,
          restaurantPhone: (restaurantDetailsSnapshot as any)?.phone,
          logoUrl:
            restaurantDetailsSnapshot?.logo_url ||
            (() => {
              try {
                return (restaurantIdSnapshot ? localStorage.getItem(`restaurant_logo_url_${restaurantIdSnapshot}`) : null) || undefined;
              } catch {
                return undefined;
              }
            })(),
          items: itemsSnapshot,
          subtotal: itemsSubtotalSnapshot,
          discount:
            discountValueSnapshot + loyaltyDiscountSnapshot + couponDiscountSnapshot,
          // M-25: Use tenant currencySymbol instead of hardcoded ₹
          discountNotes: (() => {
            const parts: string[] = [];
            if (discountPctSnapshot > 0) {
              parts.push(`${discountPctSnapshot}% off (${currencySymbol}${discountValueSnapshot.toFixed(2)})`);
            } else if (discountValueSnapshot > 0) {
              parts.push(`Manual discount ${currencySymbol}${discountValueSnapshot.toFixed(2)}`);
            }
            if (couponDiscountSnapshot > 0) {
              parts.push(`Coupon (${currencySymbol}${couponDiscountSnapshot.toFixed(2)})`);
            }
            if (loyaltyDiscountSnapshot > 0) {
              parts.push(`${loyaltyPointsUsedSnapshot} pts redeemed (${currencySymbol}${loyaltyDiscountSnapshot.toFixed(2)})`);
            }
            return parts.length > 0 ? parts.join(' + ') : undefined;
          })(),
          pointsEarned: pointsEarned > 0 ? pointsEarned : undefined,
          totalLoyaltyPoints: totalLoyaltyPoints,
          cgst: 0,
          sgst: 0,
          total: subtotalSnapshot,
          paymentMethod: methodSnapshot,
          orderType: "quickserve",
          customerName: customerNameSnapshot,
          customerPhone: customerPhoneSnapshot,
          currencySymbol,
        };

        const billUrl = await getBillUrl(billParams as any);

        // MSG91 template button has a base URL (e.g. https://swadeshisolutions.co.in/bill/)
        // already configured in the template. So we pass ONLY the short ID suffix,
        // not the full URL — otherwise MSG91 concatenates them and produces a double-prefix URL.
        const billUrlSuffix = billUrl
          ? (billUrl.split("/bill/").pop() ?? billUrl)
          : undefined;

        const formattedAmount = `${currencySymbol === "₹" ? "Rs." : currencySymbol}${subtotal.toFixed(2)}`;
        const now = new Date();
        const formattedDate = `${now.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

        const phoneWithCountryCode =
          customerPhone.replace(/[\+\-\s]/g, "").length === 10
            ? "91" + customerPhone.replace(/[\+\-\s]/g, "")
            : customerPhone.replace(/[\+\-\s]/g, "");

        // Extract social links for smart template selection
        const rawIgUrl = (restaurantDetails?.social_media as any)?.instagram_url || "";
        const igHandle = rawIgUrl
          .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
          .replace(/\/$/, "") || "";
        const googleReviewUrl = (restaurantDetails?.social_media as any)?.google_review_url || "";
        const contactNumber = (restaurantDetails as any)?.phone || "-";

        // Smart template resolution: picks correct template + params based on social links
        const { templateName, variables, buttons } = resolveInvoiceTemplate({
          customerName: customerName || "Customer",
          restaurantName: restaurantNameForMsg,
          amount: formattedAmount,
          billDate: formattedDate,
          billUrlSuffix: billUrlSuffix || "pending",
          igHandle,
          googleReviewUrl,
          contactNumber,
        });

        const { data: waResponse, error: waError } =
          await supabase.functions.invoke("send-whatsapp-unified", {
            body: {
              phoneNumber: phoneWithCountryCode,
              restaurantId,
              templateName,
              variables,
              buttons,
            },
          });


        if (waError || !waResponse.success) {
          throw new Error(
            waError?.message || waResponse?.error || "WhatsApp API failure",
          );
        }

        toast({
          title: "Bill Sent!",
          description: `Bill sent to ${customerPhone} via WhatsApp.`,
        });

        setIsSendingBill(false);
        handleCloseSuccess();
      } catch (error) {
        setIsSendingBill(false);
        console.error("Failed to send WhatsApp bill:", error);
        toast({
          title: "Failed to Send Bill",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          variant: "destructive",
        });
      }
    })();
  };

  const handleCloseSuccess = () => {
    if (status === "idle") return;
    const savedOrderNum = orderNumber;
    pendingOfflineIdsRef.current = null;
    pendingSplitLinkRef.current = null;
    pendingOnlineLinkRef.current = null;
    setStatus("idle");
    setSelectedMethod(null);
    setBillSent(false);
    setQrCodeUrl("");
    setOrderNumber(null);
    setIsOfflineOrder(false);
    setPaymentConfirmed(false);
    setCreatedOrderId(null);
    setShowSplitUI(false);
    setSplitCash("");
    setSplitUpi("");
    setSplitCard("");
    onSuccess(typeof savedOrderNum === "number" ? savedOrderNum : undefined);
    onClose();
  };

  /** Shared offline enqueue helper for all payment methods (single, split, new, or existing order) */
  const enqueueQuickServeOfflinePayment = async (
    method: string,
    splitPaymentsData?: Array<{ method: string; amount: number }>,
    ncReason?: string | null,
  ) => {
    if (!restaurantId) throw new Error("No restaurant ID");
    const isNC = method === "nc";
    const orderTotal = isNC ? 0 : subtotal;
    const nowIso = new Date().toISOString();
    const attendantName = user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.email
      : "Staff";
    const finalCustomerName = customerName.trim() || "Walk-in Customer";
    const isDeferredOfflineUpi = !isNC && method === "upi";
    const finalPaymentStatus = isNC
      ? "nc"
      : method === "pay_later" || isDeferredOfflineUpi
      ? "pending"
      : "paid";
    const txnStatus =
      method === "pay_later" || isDeferredOfflineUpi ? "pending" : "completed";
    const finalMethod = isNC ? "nc" : method;

    const kitchenItems = items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      menuItemId: item.menuItemId,
      notes: item.notes ? [item.notes] : [],
      priority: item.priority || "normal",
    }));
    const formattedItems = items.map((item) =>
      formatOrderItemString(item.quantity, item.name, item.price, item.notes),
    );
    const totalDiscountAmount =
      discountValue + couponDiscountAmount + (loyaltyDiscountAmount || 0);
    const discountNotesParts: string[] = [];
    if (discountPercentage > 0) {
      discountNotesParts.push(
        `${discountPercentage}% off (${currencySymbol}${discountValue.toFixed(2)})`,
      );
    } else if (discountValue > 0) {
      discountNotesParts.push(`Manual discount ${currencySymbol}${discountValue.toFixed(2)}`);
    }
    if (couponDiscountAmount > 0) {
      discountNotesParts.push(`Coupon (${currencySymbol}${couponDiscountAmount.toFixed(2)})`);
    }
    if (loyaltyDiscountAmount > 0) {
      discountNotesParts.push(
        `${loyaltyPointsUsed} pts redeemed (${currencySymbol}${loyaltyDiscountAmount.toFixed(2)})`,
      );
    }
    const discountNotes = discountNotesParts.join(" + ");
    const effectiveDiscountPct =
      itemsSubtotal > 0 && totalDiscountAmount > 0
        ? Math.round((totalDiscountAmount / itemsSubtotal) * 100)
        : 0;

    let resolvedOrderNumberForPrint: number | string | null = null;

    if (existingOrder) {
      const localExisting = await getLocalOrder(existingOrder.id);
      const passedCompletion = (existingOrder as any).itemCompletionStatus as
        | boolean[]
        | undefined;
      const existingCompletionStatus =
        (localExisting?.itemCompletionStatus &&
        localExisting.itemCompletionStatus.length > 0
          ? localExisting.itemCompletionStatus
          : passedCompletion) || [];
      const preciseCompletionStatus = isEditMode
        ? (() => {
            const consumedIndices = new Set<number>();
            return items.map((item) => {
              const matchIdx = editingOrderItems.findIndex((orig, origIdx) => {
                if (consumedIndices.has(origIdx)) return false;
                return (
                  orig.name === item.name &&
                  orig.price === item.price &&
                  (orig.notes || "") === (item.notes || "")
                );
              });
              if (matchIdx !== -1) {
                consumedIndices.add(matchIdx);
                return existingCompletionStatus[matchIdx] ?? false;
              }
              return false;
            });
          })()
        : items.map((_, idx) => existingCompletionStatus[idx] ?? false);

      await enqueueWrite(
        "order",
        {
          id: existingOrder.id,
          payment_status: finalPaymentStatus,
          payment_method: finalMethod,
          ...(splitPaymentsData && { split_payments: splitPaymentsData }),
          items: formattedItems,
          total: orderTotal,
          status: "preparing",
          item_completion_status: preciseCompletionStatus,
          updated_at: nowIso,
        },
        "update",
      );

      if (isEditMode && editingOrderItems.length > 0) {
        const originalMap = new Map<string, number>();
        editingOrderItems.forEach((item) => {
          const key = `${item.name}@@${item.price}@@${item.notes || ""}`;
          originalMap.set(key, (originalMap.get(key) || 0) + item.quantity);
        });
        const currentMap = new Map<
          string,
          {
            name: string;
            price: number;
            quantity: number;
            notes?: string;
            menuItemId?: string;
          }
        >();
        items.forEach((item) => {
          const key = `${item.name}@@${item.price}@@${item.notes || ""}`;
          const existing = currentMap.get(key);
          if (existing) existing.quantity += item.quantity;
          else {
            currentMap.set(key, {
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              notes: item.notes,
              menuItemId: item.menuItemId,
            });
          }
        });
        const newKitchenItems: any[] = [];
        currentMap.forEach((current, key) => {
          const netNew = current.quantity - (originalMap.get(key) || 0);
          if (netNew > 0) {
            newKitchenItems.push({
              name: current.name,
              quantity: netNew,
              price: current.price,
              menuItemId: current.menuItemId,
              notes: current.notes ? [current.notes] : [],
              is_addition: true,
              parent_order_number: existingOrder.orderNumber || 0,
            });
          }
        });
        if (newKitchenItems.length > 0) {
          const additionKoId =
            (pendingOfflineIdsRef.current as any)?.additionKitchenOrderId ||
            crypto.randomUUID();
          if (pendingOfflineIdsRef.current) {
            (pendingOfflineIdsRef.current as any).additionKitchenOrderId =
              additionKoId;
          }
          await enqueueWrite(
            "kitchen_order",
            {
              id: additionKoId,
              order_id: existingOrder.id,
              restaurant_id: restaurantId,
              source: "QuickServe",
              status: "preparing",
              items: newKitchenItems,
              order_type: isNC ? "non-chargeable" : "takeaway",
              customer_name: finalCustomerName,
              server_name: attendantName,
              priority: "normal",
              _deductInventory: true,
              created_at: nowIso,
              updated_at: nowIso,
            },
            "insert",
          );
        }
      }

      await enqueueWrite(
        "pos_transaction_clear_pending",
        { order_id: existingOrder.id },
        "delete",
      );

      const txnAmount = isNC ? 0 : additionalDue;
      await enqueueWrite(
        "pos_transaction",
        {
          restaurant_id: restaurantId,
          order_id: existingOrder.id,
          amount: txnAmount,
          payment_method: finalMethod,
          ...(splitPaymentsData && { split_payments: splitPaymentsData }),
          status: txnStatus,
          customer_name: finalCustomerName,
          customer_phone: customerPhone || null,
          staff_id: user?.id || null,
          discount_amount: 0,
          created_at: nowIso,
          updated_at: nowIso,
        },
        "insert",
      );

      if (
        loyaltyPointsUsed > 0 &&
        (loyaltyCustomerId || customerPhone.trim())
      ) {
        await enqueueWrite(
          "loyalty_redemption",
          {
            restaurant_id: restaurantId,
            customer_id: loyaltyCustomerId || null,
            customer_phone: customerPhone.trim() || null,
            transaction_type: "redeemed",
            source: "quickserve_pos",
            source_id: existingOrder.id,
            points_redeemed: loyaltyPointsUsed,
            notes: `Redeemed ${loyaltyPointsUsed} points for order discount`,
            created_by: user?.id || null,
          },
          "insert",
        );
      }

      const nextPaidTotal =
        finalPaymentStatus === "paid"
          ? alreadyPaid + txnAmount
          : alreadyPaid;
      await saveLocalOrder({
        ...(localExisting || {
          id: existingOrder.id,
          orderId: existingOrder.id,
          restaurant_id: restaurantId,
          source: "quickserve",
          orderType: isNC ? "nc" : "takeaway",
          priority: "normal",
          createdAt: nowIso,
        }),
        id: existingOrder.id,
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber ?? localExisting?.orderNumber ?? null,
        status: "preparing",
        items: kitchenItems,
        formattedItems,
        itemCompletionStatus: preciseCompletionStatus,
        total: orderTotal,
        subtotal: itemsSubtotal,
        paidAmount: nextPaidTotal,
        customerName: finalCustomerName,
        customerPhone: customerPhone || undefined,
        attendant: attendantName,
        paymentMethod: finalMethod,
        paymentStatus: finalPaymentStatus,
        splitPayments: splitPaymentsData,
        updatedAt: nowIso,
        synced: false,
      });

      resolvedOrderNumberForPrint = existingOrder.orderNumber ?? null;
      setOrderNumber(resolvedOrderNumberForPrint);
      setCreatedOrderId(existingOrder.id);
    } else {
      const fingerprint = `${restaurantId}|${orderTotal}|${finalMethod}|${formattedItems.join(",")}`;
      const reused =
        (pendingOfflineIdsRef.current?.fingerprint === fingerprint
          ? pendingOfflineIdsRef.current
          : null);
      const offlineOrderId = reused?.orderId || crypto.randomUUID();
      const offlineKitchenOrderId =
        reused?.kitchenOrderId || crypto.randomUUID();
      const nextToken =
        reused?.orderNumber || allocateOfflineQuickServeToken(restaurantId);
      pendingOfflineIdsRef.current = {
        fingerprint,
        orderId: offlineOrderId,
        kitchenOrderId: offlineKitchenOrderId,
        orderNumber: nextToken,
      };
      const initialCompletion = items.map(() => false);

      // Enqueue parent `order` BEFORE `kitchen_order` so replay satisfies FK constraint
      const queuedWrites: Parameters<typeof commitLocalOrderAndWritesAtomic>[1] = [
        {
          type: "order",
          operation: "insert",
          payload: {
            id: offlineOrderId,
            restaurant_id: restaurantId,
            customer_name: finalCustomerName,
            items: formattedItems,
            total: orderTotal,
            status: "preparing",
            payment_status: finalPaymentStatus,
            payment_method: finalMethod,
            ...(splitPaymentsData && { split_payments: splitPaymentsData }),
            source: "quickserve",
            order_type: isNC ? "non-chargeable" : "takeaway",
            attendant: attendantName,
            order_number: nextToken,
            item_completion_status: initialCompletion,
            ...(totalDiscountAmount > 0 && {
              discount_amount: totalDiscountAmount,
            }),
            ...(effectiveDiscountPct > 0 && {
              discount_percentage: effectiveDiscountPct,
            }),
            ...(discountNotes && { discount_notes: discountNotes }),
            ...(ncReason && { nc_reason: ncReason }),
            ...(customerPhone && { customer_phone: customerPhone }),
            created_at: nowIso,
            updated_at: nowIso,
          },
        },
        {
          type: "kitchen_order",
          operation: "insert",
          payload: {
            id: offlineKitchenOrderId,
            order_id: offlineOrderId,
            restaurant_id: restaurantId,
            source: "QuickServe",
            status: "preparing",
            items: kitchenItems,
            order_type: isNC ? "non-chargeable" : "takeaway",
            customer_name: finalCustomerName,
            server_name: attendantName,
            priority: "normal",
            _deductInventory: true,
            ...(ncReason && { nc_reason: ncReason }),
            ...(customerPhone && { customer_phone: customerPhone }),
            created_at: nowIso,
            updated_at: nowIso,
          },
        },
        {
          type: "pos_transaction",
          operation: "insert",
          payload: {
            restaurant_id: restaurantId,
            order_id: offlineOrderId,
            kitchen_order_id: offlineKitchenOrderId,
            amount: orderTotal,
            payment_method: finalMethod,
            ...(splitPaymentsData && { split_payments: splitPaymentsData }),
            status: txnStatus,
            customer_name: finalCustomerName || null,
            customer_phone: customerPhone || null,
            staff_id: user?.id || null,
            discount_amount: totalDiscountAmount,
            created_at: nowIso,
            updated_at: nowIso,
          },
        },
      ];

      if (
        loyaltyPointsUsed > 0 &&
        (loyaltyCustomerId || customerPhone.trim())
      ) {
        queuedWrites.push({
          type: "loyalty_redemption",
          operation: "insert",
          payload: {
            restaurant_id: restaurantId,
            customer_id: loyaltyCustomerId || null,
            customer_phone: customerPhone.trim() || null,
            transaction_type: "redeemed",
            source: "quickserve_pos",
            source_id: offlineOrderId,
            points_redeemed: loyaltyPointsUsed,
            notes: `Redeemed ${loyaltyPointsUsed} points for order discount`,
            created_by: user?.id || null,
          },
        });
      }

      await commitLocalOrderAndWritesAtomic(
        {
          id: offlineOrderId,
          orderId: offlineOrderId,
          restaurant_id: restaurantId,
          source: "quickserve",
          orderType: isNC ? "nc" : "takeaway",
          status: "preparing",
          priority: "normal",
          orderNumber: nextToken,
          items: kitchenItems,
          formattedItems,
          itemCompletionStatus: initialCompletion,
          total: orderTotal,
          subtotal: itemsSubtotal,
          paidAmount: finalPaymentStatus === "paid" ? orderTotal : 0,
          discount: effectiveDiscountPct || totalDiscountAmount || undefined,
          discountType: effectiveDiscountPct
            ? "percentage"
            : totalDiscountAmount
            ? "amount"
            : undefined,
          customerName: finalCustomerName,
          customerPhone: customerPhone || undefined,
          attendant: attendantName,
          paymentMethod: finalMethod,
          paymentStatus: finalPaymentStatus,
          splitPayments: splitPaymentsData,
          createdAt: nowIso,
          updatedAt: nowIso,
          synced: false,
        },
        queuedWrites,
      );

      pendingOfflineIdsRef.current = null;
      resolvedOrderNumberForPrint = nextToken;
      setOrderNumber(nextToken);
      setCreatedOrderId(offlineOrderId);
    }

    setIsOfflineOrder(true);
    setPaymentConfirmed(txnStatus === "completed");
    setShowSplitUI(false);
    setStatus("success");

    queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
    queryClient.invalidateQueries({ queryKey: ["quickserve-order-history"] });
    queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
    queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });

    // Auto-print only when a physical Bluetooth/LAN thermal printer is paired
    if (
      nativePrinterBridge.isConnected() ||
      thermalPrinterService.isConnected()
    ) {
      handlePrintBill(resolvedOrderNumberForPrint).catch(() => {});
    }

    toast({
      title: "Order Saved Locally ✓",
      description:
        "No internet — order queued and will sync automatically when online.",
    });
  };

  const handlePay = async (method: string) => {
    // ✅ Prevent double-click: if already processing, bail out
    if (status === "processing") return;

    // For NC, prompt for reason first
    let ncReason: string | null = null;
    if (method === "nc") {
      ncReason = window.prompt(
        "Reason for Non-Chargeable order (e.g., Owner treat, staff meal, tasting):",
      );
      if (!ncReason) return; // cancelled
    }

    // For Pay Later, require customer name
    if (method === "pay_later") {
      if (!customerName.trim()) {
        toast({
          title: "Customer Name Required",
          description: "Please enter a customer name to use Pay Later — you need to know who owes.",
          variant: "destructive",
        });
        return;
      }
    }

    setSelectedMethod(method);
    setStatus("processing");

    // Split payment — show split UI instead of processing immediately
    if (method === "split") {
      setShowSplitUI(true);
      setStatus("idle");
      return;
    }

    // ─── OFFLINE PATH ───────────────────────────────────────────────────────
    if (isOfflineNow) {
      try {
        await enqueueQuickServeOfflinePayment(method, undefined, ncReason);
        return;
      } catch (offlineErr) {
        console.error("Offline enqueue error:", offlineErr);
        toast({
          title: "Failed to Save Order",
          description: "Could not save order locally. Please try again.",
          variant: "destructive",
        });
        setStatus("idle");
        setSelectedMethod(null);
        return;
      }
    }
    // ─── END OFFLINE PATH ────────────────────────────────────────────────────

    try {
      if (!restaurantId) throw new Error("No restaurant ID");

      const isNC = method === "nc";
      const orderTotal = isNC ? 0 : subtotal;

      const attendantName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email
        : "Staff";

      const finalCustomerName = customerName.trim() || "Walk-in Customer";

      // ─── If checking out an existing order (from Active Orders or edit mode) ───
      if (existingOrder) {
        setStatus("processing");
        setSelectedMethod(method as any);

        const formattedItems = items.map(
          (item) => formatOrderItemString(item.quantity, item.name, item.price, item.notes)
        );

        // Fetch current item_completion_status to preserve served-item strikethroughs
        let existingCompletionStatus: boolean[] = [];
        if (isEditMode) {
          const { data: existingOrderData } = await supabase
            .from("orders")
            .select("item_completion_status")
            .eq("id", existingOrder.id)
            .single();
          existingCompletionStatus = (existingOrderData?.item_completion_status as boolean[]) || [];
        }

        // Build precise completion status: preserve for matched original items, false for new
        const preciseCompletionStatus = isEditMode
          ? (() => {
              const consumedIndices = new Set<number>();
              return items.map((item) => {
                const matchIdx = editingOrderItems.findIndex((orig, origIdx) => {
                  if (consumedIndices.has(origIdx)) return false;
                  return (
                  orig.name === item.name &&
                  orig.price === item.price &&
                  (orig.notes || "") === (item.notes || "")
                );
                });
                if (matchIdx !== -1) {
                  consumedIndices.add(matchIdx);
                  return existingCompletionStatus[matchIdx] ?? false;
                }
                return false; // New item — not served
              });
            })()
          : items.map((_, idx) => existingCompletionStatus[idx] ?? false);

        // 1. Update order: items, total, payment status, completion status (M-14: preserve "paid" if additionalDue === 0)
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            payment_status: isNC
              ? "nc"
              : alreadyPaid > 0 && additionalDue === 0
              ? "paid"
              : "pending",
            items: formattedItems,
            total: orderTotal,
            status: "preparing",
            item_completion_status: preciseCompletionStatus,
          })
          .eq("id", existingOrder.id);

        if (updateError) throw updateError;

        // 2. Kitchen diff: send only NEW items (not in original order) to kitchen
        if (isEditMode && editingOrderItems.length > 0) {
          const originalMap = new Map<string, number>();
          editingOrderItems.forEach((item) => {
            const key = `${item.name}@@${item.price}@@${item.notes || ""}`;
            originalMap.set(key, (originalMap.get(key) || 0) + item.quantity);
          });

          const currentMap = new Map<string, { name: string; price: number; quantity: number; notes?: string; menuItemId?: string }>();
          items.forEach((item) => {
            const key = `${item.name}@@${item.price}@@${item.notes || ""}`;
            const existing = currentMap.get(key);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              currentMap.set(key, { name: item.name, price: item.price, quantity: item.quantity, notes: item.notes, menuItemId: item.menuItemId });
            }
          });

          const newKitchenItems: { name: string; quantity: number; price: number; menuItemId?: string; notes: string[]; is_addition?: boolean; parent_order_number?: string | number }[] = [];
          currentMap.forEach((current, key) => {
            const origQty = originalMap.get(key) || 0;
            const netNew = current.quantity - origQty;
            if (netNew > 0) {
              newKitchenItems.push({
                name: current.name,
                quantity: netNew,
                price: current.price,
                menuItemId: current.menuItemId,
                notes: current.notes ? [current.notes] : [],
                is_addition: true,
                parent_order_number: existingOrder.orderNumber || 0,
              });
            }
          });

          // Only create kitchen ticket if there are actually NEW items
          if (newKitchenItems.length > 0) {
            const { data: kitchenOrder, error: kitchenError } = await supabase
              .from("kitchen_orders")
              .insert({
                restaurant_id: restaurantId,
                order_id: existingOrder.id,
                source: "QuickServe",
                status: "preparing",
                items: newKitchenItems,
                order_type: isNC ? "non-chargeable" : "takeaway",
                customer_name: finalCustomerName,
                server_name: attendantName,
                priority: "normal",
              })
              .select()
              .single();

            if (kitchenError) throw kitchenError;
            if (kitchenOrder?.id) {
              // Deduct inventory for new items (background)
              (async () => {
                try {
                  await supabase.functions.invoke("deduct-inventory-on-prep", {
                    body: { order_id: kitchenOrder.id },
                  });
                } catch (err) {
                  console.error("Inventory deduction failed:", err);
                }
              })();
            }
          }
        }

        // 3. Clean up any previous pending transactions
        await supabase
          .from("pos_transactions")
          .delete()
          .eq("order_id", existingOrder.id)
          .eq("status", "pending");

        // 4. Log payment transaction for ADDITIONAL amount only (not full total) — skip for NC (M-15)
        const txnAmount = isNC ? 0 : additionalDue;
        if (!isNC) {
          await supabase.from("pos_transactions").insert({
            restaurant_id: restaurantId,
            order_id: existingOrder.id,
            amount: txnAmount,
            payment_method: method,
            status: "pending",
            customer_name: finalCustomerName,
            customer_phone: customerPhone || null,
            staff_id: user?.id || null,
            discount_amount: 0,
          });
        }

        setOrderNumber(existingOrder.orderNumber || 0);
        setCreatedOrderId(existingOrder.id);
        setPaymentConfirmed(isNC); // NC orders are auto-confirmed

        // CRM sync (background)
        if (customerName.trim()) {
          (async () => {
            try {
              await syncCustomerToCRM({
                customerName: finalCustomerName,
                customerPhone: customerPhone || undefined,
                orderTotal: txnAmount,
                orderId: existingOrder.id,
                source: "quickserve",
              });
            } catch (err) {
              console.error("CRM sync error:", err);
            }
          })();
        }

        setStatus("success");
        return; // Early return — skip new order generation
      }
      // ──────────────────────────────────────────────────────────────

      const formattedItems = items.map(
        (item) => formatOrderItemString(item.quantity, item.name, item.price, item.notes)
      );

      const kitchenItems = items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        menuItemId: item.menuItemId,
        notes: [],
      }));

      const onlineFingerprint = `${restaurantId}|${orderTotal}|${method}|${formattedItems.join(",")}`;
      const reusedOnlineLink =
        pendingOnlineLinkRef.current?.fingerprint === onlineFingerprint
          ? pendingOnlineLinkRef.current
          : null;

      let nextOrderNumber: number;
      let kitchenOrder: any;
      let order: any;

      if (reusedOnlineLink) {
        nextOrderNumber = reusedOnlineLink.orderNumber;
        kitchenOrder = { id: reusedOnlineLink.kitchenOrderId };
        order = { id: reusedOnlineLink.orderId };
      } else {
        // 0. Generate daily sequential order token
        const today = new Date();
        const todayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        ).toISOString();
        const todayEnd = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1,
        ).toISOString();
        const { data: maxOrderRow } = await supabase
          .from("orders")
          .select("order_number")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", todayStart)
          .lt("created_at", todayEnd)
          .not("order_number", "is", null)
          .order("order_number", { ascending: false })
          .limit(1);
        nextOrderNumber =
          ((maxOrderRow?.[0]?.order_number as number) || 0) + 1;
        recordQuickServeOrderNumber(restaurantId, nextOrderNumber);

        // Initialize item completion status (all false)
        const initialCompletionStatus = items.map(() => false);

        // 1. Create kitchen order (with total_amount + payment_method for dashboard)
        const { data: createdKitchenOrder, error: kitchenError } = await supabase
          .from("kitchen_orders")
          .insert({
            restaurant_id: restaurantId,
            source: `QuickServe`,
            status: "preparing",
            items: kitchenItems,
            order_type: isNC ? "non-chargeable" : "takeaway",
            customer_name: finalCustomerName,
            server_name: attendantName,
            priority: "normal",
            ...(ncReason && { nc_reason: ncReason }),
          })
          .select()
          .single();

        if (kitchenError) throw kitchenError;
        kitchenOrder = createdKitchenOrder;
        if (kitchenOrder?.id) {
          pendingSplitLinkRef.current = {
            fingerprint: splitFingerprint,
            orderId: "",
            kitchenOrderId: kitchenOrder.id,
            orderNumber: nextOrderNumber,
            splitPayments: splitPaymentsData,
          };
        }

        const totalDiscountAmount = discountValue + couponDiscountAmount + (loyaltyDiscountAmount || 0);

        // Build discount notes for owner visibility (M-25/M-26: dynamic currencySymbol)
        const discountNotesParts: string[] = [];
        if (discountPercentage > 0) {
          discountNotesParts.push(`${discountPercentage}% off (${currencySymbol}${discountValue.toFixed(2)})`);
        } else if (discountValue > 0) {
          discountNotesParts.push(`Manual discount ${currencySymbol}${discountValue.toFixed(2)}`);
        }
        if (couponDiscountAmount > 0) {
          discountNotesParts.push(`Coupon (${currencySymbol}${couponDiscountAmount.toFixed(2)})`);
        }
        if (loyaltyDiscountAmount > 0) {
          discountNotesParts.push(`${loyaltyPointsUsed} pts redeemed (${currencySymbol}${loyaltyDiscountAmount.toFixed(2)})`);
        }
        const discountNotes = discountNotesParts.join(' + ');
        const effectiveDiscountPct = itemsSubtotal > 0 && totalDiscountAmount > 0
          ? Math.round((totalDiscountAmount / itemsSubtotal) * 100)
          : 0;

        // 2. Create order record with token and completion tracking
        const { data: createdOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            customer_name: finalCustomerName,
            items: formattedItems,
            total: orderTotal,
            status: "preparing",
            payment_status: isNC ? "nc" : "pending",
            payment_method: isNC ? "nc" : method,
            source: "quickserve",
            order_type: isNC ? "non-chargeable" : "takeaway",
            attendant: attendantName,
            order_number: nextOrderNumber,
            item_completion_status: initialCompletionStatus,
            ...(totalDiscountAmount > 0 && { discount_amount: totalDiscountAmount }),
            ...(effectiveDiscountPct > 0 && {
              discount_percentage: effectiveDiscountPct,
            }),
            ...(discountNotes && { discount_notes: discountNotes }),
            ...(ncReason && { nc_reason: ncReason }),
            ...(customerPhone && { customer_phone: customerPhone }),
          })
          .select()
          .single();

        if (orderError) throw orderError;
        order = createdOrder;

        if (order?.id && kitchenOrder?.id) {
          pendingOnlineLinkRef.current = {
            fingerprint: onlineFingerprint,
            orderId: order.id,
            kitchenOrderId: kitchenOrder.id,
            orderNumber: nextOrderNumber,
            method,
          };
        }

        // ✅ Log POS transaction SYNCHRONOUSLY to prevent race condition with "Mark as Paid" button (skip NC)
        if (!isNC) {
          const { error: txnError } = await supabase.from("pos_transactions").insert({
            restaurant_id: restaurantId,
            order_id: order?.id || null,
            kitchen_order_id: kitchenOrder?.id || null,
            amount: subtotal,
            payment_method: method,
            status: "pending",
            customer_name: finalCustomerName || null,
            customer_phone: customerPhone || null,
            staff_id: user?.id || null,
            discount_amount: 0,
          });
          if (txnError) throw txnError;
        }
      }

      // ✅ CRITICAL: Link kitchen order → order SYNCHRONOUSLY before success
      // This MUST complete before showing success, otherwise order_id stays null
      // and PaymentDialog creates a duplicate order when "Mark as Paid" is clicked
      if (order?.id && kitchenOrder?.id) {
        const { error: linkError } = await supabase
          .from("kitchen_orders")
          .update({ order_id: order.id })
          .eq("id", kitchenOrder.id);
        if (linkError) {
          console.error("❌ Critical: kitchen→order link failed:", linkError);
          throw linkError;
        }
        pendingOnlineLinkRef.current = null;
      }

      setOrderNumber(nextOrderNumber);
      setCreatedOrderId(order?.id || null);
      setPaymentConfirmed(isNC); // NC orders are auto-confirmed

      setStatus("success");
      toast({
        title: isNC ? "Order Created" : "Order Created — Awaiting Payment",
        description: isNC
          ? `Non-chargeable order created`
          : `${currencySymbol}${subtotal.toFixed(2)} via ${method.toUpperCase()} — mark as paid when received`,
      });

      // 🔥 Fire-and-forget: non-critical tasks run in background
      // Errors are logged but never block the UI
      const bgTasks: Promise<void>[] = [];

      // Deduct inventory
      if (kitchenOrder?.id) {
        bgTasks.push(
          (async () => {
            try {
              const { data: deductResult, error: deductError } =
                await supabase.functions.invoke("deduct-inventory-on-prep", {
                  body: { order_id: kitchenOrder.id },
                });
              if (deductError) {
                console.error("Inventory deduction error:", deductError.message);
              } else if (!deductResult?.success && !deductResult?.skipped && deductResult?.errors) {
                console.warn("Inventory deduction warnings:", deductResult.errors);
                toast({
                  variant: "destructive",
                  title: "Inventory Warning",
                  description: deductResult.errors.join("\n"),
                  duration: 6000,
                });
              }
            } catch (invErr) {
              console.error("Inventory deduction failed (background):", invErr);
            }
          })(),
        );
      }

      // CRM sync
      if (customerName.trim()) {
        bgTasks.push(
          (async () => {
            try {
              await syncCustomerToCRM({
                customerName: finalCustomerName,
                customerPhone: customerPhone || undefined,
                orderTotal: subtotal,
                orderId: order?.id || undefined, // L-13: pass orders.id, not kitchen_orders.id
                source: "quickserve",
              });
            } catch (crmErr) {
              console.error("CRM sync error (background):", crmErr);
            }
          })(),
        );
      }

      // Let all background tasks run — don't await them
      Promise.allSettled(bgTasks).then((results) => {
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          console.warn(`${failed.length} background tasks had issues`);
        }
      });

      // Deduct loyalty points after successful payment
      if (loyaltyPointsUsed > 0 && loyaltyCustomerId) {
        (async () => {
          try {
            // Deduct points from customer
            const { data: customer } = await supabase
              .from("customers")
              .select("loyalty_points")
              .eq("id", loyaltyCustomerId)
              .single();

            if (customer) {
              const newPoints = Math.max(
                0,
                (customer.loyalty_points || 0) - loyaltyPointsUsed,
              );
              await supabase
                .from("customers")
                .update({ loyalty_points: newPoints })
                .eq("id", loyaltyCustomerId);

              // Log redemption in loyalty_transactions
              await supabase.from("loyalty_transactions").insert({
                restaurant_id: restaurantId,
                customer_id: loyaltyCustomerId,
                points: -loyaltyPointsUsed,
                transaction_type: "redeemed",
                source: "quickserve_pos",
                notes: `Redeemed ${loyaltyPointsUsed} points for order discount`,
              });

            }
          } catch (err) {
            console.error("Loyalty points deduction error:", err);
          }
        })();
      }

      // NOTE: duplicate loyalty deduction block was removed — the one above (lines ~717-752) handles this
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

  const handlePaySplit = async () => {
    if (status === "processing") return;
    const cashAmt = parseFloat(splitCash) || 0;
    const upiAmt = parseFloat(splitUpi) || 0;
    const cardAmt = parseFloat(splitCard) || 0;
    if (cashAmt < 0 || upiAmt < 0 || cardAmt < 0) return;
    const splitSum = cashAmt + upiAmt + cardAmt;
    if (Math.abs(additionalDue - splitSum) >= 0.01 || splitSum <= 0) return;

    const splitPaymentsData = [
      ...(cashAmt > 0 ? [{ method: "cash", amount: cashAmt }] : []),
      ...(upiAmt > 0 ? [{ method: "upi", amount: upiAmt }] : []),
      ...(cardAmt > 0 ? [{ method: "card", amount: cardAmt }] : []),
    ];

    // Use the main handlePay flow but override method to "split" after setting split data
    // We'll directly invoke offline queue or DB writes here
    setSelectedMethod("split");
    setStatus("processing");
    if (isOfflineNow) {
      try {
        await enqueueQuickServeOfflinePayment("split", splitPaymentsData);
        return;
      } catch (offlineErr) {
        console.error("Offline split payment error:", offlineErr);
        toast({
          title: "Payment Failed",
          description: "Could not save split payment locally.",
          variant: "destructive",
        });
        setStatus("idle");
        setSelectedMethod(null);
        setShowSplitUI(false);
        return;
      }
    }
    try {
      if (!restaurantId) throw new Error("No restaurant ID");
      const attendantName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
        : "Staff";
      const finalCustomerName = customerName.trim() || "Walk-in Customer";
      const formattedItems = items.map(
        (item) => formatOrderItemString(item.quantity, item.name, item.price, item.notes)
      );

      if (existingOrder) {
        let existingCompletionStatus: boolean[] = [];
        if (isEditMode) {
          const { data: existingOrderData } = await supabase
            .from("orders")
            .select("item_completion_status")
            .eq("id", existingOrder.id)
            .single();
          existingCompletionStatus = (existingOrderData?.item_completion_status as boolean[]) || [];
        }

        const preciseCompletionStatus = isEditMode
          ? (() => {
              const consumedIndices = new Set<number>();
              return items.map((item) => {
                const matchIdx = editingOrderItems.findIndex((orig, origIdx) => {
                  if (consumedIndices.has(origIdx)) return false;
                  return (
                  orig.name === item.name &&
                  orig.price === item.price &&
                  (orig.notes || "") === (item.notes || "")
                );
                });
                if (matchIdx !== -1) {
                  consumedIndices.add(matchIdx);
                  return existingCompletionStatus[matchIdx] ?? false;
                }
                return false;
              });
            })()
          : items.map((_, idx) => existingCompletionStatus[idx] ?? false);

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            payment_status: "pending",
            payment_method: "split",
            split_payments: splitPaymentsData,
            items: formattedItems,
            total: subtotal,
            status: "preparing",
            item_completion_status: preciseCompletionStatus,
          })
          .eq("id", existingOrder.id);

        if (updateError) throw updateError;

        if (isEditMode && editingOrderItems.length > 0) {
          const originalMap = new Map<string, number>();
          editingOrderItems.forEach((item) => {
            const key = `${item.name}@@${item.price}@@${item.notes || ""}`;
            originalMap.set(key, (originalMap.get(key) || 0) + item.quantity);
          });

          const currentMap = new Map<string, { name: string; price: number; quantity: number; notes?: string; menuItemId?: string }>();
          items.forEach((item) => {
            const key = `${item.name}@@${item.price}@@${item.notes || ""}`;
            const existing = currentMap.get(key);
            if (existing) existing.quantity += item.quantity;
            else {
              currentMap.set(key, { name: item.name, price: item.price, quantity: item.quantity, notes: item.notes, menuItemId: item.menuItemId });
            }
          });

          const newKitchenItems: any[] = [];
          currentMap.forEach((current, key) => {
            const netNew = current.quantity - (originalMap.get(key) || 0);
            if (netNew > 0) {
              newKitchenItems.push({
                name: current.name,
                quantity: netNew,
                price: current.price,
                menuItemId: current.menuItemId,
                notes: current.notes ? [current.notes] : [],
                is_addition: true,
                parent_order_number: existingOrder.orderNumber || 0,
              });
            }
          });

          if (newKitchenItems.length > 0) {
            const { data: kitchenOrder, error: kitchenError } = await supabase
              .from("kitchen_orders")
              .insert({
                restaurant_id: restaurantId,
                order_id: existingOrder.id,
                source: "QuickServe",
                status: "preparing",
                items: newKitchenItems,
                order_type: "takeaway",
                customer_name: finalCustomerName,
                server_name: attendantName,
                priority: "normal",
              })
              .select()
              .single();

            if (kitchenError) throw kitchenError;
            if (kitchenOrder?.id) {
              supabase.functions
                .invoke("deduct-inventory-on-prep", {
                  body: { order_id: kitchenOrder.id },
                })
                .catch((err) => console.error("Inventory deduction failed:", err));
            }
          }
        }

        await supabase
          .from("pos_transactions")
          .delete()
          .eq("order_id", existingOrder.id)
          .eq("status", "pending");

        await supabase.from("pos_transactions").insert({
          restaurant_id: restaurantId,
          order_id: existingOrder.id,
          amount: additionalDue,
          payment_method: "split",
          split_payments: splitPaymentsData,
          status: "pending",
          customer_name: finalCustomerName,
          customer_phone: customerPhone || null,
          staff_id: user?.id || null,
          discount_amount: 0,
        });

        setOrderNumber(existingOrder.orderNumber || 0);
        setCreatedOrderId(existingOrder.id);
        setShowSplitUI(false);
        setStatus("success");
        toast({
          title: "Order Updated — Awaiting Payment",
          description: splitPaymentsData
            .map(s => `${currencySymbol}${s.amount.toFixed(2)} ${s.method.toUpperCase()}`)
            .join(" + "),
        });
        return;
      }

      const splitFingerprint = `${restaurantId}|${subtotal}|split|${JSON.stringify(splitPaymentsData)}|${formattedItems.join(",")}`;
      const reusedSplit =
        pendingSplitLinkRef.current?.fingerprint === splitFingerprint
          ? pendingSplitLinkRef.current
          : null;

      let nextOrderNumber: number;
      let kitchenOrder: any;
      let order: any;

      if (reusedSplit) {
        nextOrderNumber = reusedSplit.orderNumber;
        kitchenOrder = { id: reusedSplit.kitchenOrderId };
        order = { id: reusedSplit.orderId };
      } else {
        const kitchenItems = items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          menuItemId: item.menuItemId,
          notes: [],
        }));
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        const { data: maxOrderRow } = await supabase
          .from("orders")
          .select("order_number")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", todayStart)
          .lt("created_at", todayEnd)
          .not("order_number", "is", null)
          .order("order_number", { ascending: false })
          .limit(1);
        nextOrderNumber = ((maxOrderRow?.[0]?.order_number as number) || 0) + 1;
        recordQuickServeOrderNumber(restaurantId, nextOrderNumber);
        const { data: createdKitchenOrder, error: kitchenError } = await supabase
          .from("kitchen_orders")
          .insert({
            restaurant_id: restaurantId,
            source: "QuickServe",
            status: "preparing",
            items: kitchenItems,
            order_type: "takeaway",
            customer_name: finalCustomerName,
            server_name: attendantName,
            priority: "normal",
          })
          .select()
          .single();
        if (kitchenError) throw kitchenError;
        kitchenOrder = createdKitchenOrder;
        if (kitchenOrder?.id) {
          pendingSplitLinkRef.current = {
            fingerprint: splitFingerprint,
            orderId: "",
            kitchenOrderId: kitchenOrder.id,
            orderNumber: nextOrderNumber,
            splitPayments: splitPaymentsData,
          };
        }
        const totalDiscountAmount = discountValue + couponDiscountAmount + (loyaltyDiscountAmount || 0);
        const { data: createdOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            customer_name: finalCustomerName,
            items: formattedItems,
            total: subtotal,
            status: "preparing",
            payment_status: "pending",
            payment_method: "split",
            split_payments: splitPaymentsData,
            source: "quickserve",
            order_type: "takeaway",
            attendant: attendantName,
            order_number: nextOrderNumber,
            item_completion_status: items.map(() => false),
            ...(totalDiscountAmount > 0 && { discount_amount: totalDiscountAmount }),
            ...(customerPhone && { customer_phone: customerPhone }),
          })
          .select()
          .single();
        if (orderError) throw orderError;
        order = createdOrder;
        if (kitchenOrder?.id && order?.id) {
          pendingSplitLinkRef.current = {
            fingerprint: splitFingerprint,
            orderId: order.id,
            kitchenOrderId: kitchenOrder.id,
            orderNumber: nextOrderNumber,
            splitPayments: splitPaymentsData,
          };
        }
        const { error: splitTxnError } = await supabase.from("pos_transactions").insert({
          restaurant_id: restaurantId,
          order_id: order?.id || null,
          kitchen_order_id: kitchenOrder?.id || null,
          amount: subtotal,
          payment_method: "split",
          split_payments: splitPaymentsData,
          status: "pending",
          customer_name: finalCustomerName || null,
          customer_phone: customerPhone || null,
          staff_id: user?.id || null,
          discount_amount: 0,
        });
        if (splitTxnError) throw splitTxnError;
      }

      if (kitchenOrder?.id && order?.id) {
        const { error: linkError } = await supabase
          .from("kitchen_orders")
          .update({ order_id: order.id })
          .eq("id", kitchenOrder.id);
        if (linkError) {
          console.error("❌ Critical: split kitchen→order link failed:", linkError);
          throw linkError;
        }
        pendingSplitLinkRef.current = null;
      }
      setOrderNumber(nextOrderNumber);
      setCreatedOrderId(order?.id || null);
      setShowSplitUI(false);
      setStatus("success");
      toast({
        title: "Order Created — Awaiting Payment",
        description: splitPaymentsData
          .map(s => `${currencySymbol}${s.amount.toFixed(2)} ${s.method.toUpperCase()}`)
          .join(" + "),
      });
    } catch (err) {
      console.error("Split payment error:", err);
      toast({ title: "Payment Failed", description: "Could not complete split payment.", variant: "destructive" });
      setStatus("idle");
      setSelectedMethod(null);
      setShowSplitUI(false);
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
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Payment</DialogTitle>

        {status === "success" ? (
          <div className="flex flex-col items-center justify-center py-8 px-6">
            {/* Success icon + amount */}
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mb-3 animate-in zoom-in-50 duration-300",
                isOfflineOrder
                  ? "bg-amber-100 dark:bg-amber-500/20"
                  : paymentConfirmed
                    ? "bg-green-100 dark:bg-green-500/20"
                    : "bg-amber-100 dark:bg-amber-500/20",
              )}
            >
              {isOfflineOrder ? (
                <WifiOff className="h-8 w-8 text-amber-500" />
              ) : paymentConfirmed ? (
                <CheckCircle2 className="h-8 w-8 text-green-500 dark:text-green-400" />
              ) : (
                <Banknote className="h-8 w-8 text-amber-500" />
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">
              {isOfflineOrder
                ? "Order Saved Locally!"
                : selectedMethod === "pay_later"
                  ? "Pay Later — Collect When Ready"
                  : paymentConfirmed
                    ? "Payment Complete!"
                    : "Awaiting Payment"}
            </h3>
            <p className="text-gray-500 dark:text-white/60 text-sm mb-1 text-center">
              {isOfflineOrder
                ? "Will sync to server when internet is restored"
                : selectedMethod === "pay_later"
                  ? `${currencySymbol}${subtotal.toFixed(2)} pending from ${customerName.trim()}`
                  : `${currencySymbol}${additionalDue.toFixed(2)} via ${selectedMethod?.toUpperCase()}`}
            </p>

            {/* Order Token Number */}
            {orderNumber && (
              <div
                className={cn(
                  "text-white px-6 py-2.5 rounded-xl mb-4 animate-in zoom-in-75 duration-500",
                  isOfflineOrder
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-gradient-to-r from-orange-500 to-pink-500",
                )}
              >
                <p className="text-[10px] uppercase tracking-widest text-white/70 text-center">
                  {isOfflineOrder ? "Offline Token" : "Token Number"}
                </p>
                <p className="text-3xl font-black text-center tracking-wider">
                  #{String(orderNumber).padStart(3, "0")}
                </p>
                {isOfflineOrder && (
                  <p className="text-[10px] text-white/60 text-center mt-0.5">
                    Syncs automatically when online
                  </p>
                )}
              </div>
            )}

            {/* UPI QR Code — show on success online & offline pending UPI (skip for pay_later / nc / confirmed offline) */}
            {selectedMethod !== "pay_later" &&
              selectedMethod !== "nc" &&
              (!isOfflineOrder || !paymentConfirmed) && (
              <div className="w-full bg-gradient-to-b from-purple-50 to-white dark:from-purple-500/10 dark:to-gray-900 border border-purple-200 dark:border-purple-500/20 rounded-xl p-4 mb-4">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 text-center uppercase tracking-wider mb-3">
                  {upiId ? "Customer can scan to pay" : "Payment QR Code"}
                </p>
                {qrCodeUrl ? (
                  <div className="w-56 h-56 mx-auto bg-white rounded-lg p-2 shadow-sm mb-2">
                    <img
                      src={qrCodeUrl}
                      alt="UPI Payment QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : !upiId ? (
                  <div className="w-56 h-56 mx-auto bg-white rounded-lg flex flex-col items-center justify-center p-4 text-center mb-2">
                    <QrCode className="h-12 w-12 text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500">UPI ID not configured</p>
                  </div>
                ) : (
                  <div className="w-56 h-56 mx-auto bg-white rounded-lg flex items-center justify-center mb-2">
                    <QrCode className="h-16 w-16 text-gray-300 animate-pulse" />
                  </div>
                )}
                <p className="text-center text-sm font-bold text-gray-700 dark:text-white/80 mt-2">
                  {currencySymbol}
                  {additionalDue.toFixed(2)}
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <span className="text-[10px] text-gray-400 dark:text-white/40">
                    GPay
                  </span>
                  <span className="text-[10px] text-gray-300 dark:text-white/20">
                    •
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-white/40">
                    PhonePe
                  </span>
                  <span className="text-[10px] text-gray-300 dark:text-white/20">
                    •
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-white/40">
                    Paytm
                  </span>
                  <span className="text-[10px] text-gray-300 dark:text-white/20">
                    •
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-white/40">
                    Any UPI
                  </span>
                </div>
              </div>
            )}

            {/* ─── Mark as Paid Button (above bill sharing) ─── */}
            {!paymentConfirmed &&
              selectedMethod !== "pay_later" &&
              selectedMethod !== "nc" && (
              <button
                onClick={async () => {
                  if (!createdOrderId) return;
                  // ✅ Prevent double-click: disable immediately
                  setPaymentConfirmed(true);
                  try {
                    if (isOfflineOrder || isOfflineNow) {
                      if (!restaurantId) throw new Error("No restaurant ID");
                      const nowIso = new Date().toISOString();
                      const local = await getLocalOrder(createdOrderId);

                      await enqueueWrite(
                        "order",
                        {
                          id: createdOrderId,
                          payment_status: "paid",
                          payment_method: selectedMethod || "upi",
                          updated_at: nowIso,
                        },
                        "update",
                      );
                      await enqueueWrite(
                        "pos_transaction_clear_pending",
                        { order_id: createdOrderId },
                        "delete",
                      );
                      await enqueueWrite(
                        "pos_transaction",
                        {
                          id: `${createdOrderId}_markpaid`,
                          restaurant_id: restaurantId,
                          order_id: createdOrderId,
                          amount: additionalDue,
                          payment_method: selectedMethod || "upi",
                          status: "completed",
                          customer_name: customerName.trim() || "Walk-in Customer",
                          customer_phone: customerPhone || null,
                          staff_id: user?.id || null,
                          discount_amount: 0,
                          ...(selectedMethod === "split" && {
                            split_payments: [
                              ...(parseFloat(splitCash) > 0 ? [{ method: "cash", amount: parseFloat(splitCash) }] : []),
                              ...(parseFloat(splitUpi) > 0 ? [{ method: "upi", amount: parseFloat(splitUpi) }] : []),
                              ...(parseFloat(splitCard) > 0 ? [{ method: "card", amount: parseFloat(splitCard) }] : []),
                            ],
                          }),
                          created_at: nowIso,
                          updated_at: nowIso,
                        },
                        "insert",
                      );

                      if (local) {
                        const basePaid =
                          typeof local.paidAmount === "number"
                            ? local.paidAmount
                            : alreadyPaid;
                        await saveLocalOrder({
                          ...local,
                          paymentStatus: "paid",
                          paidAmount: basePaid + additionalDue,
                          updatedAt: nowIso,
                          synced: false,
                        });
                      }

                      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
                      queryClient.invalidateQueries({ queryKey: ["quickserve-order-history"] });
                      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
                      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });
                    } else {
                      const { error } = await supabase
                        .from("orders")
                        .update({ payment_status: "paid" })
                        .eq("id", createdOrderId);
                      if (error) throw error;

                      // Also update ONLY pending pos_transactions status to completed
                      await supabase
                        .from("pos_transactions")
                        .update({ status: "completed" })
                        .eq("order_id", createdOrderId)
                        .eq("status", "pending");
                    }

                    toast({
                      title: "Payment Confirmed ✓",
                      description: `${currencySymbol}${additionalDue.toFixed(2)} marked as paid via ${selectedMethod?.toUpperCase()}`,
                    });

                    // Fire WhatsApp bill in background if customer phone exists (online only)
                    if (!isOfflineOrder && !isOfflineNow && customerPhone && restaurantDetails) {
                      handleSendWhatsAppBill();
                    }

                    // Auto-close dialog
                    handleCloseSuccess();
                  } catch (err) {
                    console.error("Mark as paid error:", err);
                    setPaymentConfirmed(false); // Re-enable on failure
                    toast({
                      title: "Failed to mark as paid",
                      description: "Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={paymentConfirmed}
                className="w-full max-w-xs mt-2 py-3 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.97] shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Paid — {currencySymbol}{additionalDue.toFixed(2)}
                </span>
              </button>
            )}

            {/* Thermal / Browser Bill Print Button (works online & offline) */}
            <Button
              onClick={() => handlePrintBill()}
              disabled={isPrintingBill}
              className="w-full max-w-xs h-11 rounded-xl font-bold text-sm transition-all active:scale-95 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
            >
              <Printer className="mr-2 h-4 w-4" />
              {isPrintingBill ? "Printing..." : "Print Bill"}
            </Button>

            {/* Actions Container - Updated for MSG91 Integration */}
            {customerPhone && !isOfflineOrder && (
              <div className="w-full max-w-xs space-y-2 mt-2">
                {/* Automated PDF WhatsApp (MSG91) */}
                <Button
                  onClick={handleSendWhatsAppBill}
                  disabled={isSendingBill}
                  className={cn(
                    "w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-md",
                    "bg-[#25D366] hover:bg-[#1DA851] text-white",
                  )}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {isSendingBill
                    ? "Sending via WhatsApp..."
                    : "Send Bill via WhatsApp"}
                </Button>

                {/* Free Share Link */}
                <Button
                  variant="outline"
                  onClick={handleShareGeneric}
                  disabled={isSendingBill}
                  className="w-full h-11 rounded-xl font-semibold text-sm transition-all active:scale-95 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Text Bill (Free)
                </Button>
              </div>
            )}

            {/* If no phone number, prompt generic share */}
            {!customerPhone && (
              <Button
                variant="outline"
                onClick={handleShareGeneric}
                disabled={isSendingBill}
                className="w-full max-w-xs h-11 rounded-xl font-semibold text-sm transition-all active:scale-95 mt-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Text Link
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
            <div className="text-center py-6 px-6 bg-gradient-to-r from-orange-500/10 to-pink-500/10 dark:from-orange-500/20 dark:to-pink-500/20 border-b border-gray-200 dark:border-white/10 space-y-1">
              {alreadyPaid > 0 && (
                <div className="flex justify-center gap-4 text-xs font-semibold text-gray-500 dark:text-white/40 mb-1">
                  <span>Total: {currencySymbol}{subtotal.toFixed(0)}</span>
                  <span>Paid: {currencySymbol}{alreadyPaid.toFixed(0)}</span>
                </div>
              )}
              <p className="text-gray-500 dark:text-white/50 text-xs uppercase tracking-wider">
                {alreadyPaid > 0 ? "Additional Due" : "Amount Due"}
              </p>
              <p className="text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                {currencySymbol}
                {additionalDue.toFixed(2)}
              </p>
              {alreadyPaidLoading && (
                <p className="text-[10px] text-gray-400 dark:text-white/40 animate-pulse">
                  Calculating balance…
                </p>
              )}
              <p className="text-gray-400 dark:text-white/40 text-xs">
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </p>
            </div>


            {/* Payment Methods */}
            {!showSplitUI && (
            <div className="p-5 space-y-2">
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-white/40 font-medium mb-1.5">
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
                    disabled={status === "processing" || alreadyPaidLoading}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 active:scale-[0.98]",
                      pm.id === "split"
                        ? "border-orange-200 dark:border-orange-700/50 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 hover:border-orange-400"
                        : isProcessing
                          ? "border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/10"
                          : "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/15",
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center shrink-0",
                        pm.color,
                      )}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-left">
                      {pm.label}
                    </span>
                    {pm.id === "split" && (
                      <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 px-2 py-0.5 rounded-full">NEW</span>
                    )}
                    {isProcessing && (
                      <Loader2 className="h-4 w-4 text-gray-400 dark:text-white/60 animate-spin ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
            )}

            {/* Split Payment Input UI */}
            {showSplitUI && (() => {
              const cashAmt = parseFloat(splitCash) || 0;
              const upiAmt = parseFloat(splitUpi) || 0;
              const cardAmt = parseFloat(splitCard) || 0;
              const splitSum = cashAmt + upiAmt + cardAmt;
              const remaining = parseFloat((additionalDue - splitSum).toFixed(2));
              const isValid = Math.abs(remaining) < 0.01 && splitSum > 0;
              return (
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setShowSplitUI(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                    >
                      ← Back
                    </button>
                    <p className="text-xs uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold">Split Payment — {currencySymbol}{additionalDue.toFixed(2)}</p>
                  </div>

                  {/* Cash */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Banknote className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-0.5">Cash</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">{currencySymbol}</span>
                        <input
                          type="number" min="0" step="1" placeholder="0"
                          value={splitCash}
                          onChange={e => setSplitCash(e.target.value)}
                          className="flex-1 h-7 text-sm font-bold bg-transparent border-0 outline-none p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* UPI */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                      <Smartphone className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-purple-700 dark:text-purple-400 mb-0.5">UPI</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">{currencySymbol}</span>
                        <input
                          type="number" min="0" step="1" placeholder="0"
                          value={splitUpi}
                          onChange={e => setSplitUpi(e.target.value)}
                          className="flex-1 h-7 text-sm font-bold bg-transparent border-0 outline-none p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-0.5">Card</label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500">{currencySymbol}</span>
                        <input
                          type="number" min="0" step="1" placeholder="0"
                          value={splitCard}
                          onChange={e => setSplitCard(e.target.value)}
                          className="flex-1 h-7 text-sm font-bold bg-transparent border-0 outline-none p-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className={`rounded-xl p-2.5 text-center border-2 ${Math.abs(remaining) < 0.01 && splitSum > 0 ? "border-green-400 bg-green-50 dark:bg-green-900/20" : remaining > 0 ? "border-orange-300 bg-orange-50 dark:bg-orange-900/20" : "border-red-300 bg-red-50 dark:bg-red-900/20"}`}>
                    {Math.abs(remaining) < 0.01 && splitSum > 0
                      ? <p className="text-green-700 dark:text-green-400 font-bold text-xs">✓ Balanced!</p>
                      : remaining > 0
                        ? <p className="text-orange-700 dark:text-orange-400 text-xs font-semibold">Still needed: {currencySymbol}{remaining.toFixed(2)}</p>
                        : <p className="text-red-700 dark:text-red-400 text-xs font-semibold">Over by: {currencySymbol}{Math.abs(remaining).toFixed(2)}</p>
                    }
                  </div>

                  <button
                    onClick={handlePaySplit}
                    disabled={!isValid || status === "processing"}
                    className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] shadow-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50"
                  >
                    {status === "processing"
                      ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</span>
                      : `Confirm Split — ${currencySymbol}${additionalDue.toFixed(2)}`
                    }
                  </button>
                </div>
              );
            })()}
          </>
        )}

      </DialogContent>
    </Dialog>
  );
};
