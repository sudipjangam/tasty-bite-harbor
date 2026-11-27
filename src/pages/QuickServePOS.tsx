import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQSRMenuItems, QSRMenuItem } from "@/hooks/useQSRMenuItems";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import { QSMenuGrid } from "@/components/QuickServe/QSMenuGrid";
import {
  QSOrderPanel,
  QSOrderItem,
  AppliedCoupon,
} from "@/components/QuickServe/QSOrderPanel";
import { QSCustomerInput, LoyaltyCustomerInfo } from "@/components/QuickServe/QSCustomerInput";
import { QSPaymentSheet } from "@/components/QuickServe/QSPaymentSheet";
import {
  QSOrderHistory,
  RecalledOrderItem,
} from "@/components/QuickServe/QSOrderHistory";
import { formatOrderItemString } from "@/lib/order-utils";
import { QSActiveOrders } from "@/components/QuickServe/QSActiveOrders";
import { QSCustomItemDialog } from "@/components/QuickServe/QSCustomItemDialog";
import { QSHeldOrdersDrawer } from "@/components/QuickServe/QSHeldOrdersDrawer";
import { useHeldOrders } from "@/hooks/useHeldOrders";
import { useAuth } from "@/hooks/useAuth";
import { useCRMSync } from "@/hooks/useCRMSync";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import { useToast } from "@/hooks/use-toast";
import {
  commitLocalOrderAndWritesAtomic,
  getLocalOrder,
  getLocalOrdersByRestaurant,
  LOCAL_ORDERS_EVENT,
  saveLocalOrder,
  SYNC_COMPLETED_EVENT,
} from "@/utils/offlineDB";
import {
  allocateOfflineQuickServeToken,
  enqueueWrite,
  recordQuickServeOrderNumber,
} from "@/utils/syncManager";
import { thermalPrinterService } from "@/services/thermalPrinterService";
import { nativePrinterBridge } from "@/services/nativePrinterBridge";
import { QSRPrinterDialog } from "@/components/QSR/QSRPrinterDialog";
import {
  History,
  ShoppingBag,
  ChefHat,
  FileText,
  TrendingUp,
  Hash,
  Zap,
  PauseCircle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DailySummaryDialog } from "@/components/QuickServe/DailySummaryDialog";
import HelpProvider from "@/components/Help/HelpProvider";

