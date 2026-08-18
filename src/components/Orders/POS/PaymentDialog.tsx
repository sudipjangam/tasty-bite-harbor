import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useBillSharing } from "@/hooks/useBillSharing";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { useCRMSync } from "@/hooks/useCRMSync";
import { useSpeechAnnouncement } from "@/hooks/useSpeechAnnouncement";
import { usePaymentNotification } from "@/hooks/usePaymentNotification";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
  Sparkles,
  Percent,
  Clock,
  ArrowLeft,
  Pencil,
  Building2,
  Gift,
  Star,
  Tag,
} from "lucide-react";
import type { OrderItem } from "@/types/orders";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { thermalPrinterService } from "@/services/thermalPrinterService";
import { CustomItemDialog, CustomItem } from "./CustomItemDialog";
import { PaymentDialogProps } from "./PaymentDialog/types";
import { resolveInvoiceTemplate } from "@/utils/resolveInvoiceTemplate";
import { buildReceiptHtml } from "./PaymentDialog/utils/buildReceiptHtml";
import { calculateOrderTotals } from "./PaymentDialog/utils/paymentCalculations";

const PaymentDialog = ({
  isOpen,
  onClose,
  orderItems: initialOrderItems,
  onSuccess,
  tableNumber = "",
  onEditOrder,
  orderId,
  onOrderUpdated,
  itemCompletionStatus: initialItemCompletionStatus,
  isNonChargeable = false,
  serverName,
}: PaymentDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { hasAccess } = useAccessControl();
  const { restaurantName: hookRestaurantName, restaurantId: hookRestaurantId } = useRestaurantId();

  // Check if restaurant subscription plan includes rooms/hotel management
  const hasRoomsPlan = hasAccess("rooms") || hasAccess("hotel");

  // ─── Flow State ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState<"checkout" | "qr" | "split" | "edit" | "success">("checkout");

  // ─── Items & Custom Pricing State ────────────────────────────────────────
  const [orderItems, setOrderItems] = useState<(OrderItem & { customPrice?: number })[]>(initialOrderItems || []);
  const [customTotalOverride, setCustomTotalOverride] = useState<number | null>(null);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [tempItemPrice, setTempItemPrice] = useState<string>("");
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotalInput, setTempTotalInput] = useState<string>("");

  // Reset dialog state whenever opened or switching orders
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("checkout");
      setIsProcessingPayment(false);
      setCustomTotalOverride(null);
      setEditingItemIdx(null);
      setTempItemPrice("");
      setIsEditingTotal(false);
      setTempTotalInput("");
      setPromotionCode("");
      setManualPromoInput("");
      setAppliedPromotion(null);
      setManualDiscountPercent(0);
      setManualDiscountCash(0);
      setNcReason("");
      setSplitCash("");
      setSplitUpi("");
      setSplitCard("");
      setQrCodeUrl("");
      setOrderItems(initialOrderItems || []);
    }
  }, [isOpen, orderId, tableNumber, initialOrderItems]);

  // ─── Customer Details & Sharing ──────────────────────────────────────────
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sendBillToWhatsApp, setSendBillToWhatsApp] = useState(false);
  const [orderType, setOrderType] = useState<string | null>(null);

  // ─── Discounts & Promotions ──────────────────────────────────────────────
  const [promotionCode, setPromotionCode] = useState("");
  const [manualPromoInput, setManualPromoInput] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState<any>(null);
  const [manualDiscountPercent, setManualDiscountPercent] = useState<number>(0);
  const [manualDiscountCash, setManualDiscountCash] = useState<number>(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [ncReason, setNcReason] = useState<string>("");

  // ─── Split Payment State ─────────────────────────────────────────────────
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitUpi, setSplitUpi] = useState<string>("");
  const [splitCard, setSplitCard] = useState<string>("");

  // ─── Dynamic QR & Paytm State ────────────────────────────────────
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [paytmOrderId, setPaytmOrderId] = useState<string | null>(null);
  const [isPaytmQR, setIsPaytmQR] = useState(false);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [paymentAutoDetected, setPaymentAutoDetected] = useState(false);

  // ─── Edit Mode & Extras ──────────────────────────────────────────────────
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [newItemsBuffer, setNewItemsBuffer] = useState<OrderItem[]>([]);
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [itemCompletionStatus, setItemCompletionStatus] = useState<boolean[]>(initialItemCompletionStatus || []);

  // ─── Hooks ───────────────────────────────────────────────────────────────
  const { announcePayment } = useSpeechAnnouncement();
  const { notifyPaymentSuccess, requestPermission } = usePaymentNotification();
  const { syncCustomerToCRM } = useCRMSync();
  const { getBillUrl, shareViaWhatsApp, shareViaWebShareAPI, isWebShareSupported } = useBillSharing();

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurant-info-pos", hookRestaurantId],
    queryFn: async () => {
      // 1. Direct query with hookRestaurantId
      if (hookRestaurantId) {
        const { data: rData } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", hookRestaurantId)
          .maybeSingle();
        if (rData) {
          if (rData.name) localStorage.setItem("cached_restaurant_name", rData.name);
          return rData;
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return null;

      // 2. Check profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profile?.restaurant_id) {
        const { data: rData } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", profile.restaurant_id)
          .maybeSingle();
        if (rData) {
          if (rData.name) localStorage.setItem("cached_restaurant_name", rData.name);
          return rData;
        }
      }

      // 3. Check staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("restaurant_id")
        .eq("auth_user_id", userData.user.id)
        .maybeSingle();

      if (staffData?.restaurant_id) {
        const { data: rData } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", staffData.restaurant_id)
          .maybeSingle();
        if (rData) {
          if (rData.name) localStorage.setItem("cached_restaurant_name", rData.name);
          return rData;
        }
      }

      // 4. Check owner
      const { data: directData } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (directData?.name) localStorage.setItem("cached_restaurant_name", directData.name);
      return directData;
    },
  });

  // Dynamically resolved restaurant / branch name
  const resolvedRestaurantName = useMemo(() => {
    return (
      restaurantInfo?.name ||
      hookRestaurantName ||
      localStorage.getItem("restaurant_name") ||
      localStorage.getItem("active_branch_name") ||
      localStorage.getItem("cached_restaurant_name") ||
      "Tasty Bite Harbor"
    );
  }, [restaurantInfo, hookRestaurantName]);

  const { data: paymentSettings } = useQuery({
    queryKey: ["payment-settings", restaurantInfo?.id || hookRestaurantId],
    queryFn: async () => {
      const targetId = restaurantInfo?.id || hookRestaurantId;
      if (!targetId) return null;
      const { data } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("restaurant_id", targetId)
        .maybeSingle();
      return data;
    },
    enabled: !!(restaurantInfo?.id || hookRestaurantId),
  });

  const { data: activePromotions = [] } = useQuery({
    queryKey: ["active-promotions", restaurantInfo?.id || hookRestaurantId],
    queryFn: async () => {
      const targetId = restaurantInfo?.id || hookRestaurantId;
      if (!targetId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("promotions")
        .select("*")
        .eq("restaurant_id", targetId)
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today);
      return data || [];
    },
    enabled: !!(restaurantInfo?.id || hookRestaurantId),
  });

  // Hotel reservation check for room charging (only if hotel plan is active)
  const [detectedReservation, setDetectedReservation] = useState<{
    reservation_id: string;
    room_id: string;
    roomName: string;
    customerName: string;
  } | null>(null);

  const checkForActiveReservation = useCallback(async () => {
    if (!hasRoomsPlan) return;
    if (!customerName.trim() && !customerMobile.trim()) return;
    try {
      let query = supabase
        .from("check_ins")
        .select(`
          id,
          customer_name,
          customer_phone,
          status,
          room_id,
          rooms:room_id (id, room_number)
        `)
        .eq("status", "checked_in");

      if (customerMobile.trim()) {
        query = query.eq("customer_phone", customerMobile.trim());
      } else if (customerName.trim()) {
        query = query.ilike("customer_name", `%${customerName.trim()}%`);
      }

      const { data } = await query.limit(1);
      if (data && data.length > 0) {
        const checkIn = data[0];
        setDetectedReservation({
          reservation_id: checkIn.id,
          room_id: checkIn.room_id,
          roomName: (checkIn.rooms as any)?.room_number || "Room",
          customerName: checkIn.customer_name,
        });
      } else {
        setDetectedReservation(null);
      }
    } catch {
      setDetectedReservation(null);
    }
  }, [hasRoomsPlan, customerName, customerMobile]);

  useEffect(() => {
    if (customerMobile.length >= 10 || customerName.length >= 3) {
      checkForActiveReservation();
    }
  }, [customerMobile, customerName, checkForActiveReservation]);

  // Load existing order details if orderId is provided
  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      const { data } = await supabase
        .from("kitchen_orders")
        .select("order_type, customer_name, customer_phone, manual_discount_percent, promotion_id")
        .eq("id", orderId)
        .maybeSingle();

      if (data) {
        if (data.order_type) setOrderType(data.order_type);
        if (data.customer_name) setCustomerName(data.customer_name);
        if (data.customer_phone) setCustomerMobile(data.customer_phone);
        if (data.manual_discount_percent) setManualDiscountPercent(data.manual_discount_percent);
      }
    };
    fetchOrder();
  }, [orderId]);

  // ─── Calculations ────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return calculateOrderTotals({
      orderItems,
      appliedPromotion,
      manualDiscountPercent,
      manualDiscountCash,
      customTotalOverride,
      isNonChargeable,
    });
  }, [orderItems, appliedPromotion, manualDiscountPercent, manualDiscountCash, customTotalOverride, isNonChargeable]);

  const {
    subtotal,
    promotionDiscountAmount,
    manualDiscountAmount,
    totalDiscountAmount,
    customAdjustmentAmount,
    total,
  } = totals;

  // ─── Promo Code Validation Handler ───────────────────────────────────────
  const handleApplyPromoCode = async (codeToUse: string) => {
    const code = codeToUse.trim();
    if (!code) {
      toast({ title: "Enter promo code", variant: "destructive" });
      return;
    }
    setIsApplyingPromo(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-promo-code", {
        body: { code, orderSubtotal: subtotal, restaurantId: restaurantInfo?.id || hookRestaurantId },
      });
      if (error) throw error;
      if (data?.valid && data?.promotion) {
        setAppliedPromotion(data.promotion);
        setPromotionCode(code);
        setManualDiscountPercent(0);
        setManualDiscountCash(0);
        toast({ title: `Promo Applied ✓`, description: `${data.promotion.name || code}` });
      } else {
        toast({ title: "Invalid Promo Code", description: data?.error || "Code is not valid for this order", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Promo Validation Failed", description: err?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  // ─── Dynamic QR Generator ────────────────────────────────────────────────
  const generateQRCode = useCallback(async () => {
    const rName = resolvedRestaurantName;
    const upiId = paymentSettings?.upi_id;
    if (!upiId) return;

    try {
      const { default: QRCodeLib } = await import("qrcode");
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(rName)}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${tableNumber || "POS"}`)}`;
      const url = await QRCodeLib.toDataURL(upiUrl, { width: 300, margin: 2 });
      setQrCodeUrl(url);
    } catch (err) {
      console.error("QR Generation error:", err);
    }
  }, [resolvedRestaurantName, paymentSettings, total, tableNumber]);

  // ─── Direct Inline Price Editing Handlers ─────────────────────────────────
  const handleStartEditItemPrice = (idx: number, currentPrice: number) => {
    setEditingItemIdx(idx);
    setTempItemPrice(currentPrice.toString());
  };

  const handleSaveItemPrice = (idx: number) => {
    const val = parseFloat(tempItemPrice);
    if (!isNaN(val) && val >= 0) {
      setOrderItems((prev) => {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], customPrice: val };
        return copy;
      });
    }
    setEditingItemIdx(null);
    setTempItemPrice("");
  };

  const handleStartEditTotal = () => {
    setIsEditingTotal(true);
    setTempTotalInput(total.toFixed(2));
  };

  const handleSaveTotal = () => {
    const val = parseFloat(tempTotalInput);
    if (!isNaN(val) && val >= 0) {
      setCustomTotalOverride(val);
      toast({
        title: "Total Price Overridden",
        description: `Order total set to ${currencySymbol}${val.toFixed(2)}`,
      });
    }
    setIsEditingTotal(false);
  };

  const handleResetPriceOverrides = () => {
    setCustomTotalOverride(null);
    setOrderItems((prev) =>
      prev.map((item) => {
        const { customPrice, ...rest } = item;
        return rest as OrderItem;
      })
    );
    toast({ title: "Prices reset to original menu rates" });
  };

  // ─── Printing & Thermal Support ──────────────────────────────────────────
  const handlePrint = useCallback(async () => {
    try {
      if (thermalPrinterService.isConnected()) {
        await thermalPrinterService.printReceipt({
          restaurantName: resolvedRestaurantName,
          address: restaurantInfo?.address,
          phone: restaurantInfo?.phone,
          gstin: restaurantInfo?.gstin,
          billNumber: `#${Date.now().toString().slice(-6)}`,
          date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          tableName: tableNumber || undefined,
          customerName: customerName || undefined,
          customerMobile: customerMobile || undefined,
          serverName: serverName || undefined,
          items: orderItems.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.customPrice !== undefined ? i.customPrice : i.price,
          })),
          subtotal,
          cgst: 0,
          sgst: 0,
          discount: totalDiscountAmount,
          netAmount: total,
          currencySymbol,
          upiId: paymentSettings?.upi_id,
        });
        toast({ title: "Bill printed via thermal printer ✓" });
        return;
      }

      // Browser iframe print fallback with dynamic restaurant name
      const html = buildReceiptHtml({
        restaurantInfo: restaurantInfo || null,
        restaurantName: resolvedRestaurantName,
        orderItems,
        subtotal,
        total,
        currencySymbol,
        tableNumber,
        customerName,
        customerMobile,
        appliedPromotion,
        promotionDiscountAmount,
        manualDiscountPercent,
        manualDiscountAmount,
        totalDiscountAmount,
        customAdjustmentAmount,
        paymentSettings,
        qrCodeUrl,
        serverName,
      });

      const stale = document.getElementById("_bill_print_frame");
      if (stale) stale.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "_bill_print_frame";
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:58mm;height:1px;border:none;visibility:hidden;";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 60000);
        }, 300);
      }
      toast({ title: "Bill preview sent to printer ✓" });
    } catch (err: any) {
      console.error("Print error:", err);
      toast({ title: "Printing failed", description: err?.message, variant: "destructive" });
    }
  }, [
    restaurantInfo,
    resolvedRestaurantName,
    orderItems,
    subtotal,
    total,
    currencySymbol,
    tableNumber,
    customerName,
    customerMobile,
    appliedPromotion,
    promotionDiscountAmount,
    manualDiscountPercent,
    manualDiscountAmount,
    totalDiscountAmount,
    customAdjustmentAmount,
    paymentSettings,
    qrCodeUrl,
    serverName,
    toast,
  ]);

  // ─── WhatsApp Auto-Share ─────────────────────────────────────────────────
  const handleAutoSendWhatsApp = useCallback(async () => {
    if (!customerMobile) return;
    try {
      const cleanPhone = customerMobile.replace(/[\+\-\s]/g, "");
      const phoneWithCode = cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone;
      const formattedAmount = `Rs.${total.toFixed(2)}`;
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString("en-IN")} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

      const { templateName, variables, buttons } = resolveInvoiceTemplate({
        customerName: customerName || "Customer",
        restaurantName: resolvedRestaurantName,
        amount: formattedAmount,
        billDate: formattedDate,
        billUrlSuffix: "paid",
        contactNumber: restaurantInfo?.phone || "-",
      });

      await supabase.functions.invoke("send-whatsapp-unified", {
        body: {
          phoneNumber: phoneWithCode,
          restaurantId: restaurantInfo?.id || hookRestaurantId,
          templateName,
          variables,
          buttons,
        },
      });
    } catch (e) {
      console.warn("WhatsApp auto-send error:", e);
    }
  }, [customerMobile, restaurantInfo, hookRestaurantId, resolvedRestaurantName, total, customerName]);

  // ─── 1-CLICK INSTANT PAYMENT EXECUTION ───────────────────────────────────
  const handleQuickPay = useCallback(
    async (method: "cash" | "upi" | "card" | "pay_later" | "room" | "nc", splitPayload?: Array<{ method: string; amount: number }>) => {
      if (isProcessingPayment) return;
      setIsProcessingPayment(true);

      try {
        // Validate NC
        if (method === "nc" && !ncReason) {
          toast({ title: "Select NC Reason", description: "Please select a reason for this complimentary order.", variant: "destructive" });
          setIsProcessingPayment(false);
          return;
        }

        const targetRestaurantId = restaurantInfo?.id || hookRestaurantId;
        const finalMethod = method === "nc" ? "nc" : method;
        const finalStatus = method === "nc" ? "nc" : method === "pay_later" ? "pending" : "paid";
        const finalAmount = method === "nc" ? 0 : total;

        // 1. Sync CRM customer details
        if (customerMobile.trim() && targetRestaurantId) {
          await syncCustomerToCRM({
            phone: customerMobile.trim(),
            name: customerName.trim() || undefined,
            restaurantId: targetRestaurantId,
            orderAmount: finalAmount,
          }).catch(console.warn);
        }

        // 2. Update kitchen order in DB if orderId exists
        if (orderId) {
          await supabase
            .from("kitchen_orders")
            .update({
              status: "completed",
              payment_status: finalStatus,
              payment_method: finalMethod,
              total_amount: finalAmount,
              ...(customerName.trim() && { customer_name: customerName.trim() }),
              ...(customerMobile.trim() && { customer_phone: customerMobile.trim() }),
              ...(method === "nc" && { nc_reason: ncReason }),
            })
            .eq("id", orderId);
        }

        // 3. Room Charge handler
        if (method === "room" && detectedReservation) {
          await supabase.from("room_food_orders").insert({
            room_id: detectedReservation.room_id,
            order_id: orderId || null,
            total: finalAmount,
            status: "pending",
          });
        }

        // 4. Invalidate all POS queries
        queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
        queryClient.invalidateQueries({ queryKey: ["all-orders"] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });

        // 5. Soundbox announcement & local popup notification
        if (method !== "nc") {
          announcePayment({
            amount: finalAmount,
            tableNumber: tableNumber || undefined,
            language: (paymentSettings as any)?.voice_announcement_language === "hi" ? "hi" : "en",
          });
          notifyPaymentSuccess({
            amount: finalAmount,
            tableNumber: tableNumber || undefined,
            currencySymbol,
          });
        }

        // 6. Auto-print bill
        handlePrint().catch(console.warn);

        // 7. Auto-send WhatsApp if checkbox enabled
        if (sendBillToWhatsApp && customerMobile.trim()) {
          handleAutoSendWhatsApp().catch(console.warn);
        }

        toast({
          title: method === "nc" ? "🎁 Order Marked Complimentary" : "✅ Payment Successful",
          description: `${currencySymbol}${finalAmount.toFixed(2)} settled via ${method.toUpperCase()}`,
        });

        // 8. Success transition & quick auto-close
        setCurrentStep("success");
        setTimeout(() => {
          setCurrentStep("checkout");
          onSuccess();
          onClose();
        }, 1800);
      } catch (err: any) {
        console.error("Payment processing error:", err);
        toast({ title: "Payment Failed", description: err?.message || "Please try again.", variant: "destructive" });
      } finally {
        setIsProcessingPayment(false);
      }
    },
    [
      isProcessingPayment,
      ncReason,
      restaurantInfo,
      hookRestaurantId,
      total,
      customerMobile,
      customerName,
      orderId,
      detectedReservation,
      tableNumber,
      paymentSettings,
      currencySymbol,
      sendBillToWhatsApp,
      syncCustomerToCRM,
      queryClient,
      announcePayment,
      notifyPaymentSuccess,
      handlePrint,
      handleAutoSendWhatsApp,
      onSuccess,
      onClose,
      toast,
    ]
  );

  // ─── Split Payment Confirmation ──────────────────────────────────────────
  const handleConfirmSplit = async () => {
    const cash = parseFloat(splitCash) || 0;
    const upi = parseFloat(splitUpi) || 0;
    const card = parseFloat(splitCard) || 0;
    const sum = cash + upi + card;

    if (Math.abs(sum - total) > 0.05) {
      toast({
        title: "Split Amount Mismatch",
        description: `Split total (${currencySymbol}${sum.toFixed(2)}) must equal Total Due (${currencySymbol}${total.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    const payload = [
      { method: "cash", amount: cash },
      { method: "upi", amount: upi },
      { method: "card", amount: card },
    ].filter((p) => p.amount > 0);

    await handleQuickPay("cash", payload);
  };

  // ─── Keyboard Shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((document.activeElement as HTMLElement)?.tagName)) {
        return;
      }
      if (!isOpen || currentStep !== "checkout") return;

      if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleQuickPay("cash");
      } else if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        generateQRCode();
        setCurrentStep("qr");
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleQuickPay("card");
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, handleQuickPay, generateQRCode, handlePrint]);

  const hasCustomOverrides = customTotalOverride !== null || orderItems.some((i) => i.customPrice !== undefined);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCurrentStep("checkout");
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 rounded-2xl shadow-2xl">
          <VisuallyHidden>
            <DialogTitle>Checkout & Payment</DialogTitle>
          </VisuallyHidden>

          {/* ─── SUCCESS SCREEN ──────────────────────────────────────────── */}
          {currentStep === "success" && (
            <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 bg-white dark:bg-slate-900">
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg animate-in zoom-in-50">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Completed!</h2>
              <p className="text-base text-slate-600 dark:text-slate-300">
                {currencySymbol}
                {total.toFixed(2)} settled successfully.
              </p>
              <div className="flex gap-3 pt-4">
                <Button onClick={handlePrint} variant="outline" className="gap-2 border-slate-300 dark:border-slate-700">
                  <Printer className="w-4 h-4" /> Print Again
                </Button>
                <Button
                  onClick={() => {
                    setCurrentStep("checkout");
                    onSuccess();
                    onClose();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Done (Back to POS)
                </Button>
              </div>
            </div>
          )}

          {/* ─── QR PAYMENT MODAL STEP ──────────────────────────────────── */}
          {currentStep === "qr" && (
            <div className="p-6 space-y-6 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep("checkout")} className="gap-1 text-xs text-slate-600 dark:text-slate-300">
                  <ArrowLeft className="w-4 h-4" /> Back to Checkout
                </Button>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Scan UPI QR to Pay</h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                  {currencySymbol}{total.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-100/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="UPI QR" className="w-56 h-56 rounded-xl border border-white dark:border-slate-800 shadow-md bg-white p-2" />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-xs">Generating Dynamic QR...</p>
                  </div>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Soundbox voice announcement active on payment
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleQuickPay("upi")}
                  disabled={isProcessingPayment}
                  className="flex-1 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg"
                >
                  {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                  Confirm Received via UPI
                </Button>
              </div>
            </div>
          )}

          {/* ─── SPLIT PAYMENT MODAL STEP ───────────────────────────────── */}
          {currentStep === "split" && (
            <div className="p-6 space-y-5 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep("checkout")} className="gap-1 text-xs text-slate-600 dark:text-slate-300">
                  <ArrowLeft className="w-4 h-4" /> Back to Checkout
                </Button>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Split Payment</h3>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Total: {currencySymbol}{total.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10 space-y-1.5">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" /> Cash
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="0.00"
                    className="text-right font-bold text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="p-3.5 rounded-xl border border-purple-300 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/10 space-y-1.5">
                  <span className="text-xs font-bold text-purple-800 dark:text-purple-400 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" /> UPI
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={splitUpi}
                    onChange={(e) => setSplitUpi(e.target.value)}
                    placeholder="0.00"
                    className="text-right font-bold text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="p-3.5 rounded-xl border border-blue-300 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/10 space-y-1.5">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-400 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" /> Card
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    placeholder="0.00"
                    className="text-right font-bold text-sm bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center text-sm font-medium">
                <div>
                  <span className="text-xs text-slate-400">Entered: </span>
                  <span className="font-bold">
                    {currencySymbol}
                    {((parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0)).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Remaining: </span>
                  <span className="font-bold text-amber-400">
                    {currencySymbol}
                    {Math.max(
                      0,
                      total - ((parseFloat(splitCash) || 0) + (parseFloat(splitUpi) || 0) + (parseFloat(splitCard) || 0))
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleConfirmSplit}
                disabled={isProcessingPayment}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-md"
              >
                Confirm Split Settlement
              </Button>
            </div>
          )}

          {/* ─── PRIMARY 1-CLICK UNIFIED CHECKOUT VIEW ───────────────────── */}
          {currentStep === "checkout" && (
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-300/80 dark:divide-slate-800">
              {/* ──────────────────────────────────────────────────────────── */}
              {/* LEFT HALF (50%): INTERACTIVE BILL RECEIPT (HIGH CONTRAST)     */}
              {/* ──────────────────────────────────────────────────────────── */}
              <div className="md:col-span-6 p-5 flex flex-col justify-between bg-slate-100/90 dark:bg-slate-950/80 min-h-[520px]">
                <div className="space-y-3">
                  {/* Bill Header with Dynamic Restaurant Name */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-300/80 dark:border-slate-800">
                    <div className="max-w-[75%]">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight truncate">
                        <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">{resolvedRestaurantName}</span>
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                        {tableNumber ? `Table: ${tableNumber}` : "POS Walk-in"} • {orderItems.length} Items
                      </p>
                    </div>
                    {hasCustomOverrides && (
                      <button
                        onClick={handleResetPriceOverrides}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 underline flex items-center gap-0.5"
                      >
                        Reset Prices
                      </button>
                    )}
                  </div>

                  {/* Order Items Table with Click-to-Edit Price */}
                  <div className="max-h-[220px] overflow-y-auto pr-1 space-y-1.5">
                    <div className="grid grid-cols-12 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1 px-1">
                      <span className="col-span-7">Item</span>
                      <span className="col-span-2 text-center">Qty</span>
                      <span className="col-span-3 text-right">Price (Edit)</span>
                    </div>

                    {orderItems.map((item, idx) => {
                      const unitPrice = item.customPrice !== undefined ? item.customPrice : item.price;
                      const isEditingThis = editingItemIdx === idx;

                      return (
                        <div
                          key={`${item.id || idx}-${idx}`}
                          className="grid grid-cols-12 items-center text-xs py-2 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300/90 dark:border-slate-700/80 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                        >
                          <div className="col-span-7 truncate font-semibold text-slate-900 dark:text-slate-100">
                            {item.name}
                          </div>
                          <div className="col-span-2 text-center text-slate-600 dark:text-slate-400 font-bold">
                            ×{item.quantity}
                          </div>
                          <div className="col-span-3 text-right">
                            {isEditingThis ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-slate-500 font-bold">{currencySymbol}</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  inputMode="decimal"
                                  autoFocus
                                  value={tempItemPrice}
                                  onChange={(e) => setTempItemPrice(e.target.value)}
                                  onBlur={() => handleSaveItemPrice(idx)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSaveItemPrice(idx);
                                    }
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditingItemIdx(null);
                                    }
                                  }}
                                  className="w-16 px-1.5 py-0.5 text-right font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-500 rounded outline-none text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartEditItemPrice(idx, unitPrice)}
                                title="Click to edit price for this order"
                                className="group inline-flex items-center gap-1 font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                              >
                                {item.customPrice !== undefined && (
                                  <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold">
                                    edited
                                  </span>
                                )}
                                <span>{currencySymbol}{(unitPrice * item.quantity).toFixed(2)}</span>
                                <Pencil className="w-3 h-3 opacity-40 group-hover:opacity-100 text-indigo-600 dark:text-indigo-400 transition-opacity" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subtotal & Breakdown */}
                  <div className="pt-2.5 border-t border-slate-300/80 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                      <span>Subtotal</span>
                      <span className="font-bold">{currencySymbol}{subtotal.toFixed(2)}</span>
                    </div>

                    {promotionDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span>Promo Discount ({appliedPromotion?.name || appliedPromotion?.promotion_code})</span>
                        <span>-{currencySymbol}{promotionDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {manualDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                        <span>
                          Manual Discount {manualDiscountPercent > 0 ? `(${manualDiscountPercent}%)` : `(Cash Off)`}
                        </span>
                        <span>-{currencySymbol}{manualDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {customAdjustmentAmount !== 0 && (
                      <div className="flex justify-between text-indigo-700 dark:text-indigo-400 font-bold">
                        <span>{customAdjustmentAmount > 0 ? "Custom Adjustment (+)" : "Manual Price Adjustment (-)"}</span>
                        <span>
                          {customAdjustmentAmount > 0 ? "+" : ""}
                          {currencySymbol}{customAdjustmentAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Net Total Card with Click-to-Edit Total */}
                <div className="mt-4 pt-3 border-t border-slate-300/80 dark:border-slate-800 space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-indigo-950 text-white shadow-md flex items-center justify-between border border-slate-800 dark:border-indigo-900">
                    <div>
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                        {isNonChargeable ? "Complimentary Order" : "Net Total (Click to override)"}
                      </span>
                      <span className="text-[11px] text-indigo-300 font-medium">
                        {isNonChargeable ? "No payment collected" : "Tap amount to type custom price"}
                      </span>
                    </div>

                    <div>
                      {isNonChargeable ? (
                        <span className="text-2xl font-extrabold text-emerald-400">{currencySymbol}0.00</span>
                      ) : isEditingTotal ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-400">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            autoFocus
                            value={tempTotalInput}
                            onChange={(e) => setTempTotalInput(e.target.value)}
                            onBlur={handleSaveTotal}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSaveTotal();
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsEditingTotal(false);
                              }
                            }}
                            className="w-28 px-2 py-1 text-right font-extrabold text-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border-2 border-indigo-400 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={handleStartEditTotal}
                          title="Click to directly override final total"
                          className="group inline-flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                          <span className="text-2xl font-extrabold text-white tracking-tight">
                            {currencySymbol}{total.toFixed(2)}
                          </span>
                          <Pencil className="w-4 h-4 text-indigo-300 opacity-60 group-hover:opacity-100" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bill Bottom Helper Actions */}
                  <div className="flex gap-2">
                    <Button onClick={handlePrint} variant="outline" size="sm" className="flex-1 text-xs gap-1.5 h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs hover:bg-slate-100">
                      <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Print Preview (P)
                    </Button>
                    {onEditOrder && (
                      <Button onClick={onEditOrder} variant="ghost" size="sm" className="text-xs text-slate-600 dark:text-slate-400 font-semibold h-9 hover:bg-slate-200 dark:hover:bg-slate-800">
                        Edit Items
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* ──────────────────────────────────────────────────────────── */}
              {/* RIGHT HALF (50%): 1-CLICK PAYMENT ACTIONS & CUSTOMER PANEL   */}
              {/* ──────────────────────────────────────────────────────────── */}
              <div className="md:col-span-6 p-5 flex flex-col justify-between space-y-3.5 bg-white dark:bg-slate-900">
                <div className="space-y-3">
                  {/* Customer Phone & WhatsApp Toggle Bar */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 space-y-2.5 shadow-2xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Mobile</span>
                        <Input
                          value={customerMobile}
                          onChange={(e) => setCustomerMobile(e.target.value)}
                          placeholder="Phone (10 digits)"
                          type="tel"
                          className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Customer Name</span>
                        <Input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Name (Optional)"
                          className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1.5 border-t border-slate-200 dark:border-slate-700/80 select-none">
                      <input
                        type="checkbox"
                        checked={sendBillToWhatsApp}
                        onChange={(e) => setSendBillToWhatsApp(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        📲 Auto-send WhatsApp Bill upon payment
                      </span>
                    </label>
                  </div>

                  {/* ──────────────────────────────────────────────────────── */}
                  {/* PROMO & DISCOUNT SECTION (Dropdown + Code Input + Cash)  */}
                  {/* ──────────────────────────────────────────────────────── */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Promo & Discounts
                      </span>
                      {appliedPromotion && (
                        <button
                          onClick={() => {
                            setAppliedPromotion(null);
                            setPromotionCode("");
                            setManualPromoInput("");
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                        >
                          <X className="w-3 h-3" /> Remove Promo
                        </button>
                      )}
                    </div>

                    {/* Promo Dropdown & Manual Input */}
                    <div className="space-y-1.5">
                      {activePromotions.length > 0 && (
                        <Select
                          value={promotionCode}
                          onValueChange={(code) => {
                            const promo = activePromotions.find((p: any) => p.promotion_code === code);
                            if (promo) {
                              setAppliedPromotion(promo);
                              setPromotionCode(code);
                              setManualPromoInput(code);
                              setManualDiscountPercent(0);
                              setManualDiscountCash(0);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                            <SelectValue placeholder="Select active promo code..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activePromotions.map((p: any) => (
                              <SelectItem key={p.id} value={p.promotion_code}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold">{p.promotion_code}</span>
                                  <span className="text-[11px] text-emerald-600 font-bold">
                                    ({p.discount_percentage ? `${p.discount_percentage}% off` : `${currencySymbol}${p.discount_amount} off`})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      <div className="flex gap-1.5">
                        <Input
                          value={manualPromoInput}
                          onChange={(e) => setManualPromoInput(e.target.value)}
                          placeholder="Enter promo code"
                          className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={isApplyingPromo || !manualPromoInput.trim()}
                          onClick={() => handleApplyPromoCode(manualPromoInput)}
                          className="h-8 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold"
                        >
                          {isApplyingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    </div>

                    {/* Manual Discounts: DISCOUNT % and CASH OFF (₹) */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Discount %
                        </span>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            value={manualDiscountPercent > 0 ? manualDiscountPercent : ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setManualDiscountPercent(Math.min(100, Math.max(0, val)));
                              setManualDiscountCash(0);
                            }}
                            placeholder="0"
                            className="w-full h-8 px-2.5 pr-6 text-right font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-2 top-2 text-[11px] font-bold text-slate-400 pointer-events-none">%</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Cash Off ({currencySymbol})
                        </span>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={manualDiscountCash > 0 ? manualDiscountCash : ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setManualDiscountCash(Math.max(0, val));
                              setManualDiscountPercent(0);
                            }}
                            placeholder="0"
                            className="w-full h-8 px-2.5 pr-6 text-right font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-2 top-2 text-[11px] font-bold text-slate-400 pointer-events-none">{currencySymbol}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Discount Shortcut Chips */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {[
                        { label: "None", pct: 0 },
                        { label: "5%", pct: 5 },
                        { label: "10%", pct: 10 },
                        { label: "15%", pct: 15 },
                        { label: "20%", pct: 20 },
                      ].map((d) => (
                        <button
                          key={d.pct}
                          type="button"
                          onClick={() => {
                            setManualDiscountPercent(d.pct);
                            setManualDiscountCash(0);
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                            manualDiscountPercent === d.pct && manualDiscountCash === 0 && !appliedPromotion
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* NC Reason (If complimentary order) */}
                  {(isNonChargeable || orderType === "nc") && (
                    <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 space-y-1.5">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                        🎁 NC Reason <span className="text-rose-500">*</span>
                      </span>
                      <Select value={ncReason} onValueChange={setNcReason}>
                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-amber-300">
                          <SelectValue placeholder="Select complimentary reason..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff_meal">Staff Meal</SelectItem>
                          <SelectItem value="owner_complimentary">Owner Complimentary</SelectItem>
                          <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                          <SelectItem value="promotional_giveaway">Promotional Giveaway</SelectItem>
                          <SelectItem value="wastage">Wastage / Quality Check</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Hotel Room Guest Indicator (Only if hotel plan is active & guest detected) */}
                  {hasRoomsPlan && detectedReservation && (
                    <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-bold text-emerald-900 dark:text-emerald-200">
                            In-House Guest: {detectedReservation.customerName}
                          </span>
                          <span className="text-[10px] text-emerald-700 block">{detectedReservation.roomName}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleQuickPay("room")}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Charge Room
                      </Button>
                    </div>
                  )}
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 1-CLICK DIRECT PAYMENT ACTIONS GRID                          */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    ⚡ 1-Click Settlement (Choose Method)
                  </span>

                  {isNonChargeable ? (
                    <Button
                      onClick={() => handleQuickPay("nc")}
                      disabled={isProcessingPayment || !ncReason}
                      className="w-full py-6 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white font-bold text-base shadow-lg"
                    >
                      {isProcessingPayment ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Gift className="w-5 h-5 mr-2" />}
                      Complete Complimentary Order (₹0.00)
                    </Button>
                  ) : (
                    <>
                      {/* Big 1-Click Primary Buttons */}
                      <div className="grid grid-cols-3 gap-2.5">
                        {/* CASH BUTTON */}
                        <button
                          onClick={() => handleQuickPay("cash")}
                          disabled={isProcessingPayment}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 group cursor-pointer"
                        >
                          <Wallet className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="font-bold text-sm">Cash</span>
                          <span className="text-[11px] font-semibold opacity-95">{currencySymbol}{total.toFixed(2)}</span>
                          <span className="text-[9px] opacity-80 font-mono mt-0.5">[Enter]</span>
                        </button>

                        {/* UPI / QR BUTTON */}
                        <button
                          onClick={() => {
                            generateQRCode();
                            setCurrentStep("qr");
                          }}
                          disabled={isProcessingPayment}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 group cursor-pointer"
                        >
                          <QrCode className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="font-bold text-sm">UPI / QR</span>
                          <span className="text-[11px] font-semibold opacity-95">{currencySymbol}{total.toFixed(2)}</span>
                          <span className="text-[9px] opacity-80 font-mono mt-0.5">[U]</span>
                        </button>

                        {/* CARD BUTTON */}
                        <button
                          onClick={() => handleQuickPay("card")}
                          disabled={isProcessingPayment}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 group cursor-pointer"
                        >
                          <CreditCard className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="font-bold text-sm">Card</span>
                          <span className="text-[11px] font-semibold opacity-95">{currencySymbol}{total.toFixed(2)}</span>
                          <span className="text-[9px] opacity-80 font-mono mt-0.5">[C]</span>
                        </button>
                      </div>

                      {/* Secondary Quick Action Row - Conditioned on Hotel Plan */}
                      <div className={`grid gap-2 pt-1 ${hasRoomsPlan ? "grid-cols-3" : "grid-cols-2"}`}>
                        <button
                          onClick={() => setCurrentStep("split")}
                          className="py-2 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                        >
                          ✂️ Split Bill
                        </button>
                        <button
                          onClick={() => handleQuickPay("pay_later")}
                          className="py-2 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                        >
                          ⏳ Pay Later
                        </button>
                        {hasRoomsPlan && (
                          <button
                            onClick={() => {
                              if (detectedReservation) {
                                handleQuickPay("room");
                              } else {
                                toast({ title: "No checked-in guest detected for this order" });
                              }
                            }}
                            className="py-2 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                          >
                            🏨 Room
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentDialog;
