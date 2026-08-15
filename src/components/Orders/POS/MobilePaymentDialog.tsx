/**
 * MobilePaymentDialog.tsx
 *
 * Android-APK-only payment flow. Shown instead of PaymentDialog on native platform.
 * Uses the same Supabase logic, CRM sync, WhatsApp, and thermal printing — but in a
 * touch-optimised, bottom-sheet style UI designed for small screen POS devices.
 *
 * PaymentDialog.tsx is UNTOUCHED — this is a completely separate component.
 *
 * FEATURES:
 *  - All payment methods: Cash, Card, UPI/QR, Split, Pay Later, NC
 *  - UPI QR code display step (gap #2 fixed)
 *  - Auto-lookup customer by phone → pre-fill name + loyalty points (gap #3 fixed)
 *  - Loyalty points redemption UI → deducts from total + inserts loyalty_transactions (gap #3 fixed)
 *  - Inline printer quick-connect modal (gap #4 fixed)
 *  - Native Android share sheet via Web Share API (gap #5 fixed)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useCRMSync } from "@/hooks/useCRMSync";
import { useBillSharing } from "@/hooks/useBillSharing";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { thermalPrinterService } from "@/services/thermalPrinterService";
import { nativePrinterBridge } from "@/services/nativePrinterBridge";
import { resolveInvoiceTemplate } from "@/utils/resolveInvoiceTemplate";
import type { PaymentDialogProps } from "@/components/Orders/POS/PaymentDialog/types";
import {
  X,
  Check,
  Printer,
  Wallet,
  CreditCard,
  QrCode,
  User,
  Phone,
  Tag,
  ChevronRight,
  Loader2,
  MessageSquare,
  ArrowLeft,
  Split,
  Clock,
  Star,
  Bluetooth,
  Wifi,
  Share2,
  Gift,
  AlertCircle,
} from "lucide-react";
import QRCode from "qrcode";

// ─── Types ────────────────────────────────────────────────────────────────────

type MobilePayStep = "confirm" | "method" | "qr" | "split" | "success";

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  loyalty_points: number;
  loyalty_enrolled: boolean;
  loyalty_tier_id?: string | null;
}

// ─── Helper: calculate total with discounts ───────────────────────────────────

function calcTotal(
  subtotal: number,
  promoDiscount: number,
  manualPct: number,
  manualCash: number,
  loyaltyDiscount: number
) {
  const manualPctAmt = (subtotal * manualPct) / 100;
  const totalDiscount = promoDiscount + manualPctAmt + manualCash + loyaltyDiscount;
  return { totalDiscount, total: Math.max(0, subtotal - totalDiscount) };
}

// ─── Inline Printer Quick-Connect Modal ──────────────────────────────────────

interface PrinterModalProps {
  onConnected: () => void;
  onDismiss: () => void;
}

const PrinterQuickConnectModal: React.FC<PrinterModalProps> = ({ onConnected, onDismiss }) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"bt" | "wifi">("bt");
  const [btDevices, setBtDevices] = useState<Array<{ name: string; address: string }>>([]);
  const [scanning, setScanning] = useState(false);
  const [lanIp, setLanIp] = useState(localStorage.getItem("native_printer_lan_ip") ?? "");
  const [lanPort, setLanPort] = useState(localStorage.getItem("native_printer_lan_port") ?? "9100");
  const [connecting, setConnecting] = useState<string | null>(null);

  const scanBT = async () => {
    setScanning(true);
    setBtDevices([]);
    try {
      const devices = await nativePrinterBridge.discoverBluetooth();
      setBtDevices(devices);
      if (devices.length === 0) {
        toast({ title: "No paired BT devices found", description: "Pair printer in Android Settings first" });
      }
    } catch (e: any) {
      toast({ title: "Bluetooth scan failed", description: e?.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const connectBT = async (device: { name: string; address: string }) => {
    setConnecting(device.address);
    try {
      const ok = await nativePrinterBridge.connectBluetooth(device.address, device.name);
      if (ok) { onConnected(); } else {
        toast({ title: "BT connect failed", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "BT error", description: e?.message, variant: "destructive" });
    } finally {
      setConnecting(null);
    }
  };

  const connectWiFi = async () => {
    if (!lanIp.trim()) { toast({ title: "Enter printer IP", variant: "destructive" }); return; }
    setConnecting("wifi");
    try {
      const ok = await nativePrinterBridge.connectLAN(lanIp.trim(), parseInt(lanPort, 10));
      if (ok) { onConnected(); } else {
        toast({ title: "WiFi connect failed", description: "Check IP and ensure printer is on same network", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "WiFi error", description: e?.message, variant: "destructive" });
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onDismiss} />
      <div className="relative w-full bg-card rounded-t-2xl px-4 pt-4 pb-8 space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Connect Printer</h2>
          </div>
          <button onClick={onDismiss} className="p-1.5 rounded-full hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          {(["bt", "wifi"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {t === "bt" ? <Bluetooth className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              {t === "bt" ? "Bluetooth" : "WiFi / LAN"}
            </button>
          ))}
        </div>

        {tab === "bt" && (
          <div className="space-y-3">
            <button
              onClick={scanBT}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-muted/50 text-sm font-medium"
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
              {scanning ? "Scanning…" : "Scan Paired Devices"}
            </button>
            {btDevices.length > 0 && (
              <div className="rounded-xl border border-border divide-y divide-border">
                {btDevices.map((d) => (
                  <div key={d.address} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{d.address}</p>
                    </div>
                    <button
                      onClick={() => connectBT(d)}
                      disabled={connecting === d.address}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                    >
                      {connecting === d.address ? "Connecting…" : "Connect"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "wifi" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <input
                type="text"
                value={lanIp}
                onChange={(e) => setLanIp(e.target.value)}
                placeholder="Printer IP (e.g. 192.168.1.100)"
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <input
                type="number"
                value={lanPort}
                onChange={(e) => setLanPort(e.target.value)}
                placeholder="Port (default 9100)"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={connectWiFi}
              disabled={connecting === "wifi"}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {connecting === "wifi" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              {connecting === "wifi" ? "Connecting…" : "Connect via WiFi"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const MobilePaymentDialog: React.FC<PaymentDialogProps> = ({
  isOpen,
  onClose,
  orderItems,
  onSuccess,
  tableNumber = "",
  orderId,
  isNonChargeable = false,
  serverName,
}) => {
  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<MobilePayStep>("confirm");

  // ── Customer state ────────────────────────────────────────────────────────
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerRecord, setCustomerRecord] = useState<CustomerRecord | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // ── Discount state ────────────────────────────────────────────────────────
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [manualDiscountPct, setManualDiscountPct] = useState(0);
  const [manualCash, setManualCash] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // ── NC state ──────────────────────────────────────────────────────────────
  const [ncReason, setNcReason] = useState("");

  // ── Split state ───────────────────────────────────────────────────────────
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");
  const [splitCard, setSplitCard] = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [loyaltyPointsAwarded, setLoyaltyPointsAwarded] = useState<number | null>(null);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [pendingPrintAfterConnect, setPendingPrintAfterConnect] = useState(false);

  const { symbol: currencySymbol } = useCurrencyContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { syncCustomerToCRM } = useCRMSync();
  const { getBillUrl } = useBillSharing();

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: restaurantInfo } = useQuery({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles").select("restaurant_id").eq("id", user.id).single();
      if (!profile?.restaurant_id) return null;
      const { data } = await supabase
        .from("restaurants").select("*").eq("id", profile.restaurant_id).single();
      return data;
    },
    enabled: isOpen,
  });

  // ── Cache restaurant info to localStorage so print always has correct name ──
  useEffect(() => {
    if (restaurantInfo?.name) {
      try {
        localStorage.setItem("cached_restaurant_name", restaurantInfo.name);
        localStorage.setItem("cached_restaurant_address", restaurantInfo.address || "");
        localStorage.setItem("cached_restaurant_phone", restaurantInfo.phone || "");
        localStorage.setItem("cached_restaurant_gstin", restaurantInfo.gstin || "");
        localStorage.setItem("cached_restaurant_upi_id", (restaurantInfo as any).upi_id || "");
      } catch {}
    }
  }, [restaurantInfo]);

  const { data: paymentSettings } = useQuery({
    queryKey: ["payment-settings", restaurantInfo?.id],
    queryFn: async () => {
      if (!restaurantInfo?.id) return null;
      const { data } = await supabase
        .from("payment_settings")
        .select("*")
        .eq("restaurant_id", restaurantInfo.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!restaurantInfo?.id,
  });

  const { data: activePromotions = [] } = useQuery({
    queryKey: ["active-promotions", restaurantInfo?.id],
    queryFn: async () => {
      if (!restaurantInfo?.id) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", restaurantInfo.id)
        .eq("is_active", true)
        .not("promotion_code", "is", null)
        .lte("start_date", today)
        .gte("end_date", today);
      return data || [];
    },
    enabled: !!restaurantInfo?.id,
  });

  // ── Loyalty program settings ──────────────────────────────────────────────
  const { data: loyaltyProgram } = useQuery({
    queryKey: ["loyalty-program", restaurantInfo?.id],
    queryFn: async () => {
      if (!restaurantInfo?.id) return null;
      const { data } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("restaurant_id", restaurantInfo.id)
        .eq("is_enabled", true)
        .maybeSingle();
      return data;
    },
    enabled: !!restaurantInfo?.id,
  });

  // ── Points to currency conversion (1 point = ₹0.10 default) ─────────────
  const pointsValue = (loyaltyProgram as any)?.redemption_value_per_point ?? 0.1;
  const loyaltyDiscount = Math.min(
    pointsToRedeem * pointsValue,
    customerRecord?.loyalty_points ? customerRecord.loyalty_points * pointsValue : 0
  );

  // ── Totals ────────────────────────────────────────────────────────────────
  const subtotal = useMemo(() =>
    orderItems.reduce((sum, item) =>
      sum + (item.calculatedPrice ?? item.price * item.quantity), 0),
    [orderItems]
  );

  const promoDiscountAmt = useMemo(() =>
    appliedPromo
      ? appliedPromo.discount_percentage
        ? (subtotal * appliedPromo.discount_percentage) / 100
        : appliedPromo.discount_amount || 0
      : 0,
    [appliedPromo, subtotal]
  );

  const { totalDiscount, total } = useMemo(
    () => calcTotal(subtotal, promoDiscountAmt, manualDiscountPct, manualCash, loyaltyDiscount),
    [subtotal, promoDiscountAmt, manualDiscountPct, manualCash, loyaltyDiscount]
  );

  const finalTotal = isNonChargeable ? 0 : total;

  // ── Build UPI QR URL ──────────────────────────────────────────────────────
  const upiQrUrl = useMemo(() => {
    const upiId = (paymentSettings as any)?.upi_id;
    if (!upiId) return null;
    const name = encodeURIComponent(restaurantInfo?.name || "Restaurant");
    const amount = finalTotal.toFixed(2);
    return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR`;
  }, [paymentSettings, restaurantInfo, finalTotal]);

  // ── Generate QR code data URL locally (replaces dead Google Charts API) ────
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  useEffect(() => {
    if (!upiQrUrl) { setQrDataUrl(""); return; }
    QRCode.toDataURL(upiQrUrl, { width: 280, margin: 2, color: { dark: "#1e1b4b", light: "#ffffff" } })
      .then((url) => setQrDataUrl(url))
      .catch((err) => { console.error("QR generation failed:", err); setQrDataUrl(""); });
  }, [upiQrUrl]);


  // ── Load existing order details ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !orderId) return;
    (async () => {
      try {
        const { data: ko } = await supabase
          .from("kitchen_orders")
          .select("order_id, customer_name, customer_phone")
          .eq("id", orderId)
          .single();

        if (ko?.customer_name && !["nc", "delivery", "takeaway", "dine-in"].includes(ko.customer_name.toLowerCase())) {
          setCustomerName(ko.customer_name);
        }
        if ((ko as any)?.customer_phone) {
          setCustomerMobile(String((ko as any).customer_phone));
        }

        if (ko?.order_id) {
          const { data: order } = await supabase
            .from("orders")
            .select("customer_name, customer_phone, discount_percentage, discount_amount, promotion_code, promotion_name")
            .eq("id", ko.order_id)
            .maybeSingle();

          if (order) {
            if ((order as any).customer_name) setCustomerName((order as any).customer_name);
            if ((order as any).customer_phone) setCustomerMobile(String((order as any).customer_phone));
            const pct = parseFloat((order as any).discount_percentage) || 0;
            setManualDiscountPct(pct);
            if ((order as any).promotion_code) {
              setPromoCode((order as any).promotion_code);
              setAppliedPromo({
                name: (order as any).promotion_name || "Applied Promotion",
                code: (order as any).promotion_code,
                promotion_code: (order as any).promotion_code,
                discount_percentage: pct,
              });
            }
          }
        }
      } catch (e) {
        console.error("MobilePaymentDialog: load order details failed", e);
      }
    })();
  }, [isOpen, orderId]);

  // ── Reset on close ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setStep("confirm");
      setCustomerName("");
      setCustomerMobile("");
      setCustomerRecord(null);
      setPromoCode("");
      setAppliedPromo(null);
      setManualDiscountPct(0);
      setManualCash(0);
      setPointsToRedeem(0);
      setNcReason("");
      setSplitCash("");
      setSplitUpi("");
      setSplitCard("");
      setIsSaving(false);
      setLoyaltyPointsAwarded(null);
      setShowPrinterModal(false);
      setPendingPrintAfterConnect(false);
    }
  }, [isOpen]);

  // ── Auto-lookup customer by phone ─────────────────────────────────────────
  const lookupCustomer = useCallback(async (phoneStr: string) => {
    if (!phoneStr) return;
    const phone = phoneStr.trim();
    if (phone.length < 10) return;
    setIsLookingUp(true);
    try {
      let query = supabase
        .from("customers")
        .select("id, name, phone, loyalty_points, loyalty_enrolled, loyalty_tier_id")
        .eq("phone", phone);
        
      if (restaurantInfo?.id) {
        query = query.eq("restaurant_id", restaurantInfo.id);
      }
      
      const { data: customer, error } = await query.maybeSingle();
      
      if (error) {
        console.error("Customer lookup query error:", error);
      }

      if (customer) {
        setCustomerRecord(customer as CustomerRecord);
        if (!customerName && customer.name) setCustomerName(customer.name);
        if (customer.loyalty_enrolled && (customer.loyalty_points ?? 0) > 0) {
          toast({
            title: `Welcome back, ${customer.name}! 🎉`,
            description: `You have ${customer.loyalty_points} loyalty points (≈ ${currencySymbol}${(customer.loyalty_points * pointsValue).toFixed(2)})`,
          });
        }
      } else {
        setCustomerRecord(null);
      }
    } catch (e) {
      console.error("Customer lookup failed:", e);
    } finally {
      setIsLookingUp(false);
    }
  }, [customerName, toast, currencySymbol, pointsValue, restaurantInfo?.id]);

  const handlePhoneBlur = useCallback(() => lookupCustomer(customerMobile), [lookupCustomer, customerMobile]);

  useEffect(() => {
    const phone = customerMobile.trim();
    if (phone.length >= 10) {
      lookupCustomer(customerMobile);
    } else if (phone.length < 10 && customerRecord) {
      // Clear customer record if they start deleting the phone number
      setCustomerRecord(null);
      setCustomerName("");
    }
  }, [customerMobile, lookupCustomer]);


  // ── Invalidate queries helper ─────────────────────────────────────────────
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["all-orders"] });
    queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
    queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
    queryClient.invalidateQueries({ queryKey: ["active-orders"] });
    queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
  }, [queryClient]);

  // ── Apply promo ───────────────────────────────────────────────────────────
  const handleApplyPromo = useCallback(async (code?: string) => {
    const codeToUse = (code ?? promoCode).trim();
    if (!codeToUse) {
      toast({ title: "Enter promo code", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("validate-promo-code", {
        body: { code: codeToUse, orderSubtotal: subtotal, restaurantId: restaurantInfo?.id },
      });
      if (error) throw error;
      if (data.valid && data.promotion) {
        setPromoCode(codeToUse);
        setAppliedPromo(data.promotion);
        toast({ title: `${data.promotion.name} applied ✓` });
      } else {
        toast({ title: "Invalid code", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Validation error", variant: "destructive" });
    }
  }, [promoCode, subtotal, restaurantInfo, toast]);

  // ── Print bill ────────────────────────────────────────────────────────────
  const isPrintingRef = useRef(false);
  
  const handlePrint = useCallback(async () => {
    if (isPrintingRef.current) return;
    
    const connected = nativePrinterBridge.getStatus().connected || thermalPrinterService.isConnected();
    if (!connected) {
      setPendingPrintAfterConnect(true);
      setShowPrinterModal(true);
      return;
    }
    
    isPrintingRef.current = true;
    setIsPrinting(true);
    try {
      // Resolve restaurant name: live query > localStorage cache > fallback
      const cachedName = localStorage.getItem("cached_restaurant_name") || "";
      const cachedAddress = localStorage.getItem("cached_restaurant_address") || "";
      const cachedPhone = localStorage.getItem("cached_restaurant_phone") || "";
      const cachedGstin = localStorage.getItem("cached_restaurant_gstin") || "";
      const cachedUpiId = localStorage.getItem("cached_restaurant_upi_id") || "";

      const rName = restaurantInfo?.name || cachedName || "Restaurant";
      const rAddress = restaurantInfo?.address || cachedAddress || undefined;
      const rPhone = restaurantInfo?.phone || cachedPhone || undefined;
      const rGstin = restaurantInfo?.gstin || cachedGstin || undefined;
      const upiId = (paymentSettings as any)?.upi_id || (restaurantInfo as any)?.upi_id || cachedUpiId || undefined;

      await thermalPrinterService.printReceipt({
        restaurantName: rName,
        address: rAddress,
        phone: rPhone,
        gstin: rGstin,
        billNumber: `#${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        tableName: tableNumber || undefined,
        customerName: customerName || undefined,
        customerMobile: customerMobile || undefined,
        serverName: serverName || undefined,
        items: orderItems,
        subtotal,
        cgst: 0,
        sgst: 0,
        discount: totalDiscount,
        netAmount: finalTotal,
        currencySymbol,
        upiId,
      });
      toast({ title: "Bill printed ✓" });
    } catch (err: any) {
      toast({ title: "Print failed", description: err?.message, variant: "destructive" });
    } finally {
      isPrintingRef.current = false;
      setIsPrinting(false);
    }
  }, [restaurantInfo, paymentSettings, tableNumber, customerName, customerMobile, serverName, orderItems, subtotal, totalDiscount, finalTotal, currencySymbol, toast]);

  // ── After printer connects inline ─────────────────────────────────────────
  const handlePrinterConnected = useCallback(async () => {
    setShowPrinterModal(false);
    toast({ title: "Printer connected ✓" });
    if (pendingPrintAfterConnect) {
      setPendingPrintAfterConnect(false);
      await handlePrint();
    }
  }, [pendingPrintAfterConnect, handlePrint, toast]);

  const handleSendWhatsApp = useCallback(async () => {
    if (!customerMobile) {
      toast({ title: "Enter customer mobile number", variant: "destructive" });
      return;
    }
    if (!restaurantInfo) {
      toast({ title: "Restaurant data loading...", description: "Please try again in a few seconds", variant: "destructive" });
      return;
    }
    setIsSendingWA(true);
    try {
      const billUrl = await getBillUrl({
        restaurantId: restaurantInfo?.id,
        restaurantName: restaurantInfo?.name || "Restaurant",
        restaurantAddress: restaurantInfo?.address,
        restaurantPhone: restaurantInfo?.phone,
        items: orderItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        subtotal,
        total: finalTotal,
        discount: totalDiscount > 0 ? totalDiscount : undefined,
        tableNumber: tableNumber || undefined,
        customerName: customerName || undefined,
        orderDate: new Date().toLocaleString("en-IN"),
        currencySymbol,
      });

      const billUrlSuffix = billUrl ? billUrl.split("/bill/").pop() ?? billUrl : undefined;
      const formattedAmount = `Rs.${finalTotal.toFixed(2)}`;
      const now = new Date();
      const formattedDate = `${now.toLocaleDateString("en-IN")} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
      const cleanPhone = customerMobile.replace(/[\+\-\s]/g, "");
      const phoneWithCountryCode = cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone;

      const igHandle = ((restaurantInfo as any)?.social_media as any)?.instagram_url?.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") || "";
      const googleReviewUrl = ((restaurantInfo as any)?.social_media as any)?.google_review_url || "";
      const contactNumber = (restaurantInfo as any)?.phone || "-";

      const { templateName, variables, buttons } = resolveInvoiceTemplate({
        customerName: customerName || "Customer",
        restaurantName: restaurantInfo?.name || "Restaurant",
        amount: formattedAmount,
        billDate: formattedDate,
        billUrlSuffix: billUrlSuffix || "pending",
        igHandle,
        googleReviewUrl,
        contactNumber,
      });

      const { data: waResp, error: waErr } = await supabase.functions.invoke("send-whatsapp-unified", {
        body: { phoneNumber: phoneWithCountryCode, restaurantId: restaurantInfo?.id, templateName, variables, buttons },
      });

      if (waErr || !waResp?.success) {
        throw new Error(waErr?.message || waResp?.error || "WhatsApp API failure. Please check API keys.");
      }
      toast({ title: "Bill sent via WhatsApp ✓" });
    } catch (err: any) {
      console.error("WhatsApp sending error:", err);
      toast({ title: "WhatsApp failed", description: err?.message || "Unknown error occurred", variant: "destructive" });
    } finally {
      setIsSendingWA(false);
    }
  }, [customerMobile, customerName, restaurantInfo, orderItems, subtotal, finalTotal, totalDiscount, tableNumber, currencySymbol, getBillUrl, toast]);

  // ── Native share sheet ────────────────────────────────────────────────────
  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) {
      toast({ title: "Share not available on this device", variant: "destructive" });
      return;
    }
    try {
      const text = [
        `*${restaurantInfo?.name || "Restaurant"} — Bill*`,
        tableNumber ? `Table: ${tableNumber}` : "",
        customerName ? `Customer: ${customerName}` : "",
        "",
        ...orderItems.map((i) => `${i.name} ×${i.quantity} — ${currencySymbol}${(i.price * i.quantity).toFixed(2)}`),
        "",
        totalDiscount > 0 ? `Discount: -${currencySymbol}${totalDiscount.toFixed(2)}` : "",
        `*Total: ${currencySymbol}${finalTotal.toFixed(2)}*`,
      ].filter(Boolean).join("\n");

      await navigator.share({ title: "Bill", text });
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Share failed", description: e?.message, variant: "destructive" });
      }
    }
  }, [restaurantInfo, tableNumber, customerName, orderItems, currencySymbol, totalDiscount, finalTotal, toast]);

  // ── Core payment processing ───────────────────────────────────────────────
  const processPayment = useCallback(async (
    paymentMethod: string,
    splitData?: Array<{ method: string; amount: number }>
  ) => {
    setIsSaving(true);
    try {
      const restaurantId = restaurantInfo?.id;
      const finalPaymentMethod = isNonChargeable ? "nc" : paymentMethod;
      const finalPaymentStatus = isNonChargeable ? "nc"
        : (paymentMethod === "pay_later" ? "pending" : "paid");

      const effectiveDiscountPct = subtotal > 0 && totalDiscount > 0
        ? Math.round((totalDiscount / subtotal) * 100) : 0;

      const discountParts: string[] = [];
      if (manualDiscountPct > 0) discountParts.push(`${manualDiscountPct}%`);
      if (manualCash > 0) discountParts.push(`₹${manualCash}`);
      if (appliedPromo) discountParts.push(appliedPromo.name || "Promo");
      if (loyaltyDiscount > 0) discountParts.push(`${pointsToRedeem} pts`);
      const discountNotes = discountParts.join(" + ");

      const { data: { user } } = await supabase.auth.getUser();

      if (orderId) {
        // First try: treat orderId as a kitchen_orders.id
        const { data: ko } = await supabase
          .from("kitchen_orders")
          .select("order_id")
          .eq("id", orderId)
          .maybeSingle();

        // orderId may be kitchen_orders.id (POS/QSR) OR orders.id (Orders Management).
        // Use the linked order_id when available; otherwise treat orderId as orders.id.
        const targetOrderId = ko?.order_id ?? orderId;

        // Only update kitchen_order status if it actually IS a kitchen_orders row
        if (ko) {
          await supabase.from("kitchen_orders").update({
            status: "completed",
            ...(customerName.trim() && { customer_name: customerName.trim() }),
            ...(customerMobile && { customer_phone: customerMobile }),
          }).eq("id", orderId);
        }

        if (targetOrderId) {
          await supabase.from("orders").update({
            payment_status: finalPaymentStatus,
            payment_method: finalPaymentMethod,
            status: "completed",
            total: finalTotal,
            discount_amount: isNonChargeable ? subtotal : totalDiscount,
            discount_percentage: isNonChargeable ? 100 : effectiveDiscountPct,
            promotion_code: isNonChargeable ? null : (appliedPromo?.promotion_code || appliedPromo?.code || null),
            promotion_name: isNonChargeable ? null : (appliedPromo?.name || null),
            ...(discountNotes && { discount_notes: isNonChargeable ? "Non-Chargeable (100% off)" : discountNotes }),
            ...(isNonChargeable && ncReason && { nc_reason: ncReason }),
            ...(splitData && { split_payments: splitData }),
            ...(customerName.trim() && { customer_name: customerName.trim() }),
            ...(customerMobile && { customer_phone: customerMobile }),
          }).eq("id", targetOrderId);
        }

        // Log transaction
        if (!isNonChargeable) {
          await supabase.from("pos_transactions").insert({
            restaurant_id: restaurantId,
            order_id: targetOrderId || null,
            kitchen_order_id: ko ? orderId : null,
            amount: finalTotal,
            payment_method: finalPaymentMethod,
            status: finalPaymentMethod === "pay_later" ? "pending" : "completed",
            customer_name: customerName || null,
            customer_phone: customerMobile || null,
            staff_id: user?.id || null,
            discount_amount: totalDiscount,
            promotion_id: appliedPromo?.id || null,
            ...(splitData && { split_payments: splitData }),
          }).then(() => {}, console.error);
        }

        // Log promo usage
        if (appliedPromo && restaurantId) {
          await supabase.functions.invoke("log-promotion-usage", {
            body: {
              orderId,
              promotionId: appliedPromo.id,
              restaurantId,
              customerName: customerName || "Walk-in Customer",
              customerPhone: customerMobile || null,
              orderTotal: finalTotal,
              discountAmount: promoDiscountAmt,
            },
          }).catch(console.error);
        }
      }

      // ── CRM sync (earn points) ───────────────────────────────────────────
      if (customerName.trim()) {
        const pts = await syncCustomerToCRM({
          customerName: customerName.trim(),
          customerPhone: customerMobile || undefined,
          orderTotal: finalTotal,
          orderId: orderId || undefined,
          source: tableNumber ? "pos" : "qsr",
        }).catch(() => null);
        if ((pts as any)?.pointsAwarded) setLoyaltyPointsAwarded((pts as any).pointsAwarded);
      }

      // ── Loyalty redemption: insert loyalty_transactions redeem row ────────
      if (pointsToRedeem > 0 && customerRecord?.id && restaurantInfo?.id) {
        await supabase.from("loyalty_transactions").insert({
          customer_id: customerRecord.id,
          restaurant_id: restaurantInfo.id,
          transaction_type: "redeem",
          points: -pointsToRedeem,
          order_id: orderId || null,
          notes: `Redeemed at checkout — ${currencySymbol}${loyaltyDiscount.toFixed(2)} off`,
        });

        // Update customer's loyalty_points balance in DB
        await supabase
          .from("customers")
          .update({ loyalty_points: (customerRecord.loyalty_points || 0) - pointsToRedeem })
          .eq("id", customerRecord.id);
      }

      invalidateQueries();
      setStep("success");

      // Auto-close after 5s
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 5000);
    } catch (err: any) {
      console.error("MobilePaymentDialog: payment processing failed", err);
      toast({ title: "Payment failed", description: err?.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [
    restaurantInfo, orderId, isNonChargeable, customerName, customerMobile, customerRecord,
    subtotal, totalDiscount, finalTotal, manualDiscountPct, manualCash,
    appliedPromo, promoDiscountAmt, ncReason, tableNumber, pointsToRedeem, loyaltyDiscount,
    currencySymbol, syncCustomerToCRM, invalidateQueries, onSuccess, onClose, toast,
  ]);

  // ── Split payment ─────────────────────────────────────────────────────────
  const handleSplitPay = useCallback(async () => {
    const cash = parseFloat(splitCash) || 0;
    const upi = parseFloat(splitUpi) || 0;
    const card = parseFloat(splitCard) || 0;
    const splitSum = cash + upi + card;

    if (Math.abs(splitSum - finalTotal) > 1) {
      toast({
        title: "Split amounts don't match",
        description: `Total ${currencySymbol}${finalTotal.toFixed(2)} ≠ Split ${currencySymbol}${splitSum.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    const splitData = [
      ...(cash > 0 ? [{ method: "cash", amount: cash }] : []),
      ...(upi > 0 ? [{ method: "upi", amount: upi }] : []),
      ...(card > 0 ? [{ method: "card", amount: card }] : []),
    ];
    await processPayment("split", splitData);
  }, [splitCash, splitUpi, splitCard, finalTotal, currencySymbol, processPayment, toast]);

  if (!isOpen) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Outer Solid Wrapper - z-[9999] and solid color inline style to guarantee it blocks the background */}
      <div 
        className="fixed inset-0 z-[9999] flex flex-col overflow-hidden" 
        style={{ backgroundColor: '#f8fafc' }}
      >
        
        {/* ─── CONFIRM STEP ──────────────────────────────────────────────── */}
        {step === "confirm" && (
          <>
            {/* Header - Solid */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
              <h1 className="text-base font-medium text-slate-900 dark:text-white">
                {tableNumber ? (tableNumber.toLowerCase().includes("table") ? tableNumber : `Table ${tableNumber}`) : "Checkout"}
              </h1>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors">
                <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-5" style={{ backgroundColor: '#f8fafc' }}>
              
              {/* Order Summary - Solid Card */}
              <div className="mb-4 relative z-10 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-md overflow-hidden">
                <div className="px-4 py-3 bg-blue-100/50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-900/40">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 tracking-wider uppercase">Order Summary</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orderItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 ml-3">
                        {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Details - Solid Card */}
              <div className="mb-4 relative z-10 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">Customer Details</p>
                  {isLookingUp && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/65 dark:border-slate-800 px-3.5 py-2.5 rounded-xl">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name (Optional)"
                    className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/65 dark:border-slate-800 px-3.5 py-2.5 rounded-xl">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    onBlur={handlePhoneBlur}
                    placeholder="Mobile number (auto-lookup)"
                    className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none"
                    inputMode="numeric"
                  />
                </div>

                {/* Customer loyalty badge */}
                {customerRecord && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 px-3.5 py-2.5 mt-2">
                    <Star className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-indigo-900 dark:text-indigo-300 truncate">Customer: {customerRecord.name}</p>
                      {customerRecord.loyalty_enrolled && (
                        <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mt-0.5">{customerRecord.loyalty_points} pts available (≈ {currencySymbol}{(customerRecord.loyalty_points * pointsValue).toFixed(2)})</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Loyalty Redemption */}
              {customerRecord?.loyalty_enrolled && (customerRecord.loyalty_points ?? 0) > 0 && (
                <div className="mb-4 relative z-10 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/10 shadow-md overflow-hidden">
                  <div className="px-4 py-2.5 bg-amber-100/50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
                      <Gift className="h-4 w-4" />
                      Redeem Loyalty
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-900 dark:text-amber-300">{customerRecord.loyalty_points} pts available</p>
                        <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-500 mt-0.5">Value: {currencySymbol}{(customerRecord.loyalty_points * pointsValue).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          value={pointsToRedeem || ""}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(customerRecord.loyalty_points, parseInt(e.target.value) || 0));
                            setPointsToRedeem(val);
                          }}
                          placeholder="0"
                          min={0}
                          max={customerRecord.loyalty_points}
                          className="w-20 text-center rounded-xl border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm font-medium text-amber-950 dark:text-amber-100 outline-none"
                          inputMode="numeric"
                        />
                        <p className="text-xs font-semibold text-amber-800">pts</p>
                      </div>
                    </div>
                    {loyaltyDiscount > 0 && (
                      <div className="pt-2 border-t border-amber-200/50">
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                          <span>Discount Applied</span>
                          <span>-{currencySymbol}{loyaltyDiscount.toFixed(2)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Discounts & Promos - Solid Card */}
              <div className="mb-4 relative z-10 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 shadow-md p-4 flex flex-col gap-4">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-500 tracking-wider uppercase">Discounts & Promos</p>
                
                {/* Promo code input */}
                <div className="flex gap-2 w-full">
                  <div className="flex items-center gap-2 flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2">
                    <Tag className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Promo code"
                      className="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none uppercase"
                    />
                  </div>
                  <button
                    onClick={() => handleApplyPromo()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium shadow hover:bg-indigo-700 active:scale-95 transition-all shrink-0"
                  >
                    Apply
                  </button>
                </div>

                {/* Quick-select promotions */}
                {activePromotions.length > 0 && !appliedPromo && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {activePromotions.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => { setPromoCode(p.promotion_code); handleApplyPromo(p.promotion_code); }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-indigo-150 bg-indigo-50/50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {appliedPromo && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/30 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400 truncate">{appliedPromo.name}</p>
                      <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                        {appliedPromo.discount_percentage ? `${appliedPromo.discount_percentage}% off` : `${currencySymbol}${appliedPromo.discount_amount} off`}
                      </p>
                    </div>
                    <button onClick={() => { setAppliedPromo(null); setPromoCode(""); }} className="text-[10px] font-medium text-rose-600 px-2 py-1 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors shrink-0">Remove</button>
                  </div>
                )}

                {/* Manual discounts fields */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500 pl-0.5">Discount %</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={manualDiscountPct || ""}
                        onChange={(e) => setManualDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        placeholder="0"
                        min={0} max={100}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-3 pr-8 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none"
                        inputMode="decimal"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500 pl-0.5">Cash Off</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">{currencySymbol}</span>
                      <input
                        type="number"
                        value={manualCash || ""}
                        onChange={(e) => setManualCash(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        min={0}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 pl-6 pr-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none"
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* NC reason */}
              {isNonChargeable && (
                <div className="rounded-2xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-2">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Non-Chargeable Order
                  </p>
                  <input
                    type="text"
                    value={ncReason}
                    onChange={(e) => setNcReason(e.target.value)}
                    placeholder="Enter reason for NC (optional)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-orange-400"
                  />
                </div>
              )}

              {/* Bill summary - Solid Dark Card */}
              <div className="mb-4 relative z-10 rounded-2xl bg-slate-900 dark:bg-slate-900 p-5 flex flex-col gap-2.5 shadow-lg border border-slate-800">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-xs font-medium text-emerald-400">
                    <span>Discount</span>
                    <span>-{currencySymbol}{totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-xs font-medium text-amber-400">
                    <span>Loyalty Redeem</span>
                    <span>-{currencySymbol}{loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="h-px bg-slate-800 my-2" />
                <div className="flex justify-between items-end text-white">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{isNonChargeable ? "Amount (NC)" : "Total Amount"}</span>
                  <span className="text-3xl font-bold leading-none">{currencySymbol}{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action bar - Solid Footer */}
            <div className="px-4 pt-3.5 pb-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-md z-10">
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  {isPrinting ? "Printing..." : "Print Bill"}
                </button>

                {customerMobile && (
                  <button
                    onClick={handleSendWhatsApp}
                    disabled={isSendingWA}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-emerald-250 bg-emerald-50 dark:bg-emerald-950/20 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {isSendingWA ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    {isSendingWA ? "Sending..." : "WhatsApp"}
                  </button>
                )}
              </div>

              <button
                onClick={() => setStep("method")}
                className="w-full flex items-center justify-center gap-1.5 py-4 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-md hover:bg-indigo-700 transition-all active:scale-[0.99]"
              >
                Collect Payment <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {/* ─── PAYMENT METHOD STEP ───────────────────────────────────────── */}
        {step === "method" && (
          <>
            {/* Header - Solid */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
              <button onClick={() => setStep("confirm")} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors active:scale-95">
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div className="flex-1">
                <h1 className="text-base font-medium text-slate-900 dark:text-white">Payment Method</h1>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{currencySymbol}{finalTotal.toFixed(2)} to collect</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
              {[
                { id: "cash", icon: Wallet, label: "Cash", desc: "Receive physical cash", bg: "bg-emerald-500/10 dark:bg-emerald-500/20", iconColor: "text-emerald-600 dark:text-emerald-400" },
                { id: "card", icon: CreditCard, label: "Card / POS", desc: "Debit, credit, swipe", bg: "bg-blue-500/10 dark:bg-blue-500/20", iconColor: "text-blue-600 dark:text-blue-400" },
                { id: "upi", icon: QrCode, label: "UPI / QR", desc: "GPay, PhonePe, Paytm", bg: "bg-violet-500/10 dark:bg-violet-500/20", iconColor: "text-violet-600 dark:text-violet-400" },
                { id: "split", icon: Split, label: "Split Payment", desc: "Multiple methods", bg: "bg-amber-500/10 dark:bg-amber-500/20", iconColor: "text-amber-600 dark:text-amber-400" },
                { id: "pay_later", icon: Clock, label: "Pay Later", desc: "Customer name required", bg: "bg-rose-500/10 dark:bg-rose-500/20", iconColor: "text-rose-600 dark:text-rose-400" },
              ].map(({ id, icon: Icon, label, desc, bg, iconColor }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id === "split") {
                      setSplitCash(""); setSplitUpi(""); setSplitCard("");
                      setStep("split");
                    } else if (id === "upi") {
                      setStep("qr");
                    } else if (id === "pay_later" && !customerName.trim()) {
                      toast({ title: "Customer name required", description: "Enter customer name before choosing Pay Later", variant: "destructive" });
                    } else {
                      processPayment(id);
                    }
                  }}
                  disabled={isSaving}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              ))}

              {isNonChargeable && (
                <button
                  onClick={() => processPayment("nc")}
                  disabled={isSaving}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-orange-200 dark:border-orange-900 bg-white dark:bg-slate-900 shadow-sm hover:bg-orange-50 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <div className="h-11 w-11 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <X className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Non-Chargeable</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Mark as NC — no payment collected</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
          </>
        )}

        {/* ─── UPI QR STEP ───────────────────────────────────────────────── */}
        {step === "qr" && (
          <>
            {/* Header - Solid */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
              <button onClick={() => setStep("method")} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors active:scale-95">
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div className="flex-1">
                <h1 className="text-base font-medium text-slate-900 dark:text-white">UPI / QR Payment</h1>
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400">{currencySymbol}{finalTotal.toFixed(2)} to collect</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
              {qrDataUrl ? (
                <>
                  {/* QR Card - Solid */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-5 shadow-sm text-center">
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 inline-block border border-slate-100 dark:border-slate-850">
                      <img
                        src={qrDataUrl}
                        alt="UPI QR Code"
                        width={250}
                        height={250}
                        className="block rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Amount & UPI ID */}
                  <div className="text-center space-y-2">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{currencySymbol}{finalTotal.toFixed(2)}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Scan with any UPI app</p>
                    {(paymentSettings as any)?.upi_id && (
                      <p className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl inline-block border border-indigo-100/50">{(paymentSettings as any).upi_id}</p>
                    )}
                  </div>
                </>
              ) : upiQrUrl ? (
                /* QR Generating - Solid */
                <div className="flex flex-col items-center gap-3">
                  <div className="h-48 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  </div>
                  <p className="text-xs font-medium text-slate-500">Generating QR code...</p>
                </div>
              ) : (
                /* No UPI Configured - Solid */
                <div className="rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm p-6 text-center space-y-3.5 max-w-xs">
                  <div className="h-14 w-14 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
                    <AlertCircle className="h-7 w-7 text-orange-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">No UPI ID configured</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">Add your UPI ID in Settings → Payment Settings to show a QR code here.</p>
                </div>
              )}
            </div>

            {/* Bottom confirm bar - Solid */}
            <div className="px-4 pt-3.5 pb-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
              <button
                onClick={() => processPayment("upi")}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-md hover:bg-indigo-700 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isSaving ? "Processing..." : "Customer Has Paid — Confirm"}
              </button>
            </div>
          </>
        )}

        {/* ─── SPLIT PAYMENT STEP ────────────────────────────────────────── */}
        {step === "split" && (
          <>
            {/* Header - Solid */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
              <button onClick={() => setStep("method")} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors active:scale-95">
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
              <div>
                <h1 className="text-base font-medium text-slate-900 dark:text-white">Split Payment</h1>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Total: {currencySymbol}{finalTotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
              {[
                { label: "Cash", state: splitCash, setter: setSplitCash, icon: Wallet, iconColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
                { label: "UPI", state: splitUpi, setter: setSplitUpi, icon: QrCode, iconColor: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
                { label: "Card", state: splitCard, setter: setSplitCard, icon: CreditCard, iconColor: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
              ].map(({ label, state, setter, icon: Icon, iconColor, bg }) => (
                <div key={label} className="flex items-center gap-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm px-4 py-3.5">
                  <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 w-12">{label}</p>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-400 shrink-0">{currencySymbol}</span>
                    <input
                      type="number"
                      value={state}
                      onChange={(e) => setter(e.target.value)}
                      placeholder="0.00"
                      min={0}
                      className="w-full min-w-0 flex-1 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 outline-none text-right placeholder:text-slate-400 border border-slate-200 dark:border-slate-700"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              ))}

              {/* Running total - Solid Dark Card */}
              <div className="rounded-2xl bg-slate-900 dark:bg-slate-900 p-5 space-y-2.5 shadow-md border border-slate-850">
                <div className="flex justify-between text-xs font-semibold text-slate-350">
                  <span>Split total</span>
                  <span className={`${Math.abs((parseFloat(splitCash)||0)+(parseFloat(splitUpi)||0)+(parseFloat(splitCard)||0) - finalTotal) < 0.01 ? "text-emerald-400" : "text-white"}`}>
                    {currencySymbol}{((parseFloat(splitCash)||0)+(parseFloat(splitUpi)||0)+(parseFloat(splitCard)||0)).toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-slate-800 my-2" />
                <div className="flex justify-between text-xs font-medium text-slate-400">
                  <span>Remaining</span>
                  <span className="font-bold text-white text-base">
                    {currencySymbol}{Math.max(0, finalTotal - (parseFloat(splitCash)||0) - (parseFloat(splitUpi)||0) - (parseFloat(splitCard)||0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom confirm bar - Solid */}
            <div className="px-4 pt-3.5 pb-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10">
              <button
                onClick={handleSplitPay}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-md hover:bg-indigo-700 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {isSaving ? "Processing..." : "Confirm Split Payment"}
              </button>
            </div>
          </>
        )}

        {/* ─── SUCCESS STEP ──────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              </div>
            </div>

            {/* Payment info */}
            <div className="space-y-1.5">
              <h1 className="text-xl font-medium text-slate-900 dark:text-white tracking-tight">Payment Received!</h1>
              <p className="text-base font-medium text-indigo-600 dark:text-indigo-400">{currencySymbol}{finalTotal.toFixed(2)} collected</p>
              {loyaltyPointsAwarded && loyaltyPointsAwarded > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-150">
                  <Star className="h-3.5 w-3.5 text-indigo-500" />
                  <p className="text-[11px] font-medium text-indigo-600">+{loyaltyPointsAwarded} loyalty points awarded 🎉</p>
                </div>
              )}
              {pointsToRedeem > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-55 border border-amber-100">
                  <Gift className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{pointsToRedeem} pts redeemed</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 w-full flex-wrap">
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900  text-sm font-medium text-slate-700 dark:text-slate-300 shadow-lg hover:bg-white dark:hover:bg-slate-800 active:scale-[0.97] transition-all min-w-[100px] disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? "Printing..." : "Print"}
              </button>
              {customerMobile && (
                <button
                  onClick={handleSendWhatsApp}
                  disabled={isSendingWA}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-900  text-sm font-medium text-emerald-700 dark:text-emerald-400 shadow-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-[0.97] transition-all min-w-[100px] disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  {isSendingWA ? "Sending..." : "WhatsApp"}
                </button>
              )}
              {typeof navigator !== "undefined" && !!navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900  text-sm font-medium text-slate-700 dark:text-slate-300 shadow-lg hover:bg-white dark:hover:bg-slate-800 active:scale-[0.97] transition-all min-w-[100px]"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              )}
            </div>

            <button
              onClick={() => { onSuccess(); onClose(); }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-base font-bold shadow-xl shadow-indigo-600/30 dark:shadow-none hover:shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              Back to POS
            </button>
          </div>
        )}
      </div>

      {/* ─── INLINE PRINTER QUICK-CONNECT MODAL ────────────────────────── */}
      {showPrinterModal && (
        <PrinterQuickConnectModal
          onConnected={handlePrinterConnected}
          onDismiss={() => { setShowPrinterModal(false); setPendingPrintAfterConnect(false); }}
        />
      )}
    </>
  );
};

export default MobilePaymentDialog;