const QuickServePOS: React.FC = () => {
  const { restaurantName } = useRestaurantId();
  const [orderItems, setOrderItems] = useState<QSOrderItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showActiveOrders, setShowActiveOrders] = useState(false);
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<LoyaltyCustomerInfo | null>(null);
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);
  const [loyaltyDiscountAmount, setLoyaltyDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponDiscountAmount, setCouponDiscountAmount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [sendingToKitchen, setSendingToKitchen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderNumber, setEditingOrderNumber] = useState<number | null>(null);
  const [editingOrderItems, setEditingOrderItems] = useState<QSOrderItem[]>([]);
  const [editingOrderCompletionStatus, setEditingOrderCompletionStatus] = useState<boolean[]>([]);
  const [editingOrderPaidAmount, setEditingOrderPaidAmount] = useState<number>(0);
  const pendingKitchenSubmitRef = useRef<{
    fingerprint: string;
    orderId: string;
    kitchenOrderId: string;
    orderNumber: number;
  } | null>(null);
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const { user, isRole } = useAuth();
  const canViewRevenue = Boolean(
    user?.role_has_full_access ||
      (typeof isRole === "function" &&
        (isRole("admin") || isRole("manager") || isRole("owner"))),
  );
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [isPrinterConnected, setIsPrinterConnected] = useState(
    () => nativePrinterBridge.isConnected() || thermalPrinterService.isConnected(),
  );

  const isOfflineNow = useCallback(
    () => !isOnline || (typeof navigator !== "undefined" && !navigator.onLine),
    [isOnline],
  );

  // Printer auto-reconnect & live status tracking
  useEffect(() => {
    const refreshStatus = () => {
      setIsPrinterConnected(
        nativePrinterBridge.isConnected() || thermalPrinterService.isConnected(),
      );
    };
    const unsubWeb = thermalPrinterService.onConnectionChange(refreshStatus);
    const unsubNative = nativePrinterBridge.onStatusChange(refreshStatus);
    thermalPrinterService.tryAutoReconnect().then(refreshStatus).catch(() => {});
    return () => {
      unsubWeb();
      unsubNative();
    };
  }, []);

  // Refresh QuickServe queries when offline orders change or sync completes
  useEffect(() => {
    const refreshQuickServe = () => {
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-order-history"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });
      queryClient.invalidateQueries({ queryKey: ["daily-summary-data", restaurantId] });
    };
    window.addEventListener(LOCAL_ORDERS_EVENT, refreshQuickServe);
    window.addEventListener(SYNC_COMPLETED_EVENT, refreshQuickServe);
    return () => {
      window.removeEventListener(LOCAL_ORDERS_EVENT, refreshQuickServe);
      window.removeEventListener(SYNC_COMPLETED_EVENT, refreshQuickServe);
    };
  }, [queryClient]);

  // Revoke daily summary view immediately if revenue access is lost
  useEffect(() => {
    if (!canViewRevenue && showDailySummary) {
      setShowDailySummary(false);
    }
  }, [canViewRevenue, showDailySummary]);
  const { syncCustomerToCRM } = useCRMSync();
  const { heldOrders, heldCount, holdOrder, resumeOrder, deleteHeldOrder } = useHeldOrders();

  // Fetch loyalty program settings for redemption cap and point value (cached offline)
  const { data: loyaltyProgram } = useQuery({
    queryKey: ["loyalty-program-qs", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return null;
      const cacheKey = `qs_loyalty_program_${restaurantId}`;
      const loadCached = () => {
        try {
          const raw = localStorage.getItem(cacheKey);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      };
      if (isOfflineNow()) return loadCached();
      try {
        const { data, error } = await supabase
          .from("loyalty_programs")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .maybeSingle();
        if (error && error.code !== "PGRST116") {
          console.error("Loyalty program fetch error:", error);
          return loadCached();
        }
        try {
          if (data) localStorage.setItem(cacheKey, JSON.stringify(data));
          else localStorage.removeItem(cacheKey);
        } catch {
          /* ignore */
        }
        return data;
      } catch {
        return loadCached();
      }
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 30,
  });

  // Fetch active coupons (cached offline)
  const { data: availableCoupons = [] } = useQuery({
    queryKey: ["active-coupons", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return [];
      const cacheKey = `qs_coupons_${restaurantId}`;
      const loadCached = () => {
        try {
          const raw = localStorage.getItem(cacheKey);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      };
      if (isOfflineNow()) return loadCached();
      const today = new Date().toISOString();
      try {
        const { data, error } = await supabase
          .from("promotion_campaigns")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .lte("start_date", today)
          .gte("end_date", today);

        if (error) {
          console.error("Failed to fetch coupons:", error);
          return loadCached();
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data || []));
        } catch {
          /* ignore */
        }
        return data || [];
      } catch {
        return loadCached();
      }
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });

  const handleCustomerFound = useCallback((customer: LoyaltyCustomerInfo | null) => {
    setLoyaltyCustomer(customer);
    setLoyaltyPointsUsed(0);
    setLoyaltyDiscountAmount(0);
  }, []);

  // Menu data
  const {
    menuItems,
    categories,
    isLoading: menuLoading,
    soldOutCount,
    toggleAvailability,
    restoreAllItems,
    isToggling,
    isRestoring,
  } = useQSRMenuItems();

  // Today's revenue — counts all chargeable orders (pending + paid), excludes NC + merges offline edits by order ID
  const { data: todaysRevenue = 0 } = useQuery({
    queryKey: ["quickserve-todays-revenue", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId || !canViewRevenue) return 0;
      const today = new Date();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);
      const ymd = dayStart.toISOString().slice(0, 10);
      const cacheKey = `qs_todays_revenue_${restaurantId}_${ymd}`;

      const localOrders = (await getLocalOrdersByRestaurant(restaurantId)).filter(
        (lo) => {
          const src = (lo.source || "").toLowerCase();
          if (src && src !== "quickserve" && src !== "pos") return false;
          const ts = new Date(lo.createdAt).getTime();
          return ts >= dayStart.getTime() && ts <= dayEnd.getTime();
        },
      );

      const computeMergedRevenue = (
        serverRows: Array<{ id: string; total: number }>,
        serverSucceeded: boolean,
      ) => {
        const totalsById = new Map<string, number>();
        for (const r of serverRows) {
          totalsById.set(r.id, Number(r.total) || 0);
        }
        for (const lo of localOrders) {
          const targetId = lo.orderId || lo.id;
          if (
            lo.status === "deleted" ||
            lo.status === "held" ||
            lo.status === "new" ||
            lo.orderType === "nc" ||
            lo.paymentStatus === "nc"
          ) {
            totalsById.delete(targetId);
            totalsById.delete(lo.id);
            continue;
          }
          if (serverSucceeded && lo.synced === true) continue;
          totalsById.set(targetId, Number(lo.total) || 0);
        }
        let sum = 0;
        totalsById.forEach((v) => {
          sum += v;
        });
        return sum;
      };

      const readCachedRevenue = () => {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (!raw) return computeMergedRevenue([], false);
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.rows)) {
            return computeMergedRevenue(parsed.rows, false);
          }
          const scalar = Number(parsed) || 0;
          const fallbackLocal = localOrders
            .filter(
              (lo) =>
                lo.status !== "deleted" &&
                lo.status !== "held" &&
                lo.status !== "new" &&
                lo.orderType !== "nc" &&
                lo.paymentStatus !== "nc",
            )
            .reduce((s, lo) => s + (Number(lo.total) || 0), 0);
          return scalar + fallbackLocal;
        } catch {
          return 0;
        }
      };

      if (isOfflineNow()) {
        return readCachedRevenue();
      }

      try {
        const PAGE_SIZE = 1000;
        const allRows: Array<{ id: string; total: number }> = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("orders")
            .select("id, total")
            .eq("restaurant_id", restaurantId)
            .in("source", ["quickserve", "pos"])
            .in("status", ["preparing", "ready", "served", "completed"])
            .or("payment_status.is.null,payment_status.neq.nc")
            .or("order_type.is.null,order_type.neq.non-chargeable")
            .gte("created_at", dayStart.toISOString())
            .lte("created_at", dayEnd.toISOString())
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          const batch = (data || []) as Array<{ id: string; total: number }>;
          allRows.push(...batch);
          if (batch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        const serverRevenue = allRows.reduce(
          (sum, o) => sum + (Number(o.total) || 0),
          0,
        );
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ total: serverRevenue, rows: allRows }),
          );
        } catch {
          /* ignore */
        }
        return computeMergedRevenue(allRows, true);
      } catch {
        return readCachedRevenue();
      }
    },
    enabled: !!restaurantId && canViewRevenue,
    refetchInterval: 120000,
  });

  // Today's order count — counts all non-NC orders processed today (online + offline)
  const { data: todaysOrderCount = 0 } = useQuery({
    queryKey: ["quickserve-todays-count", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return 0;
      const today = new Date();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);
      const ymd = dayStart.toISOString().slice(0, 10);
      const cacheKey = `qs_todays_count_${restaurantId}_${ymd}`;

      const localOrders = (await getLocalOrdersByRestaurant(restaurantId)).filter(
        (lo) => {
          const src = (lo.source || "").toLowerCase();
          if (src && src !== "quickserve" && src !== "pos") return false;
          const ts = new Date(lo.createdAt).getTime();
          return ts >= dayStart.getTime() && ts <= dayEnd.getTime();
        },
      );

      const computeMergedCount = (
        serverRows: Array<{ id: string; order_number?: number | null }>,
        serverSucceeded: boolean,
      ) => {
        const ids = new Set<string>(serverRows.map((r) => r.id));
        for (const lo of localOrders) {
          const targetId = lo.orderId || lo.id;
          if (
            lo.status === "deleted" ||
            lo.status === "held" ||
            lo.status === "new" ||
            lo.orderType === "nc" ||
            lo.paymentStatus === "nc"
          ) {
            ids.delete(targetId);
            ids.delete(lo.id);
            continue;
          }
          if (serverSucceeded && lo.synced === true) continue;
          ids.add(targetId);
        }
        return ids.size;
      };

      const readCachedCount = () => {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (!raw) return computeMergedCount([], false);
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.rows)) {
            return computeMergedCount(parsed.rows, false);
          }
          const scalar = Number(parsed) || 0;
          const activeLocal = localOrders.filter(
            (lo) =>
              lo.status !== "deleted" &&
              lo.status !== "held" &&
              lo.status !== "new" &&
              lo.orderType !== "nc" &&
              lo.paymentStatus !== "nc",
          ).length;
          return scalar + activeLocal;
        } catch {
          return 0;
        }
      };

      if (isOfflineNow()) {
        return readCachedCount();
      }

      try {
        const PAGE_SIZE = 1000;
        const serverRows: Array<{ id: string; order_number?: number | null }> = [];
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("orders")
            .select("id, order_number")
            .eq("restaurant_id", restaurantId)
            .in("source", ["quickserve", "pos"])
            .in("status", ["preparing", "ready", "served", "completed"])
            .or("payment_status.is.null,payment_status.neq.nc")
            .gte("created_at", dayStart.toISOString())
            .lte("created_at", dayEnd.toISOString())
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          const batch = (data || []) as Array<{ id: string; order_number?: number | null }>;
          serverRows.push(...batch);
          if (batch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        const maxNum = serverRows.reduce(
          (m: number, r: any) => Math.max(m, Number(r.order_number) || 0),
          0,
        );
        if (maxNum > 0) recordQuickServeOrderNumber(restaurantId, maxNum);
        const serverCount = serverRows.length;
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ count: serverCount, rows: serverRows }),
          );
        } catch {
          /* ignore */
        }
        return computeMergedCount(serverRows, true);
      } catch {
        return readCachedCount();
      }
    },
    enabled: !!restaurantId,
    refetchInterval: 120000,
  });

  // Cart counts for menu badges
  const cartItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orderItems.forEach((item) => {
      if (!item.isCustom) {
        counts[item.menuItemId] =
          (counts[item.menuItemId] || 0) + item.quantity;
      }
    });
    return counts;
  }, [orderItems]);

  // Add item to order
  const handleAddItem = useCallback((menuItem: QSRMenuItem) => {
    setOrderItems((prev) => {
      const existing = prev.find(
        (item) => item.menuItemId === menuItem.id && !item.isCustom,
      );
      if (existing) {
        return prev.map((item) =>
          item.menuItemId === menuItem.id && !item.isCustom
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          isCustom: false,
        },
      ];
    });
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  const handleIncrement = useCallback((id: string) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }, []);

  const handleDecrement = useCallback((id: string) => {
    setOrderItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const handleRemove = useCallback((id: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddNote = useCallback((id: string, note: string) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: note } : item)),
    );
  }, []);

  const handleSetItemPriority = useCallback((id: string, priority: 'first' | 'normal' | 'last') => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, priority } : item)),
    );
  }, []);

  const handleClear = useCallback(() => {
    setOrderItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setEditingOrderId(null);
    setEditingOrderNumber(null);
    setEditingOrderItems([]);
    setEditingOrderCompletionStatus([]);
    setEditingOrderPaidAmount(0);
    toast({
      title: "Order Cleared",
      description: "All items removed",
      duration: 1500,
    });
  }, [toast]);

  const handlePaymentSuccess = useCallback(() => {
    setOrderItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setShowPayment(false);
    setShowMobileCart(false);
    setDiscountAmount(0);
    setDiscountPercentage(0);
    setLoyaltyCustomer(null);
    setLoyaltyPointsUsed(0);
    setLoyaltyDiscountAmount(0);
    setAppliedCoupon(null);
    setCouponDiscountAmount(0);
    setCouponError(null);
    // Clear edit mode state
    setEditingOrderId(null);
    setEditingOrderNumber(null);
    setEditingOrderItems([]);
    setEditingOrderCompletionStatus([]);
    setEditingOrderPaidAmount(0);
    // Refresh active orders and stats
    queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
    queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
    queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });
    queryClient.invalidateQueries({ queryKey: ["food-truck-today-stats"] });
  }, [queryClient]);

  // ─── Hold Order ─────────────────────────────────────────────────────────
  const handleHoldOrder = useCallback(() => {
    if (orderItems.length === 0) return;
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    holdOrder({
      customerName,
      customerPhone,
      items: orderItems,
      subtotal,
      loyaltyCustomer,
      loyaltyPointsUsed,
      loyaltyDiscountAmount,
      discountAmount,
      discountPercentage,
      appliedCoupon,
      couponDiscountAmount,
    });
    // Clear the cart
    setOrderItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountAmount(0);
    setDiscountPercentage(0);
    setLoyaltyCustomer(null);
    setLoyaltyPointsUsed(0);
    setLoyaltyDiscountAmount(0);
    setAppliedCoupon(null);
    setCouponDiscountAmount(0);
    setCouponError(null);
    setShowMobileCart(false);
    toast({
      title: "Order Held ✓",
      description: `Parked for ${customerName || "Walk-in"} — tap Held to resume`,
      duration: 2500,
    });
  }, [
    orderItems, customerName, customerPhone, holdOrder, toast,
    loyaltyCustomer, loyaltyPointsUsed, loyaltyDiscountAmount,
    discountAmount, discountPercentage, appliedCoupon, couponDiscountAmount,
  ]);

  // Resume a held order
  const handleResumeOrder = useCallback(
    (id: string) => {
      const held = resumeOrder(id);
      if (!held) return;
      // If cart already has items, ask for confirmation
      if (orderItems.length > 0) {
        const ok = window.confirm(
          "Current cart has items. Replace with the held order?",
        );
        if (!ok) return;
      }
      setOrderItems(held.items);
      setCustomerName(held.customerName);
      setCustomerPhone(held.customerPhone);
      setLoyaltyCustomer(held.loyaltyCustomer ?? null);
      setLoyaltyPointsUsed(held.loyaltyPointsUsed ?? 0);
      setLoyaltyDiscountAmount(held.loyaltyDiscountAmount ?? 0);
      setDiscountAmount(held.discountAmount ?? 0);
      setDiscountPercentage(held.discountPercentage ?? 0);
      setAppliedCoupon(held.appliedCoupon ?? null);
      setCouponDiscountAmount(held.couponDiscountAmount ?? 0);
      setShowHeldOrders(false);
      toast({
        title: "Order Resumed",
        description: `${held.items.length} items loaded back into cart`,
        duration: 2000,
      });
    },
    [resumeOrder, orderItems, toast],
  );

  // ─── Send to Kitchen (no payment) ───────────────────────────────────────
  const handleSendToKitchen = useCallback(async () => {
    if (orderItems.length === 0 || !restaurantId || sendingToKitchen) return;
    setSendingToKitchen(true);
    try {
      const attendantName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email
        : "Staff";
      const finalCustomerName = customerName.trim() || "Walk-in Customer";

      const kitchenItems = orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        menuItemId: item.menuItemId,
        notes: item.notes ? [item.notes] : [],
        priority: item.priority || "normal",
      }));
      const formattedItems = orderItems.map(
        (item) => formatOrderItemString(item.quantity, item.name, item.price, item.notes)
      );

      const itemsSubtotal = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const discountValue =
        discountPercentage > 0
          ? (itemsSubtotal * discountPercentage) / 100
          : discountAmount;
      const afterDiscount = Math.max(
        0,
        itemsSubtotal - discountValue - couponDiscountAmount,
      );
      const orderTotal = Math.max(0, afterDiscount - loyaltyDiscountAmount);

      const totalDiscountAmount =
        discountValue + couponDiscountAmount + (loyaltyDiscountAmount || 0);
      const discountNotesParts: string[] = [];
      if (discountPercentage > 0) {
        discountNotesParts.push(
          `${discountPercentage}% off (₹${discountValue.toFixed(2)})`,
        );
      } else if (discountValue > 0) {
        discountNotesParts.push(
          `Manual discount ₹${discountValue.toFixed(2)}`,
        );
      }
      if (couponDiscountAmount > 0) {
        discountNotesParts.push(
          `Coupon (₹${couponDiscountAmount.toFixed(2)})`,
        );
      }
      if (loyaltyDiscountAmount > 0) {
        discountNotesParts.push(
          `${loyaltyPointsUsed} pts redeemed (₹${loyaltyDiscountAmount.toFixed(2)})`,
        );
      }
      const discountNotes = discountNotesParts.join(" + ");
      const effectiveDiscountPct =
        itemsSubtotal > 0 && totalDiscountAmount > 0
          ? Math.round((totalDiscountAmount / itemsSubtotal) * 100)
          : 0;

      // ─── OFFLINE SEND TO KITCHEN (new order OR edit existing order) ──────
      if (isOfflineNow()) {
        const nowIso = new Date().toISOString();
        const printOfflineKot = (
          tokenNum: number,
          kotItems: Array<{
            name: string;
            quantity: number;
            price?: number;
            notes?: string[] | string;
          }>,
          isAddition = false,
        ) => {
          if (!isPrinterConnected) return;
          thermalPrinterService
            .printKOT({
              tableName: `Token #${String(tokenNum).padStart(3, "0")}`,
              serverName: attendantName,
              items: kotItems.map((item) => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                notes: Array.isArray(item.notes)
                  ? item.notes.length > 0
                    ? item.notes.join(", ")
                    : undefined
                  : item.notes,
              })),
              ...(isAddition ? { isAddition: true } : {}),
              orderType: "takeaway",
            })
            .catch((err) => {
              console.error("Offline KOT print error:", err);
              toast({
                title: "KOT Print Failed",
                description: err?.message || "Order saved, but KOT could not be printed.",
                variant: "destructive",
              });
            });
        };

        if (editingOrderId) {
          const localExisting = await getLocalOrder(editingOrderId);
          const orderNum =
            editingOrderNumber || localExisting?.orderNumber || 0;
          const fullTotal = orderItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          );
          const existingCompletionStatus =
            localExisting?.itemCompletionStatus &&
            localExisting.itemCompletionStatus.length > 0
              ? localExisting.itemCompletionStatus
              : editingOrderCompletionStatus;
          const consumedIndices = new Set<number>();
          const preciseCompletionStatus = orderItems.map((item) => {
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

          const collectedPaidAmount =
            typeof localExisting?.paidAmount === "number"
              ? localExisting.paidAmount
              : editingOrderPaidAmount > 0
              ? editingOrderPaidAmount
              : localExisting?.paymentStatus === "paid"
              ? Number(localExisting?.total) || 0
              : 0;
          const isNonChargeable =
            localExisting?.paymentStatus === "nc" ||
            localExisting?.orderType === "nc";
          const rawDiscountVal = Number(localExisting?.discount) || 0;
          const extraFixedDiscount = Number(localExisting?.fixedDiscountAmount) || 0;
          const existingDiscount =
            localExisting?.discountType === "percentage"
              ? (fullTotal * rawDiscountVal) / 100 + extraFixedDiscount
              : rawDiscountVal + extraFixedDiscount;
          const adjustedTotal = isNonChargeable
            ? 0
            : Math.max(0, fullTotal - existingDiscount);
          const hasBalanceDue =
            !isNonChargeable && adjustedTotal > collectedPaidAmount + 0.005;
          const nextPaymentStatus = isNonChargeable
            ? "nc"
            : hasBalanceDue
            ? "pending"
            : collectedPaidAmount > 0
            ? "paid"
            : localExisting?.paymentStatus || "pending";

          const queuedWrites: Parameters<typeof commitLocalOrderAndWritesAtomic>[1] = [
            {
              type: "order",
              operation: "update",
              payload: {
                id: editingOrderId,
                items: formattedItems,
                total: adjustedTotal,
                status: "preparing",
                item_completion_status: preciseCompletionStatus,
                payment_status: nextPaymentStatus,
                updated_at: nowIso,
              },
            },
          ];

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
          orderItems.forEach((item) => {
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
              const cartItem = orderItems.find(
                (it) =>
                  `${it.name}@@${it.price}@@${it.notes || ""}` === key,
              );
              newKitchenItems.push({
                name: current.name,
                quantity: netNew,
                price: current.price,
                menuItemId: current.menuItemId,
                notes: current.notes ? [current.notes] : [],
                priority: cartItem?.priority || "normal",
                is_addition: true,
                parent_order_number: orderNum,
              });
            }
          });

          if (newKitchenItems.length > 0) {
            queuedWrites.push({
              type: "kitchen_order",
              operation: "insert",
              payload: {
                id: crypto.randomUUID(),
                order_id: editingOrderId,
                restaurant_id: restaurantId,
                source: "QuickServe",
                status: "preparing",
                items: newKitchenItems,
                order_type: "takeaway",
                customer_name: finalCustomerName,
                server_name: attendantName,
                priority: "normal",
                _deductInventory: true,
                created_at: nowIso,
                updated_at: nowIso,
              },
            });
          }

          await commitLocalOrderAndWritesAtomic(
            {
              ...(localExisting || {
                id: editingOrderId,
                orderId: editingOrderId,
                restaurant_id: restaurantId,
                source: "quickserve",
                orderType: "takeaway",
                priority: "normal",
                createdAt: nowIso,
              }),
              id: editingOrderId,
              orderId: editingOrderId,
              orderNumber: orderNum || null,
              status: "preparing",
              items: kitchenItems,
              formattedItems,
              itemCompletionStatus: preciseCompletionStatus,
              total: adjustedTotal,
              subtotal: fullTotal,
              paidAmount: collectedPaidAmount,
              customerName: finalCustomerName,
              customerPhone: customerPhone || undefined,
              attendant: attendantName,
              paymentStatus: nextPaymentStatus,
              updatedAt: nowIso,
              synced: false,
            },
            queuedWrites,
          );

          if (newKitchenItems.length > 0) {
            printOfflineKot(orderNum, newKitchenItems, true);
          }

          const newItemCount = newKitchenItems.reduce(
            (s, i) => s + i.quantity,
            0,
          );
          toast({
            title: `Token #${String(orderNum).padStart(3, "0")} — Updated (Offline)`,
            description:
              newItemCount > 0
                ? `${newItemCount} new item(s) queued — will sync when connected`
                : "Order updated locally — will sync when connected",
            duration: 3000,
          });
        } else {
          const fingerprint = `${restaurantId}|${orderTotal}|${finalCustomerName}|${formattedItems.join(",")}`;
          const reused =
            pendingKitchenSubmitRef.current?.fingerprint === fingerprint
              ? pendingKitchenSubmitRef.current
              : null;
          const offlineOrderId = reused?.orderId || crypto.randomUUID();
          const offlineKitchenOrderId =
            reused?.kitchenOrderId || crypto.randomUUID();
          const nextOrderNumber =
            reused?.orderNumber || allocateOfflineQuickServeToken(restaurantId);
          pendingKitchenSubmitRef.current = {
            fingerprint,
            orderId: offlineOrderId,
            kitchenOrderId: offlineKitchenOrderId,
            orderNumber: nextOrderNumber,
          };
          const initialCompletionStatus = orderItems.map(() => false);

          // Enqueue parent `order` BEFORE `kitchen_order` so replay satisfies FK constraint
          await commitLocalOrderAndWritesAtomic(
            {
              id: offlineOrderId,
              orderId: offlineOrderId,
              restaurant_id: restaurantId,
              source: "quickserve",
              orderType: "takeaway",
              status: "preparing",
              priority: "normal",
              orderNumber: nextOrderNumber,
              items: kitchenItems,
              formattedItems,
              itemCompletionStatus: initialCompletionStatus,
              total: orderTotal,
              subtotal: itemsSubtotal,
              paidAmount: 0,
              discount:
                discountPercentage > 0
                  ? discountPercentage
                  : totalDiscountAmount > 0
                  ? totalDiscountAmount
                  : undefined,
              discountType:
                discountPercentage > 0
                  ? "percentage"
                  : totalDiscountAmount > 0
                  ? "amount"
                  : undefined,
              fixedDiscountAmount:
                discountPercentage > 0 &&
                couponDiscountAmount + (loyaltyDiscountAmount || 0) > 0
                  ? couponDiscountAmount + (loyaltyDiscountAmount || 0)
                  : undefined,
              customerName: finalCustomerName,
              customerPhone: customerPhone || undefined,
              attendant: attendantName,
              paymentStatus: "pending",
              createdAt: nowIso,
              updatedAt: nowIso,
              synced: false,
            },
            [
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
                  payment_status: "pending",
                  source: "quickserve",
                  order_type: "takeaway",
                  attendant: attendantName,
                  order_number: nextOrderNumber,
                  item_completion_status: initialCompletionStatus,
                  ...(totalDiscountAmount > 0 && {
                    discount_amount: totalDiscountAmount,
                  }),
                  ...(effectiveDiscountPct > 0 && {
                    discount_percentage: effectiveDiscountPct,
                  }),
                  ...(discountNotes && { discount_notes: discountNotes }),
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
                  order_type: "takeaway",
                  customer_name: finalCustomerName,
                  server_name: attendantName,
                  priority: "normal",
                  _deductInventory: true,
                  created_at: nowIso,
                  updated_at: nowIso,
                },
              },
            ],
          );
          pendingKitchenSubmitRef.current = null;

          printOfflineKot(nextOrderNumber, kitchenItems);

          toast({
            title: `Token #${String(nextOrderNumber).padStart(3, "0")} — Saved Offline ✓`,
            description: `Queued for ${finalCustomerName} — will sync automatically when connected.`,
            duration: 3000,
          });
        }

        setOrderItems([]);
        setCustomerName("");
        setCustomerPhone("");
        setShowMobileCart(false);
        setDiscountAmount(0);
        setDiscountPercentage(0);
        setLoyaltyCustomer(null);
        setLoyaltyPointsUsed(0);
        setLoyaltyDiscountAmount(0);
        setAppliedCoupon(null);
        setCouponDiscountAmount(0);
        setCouponError(null);
        setEditingOrderId(null);
        setEditingOrderNumber(null);
        setEditingOrderItems([]);
        setEditingOrderCompletionStatus([]);
        setEditingOrderPaidAmount(0);

        queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
        queryClient.invalidateQueries({
          queryKey: ["quickserve-todays-revenue"],
        });
        return;
      }

      // Generate daily sequential order token (online)
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
      const nextOrderNumber =
        ((maxOrderRow?.[0]?.order_number as number) || 0) + 1;
      recordQuickServeOrderNumber(restaurantId, nextOrderNumber);

      // Initialize item completion status
      const initialCompletionStatus = orderItems.map(() => false);

      // ─── UPDATE MODE: Edit existing order (add/remove items) ───────────────
      if (editingOrderId) {
        // Fetch current order to get order_number and existing completion status
        const { data: existingOrder, error: fetchErr } = await supabase
          .from("orders")
          .select("items, total, item_completion_status, order_number, payment_status")
          .eq("id", editingOrderId)
          .single();

        if (fetchErr) throw fetchErr;
        const orderNumber = existingOrder?.order_number || 0;

        // Calculate new total from ALL current cart items (existing + new + modified)
        const fullSubtotal = orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity, 0,
        );
        const fullTotal = fullSubtotal; // No discount recalculation for edit mode

        // Fetch already paid transactions
        const { data: paidTxns } = await supabase
          .from("pos_transactions")
          .select("amount")
          .eq("order_id", editingOrderId)
          .eq("status", "completed");
        const alreadyPaid = (paidTxns || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const hasBalanceDue = fullTotal > alreadyPaid;

        // Format ALL current items for the order record
        const allFormattedItems = orderItems.map(
          (item) => formatOrderItemString(item.quantity, item.name, item.price, item.notes)
        );

        // Preserve completion status for existing (served) items, set false for NEW items only
        // This keeps strikethrough on already-served items while new additions show as unserved
        const existingCompletionStatus = (existingOrder?.item_completion_status as boolean[]) || [];

        // Track consumed indices to handle duplicate items correctly
        const consumedIndices = new Set<number>();
        const preciseCompletionStatus = orderItems.map((item) => {
          // Find first unconsumed matching original item
          const matchIdx = editingOrderItems.findIndex((orig, origIdx) => {
            if (consumedIndices.has(origIdx)) return false;
            return orig.name === item.name && orig.price === item.price;
          });

          if (matchIdx !== -1) {
            consumedIndices.add(matchIdx);
            return existingCompletionStatus[matchIdx] ?? false;
          }
          // New item — not served
          return false;
        });

        // 1. Replace the entire order items, total, and payment_status
        const { error: updateErr } = await supabase
          .from("orders")
          .update({
            items: allFormattedItems,
            total: fullTotal,
            status: "preparing",
            item_completion_status: preciseCompletionStatus,
            payment_status: hasBalanceDue ? "pending" : existingOrder.payment_status,
          })
          .eq("id", editingOrderId);

        if (updateErr) throw updateErr;

        // 2. Determine which items are NEW (not in original order) for kitchen
        // Build a map of original items: name -> total quantity
        const originalMap = new Map<string, number>();
        editingOrderItems.forEach((item) => {
          const key = `${item.name}@@${item.price}@@${item.notes || ""}`;
          originalMap.set(key, (originalMap.get(key) || 0) + item.quantity);
        });

        // Subtract original quantities from current to find net new
        const currentMap = new Map<string, { name: string; price: number; quantity: number; notes?: string; menuItemId?: string }>();
        orderItems.forEach((item) => {
          const key = `${item.name}@@${item.price}@@${item.notes || ""}`;
          const existing = currentMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            currentMap.set(key, { name: item.name, price: item.price, quantity: item.quantity, notes: item.notes, menuItemId: item.menuItemId });
          }
        });

        const newKitchenItems: { 
          name: string; 
          quantity: number; 
          price: number; 
          menuItemId?: string; 
          notes: string[];
          priority?: string;
          is_addition?: boolean;
          parent_order_number?: string | number;
        }[] = [];
        currentMap.forEach((current, key) => {
          const origQty = originalMap.get(key) || 0;
          const netNew = current.quantity - origQty;
          if (netNew > 0) {
            const cartItem = orderItems.find(
              (item) => `${item.name}@@${item.price}@@${item.notes || ""}` === key
            );
            newKitchenItems.push({
              name: current.name,
              quantity: netNew,
              price: current.price,
              menuItemId: current.menuItemId,
              notes: current.notes ? [current.notes] : [],
              priority: cartItem?.priority || "normal",
              is_addition: true,
              parent_order_number: orderNumber,
            });
          }
        });

        // 3. Only create kitchen order if there are actually NEW items
        if (newKitchenItems.length > 0) {
          const { data: kitchenOrder, error: kitchenError } = await supabase
            .from("kitchen_orders")
            .insert({
              restaurant_id: restaurantId,
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

          // Link kitchen order & deduct inventory (background)
          if (kitchenOrder?.id) {
            (async () => {
              try {
                await supabase
                  .from("kitchen_orders")
                  .update({ order_id: editingOrderId })
                  .eq("id", kitchenOrder.id);
              } catch (err) {
                console.error("Link kitchen→order error:", err);
              }
            })();
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

        const newItemCount = newKitchenItems.reduce((s, i) => s + i.quantity, 0);
        toast({
          title: `Token #${String(orderNumber).padStart(3, "0")} — Order Updated`,
          description: newItemCount > 0
            ? `${newItemCount} new item(s) sent to kitchen • Total: ${currencySymbol}${fullTotal.toFixed(0)}`
            : `Order updated • Total: ${currencySymbol}${fullTotal.toFixed(0)}`,
          duration: 3000,
        });

        // Clear cart and editing state
        setOrderItems([]);
        setCustomerName("");
        setCustomerPhone("");
        setShowMobileCart(false);
        setDiscountAmount(0);
        setDiscountPercentage(0);
        setLoyaltyCustomer(null);
        setLoyaltyPointsUsed(0);
        setLoyaltyDiscountAmount(0);
        setAppliedCoupon(null);
        setCouponDiscountAmount(0);
        setCouponError(null);
        setEditingOrderId(null);
        setEditingOrderNumber(null);
        setEditingOrderItems([]);

        queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
        queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });
        queryClient.invalidateQueries({ queryKey: ["food-truck-today-stats"] });
        return; // skip new order creation
      }
      // ────────────────────────────────────────────────────────────────

      // 1. Create kitchen order (food truck: starts preparing immediately, no KDS step)
      const { data: kitchenOrder, error: kitchenError } = await supabase
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

      // 2. Create order with payment_status: "pending" (reuses discount totals computed above)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          customer_name: finalCustomerName,
          items: formattedItems,
          total: orderTotal,
          status: "preparing",
          payment_status: "pending",
          source: "quickserve",
          order_type: "takeaway",
          attendant: attendantName,
          order_number: nextOrderNumber,
          item_completion_status: initialCompletionStatus,
          ...(totalDiscountAmount > 0 && {
            discount_amount: totalDiscountAmount,
          }),
          ...(effectiveDiscountPct > 0 && {
            discount_percentage: effectiveDiscountPct,
          }),
          ...(discountNotes && { discount_notes: discountNotes }),
          ...(customerPhone && { customer_phone: customerPhone }),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Link kitchen order → order & deduct inventory on send (food truck has no KDS)
      if (order?.id && kitchenOrder?.id) {
        const { error: linkError } = await supabase
          .from("kitchen_orders")
          .update({ order_id: order.id })
          .eq("id", kitchenOrder.id);
        if (linkError) console.error("Link kitchen→order error:", linkError);

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

      // CRM sync (background)
      if (customerName.trim()) {
        (async () => {
          try {
            await syncCustomerToCRM({
              customerName: finalCustomerName,
              customerPhone: customerPhone || undefined,
              orderTotal,
              orderId: kitchenOrder?.id || undefined,
              source: "quickserve",
            });
          } catch (err) {
            console.error("CRM sync error:", err);
          }
        })();
      }

      toast({
        title: `Token #${String(nextOrderNumber).padStart(3, "0")} — Sent to Kitchen`,
        description: `Payment pending for ${finalCustomerName}`,
        duration: 3000,
      });

      // Clear the cart
      setOrderItems([]);
      setCustomerName("");
      setCustomerPhone("");
      setShowMobileCart(false);
      setDiscountAmount(0);
      setDiscountPercentage(0);
      setLoyaltyCustomer(null);
      setLoyaltyPointsUsed(0);
      setLoyaltyDiscountAmount(0);
      setAppliedCoupon(null);
      setCouponDiscountAmount(0);
      setCouponError(null);

      // Refresh active orders & stats
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({ queryKey: ["food-truck-today-stats"] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) {
      console.error("Send to kitchen error:", error);
      toast({
        title: "Failed to Send",
        description: "Could not send order to kitchen. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingToKitchen(false);
    }
  }, [
    orderItems, restaurantId, sendingToKitchen, user, customerName,
    customerPhone, discountAmount, discountPercentage, couponDiscountAmount,
    loyaltyDiscountAmount, loyaltyPointsUsed, toast,
    queryClient, syncCustomerToCRM, editingOrderId, editingOrderNumber, editingOrderItems,
    isOfflineNow, isPrinterConnected, currencySymbol,
  ]);

  // Add custom item
  const handleAddCustomItem = useCallback(
    (name: string, price: number) => {
      setOrderItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          menuItemId: `custom-${Date.now()}`,
          name,
          price,
          quantity: 1,
          isCustom: true,
        },
      ]);
      toast({
        title: "Custom Item Added",
        description: `${name} — ₹${price}`,
        duration: 1500,
      });
    },
    [toast],
  );

  // Handle discount change
  const handleDiscountChange = useCallback(
    (amount: number, percentage: number) => {
      setDiscountAmount(amount);
      setDiscountPercentage(percentage);
    },
    [],
  );

  // Handle apply coupon
  const handleApplyCoupon = useCallback(
    async (code: string) => {
      if (!restaurantId) return;
      setCouponLoading(true);
      setCouponError(null);

      try {
        const todayStr = new Date().toISOString().split("T")[0];
        let matchedCoupon: any = null;

        if (isOfflineNow()) {
          matchedCoupon =
            (availableCoupons || []).find(
              (c: any) =>
                c.is_active !== false &&
                (!c.start_date || String(c.start_date) <= todayStr) &&
                (!c.end_date || String(c.end_date) >= todayStr) &&
                String(c.promotion_code || "").toLowerCase() ===
                  code.trim().toLowerCase(),
            ) || null;
        } else {
          const { data, error } = await supabase
            .from("promotion_campaigns")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .eq("promotion_code", code.trim())
            .eq("is_active", true)
            .lte("start_date", todayStr)
            .gte("end_date", todayStr)
            .maybeSingle();
          if (!error && data) matchedCoupon = data;
        }

        if (!matchedCoupon) {
          setCouponError("Invalid or expired coupon");
          return;
        }

        setAppliedCoupon({
          id: matchedCoupon.id,
          code: matchedCoupon.promotion_code,
          name: matchedCoupon.name,
          discount_percentage: matchedCoupon.discount_percentage,
          discount_amount: matchedCoupon.discount_amount,
        });

        // Reset manual discount when applying a coupon to avoid double dipping
        setDiscountAmount(0);
        setDiscountPercentage(0);

        toast({
          title: "Coupon Applied",
          description: `${matchedCoupon.name} applied successfully!`,
          duration: 2000,
        });
      } catch {
        setCouponError("Failed to apply coupon");
      } finally {
        setCouponLoading(false);
      }
    },
    [restaurantId, availableCoupons, isOfflineNow, toast],
  );

  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscountAmount(0);
    setCouponError(null);
  }, []);

  // Recall order from history into active cart
  const handleRecallOrder = useCallback(
    (items: RecalledOrderItem[], name: string, phone: string) => {
      const newOrderItems: QSOrderItem[] = items.map((item) => ({
        id: crypto.randomUUID(),
        menuItemId: "",
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isCustom: true,
      }));
      setOrderItems(newOrderItems);
      if (name) setCustomerName(name);
      if (phone) setCustomerPhone(phone);
      toast({
        title: "Order Recalled",
        description: `${items.length} items loaded — you can now edit or add more`,
        duration: 2500,
      });
    },
    [toast],
  );

  // Reorder last order items
  const handleReorderLastOrder = useCallback(
    (items: { name: string; quantity: number; price: number }[]) => {
      const newOrderItems: QSOrderItem[] = items.map((item) => ({
        id: crypto.randomUUID(),
        menuItemId: "",
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isCustom: true,
      }));
      setOrderItems(newOrderItems);
      toast({
        title: "Last Order Loaded",
        description: `Loaded ${items.length} items from previous order`,
        duration: 2000,
      });
    },
    [toast],
  );

  // ─── Add Items to Existing Order ──────────────────────────────────────
  const handleAddItemsToOrder = useCallback(
    (order: import("@/components/QuickServe/QSActiveOrders").ActiveOrder) => {
      // If cart already has items, ask confirmation
      if (orderItems.length > 0) {
        const ok = window.confirm(
          "Current cart has items. Replace with edit mode for this order?",
        );
        if (!ok) return;
      }

      // Parse existing items into fully editable cart items
      const existingParsed: QSOrderItem[] = order.items.map((itemStr, idx) => {
        const match = itemStr.match(/^(\d+)x\s+(.+?)\s+@(\d+(?:\.\d+)?)$/);
        if (match) {
          let itemName = match[2];
          let itemNotes: string | undefined = undefined;
          
          // Extract notes if present at the end of the name: e.g. "Burger (No onion)"
          const notesMatch = itemName.match(/^(.*?)\s*\((.*?)\)$/);
          if (notesMatch) {
            itemName = notesMatch[1];
            itemNotes = notesMatch[2];
          }

          // Try to find matching menu item for proper menuItemId
          const matchedMenu = menuItems.find(
            (m) => m.name.toLowerCase() === itemName.toLowerCase(),
          );
          return {
            id: `existing-${idx}`,
            menuItemId: matchedMenu?.id || `existing-menu-${idx}`,
            name: itemName,
            price: parseFloat(match[3]),
            quantity: parseInt(match[1]),
            isCustom: !matchedMenu,
            notes: itemNotes,
          };
        }
        return {
          id: `existing-${idx}`,
          menuItemId: `existing-menu-${idx}`,
          name: itemStr,
          price: 0,
          quantity: 1,
          isCustom: true,
        };
      });

      setEditingOrderId(order.id);
      setEditingOrderNumber(order.order_number || null);
      setEditingOrderCompletionStatus(
        Array.isArray(order.item_completion_status)
          ? order.item_completion_status
          : [],
      );
      setEditingOrderPaidAmount(
        typeof (order as any).paid_amount === "number"
          ? (order as any).paid_amount
          : typeof (order as any).paidAmount === "number"
          ? (order as any).paidAmount
          : order.payment_status === "paid"
          ? Number(order.total) || 0
          : 0,
      );
      // Store original items snapshot for kitchen diff (what was originally in the order)
      setEditingOrderItems(existingParsed.map(item => ({ ...item })));
      // Load ALL existing items into the editable cart
      setOrderItems(existingParsed);
      setCustomerName(order.customer_name || "");
      setCustomerPhone(order.customer_phone || "");
      setShowActiveOrders(false);
      setShowMobileCart(false);

      toast({
        title: `Editing Order #${String(order.order_number || 0).padStart(3, "0")}`,
        description: "Add, remove, or adjust items — then tap Kitchen to update",
        duration: 3000,
      });
    },
    [orderItems, toast, menuItems],
  );

  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const orderTotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Recalculate coupon discount whenever subtotal or applied coupon changes
  React.useEffect(() => {
    if (!appliedCoupon) {
      setCouponDiscountAmount(0);
      return;
    }
    
    let discount = 0;
    if (appliedCoupon.discount_percentage) {
      discount = (orderTotal * appliedCoupon.discount_percentage) / 100;
    } else if (appliedCoupon.discount_amount) {
      discount = appliedCoupon.discount_amount;
    }
    
    // Cap discount at order total
    setCouponDiscountAmount(Math.min(discount, orderTotal));
  }, [appliedCoupon, orderTotal]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-orange-50/30 to-pink-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white overflow-hidden">
      {/* ─── Premium Header ─── */}
      <header className="relative shrink-0 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative flex items-center justify-between px-4 py-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 border border-white/20">
              <Zap className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div>
              {restaurantName && (
                <p className="text-[10px] text-white/70 font-semibold tracking-widest uppercase">
                  {restaurantName}
                </p>
              )}
              <h1 className="text-base font-extrabold text-white tracking-tight">
                QuickServe
              </h1>
              <p className="text-[10px] text-white/60 font-medium tracking-wider uppercase">
                Counter & Takeaway
              </p>
            </div>
            <div className="ml-2">
              <HelpProvider />
            </div>
          </div>

          {/* Live Stats Pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/10">
              <Hash className="h-3 w-3 text-white/70" />
              <span className="text-xs font-bold text-white">
                {todaysOrderCount}
              </span>
            </div>
            {canViewRevenue && (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/10">
                <TrendingUp className="h-3 w-3 text-emerald-300" />
                <span className="text-xs font-bold text-white">
                  {currencySymbol}
                  {todaysRevenue.toFixed(0)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="relative flex items-center flex-wrap gap-1.5 sm:gap-1.5 px-4 pb-3">
          <button
            onClick={() => setShowActiveOrders(true)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 transition-all active:scale-95"
          >
            <ChefHat className="h-3.5 w-3.5 text-amber-200" />
            <span className="text-xs font-semibold text-white">Active</span>
          </button>

          {heldCount > 0 && (
            <button
              onClick={() => setShowHeldOrders(true)}
              className="flex items-center gap-1.5 bg-amber-400/30 hover:bg-amber-400/40 backdrop-blur-md rounded-xl px-3 py-2 border border-amber-300/30 transition-all active:scale-95 animate-pulse"
            >
              <PauseCircle className="h-3.5 w-3.5 text-amber-200" />
              <span className="text-xs font-bold text-white">
                Held ({heldCount})
              </span>
            </button>
          )}

          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 transition-all active:scale-95"
          >
            <History className="h-3.5 w-3.5 text-white/80" />
            <span className="text-xs font-semibold text-white">History</span>
          </button>

          <button
            onClick={() => setShowPrinterDialog(true)}
            className={`flex items-center gap-1.5 backdrop-blur-md rounded-xl px-3 py-2 border transition-all active:scale-95 ${
              isPrinterConnected
                ? "bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-300/40"
                : "bg-white/15 hover:bg-white/25 border-white/10"
            }`}
            title={isPrinterConnected ? "Thermal Printer Connected" : "Setup Thermal Printer"}
          >
            <Printer
              className={`h-3.5 w-3.5 ${
                isPrinterConnected ? "text-emerald-200" : "text-white/80"
              }`}
            />
            <span className="text-xs font-semibold text-white">
              {isPrinterConnected ? "Printer ✓" : "Printer"}
            </span>
          </button>

          {canViewRevenue && (
            <button
              onClick={() => setShowDailySummary(true)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 transition-all active:scale-95 ml-auto"
            >
              <FileText className="h-3.5 w-3.5 text-pink-200" />
              <span className="text-xs font-semibold text-white">End Day</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── Main Content: Menu + Order Panel ─── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Menu Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          <QSMenuGrid
            menuItems={menuItems}
            categories={categories}
            isLoading={menuLoading}
            cartItemCounts={cartItemCounts}
            onAddItem={handleAddItem}
            onToggleAvailability={toggleAvailability}
            onRestoreAll={restoreAllItems}
            soldOutCount={soldOutCount}
            isToggling={isToggling}
            isRestoring={isRestoring}
          />
        </div>

        {/* Right: Order Panel (desktop only) */}
        <div className="hidden md:flex flex-col w-72 lg:w-80 xl:w-96 bg-white/60 dark:bg-white/5 backdrop-blur-xl border-l border-white/20 dark:border-white/5 min-h-0 overflow-hidden">
          <QSCustomerInput
            customerName={customerName}
            customerPhone={customerPhone}
            onNameChange={setCustomerName}
            onPhoneChange={setCustomerPhone}
            onCustomerFound={handleCustomerFound}
            onReorder={handleReorderLastOrder}
          />
          <QSOrderPanel
            items={orderItems}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onAddNote={handleAddNote}
            onClear={handleClear}
            onProceedToPayment={() => setShowPayment(true)}
            onHoldOrder={handleHoldOrder}
            onSendToKitchen={handleSendToKitchen}
            onSetItemPriority={handleSetItemPriority}
            discountAmount={discountAmount}
            discountPercentage={discountPercentage}
            onDiscountChange={handleDiscountChange}
            onAddCustomItem={() => setShowCustomItem(true)}
            loyaltyCustomer={loyaltyCustomer}
            loyaltyPointsUsed={loyaltyPointsUsed}
            loyaltyDiscountAmount={loyaltyDiscountAmount}
            onLoyaltyRedemptionChange={(points, discount) => {
              setLoyaltyPointsUsed(points);
              setLoyaltyDiscountAmount(discount);
            }}
            loyaltyProgram={loyaltyProgram}
            availableCoupons={availableCoupons}
            appliedCoupon={appliedCoupon}
            couponDiscountAmount={couponDiscountAmount}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            couponLoading={couponLoading}
            couponError={couponError}
            editingOrderItems={editingOrderItems}
            onCancelEdit={editingOrderId ? () => {
              setEditingOrderId(null);
              setEditingOrderNumber(null);
              setEditingOrderItems([]);
              setEditingOrderCompletionStatus([]);
              setEditingOrderPaidAmount(0);
              setOrderItems([]);
              setCustomerName("");
              setCustomerPhone("");
              toast({ title: "Edit Cancelled", duration: 1500 });
            } : undefined}
          />
        </div>
      </div>

      {/* ─── Mobile: Floating Cart Button ─── */}
      {(itemCount > 0 || editingOrderId) && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 z-40">
          <Button
            onClick={() => setShowMobileCart(true)}
            className="w-full h-14 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-600 hover:from-orange-600 hover:via-rose-600 hover:to-pink-700 text-white font-bold text-base rounded-2xl shadow-2xl shadow-orange-500/40 active:scale-[0.97] transition-all border border-white/10"
            style={{
              boxShadow:
                "0 8px 32px rgba(249, 115, 22, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
            }}
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            View Order • {itemCount} items • {currencySymbol}
            {orderTotal.toFixed(2)}
          </Button>
        </div>
      )}

      {/* ─── Mobile: Order Cart Sheet ─── */}
      <Sheet open={showMobileCart} onOpenChange={setShowMobileCart}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-3xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-gray-200 dark:border-white/10 text-gray-900 dark:text-white p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Your Order</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full opacity-60" />
            </div>
            <QSCustomerInput
              customerName={customerName}
              customerPhone={customerPhone}
              onNameChange={setCustomerName}
              onPhoneChange={setCustomerPhone}
              onCustomerFound={handleCustomerFound}
              onReorder={handleReorderLastOrder}
            />
            <QSOrderPanel
              items={orderItems}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onAddNote={handleAddNote}
              onClear={handleClear}
              onProceedToPayment={() => {
                setShowMobileCart(false);
                setShowPayment(true);
              }}
              onHoldOrder={handleHoldOrder}
              onSendToKitchen={handleSendToKitchen}
              onSetItemPriority={handleSetItemPriority}
              discountAmount={discountAmount}
              discountPercentage={discountPercentage}
              onDiscountChange={handleDiscountChange}
              onAddCustomItem={() => setShowCustomItem(true)}
              loyaltyCustomer={loyaltyCustomer}
              loyaltyPointsUsed={loyaltyPointsUsed}
              loyaltyDiscountAmount={loyaltyDiscountAmount}
              onLoyaltyRedemptionChange={(points, discount) => {
                setLoyaltyPointsUsed(points);
                setLoyaltyDiscountAmount(discount);
              }}
              loyaltyProgram={loyaltyProgram}
              availableCoupons={availableCoupons}
              appliedCoupon={appliedCoupon}
              couponDiscountAmount={couponDiscountAmount}
              onApplyCoupon={handleApplyCoupon}
              onRemoveCoupon={handleRemoveCoupon}
              couponLoading={couponLoading}
              couponError={couponError}
              editingOrderItems={editingOrderItems}
              onCancelEdit={editingOrderId ? () => {
                setEditingOrderId(null);
                setEditingOrderNumber(null);
                setEditingOrderItems([]);
                setEditingOrderCompletionStatus([]);
                setEditingOrderPaidAmount(0);
                setOrderItems([]);
                setCustomerName("");
                setCustomerPhone("");
                setShowMobileCart(false);
                toast({ title: "Edit Cancelled", duration: 1500 });
              } : undefined}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Sheet */}
      <QSPaymentSheet
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        items={orderItems}
        customerName={customerName}
        customerPhone={customerPhone}
        onSuccess={handlePaymentSuccess}
        discountAmount={discountAmount}
        discountPercentage={discountPercentage}
        loyaltyPointsUsed={loyaltyPointsUsed}
        loyaltyDiscountAmount={loyaltyDiscountAmount}
        loyaltyCustomerId={loyaltyCustomer?.id}
        couponId={appliedCoupon?.id}
        couponDiscountAmount={couponDiscountAmount}
        existingOrder={editingOrderId ? {
          id: editingOrderId,
          total: orderItems.reduce((s, i) => s + i.price * i.quantity, 0),
          orderNumber: editingOrderNumber,
          itemCompletionStatus: editingOrderCompletionStatus,
          paidAmount: editingOrderPaidAmount,
        } : undefined}
        editingOrderItems={editingOrderItems}
      />

      {/* Custom Item Dialog */}
      <QSCustomItemDialog
        isOpen={showCustomItem}
        onClose={() => setShowCustomItem(false)}
        onAdd={handleAddCustomItem}
      />

      {/* Order History */}
      <QSOrderHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onRecallOrder={handleRecallOrder}
      />

      {/* Active Orders Panel */}
      <QSActiveOrders
        isOpen={showActiveOrders}
        onClose={() => setShowActiveOrders(false)}
        onAddItems={handleAddItemsToOrder}
      />

      {/* Held Orders Drawer */}
      <QSHeldOrdersDrawer
        isOpen={showHeldOrders}
        onClose={() => setShowHeldOrders(false)}
        heldOrders={heldOrders}
        onResume={handleResumeOrder}
        onDelete={deleteHeldOrder}
      />

      {/* Daily Summary */}
      <DailySummaryDialog
        isOpen={showDailySummary && canViewRevenue}
        onClose={() => setShowDailySummary(false)}
      />

      {/* Printer Setup Dialog */}
      <QSRPrinterDialog
        isOpen={showPrinterDialog}
        onClose={() => setShowPrinterDialog(false)}
        onPrinterStateChange={() =>
          setIsPrinterConnected(
            nativePrinterBridge.isConnected() ||
              thermalPrinterService.isConnected(),
          )
        }
      />
    </div>
  );
};

export default QuickServePOS;
