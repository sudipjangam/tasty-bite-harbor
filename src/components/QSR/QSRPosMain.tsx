import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { thermalPrinterService } from "@/services/thermalPrinterService";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQSRMenuItems, QSRMenuItem } from "@/hooks/useQSRMenuItems";
import { useQSRTables } from "@/hooks/useQSRTables";
import { useActiveKitchenOrders } from "@/hooks/useActiveKitchenOrders";
import { usePastOrders, PastOrder } from "@/hooks/usePastOrders";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatOrderItemString } from "@/lib/order-utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay, endOfDay } from "date-fns";
import { formatIndianCurrency } from "@/utils/formatters";
import {
  QSROrderItem,
  QSROrderMode,
  QSRTable,
  ActiveKitchenOrder,
  QSRCustomItem,
} from "@/types/qsr";
import { QSRModeSelector } from "./QSRModeSelector";
import { QSRTableGrid } from "./QSRTableGrid";
import { QSRMenuGrid } from "./QSRMenuGrid";
import { QSROrderPad } from "./QSROrderPad";
import { QSRActiveOrdersDrawer } from "./QSRActiveOrdersDrawer";
import { QSRPastOrdersDrawer } from "./QSRPastOrdersDrawer";
import { QSRCustomItemDialog } from "./QSRCustomItemDialog";
import { QSRCartBottomSheet, QSRCartFAB } from "./QSRCartBottomSheet";
import { QSRMobileHeader } from "./QSRMobileHeader";
import { QSRPrinterDialog } from "./QSRPrinterDialog";
import { getPaperSize } from "@/services/nativePrinterBridge";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { POSRiderTrackingDrawer } from "@/components/Aggregators/POSRiderTrackingDrawer";
import { useRiderTracking } from "@/hooks/useRiderTracking";
import { Quick86Modal } from "@/components/Menu/Quick86Modal";
import { use86Cascade } from "@/hooks/use86Cascade";
import { useOnlineDelivery } from "@/hooks/useOnlineDelivery";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import {
  enqueueWrite,
  generateOfflineOrderNumber,
  hasPendingKitchenOrderInsert,
  removeQueuedWritesForOrder,
} from "@/utils/syncManager";
import {
  commitLocalOrderAndWritesAtomic,
  deleteLocalOrder,
  getLocalOrder,
  getLocalOrdersByRestaurant,
  LOCAL_ORDERS_EVENT,
  saveLocalOrder,
} from "@/utils/offlineDB";
import { KitchenLoadGauge } from "@/components/Kitchen/KitchenLoadGauge";
import {
  Clock,
  Zap,
  History,
  ArrowLeft,
  LayoutGrid,
  RefreshCw,
  TrendingUp,
  Receipt,
  Trash2,
  Printer,
  PrinterCheck,
  Bike,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HelpProvider from "@/components/Help/HelpProvider";
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
import AdaptivePaymentDialog from "@/components/Orders/POS/AdaptivePaymentDialog";

// Helper: only prepend "Table " if name doesn't already start with "table"
// Handles: "Table 1" → "Table 1", "Table1" → "Table1", "D1" → "Table D1"
const tableLabel = (name: string) =>
  /^table/i.test(name) ? name : `Table ${name}`;

const TAX_RATE = 0.05; // 5% tax

export const QSRPosMain: React.FC = () => {
  // State
  const [orderMode, setOrderMode] = useState<QSROrderMode>("dine_in");
  const [selectedTable, setSelectedTable] = useState<QSRTable | null>(null);
  const [orderItems, setOrderItems] = useState<QSROrderItem[]>([]);
  const [showActiveOrders, setShowActiveOrders] = useState(false);
  const [showPastOrders, setShowPastOrders] = useState(false);
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recalledKitchenOrderId, setRecalledKitchenOrderId] = useState<
    string | null
  >(null);
  // Track the order ID that was sent to kitchen for post-pay flow
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingKitchenOrderId, setPendingKitchenOrderId] = useState<
    string | null
  >(null);
  // Store order items for payment (since cart is cleared after send to kitchen)
  const [paymentOrderItems, setPaymentOrderItems] = useState<QSROrderItem[]>(
    [],
  );
  // Track item completion status for strikethrough in order pad
  const [itemCompletionStatus, setItemCompletionStatus] = useState<boolean[]>(
    [],
  );
  const [checkoutSource, setCheckoutSource] = useState<"cart" | "drawer" | null>(
    null,
  );
  const tableSelectReqRef = React.useRef(0);
  const pendingOfflinePrePayRef = React.useRef<{
    fingerprint: string;
    orderId: string;
    kitchenOrderId: string;
    offlineToken: string;
    txnId: string;
  } | null>(null);
  const pendingOnlinePrePayRef = React.useRef<{
    fingerprint: string;
    kitchenOrderId: string | null;
    orderId: string | null;
    txnId: string | null;
  } | null>(null);
  // C-1: Stable UUID cache for new-order path in handleSendToKitchen (prevents duplicate rows on retry)
  const pendingNewKitchenOrderRef = React.useRef<{
    fingerprint: string;
    orderId: string;
    kitchenOrderId: string;
    offlineToken: string;
  } | null>(null);
  // H-6: Snapshot of POS state before opening drawer payment so closing without paying restores it
  const drawerCheckoutSnapshotRef = React.useRef<{
    orderMode: QSROrderMode;
    selectedTable: QSRTable | null;
    recalledKitchenOrderId: string | null;
    pendingOrderId: string | null;
    pendingKitchenOrderId: string | null;
    paymentOrderItems: QSROrderItem[];
  } | null>(null);
  const acceptedCompletionRef = React.useRef<Map<string, boolean[]>>(new Map());
  const workspaceGenRef = React.useRef(0);
  // Delete confirmation state
  const [orderToDelete, setOrderToDelete] = useState<{
    order: ActiveKitchenOrder | PastOrder | null;
    type: "active" | "past" | null;
  }>({ order: null, type: null });

  // Printer connection & paper size state
  const [isPrinterConnected, setIsPrinterConnected] = useState(thermalPrinterService.isConnected());
  const [printerName, setPrinterName] = useState<string | null>(thermalPrinterService.getDeviceName());
  const [paperSize, setPaperSizeState] = useState<"58" | "80">(getPaperSize);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const refreshPrinterStatus = useCallback(() => {
    setIsPrinterConnected(thermalPrinterService.isConnected());
    setPrinterName(thermalPrinterService.getDeviceName());
    setPaperSizeState(getPaperSize());
  }, []);

  // Mobile UI V2 feature gate
  const { isLocked: mobileV2Locked } = useFeatureGate("qsr-pos.mobile_ui_v2");
  const useMobileV2 = !mobileV2Locked;

  // NC (Non-Chargeable) Reason state
  const [ncReason, setNcReason] = useState<string>("");

  // Customer name and phone state for all orders
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);

  // Online Delivery (Swiggy / Zomato) check
  const { isOnlineDeliveryEnabled } = useOnlineDelivery();

  // Rider Tracking Drawer state & Feature Lock check (only when online delivery is enabled)
  const [showRiderTracking, setShowRiderTracking] = useState(false);
  const { totalActiveRiders, ridersAtStore } = useRiderTracking();
  const { isLocked: isRiderTrackingLocked } = useFeatureGate("aggregators.rider_tracking");
  const { isLocked: isAggregatorsViewLocked } = useFeatureGate("aggregators.view");
  const canShowRiderTracking = isOnlineDeliveryEnabled && !isRiderTrackingLocked && !isAggregatorsViewLocked;

  // 86 Stock-Kill modal state & Feature Lock check
  // Quick 86 is ONLY shown if online delivery feature (Swiggy / Zomato) is enabled for this restaurant
  const [show86Modal, setShow86Modal] = useState(false);
  const { unavailableCount } = use86Cascade();
  const { isLocked: is86LiveLocked } = useFeatureGate("aggregators.live_86");
  const { isLocked: is86MenuSyncLocked } = useFeatureGate("aggregators.menu_sync");
  const canShow86Button = isOnlineDeliveryEnabled && (!is86LiveLocked || !is86MenuSyncLocked);

  // Hooks
  const { restaurantId, restaurantName } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const { user, isRole } = useAuth();
  const canViewRevenue = Boolean(user?.role_has_full_access || isRole("admin") || isRole("manager") || isRole("owner"));
  const { toast } = useToast();

  const isOfflineNow = useCallback(
    () => !isOnline || (typeof navigator !== "undefined" && !navigator.onLine),
    [isOnline],
  );

  // Customer lookup by phone — auto-fills name if found in CRM
  const handleCustomerPhoneChange = useCallback(async (phone: string) => {
    setCustomerPhone(phone);
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10 || isOfflineNow()) {
      // Don't clear manually-typed name; skip network CRM lookup when offline
      return;
    }
    setIsLookingUpCustomer(true);
    try {
      let query = supabase
        .from("customers")
        .select("id, name, phone, loyalty_points, loyalty_enrolled")
        .eq("phone", cleaned);
      if (restaurantId) query = query.eq("restaurant_id", restaurantId);
      const { data: customer } = await query.maybeSingle();
      if (customer?.name) {
        setCustomerName(customer.name);
        toast({
          title: `Customer found: ${customer.name}`,
          description: customer.loyalty_enrolled && (customer.loyalty_points ?? 0) > 0
            ? `${customer.loyalty_points} loyalty pts`
            : "Name auto-filled",
          duration: 2500,
        });
      }
    } catch (e) {
      console.error("QSR customer lookup failed:", e);
    } finally {
      setIsLookingUpCustomer(false);
    }
  }, [restaurantId, isOfflineNow, toast]);

  // Printer toggle handler (shared between mobile kebab + desktop button)
  const handlePrinterToggle = useCallback(async () => {
    try {
      if (isPrinterConnected) {
        await thermalPrinterService.disconnect();
        toast({ title: "Printer Disconnected", description: "Thermal printer has been disconnected" });
      } else {
        await thermalPrinterService.connect();
        toast({ title: "Printer Connected", description: "Thermal printer is ready for KOTs" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Connection Failed", description: err.message || "Failed to connect to printer" });
    }
  }, [isPrinterConnected, toast]);
  const { menuItems, categories, isLoading: menuLoading } = useQSRMenuItems();
  const {
    tables,
    isLoading: tablesLoading,
    refetch: refetchTables,
    updateTableStatus,
  } = useQSRTables();
  const {
    orders: activeOrders,
    isLoading: ordersLoading,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    toggleItemCompletion,
    handlePriorityChange,
  } = useActiveKitchenOrders();
  const {
    orders: pastOrders,
    isLoading: pastOrdersLoading,
    searchQuery: pastSearchQuery,
    setSearchQuery: setPastSearchQuery,
    dateFilter: pastDateFilter,
    setDateFilter: setPastDateFilter,
    customStartDate: pastCustomStartDate,
    setCustomStartDate: setPastCustomStartDate,
    customEndDate: pastCustomEndDate,
    setCustomEndDate: setPastCustomEndDate,
  } = usePastOrders();

  // Get attendant name
  const attendantName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Staff";

  // Auto-reconnect printer on page load and foreground resume
  useEffect(() => {
    // Listen for connection state changes
    const unsubscribe = thermalPrinterService.onConnectionChange((connected) => {
      setIsPrinterConnected(connected);
      setPrinterName(connected ? thermalPrinterService.getDeviceName() : null);
    });

    // Try auto-reconnect to saved printer
    setIsReconnecting(true);
    thermalPrinterService.tryAutoReconnect()
      .then((reconnected) => {
        if (reconnected) {
          toast({
            title: "Printer Connected",
            description: `Auto-connected to ${thermalPrinterService.getDeviceName() || "printer"}`,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsReconnecting(false));

    // Listen to app foreground resume to update status
    let appStateHandle: any = null;
    if (Capacitor.isNativePlatform()) {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          refreshPrinterStatus();
        }
      }).then(handle => {
        appStateHandle = handle;
      }).catch(() => {});
    }

    return () => {
      unsubscribe();
      if (appStateHandle && typeof appStateHandle.remove === "function") {
        appStateHandle.remove();
      }
    };
  }, [refreshPrinterStatus, toast]);

  // Query for today's revenue (includes unsynced offline completed bills)
  const queryClient = useQueryClient();
  const { data: todaysRevenue = 0 } = useQuery({
    queryKey: ["qsr-todays-revenue", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId || !canViewRevenue) return 0;

      const today = new Date();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);
      const cacheKey = `qsr_todays_revenue_${restaurantId}_${dayStart.toISOString().slice(0, 10)}`;

      const localOrders = await getLocalOrdersByRestaurant(restaurantId);
      const deletedServerIds = new Set(
        localOrders
          .filter((lo) => lo.status === "deleted" && lo.orderId)
          .map((lo) => lo.orderId as string),
      );
      const offlineRevenue = localOrders
        .filter((lo) => {
          // H-28: exclude synced local mirrors to avoid double-counting against server/cached totals
          if (lo.synced) return false;
          if (lo.status !== "completed" || lo.orderType === "nc") return false;
          const ts = new Date(lo.completedAt || lo.createdAt).getTime();
          return ts >= dayStart.getTime() && ts <= dayEnd.getTime();
        })
        .reduce((sum, lo) => sum + (Number(lo.total) || 0), 0);

      const readCachedServerRevenue = (): number => {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (!raw) return offlineRevenue;
          const parsed = JSON.parse(raw);
          if (typeof parsed === "number") return parsed + offlineRevenue;
          if (parsed && Array.isArray(parsed.serverOrders)) {
            const totalsById = new Map<string, number>();
            for (const o of parsed.serverOrders as Array<{ id: string; total: number }>) {
              totalsById.set(o.id, Number(o.total) || 0);
            }
            for (const lo of localOrders) {
              const targetId = lo.orderId || lo.id;
              if (lo.status === "deleted" || lo.orderType === "nc" || lo.paymentStatus === "nc") {
                totalsById.delete(targetId);
                totalsById.delete(lo.id);
                continue;
              }
              if (lo.synced) continue;
              if (lo.status === "completed") {
                const ts = new Date(lo.completedAt || lo.createdAt).getTime();
                if (ts >= dayStart.getTime() && ts <= dayEnd.getTime()) {
                  totalsById.set(targetId, Number(lo.total) || 0);
                }
              }
            }
            let sum = 0;
            totalsById.forEach((v) => {
              sum += v;
            });
            return sum;
          }
          return (Number(parsed?.serverRevenue) || 0) + offlineRevenue;
        } catch {
          return offlineRevenue;
        }
      };

      const offline = isOfflineNow();
      if (offline) {
        return readCachedServerRevenue();
      }

      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select("id, total")
          .eq("restaurant_id", restaurantId)
          .eq("status", "completed")
          .neq("order_type", "non-chargeable")
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString());

        if (error) throw error;

        const serverOrders = (orders || []).map((o: any) => ({
          id: o.id as string,
          total: Number(o.total) || 0,
        }));
        const serverOrderIds = new Set(serverOrders.map((o) => o.id));
        const serverRevenue = serverOrders
          .filter((o) => !deletedServerIds.has(o.id))
          .reduce((sum, o) => sum + o.total, 0);
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ serverRevenue, serverOrders }),
          );
        } catch {
          /* ignore storage quota errors */
        }

        const unsyncedOfflineRevenue = localOrders
          .filter((lo) => {
            if (lo.synced) return false;
            if (lo.status !== "completed" || lo.orderType === "nc") return false;
            if (lo.orderId && serverOrderIds.has(lo.orderId)) return false;
            const ts = new Date(lo.completedAt || lo.createdAt).getTime();
            return ts >= dayStart.getTime() && ts <= dayEnd.getTime();
          })
          .reduce((sum, lo) => sum + (Number(lo.total) || 0), 0);

        return serverRevenue + unsyncedOfflineRevenue;
      } catch {
        return readCachedServerRevenue();
      }
    },
    enabled: !!restaurantId && canViewRevenue,
    refetchInterval: 120000,
  });

  // Real-time subscription for revenue updates
  useEffect(() => {
    if (!restaurantId || !canViewRevenue) return;

    const handleLocalOrdersChange = () => {
      queryClient.invalidateQueries({ queryKey: ["qsr-todays-revenue", restaurantId] });
    };
    window.addEventListener(LOCAL_ORDERS_EVENT, handleLocalOrdersChange);

    const channel = supabase
      .channel(`qsr-revenue-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          const oldStatus = (payload.old as any)?.status;
          if (newStatus === "completed" || oldStatus === "completed") {
            queryClient.invalidateQueries({ queryKey: ["qsr-todays-revenue", restaurantId] });
          }
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener(LOCAL_ORDERS_EVENT, handleLocalOrdersChange);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, canViewRevenue, queryClient]);

  // Calculations - No tax in QSR POS (per user request)
  const subtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [orderItems],
  );
  const tax = 0; // No tax in QSR POS
  const total = subtotal;

  // Cart item counts for menu badges (aggregates base menuItemId if variant selected)
  const cartItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orderItems.forEach((item) => {
      if (!item.isCustom) {
        const baseId = item.menuItemId.split("__")[0];
        counts[baseId] = (counts[baseId] || 0) + item.quantity;
        if (item.menuItemId !== baseId) {
          counts[item.menuItemId] = (counts[item.menuItemId] || 0) + item.quantity;
        }
      }
    });
    return counts;
  }, [orderItems]);

  // Memoized payment dialog items to prevent creating new array reference on every render
  const paymentDialogItems = useMemo(() => {
    const sourceItems =
      checkoutSource === "drawer"
        ? paymentOrderItems
        : checkoutSource === "cart"
        ? orderItems
        : orderItems.length > 0
        ? orderItems
        : paymentOrderItems;
    return sourceItems.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes,
      modifiers: item.modifiers,
    }));
  }, [checkoutSource, orderItems, paymentOrderItems]);

  // Mode change handler - clear table and cart when switching modes
  const handleModeChange = useCallback(
    (mode: QSROrderMode) => {
      // H-4: invalidate any in-flight handleSelectTable async recall from previous mode
      tableSelectReqRef.current += 1;
      setOrderMode(mode);
      if (mode !== "dine_in") {
        setSelectedTable(null);
      }
      // Clear cart when switching modes
      if (orderItems.length > 0) {
        setOrderItems([]);
        setCustomerName(""); // Clear customer name when switching modes
        setCustomerPhone(""); // Clear customer phone
        setNcReason(""); // Clear NC reason when switching modes
        setRecalledKitchenOrderId(null);
        setItemCompletionStatus([]);
        setPendingKitchenOrderId(null);
        setPendingOrderId(null);
        setPaymentOrderItems([]);
      }
    },
    [orderItems.length],
  );

  // Table selection handler (supports recalling offline table orders)
  const handleSelectTable = useCallback(
    async (table: QSRTable) => {
      const reqId = ++tableSelectReqRef.current;

      if (table.status === "occupied" && table.activeOrderId) {
        const restoreRecalledOrder = (
          kitchenOrderId: string,
          items: { name: string; quantity: number; price: number; notes?: string | string[]; printed_qty?: number }[],
          completionStatus: boolean[],
          linkedOrderId?: string | null,
          cName?: string | null,
          cPhone?: string | null,
        ) => {
          const mappedItems: QSROrderItem[] = items.map((item, idx) => {
            const menuItem = menuItems.find(
              (m) => m.name.toLowerCase() === item.name.toLowerCase(),
            );
            return {
              id: `${kitchenOrderId}-${idx}`,
              menuItemId: menuItem?.id || `custom-${idx}`,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              printed_qty: item.printed_qty || 0,
              notes: Array.isArray(item.notes) ? item.notes.join(", ") : item.notes,
              isCustom: !menuItem,
            };
          });

          setOrderItems(mappedItems);
          setRecalledKitchenOrderId(kitchenOrderId);
          setItemCompletionStatus(completionStatus);
          setPendingKitchenOrderId(kitchenOrderId);
          setPaymentOrderItems(mappedItems);
          setPendingOrderId(linkedOrderId || null);
          setCustomerName(cName || "");
          setCustomerPhone(cPhone || "");

          toast({
            title: "Order Recalled",
            description: `Loaded existing order for ${table.name}`,
          });
        };

        try {
          const localOrder = await getLocalOrder(table.activeOrderId).catch(
            () => undefined,
          );
          if (tableSelectReqRef.current !== reqId) return;
          if (
            localOrder &&
            (localOrder.status === "deleted" || localOrder.status === "completed")
          ) {
            refetchTables();
            throw new Error("Active table order is no longer active");
          }
          if (
            localOrder &&
            (isOfflineNow() || localOrder.synced !== true)
          ) {
            restoreRecalledOrder(
              localOrder.id,
              localOrder.items || [],
              localOrder.itemCompletionStatus || [],
              localOrder.orderId,
              localOrder.customerName,
              localOrder.customerPhone,
            );
            setSelectedTable(table);
            return;
          }

          const offline = isOfflineNow();
          if (offline) {
            const cachedActive = activeOrders.find(
              (o) =>
                o.id === table.activeOrderId &&
                o.status !== "deleted" &&
                o.status !== "completed",
            );
            if (cachedActive) {
              restoreRecalledOrder(
                cachedActive.id,
                cachedActive.items || [],
                cachedActive.itemCompletionStatus || [],
                cachedActive.orderId,
                cachedActive.customerName,
                cachedActive.customerPhone,
              );
              setSelectedTable(table);
              return;
            }
            throw new Error("Order details not cached for offline recall");
          }

          const { data: kitchenOrder, error } = await supabase
            .from("kitchen_orders")
            .select("*")
            .eq("id", table.activeOrderId)
            .maybeSingle();

          if (tableSelectReqRef.current !== reqId) return;
          if (error) throw error;

          if (kitchenOrder) {
            restoreRecalledOrder(
              kitchenOrder.id,
              (kitchenOrder.items as any[]) || [],
              (kitchenOrder.item_completion_status as boolean[]) || [],
              kitchenOrder.order_id,
              kitchenOrder.customer_name,
              kitchenOrder.customer_phone,
            );
          } else {
            refetchTables();
            throw new Error("Active table order not found");
          }
        } catch (error) {
          if (tableSelectReqRef.current !== reqId) return;
          console.error("Error loading table order:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load table order",
          });
          return;
        }
      } else {
        setOrderItems([]);
        setRecalledKitchenOrderId(null);
        setItemCompletionStatus([]);
        setPendingOrderId(null);
        setPendingKitchenOrderId(null);
        setPaymentOrderItems([]);
        setCustomerName("");
        setCustomerPhone("");
        setNcReason("");
      }
      if (tableSelectReqRef.current !== reqId) return;
      setSelectedTable(table);
    },
    [menuItems, activeOrders, isOfflineNow, toast],
  );

  // Add menu item to cart
  const handleAddItem = useCallback(
    (menuItem: QSRMenuItem) => {
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
            category: menuItem.category,
            isCustom: false,
          },
        ];
      });

      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      toast({
        title: "Added",
        description: `${menuItem.name} added to order`,
        duration: 1500,
      });
    },
    [toast],
  );

  // Add custom item
  const handleAddCustomItem = useCallback(
    (customItem: QSRCustomItem) => {
      const newItem: QSROrderItem = {
        id: crypto.randomUUID(),
        menuItemId: `custom-${Date.now()}`,
        name: customItem.name,
        price: customItem.price,
        quantity: customItem.quantity,
        isCustom: true,
      };
      setOrderItems((prev) => [...prev, newItem]);
      toast({
        title: "Custom Item Added",
        description: `${customItem.name} added to order`,
      });
    },
    [toast],
  );

  // Cart operations
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

  const handleReorderItems = useCallback((startIndex: number, endIndex: number) => {
    setOrderItems((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Auto-assign priorities based on new positions
      return result.map((item, index) => {
        let newPriority: 'first' | 'normal' | 'last' = 'normal';
        if (result.length > 1) {
          if (index === 0) newPriority = 'first';
          else if (index === result.length - 1) newPriority = 'last';
        }
        return { ...item, priority: newPriority };
      });
    });
  }, []);

  const handleClearOrder = useCallback(() => {
    setOrderItems([]);
    setRecalledKitchenOrderId(null);
    setItemCompletionStatus([]);
    setCustomerName(""); // Clear customer name
    setCustomerPhone(""); // Clear customer phone
    setNcReason(""); // Clear NC reason
    setSelectedTable(null);
    toast({
      title: "Order Cleared",
      description: "All items removed from order",
    });
  }, [toast]);

  const orderMirrorLocksRef = React.useRef(new Map<string, Promise<void>>());
  const runMirrorLocked = useCallback(
    async <T,>(lockKey: string, fn: () => Promise<T>): Promise<T> => {
      const prev = orderMirrorLocksRef.current.get(lockKey) || Promise.resolve();
      const next = prev.then(fn, fn);
      const settled = next.then(
        () => undefined,
        () => undefined,
      );
      orderMirrorLocksRef.current.set(lockKey, settled);
      return next;
    },
    [],
  );

  // Toggle item completion status in order pad (for recalled orders)
  const handleToggleItemCompletion = useCallback(
    async (index: number) => {
      const kitchenOrderId = recalledKitchenOrderId || pendingKitchenOrderId;
      if (!kitchenOrderId) return;

      const gen = workspaceGenRef.current;
      const accepted = acceptedCompletionRef.current.get(kitchenOrderId);
      const previousValue =
        accepted !== undefined
          ? Boolean(accepted[index])
          : Boolean(itemCompletionStatus[index]);
      const nextValue = !Boolean(itemCompletionStatus[index]);
      const optimisticCompletion = [...itemCompletionStatus];
      while (optimisticCompletion.length <= index) {
        optimisticCompletion.push(false);
      }
      optimisticCompletion[index] = nextValue;
      setItemCompletionStatus((prev) => {
        const next = [...prev];
        while (next.length <= index) next.push(false);
        next[index] = nextValue;
        return next;
      });

      try {
        await runMirrorLocked(kitchenOrderId, async () => {
          const localExisting = await getLocalOrder(kitchenOrderId).catch(
            () => undefined,
          );
          if (isOfflineNow() || localExisting) {
            const baseCompletion =
              localExisting?.itemCompletionStatus &&
              localExisting.itemCompletionStatus.length > 0
                ? [...localExisting.itemCompletionStatus]
                : [...optimisticCompletion];
            while (baseCompletion.length <= index) {
              baseCompletion.push(false);
            }
            baseCompletion[index] = nextValue;

            const mirrorToSave = localExisting
              ? {
                  ...localExisting,
                  itemCompletionStatus: baseCompletion,
                  updatedAt: new Date().toISOString(),
                }
              : null;
            await commitLocalOrderAndWritesAtomic(mirrorToSave, [
              {
                type: "kitchen_order",
                operation: "update",
                payload: {
                  id: kitchenOrderId,
                  item_completion_status: baseCompletion,
                },
              },
            ]);
            acceptedCompletionRef.current.set(kitchenOrderId, baseCompletion);
            refetchTables();
            return;
          }

          const { error } = await supabase
            .from("kitchen_orders")
            .update({ item_completion_status: optimisticCompletion })
            .eq("id", kitchenOrderId);

          if (error) throw error;
          acceptedCompletionRef.current.set(kitchenOrderId, optimisticCompletion);
          refetchTables();
        });
      } catch (error) {
        console.error("Error toggling item completion:", error);
        if (
          workspaceGenRef.current === gen &&
          (recalledKitchenOrderId === kitchenOrderId ||
            pendingKitchenOrderId === kitchenOrderId)
        ) {
          setItemCompletionStatus((prev) => {
            const reverted = [...prev];
            if (reverted.length > index) {
              reverted[index] = previousValue;
            }
            return reverted;
          });
        }
      }
    },
    [
      recalledKitchenOrderId,
      pendingKitchenOrderId,
      itemCompletionStatus,
      isOfflineNow,
      refetchTables,
      runMirrorLocked,
    ],
  );

  // Send to kitchen
  const handleSendToKitchen = useCallback(async () => {
    if (orderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Please add items to the order before sending to kitchen.",
      });
      return;
    }

    if (!restaurantId) return;

    setIsLoading(true);
    try {
      // Determine order source/customer name
      // Use actual customer name for takeaway/delivery/NC, fallback to mode-based defaults
      const orderSource =
        orderMode === "dine_in" && selectedTable
          ? tableLabel(selectedTable.name)
          : orderMode.charAt(0).toUpperCase() +
            orderMode.slice(1).replace("_", " ");

      // Use customer name if provided; fallback to table/mode-based defaults to avoid null constraint errors on orders relation
      const finalCustomerName =
        customerName.trim() ||
        (orderMode === "dine_in" && selectedTable
          ? tableLabel(selectedTable.name)
          : orderMode === "takeaway"
          ? "Takeaway Customer"
          : orderMode === "delivery"
          ? "Delivery Customer"
          : "Walk-in Customer");

      const deltaItemsToPrint: any[] = [];
      let finalKitchenItems: any[] = [];
      let currentRound = 1;
      let existingOrderId: string | null = null;
      const offline = isOfflineNow();
      const hasPendingInsert =
        !offline && recalledKitchenOrderId
          ? await hasPendingKitchenOrderInsert(recalledKitchenOrderId)
          : false;
      const shouldQueueWrite = offline || hasPendingInsert;

      const orderTypeMap: Record<QSROrderMode, string> = {
        dine_in: "dine_in",
        takeaway: "takeaway",
        delivery: "delivery",
        nc: "nc",
      };

      const formattedOrderItems = orderItems.map((item) =>
        formatOrderItemString(item.quantity, item.name, item.price, item.notes),
      );

      if (shouldQueueWrite) {
        const nowIso = new Date().toISOString();

        if (recalledKitchenOrderId) {
          const localExisting = await getLocalOrder(recalledKitchenOrderId);
          const activeMatch = activeOrders.find(
            (o) => o.id === recalledKitchenOrderId,
          );
          const existingItems: any[] =
            localExisting?.items || activeMatch?.items || [];
          existingOrderId =
            localExisting?.orderId || activeMatch?.orderId || pendingOrderId || null;
          currentRound = (localExisting?.roundNumber || 1) + 1;

          finalKitchenItems = orderItems.map((item) => {
            const existingItem = existingItems.find(
              (ei: any) => ei.name === item.name && ei.price === item.price,
            );
            const previouslyPrinted = existingItem?.printed_qty || 0;
            const delta = item.quantity - previouslyPrinted;
            if (delta > 0) {
              deltaItemsToPrint.push({
                name: item.name,
                quantity: item.quantity,
                printed_qty: previouslyPrinted,
                price: item.price,
                notes: item.notes,
              });
            }
            return {
              name: item.name,
              quantity: item.quantity,
              printed_qty: item.quantity,
              price: item.price,
              menuItemId: item.menuItemId,
              notes: item.notes ? [item.notes] : [],
              priority: item.priority || "normal",
            };
          });

          await enqueueWrite(
            "kitchen_order",
            {
              id: recalledKitchenOrderId,
              items: finalKitchenItems,
              status: "new",
              source: `QSR-${orderSource}`,
              round_number: currentRound,
              started_at: null,
              completed_at: null,
              bumped_at: null,
            },
            "update",
          );

          if (existingOrderId) {
            await enqueueWrite(
              "order",
              {
                id: existingOrderId,
                items: formattedOrderItems,
                total,
              },
              "update",
            );
          }

          await saveLocalOrder({
            id: recalledKitchenOrderId,
            orderId: existingOrderId,
            restaurant_id: restaurantId,
            source: `QSR-${orderSource}`,
            tableId: selectedTable?.id || localExisting?.tableId || null,
            tableName: selectedTable?.name || localExisting?.tableName || null,
            orderType: orderMode,
            status: "new",
            priority: localExisting?.priority || "normal",
            roundNumber: currentRound,
            items: finalKitchenItems,
            itemCompletionStatus:
              localExisting?.itemCompletionStatus || activeMatch?.itemCompletionStatus || [],
            total,
            customerName: finalCustomerName,
            customerPhone: customerPhone || undefined,
            attendant: attendantName,
            createdAt: localExisting?.createdAt || activeMatch?.createdAt || nowIso,
            updatedAt: nowIso,
            synced: false,
          });
        } else {
          finalKitchenItems = orderItems.map((item) => {
            deltaItemsToPrint.push({
              name: item.name,
              quantity: item.quantity,
              printed_qty: 0,
              price: item.price,
              notes: item.notes,
            });
            return {
              name: item.name,
              quantity: item.quantity,
              printed_qty: item.quantity,
              price: item.price,
              menuItemId: item.menuItemId,
              notes: item.notes ? [item.notes] : [],
              priority: item.priority || "normal",
            };
          });

          // C-1: Reuse stable UUIDs across retries to prevent duplicate server rows
          const newOrderFingerprint = `${restaurantId}|new|${total}|${formattedOrderItems.join(",")}`;
          const reusedNew =
            pendingNewKitchenOrderRef.current?.fingerprint === newOrderFingerprint
              ? pendingNewKitchenOrderRef.current
              : null;
          const offlineOrderId = reusedNew?.orderId || crypto.randomUUID();
          const offlineKitchenOrderId = reusedNew?.kitchenOrderId || crypto.randomUUID();
          const offlineToken = reusedNew?.offlineToken || generateOfflineOrderNumber();
          pendingNewKitchenOrderRef.current = { fingerprint: newOrderFingerprint, orderId: offlineOrderId, kitchenOrderId: offlineKitchenOrderId, offlineToken };

          // Enqueue parent order + kitchen_order + local mirror atomically
          await commitLocalOrderAndWritesAtomic(
            {
              id: offlineKitchenOrderId,
              orderId: offlineOrderId,
              restaurant_id: restaurantId,
              source: `QSR-${orderSource}`,
              tableId: selectedTable?.id || null,
              tableName: selectedTable?.name || null,
              orderType: orderMode,
              status: "new",
              priority: "normal",
              roundNumber: 1,
              items: finalKitchenItems,
              itemCompletionStatus: orderItems.map(() => false),
              total,
              customerName: finalCustomerName,
              customerPhone: customerPhone || undefined,
              attendant: attendantName,
              offlineToken,
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
                  customer_phone: customerPhone || null,
                  items: formattedOrderItems,
                  total,
                  status: "pending",
                  source: "pos",
                  order_type:
                    orderMode === "nc"
                      ? "non-chargeable"
                      : orderMode.replace("_", "-"),
                  nc_reason: orderMode === "nc" ? ncReason : null,
                  attendant: attendantName,
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
                  source: `QSR-${orderSource}`,
                  status: "new",
                  items: finalKitchenItems,
                  order_type: orderTypeMap[orderMode],
                  customer_name: finalCustomerName,
                  customer_phone: customerPhone || null,
                  server_name: attendantName,
                  priority: "normal",
                  round_number: 1,
                  ...(selectedTable?.name && { table_number: selectedTable.name }),
                  created_at: nowIso,
                  updated_at: nowIso,
                },
              },
            ],
          );

          setPendingOrderId(offlineOrderId);
          setPendingKitchenOrderId(offlineKitchenOrderId);
          setPaymentOrderItems([...orderItems]);
        }

        const itemsToPrint =
          deltaItemsToPrint.length > 0 ? deltaItemsToPrint : orderItems;
        if (itemsToPrint.length > 0) {
          try {
            await thermalPrinterService.printKOT({
              tableName: selectedTable ? selectedTable.name : orderSource,
              serverName: attendantName,
              items: itemsToPrint,
              isAddition: currentRound > 1,
              roundNumber: currentRound,
              orderType: orderMode,
            });
          } catch (printErr: any) {
            console.error("[QSR POS] KOT print failed:", printErr);
            toast({
              variant: "destructive",
              title: "KOT Print Failed",
              description:
                printErr?.message ||
                "Order was queued, but the KOT could not be printed.",
            });
          }
        }

        if (orderMode === "dine_in" && selectedTable) {
          await updateTableStatus(selectedTable.id, "occupied");
        }
        pendingNewKitchenOrderRef.current = null; // C-1: clear after table status succeeds

        toast({
          title: offline ? "Sent to Kitchen (Offline) ✓" : "Sent to Kitchen ✓",
          description: offline
            ? "Order queued locally and will sync automatically when connected."
            : "Order queued behind pending local ticket — will sync automatically.",
        });

        setOrderItems([]);
        setRecalledKitchenOrderId(null);
        setShowMobileCart(false);
        setSelectedTable(null);
        setCustomerName("");
        setCustomerPhone("");
        setNcReason("");
        refetchTables();

        queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
        queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["all-orders"] });
        return;
      }

      if (recalledKitchenOrderId) {
        // Fetch existing kitchen order to get previous items and round
        const { data: existingKitchenOrder, error: fetchError } = await supabase
          .from("kitchen_orders")
          .select("id, items, order_id, round_number")
          .eq("id", recalledKitchenOrderId)
          .maybeSingle();
          
        if (fetchError) throw fetchError;
        if (!existingKitchenOrder) {
          toast({
            variant: "destructive",
            title: "Order not found",
            description: "The order might have been completed or deleted",
          });
          return;
        }

        currentRound = (existingKitchenOrder.round_number || 1) + 1;
        existingOrderId = existingKitchenOrder.order_id;
        
        // Ensure items is an array
        const existingItems = Array.isArray(existingKitchenOrder.items) ? existingKitchenOrder.items : [];
        
        finalKitchenItems = orderItems.map((item) => {
          // Find existing item by name and price
          const existingItem = existingItems.find((ei: any) => ei.name === item.name && ei.price === item.price);
          const previouslyPrinted = existingItem?.printed_qty || 0;
          const delta = item.quantity - previouslyPrinted;
          
          if (delta > 0) {
            deltaItemsToPrint.push({
              name: item.name,
              quantity: item.quantity,
              printed_qty: previouslyPrinted, // Important: pass previous qty to calculate delta in printer service
              price: item.price,
              notes: item.notes
            });
          }
          
          return {
            name: item.name,
            quantity: item.quantity,
            printed_qty: item.quantity, // Mark as fully printed now
            price: item.price,
            menuItemId: item.menuItemId,
            notes: item.notes ? [item.notes] : [],
            priority: item.priority || "normal",
          };
        });

        // Update existing kitchen order
        const { error: updateError } = await supabase
          .from("kitchen_orders")
          .update({
            items: finalKitchenItems,
            status: "new",
            source: `QSR-${orderSource}`,
            round_number: currentRound,
            // Note: NOT resetting created_at - preserves original order timing
            started_at: null, // Reset preparation status
            completed_at: null,
            bumped_at: null,
          })
          .eq("id", recalledKitchenOrderId);

        if (updateError) throw updateError;

        // Update linked order total
        if (existingOrderId) {
          const { error: orderUpdateError } = await supabase
            .from("orders")
            .update({
              items: orderItems.map((item) =>
                formatOrderItemString(item.quantity, item.name, item.price, item.notes)
              ),
              total: total
            })
            .eq("id", existingOrderId);
            
          if (orderUpdateError) {
            console.error("Failed to update linked order:", orderUpdateError);
          }
        }
      } else {
        // Build order type for KDS
        const orderTypeMap: Record<QSROrderMode, string> = {
          dine_in: "dine_in",
          takeaway: "takeaway",
          delivery: "delivery",
          nc: "nc", // NC stored as 'nc' for proper recall
        };

        // First round: all items are new
        finalKitchenItems = orderItems.map((item) => {
          deltaItemsToPrint.push({
            name: item.name,
            quantity: item.quantity,
            printed_qty: 0,
            price: item.price,
            notes: item.notes
          });
          
          return {
            name: item.name,
            quantity: item.quantity,
            printed_qty: item.quantity,
            price: item.price,
            menuItemId: item.menuItemId,
            notes: item.notes ? [item.notes] : [],
            priority: item.priority || "normal",
          };
        });

        // Create new kitchen order
        const { data: kitchenOrder, error: kitchenError } = await supabase
          .from("kitchen_orders")
          .insert({
            restaurant_id: restaurantId,
            source: `QSR-${orderSource}`,
            status: "new",
            items: finalKitchenItems,
            order_type: orderTypeMap[orderMode],
            customer_name: finalCustomerName, // Use actual customer name
            customer_phone: customerPhone || null, // Add phone
            server_name: attendantName,
            priority: "normal",
            round_number: 1,
          })
          .select()
          .single();


        if (kitchenError) throw kitchenError;

        // Create corresponding order record
        const { data: createdOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            customer_name: finalCustomerName, // Use actual customer name
            customer_phone: customerPhone || null, // Add phone
            items: orderItems.map((item) =>
              formatOrderItemString(item.quantity, item.name, item.price, item.notes)
            ),
            total: total,
            status: "pending",
            source: "pos",
            order_type:
              orderMode === "nc"
                ? "non-chargeable"
                : orderMode.replace("_", "-"),
            nc_reason: orderMode === "nc" ? ncReason : null, // Store NC reason
            attendant: attendantName,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        existingOrderId = createdOrder?.id;

        // Link kitchen order to order record
        if (createdOrder?.id && kitchenOrder?.id) {
          await supabase
            .from("kitchen_orders")
            .update({ order_id: createdOrder.id })
            .eq("id", kitchenOrder.id);

          // Store for post-pay flow
          setPendingOrderId(createdOrder.id);
          setPendingKitchenOrderId(kitchenOrder.id);
          setPaymentOrderItems([...orderItems]); // Copy for payment dialog
        }
      }

      // Send to thermal printer (Bluetooth or USB/Browser auto-fallback)
      const itemsToPrint = deltaItemsToPrint.length > 0 ? deltaItemsToPrint : orderItems;
      if (itemsToPrint.length > 0) {
        try {
          await thermalPrinterService.printKOT({
            tableName: selectedTable ? selectedTable.name : orderSource,
            serverName: attendantName,
            items: itemsToPrint,
            isAddition: currentRound > 1,
            roundNumber: currentRound,
            orderType: orderMode,
          });
        } catch (printErr: any) {
          console.error("[QSR POS] KOT print failed:", printErr);
          toast({
            variant: "destructive",
            title: "KOT Print Notice",
            description: printErr?.message || "Could not print KOT receipt",
          });
        }
      }

      // Update table status if dine-in
      if (orderMode === "dine_in" && selectedTable) {
        await updateTableStatus(selectedTable.id, "occupied");
      }

      toast({
        title: "Sent to Kitchen",
        description: "Order sent. Ready for payment when customer is done.",
      });

      // Reset cart and clear selected table to prevent duplicate orders
      setOrderItems([]);
      setRecalledKitchenOrderId(null);
      setShowMobileCart(false); // Close cart sheet on mobile
      setSelectedTable(null);
      setCustomerName(""); // Clear customer name
      setCustomerPhone(""); // Clear customer phone
      setNcReason(""); // Clear NC reason
      refetchTables();

      // Invalidate active orders query immediately
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
    } catch (error) {
      console.error("Error sending to kitchen:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send order to kitchen",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    orderItems,
    restaurantId,
    orderMode,
    selectedTable,
    total,
    attendantName,
    customerName,
    customerPhone,
    ncReason,
    recalledKitchenOrderId,
    pendingOrderId,
    activeOrders,
    isOfflineNow,
    queryClient,
    toast,
    updateTableStatus,
    refetchTables,
  ]);

  // Hold order
  const handleHoldOrder = useCallback(async () => {
    if (orderItems.length === 0 || !restaurantId) return;

    setIsLoading(true);
    try {
      // Determine order source/customer name
      const orderSource =
        orderMode === "dine_in" && selectedTable
          ? tableLabel(selectedTable.name)
          : orderMode.charAt(0).toUpperCase() +
            orderMode.slice(1).replace("_", " ");

      // Use customer name if provided; fallback to table/mode-based defaults to avoid null constraint errors on orders relation
      const finalCustomerName =
        customerName.trim() ||
        (orderMode === "dine_in" && selectedTable
          ? tableLabel(selectedTable.name)
          : orderMode === "takeaway"
          ? "Takeaway Customer"
          : orderMode === "delivery"
          ? "Delivery Customer"
          : "Walk-in Customer");

      const kitchenItems = orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        menuItemId: item.menuItemId,
        notes: item.notes ? [item.notes] : [],
      }));

      const total = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const offline = isOfflineNow();
      // H-2: also queue-write when a pending insert exists for a recalled order
      const hasPendingHoldInsert =
        !offline && recalledKitchenOrderId
          ? await hasPendingKitchenOrderInsert(recalledKitchenOrderId)
          : false;
      if (offline || hasPendingHoldInsert) {
        const nowIso = new Date().toISOString();
        const formattedItems = orderItems.map((item) =>
          formatOrderItemString(item.quantity, item.name, item.price, item.notes),
        );

        if (recalledKitchenOrderId) {
          const localExisting = await getLocalOrder(recalledKitchenOrderId);
          const existingItems: any[] =
            localExisting?.items ||
            activeOrders.find((o) => o.id === recalledKitchenOrderId)?.items ||
            [];
          const preservedKitchenItems = orderItems.map((item) => {
            const existingItem = existingItems.find(
              (ei: any) => ei.name === item.name && ei.price === item.price,
            );
            return {
              name: item.name,
              quantity: item.quantity,
              printed_qty: existingItem?.printed_qty || 0,
              price: item.price,
              menuItemId: item.menuItemId,
              notes: item.notes ? [item.notes] : [],
            };
          });
          const preservedRound =
            localExisting?.roundNumber ||
            (activeOrders.find((o) => o.id === recalledKitchenOrderId) as any)
              ?.roundNumber ||
            1;
          await enqueueWrite(
            "kitchen_order",
            {
              id: recalledKitchenOrderId,
              items: preservedKitchenItems,
              status: "held",
              source: `QSR-${orderSource}`,
              round_number: preservedRound,
            },
            "update",
          );
          const resolvedHoldOrderId = localExisting?.orderId || pendingOrderId || null;
          // H-3: Always enqueue parent order update (resolve from kitchen_order_id if localExisting was absent)
          await enqueueWrite(
            "order",
            {
              id: resolvedHoldOrderId || recalledKitchenOrderId,
              ...(!resolvedHoldOrderId && {
                _resolveOrderIdFromKitchenOrderId: recalledKitchenOrderId,
              }),
              items: formattedItems,
              total,
              status: "held",
            },
            "update",
          );
          await saveLocalOrder({
            id: recalledKitchenOrderId,
            orderId: localExisting?.orderId || pendingOrderId || null,
            restaurant_id: restaurantId,
            source: `QSR-${orderSource}`,
            tableId: selectedTable?.id || localExisting?.tableId || null,
            tableName: selectedTable?.name || localExisting?.tableName || null,
            orderType: orderMode,
            status: "held",
            priority: localExisting?.priority || "normal",
            roundNumber: preservedRound,
            items: preservedKitchenItems,
            ...(localExisting?.itemCompletionStatus && {
              itemCompletionStatus: localExisting.itemCompletionStatus,
            }),
            ...(localExisting?.offlineToken && {
              offlineToken: localExisting.offlineToken,
            }),
            total,
            customerName: finalCustomerName,
            customerPhone: customerPhone || undefined,
            attendant: attendantName,
            createdAt: localExisting?.createdAt || nowIso,
            updatedAt: nowIso,
            synced: false,
          });
        } else {
          // H-1: Reuse stable UUIDs across hold-order retries to prevent duplicate rows
          const holdFingerprint = `hold|${restaurantId}|${total}|${formattedItems.join(",")}`;
          const reusedHold =
            pendingNewKitchenOrderRef.current?.fingerprint === holdFingerprint
              ? pendingNewKitchenOrderRef.current
              : null;
          const offlineOrderId = reusedHold?.orderId || crypto.randomUUID();
          const offlineKitchenOrderId = reusedHold?.kitchenOrderId || crypto.randomUUID();
          const holdOfflineToken = reusedHold?.offlineToken || generateOfflineOrderNumber();
          if (!reusedHold) {
            pendingNewKitchenOrderRef.current = { fingerprint: holdFingerprint, orderId: offlineOrderId, kitchenOrderId: offlineKitchenOrderId, offlineToken: holdOfflineToken };
          }

          await commitLocalOrderAndWritesAtomic(
            {
              id: offlineKitchenOrderId,
              orderId: offlineOrderId,
              restaurant_id: restaurantId,
              source: `QSR-${orderSource}`,
              tableId: selectedTable?.id || null,
              tableName: selectedTable?.name || null,
              orderType: orderMode,
              status: "held",
              priority: "normal",
              items: kitchenItems,
              total,
              customerName: finalCustomerName,
              customerPhone: customerPhone || undefined,
              attendant: attendantName,
              offlineToken: holdOfflineToken,
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
                  customer_phone: customerPhone || null,
                  items: formattedItems,
                  total,
                  status: "held",
                  source: "pos",
                  order_type:
                    orderMode === "nc"
                      ? "non-chargeable"
                      : orderMode.replace("_", "-"),
                  nc_reason: orderMode === "nc" ? ncReason : null,
                  attendant: attendantName,
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
                  source: `QSR-${orderSource}`,
                  status: "held",
                  items: kitchenItems,
                  server_name: attendantName,
                  order_type: orderMode,
                  customer_name: finalCustomerName,
                  customer_phone: customerPhone || null,
                  created_at: nowIso,
                  updated_at: nowIso,
                },
              },
            ],
          );
        }

        toast({
          title: "Order Held Locally ✓",
          description: "Saved offline — recall anytime or sync when online.",
        });

        setOrderItems([]);
        setRecalledKitchenOrderId(null);
        setSelectedTable(null);
        setCustomerName("");
        setCustomerPhone("");
        setNcReason("");
        pendingNewKitchenOrderRef.current = null; // H-1: clear on hold success

        queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
        queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["all-orders"] });
        return;
      }

      if (recalledKitchenOrderId) {
        // Update existing kitchen order
        await supabase
          .from("kitchen_orders")
          .update({
            items: kitchenItems,
            status: "held",
            source: `QSR-${orderSource}`,
          })
          .eq("id", recalledKitchenOrderId);
      } else {
        // Create new held order with linked orders record for proper tracking
        // First create the orders record
        const { data: createdOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            customer_name: finalCustomerName, // Use actual customer name
            items: orderItems.map((item) =>
              formatOrderItemString(item.quantity, item.name, item.price, item.notes)
            ),
            total: total,
            status: "held",
            source: "pos",
            order_type:
              orderMode === "nc"
                ? "non-chargeable"
                : orderMode.replace("_", "-"),
            nc_reason: orderMode === "nc" ? ncReason : null, // Store NC reason
            attendant: attendantName,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create kitchen order linked to the orders record
        const { error: kitchenError } = await supabase
          .from("kitchen_orders")
          .insert({
            restaurant_id: restaurantId,
            source: `QSR-${orderSource}`,
            status: "held",
            items: kitchenItems,
            server_name: attendantName,
            order_id: createdOrder?.id, // Link to orders record
            order_type: orderMode, // Save order type for recall
          });

        if (kitchenError) throw kitchenError;
      }

      toast({
        title: "Order Held",
        description: "Order saved and can be recalled later",
      });

      setOrderItems([]);
      setRecalledKitchenOrderId(null);
      setSelectedTable(null);
      setCustomerName("");
      setCustomerPhone("");
      setNcReason("");

      // Invalidate active orders query immediately
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
    } catch (error) {
      console.error("Error holding order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to hold order",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    orderItems,
    restaurantId,
    orderMode,
    selectedTable,
    recalledKitchenOrderId,
    pendingOrderId,
    customerName,
    customerPhone,
    ncReason,
    attendantName,
    isOfflineNow,
    queryClient,
    toast,
  ]);

  // Recall order from active orders drawer
  const handleRecallOrder = useCallback(
    (order: ActiveKitchenOrder) => {
      tableSelectReqRef.current += 1;
      // Restore customer details from recalled order if available
      setCustomerName((order as any).customer_name || order.customerName || "");
      setCustomerPhone((order as any).customer_phone || order.customerPhone || "");
      setNcReason("");
      setPendingKitchenOrderId(null);
      setPendingOrderId(order.orderId || null);
      setPaymentOrderItems([]);

      const mappedItems: QSROrderItem[] = order.items.map((item, idx) => {
        const menuItem = menuItems.find(
          (m) => m.name.toLowerCase() === item.name.toLowerCase(),
        );
        return {
          id: `${order.id}-${idx}`,
          menuItemId: menuItem?.id || `custom-${idx}`,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          printed_qty: (item as any).printed_qty || 0,
          isCustom: !menuItem,
          notes: Array.isArray(item.notes) ? item.notes.join(", ") : item.notes,
        };
      });

      setOrderItems(mappedItems);
      setRecalledKitchenOrderId(order.id);
      setItemCompletionStatus(order.itemCompletionStatus || []);
      setShowActiveOrders(false);

      // Automatically switch mode based on recalled order's type
      if (order.orderType) {
        setOrderMode(order.orderType);
      }

      // Try to extract and select table for dine-in orders
      if (order.orderType === "dine_in") {
        // Find the table by checking if its name is contained in the source string
        // Sort by length descending to match longer names first (e.g. "Table 10" before "Table 1")
        const sortedTables = [...tables].sort((a, b) => b.name.length - a.name.length);
        const table = sortedTables.find((t) =>
          order.source.toLowerCase().includes(t.name.toLowerCase())
        );
        if (table) {
          setSelectedTable(table);
        }
      } else {
        // Clear table selection for non-dine-in orders
        setSelectedTable(null);
      }

      toast({
        title: "Order Recalled",
        description: `Recalled order from ${order.source} - Mode: ${order.orderType || "unknown"}`,
      });
    },
    [
      menuItems,
      tables,
      setOrderMode,
      setSelectedTable,
      toast,
    ],
  );

  // Handle proceed to payment directly from active orders
  const handleProceedToPayment = useCallback(
    (order: ActiveKitchenOrder) => {
      // H-6: Snapshot current POS workspace state so closing without paying restores it
      drawerCheckoutSnapshotRef.current = {
        orderMode,
        selectedTable,
        recalledKitchenOrderId,
        pendingOrderId,
        pendingKitchenOrderId,
        paymentOrderItems,
      } as any;
      // Map order items for payment
      const mappedItems: QSROrderItem[] = order.items.map((item, idx) => {
        const menuItem = menuItems.find(
          (m) => m.name.toLowerCase() === item.name.toLowerCase(),
        );
        return {
          id: `${order.id}-${idx}`,
          menuItemId: menuItem?.id || `custom-${idx}`,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          printed_qty: (item as any).printed_qty || 0,
          isCustom: !menuItem,
          notes: Array.isArray(item.notes) ? item.notes.join(", ") : item.notes,
        };
      });

      // Store the items for payment dialog
      setPaymentOrderItems(mappedItems);
      setCheckoutSource("drawer");
      setPendingKitchenOrderId(order.id);
      setPendingOrderId(order.orderId || null);
      setRecalledKitchenOrderId(order.id);
      
      // Update the current mode to match the order being paid
      if (order.orderType) {
        setOrderMode(order.orderType as QSROrderMode);
      }

      // Try to extract table from source (clear inherited table first so non-matching sources don't inherit workspace table)
      setSelectedTable(null);
      if ((order.orderType || orderMode) === "dine_in") {
        const sortedTables = [...tables].sort((a, b) => b.name.length - a.name.length);
        const table = sortedTables.find((t) =>
          order.source.toLowerCase().includes(t.name.toLowerCase())
        );
        if (table) {
          setSelectedTable(table);
        }
      }

      // Open payment dialog (drawer stays open in background)
      setShowPaymentDialog(true);
    },
    [menuItems, tables, orderMode, selectedTable, recalledKitchenOrderId, pendingOrderId, pendingKitchenOrderId, paymentOrderItems],
  );

  // Handle payment dialog close - Clear all payment state
  const handlePaymentDialogClose = useCallback(() => {
    setShowPaymentDialog(false);
    // Clear payment state to prevent stale data on next open
    setPaymentOrderItems([]);
    setPendingKitchenOrderId(null);
    setCheckoutSource(null);
    // H-6: Restore previous POS workspace state if user cancelled drawer payment
    if (drawerCheckoutSnapshotRef.current) {
      const snap = drawerCheckoutSnapshotRef.current as any;
      drawerCheckoutSnapshotRef.current = null;
      setOrderMode(snap.orderMode);
      setSelectedTable(snap.selectedTable);
      setRecalledKitchenOrderId(snap.recalledKitchenOrderId);
      setPendingOrderId(snap.pendingOrderId);
      setPendingKitchenOrderId(snap.pendingKitchenOrderId ?? null);
      setPaymentOrderItems(snap.paymentOrderItems ?? []);
    }
  }, []);

  // Payment success handler - Supports both pre-pay and post-pay flows (online + offline)
  const handlePaymentSuccess = useCallback(
    async (paymentDetails?: {
      method?: string;
      paymentStatus?: string;
      total?: number;
      subtotal?: number;
      discountAmount?: number;
      discountPercentage?: number;
      discountNotes?: string;
      ncReason?: string;
      splitPayments?: Array<{ method: string; amount: number }>;
      customerName?: string;
      customerMobile?: string;
      items?: any[];
      offlineQueued?: boolean;
      loyaltyPointsRedeemed?: number;
      loyaltyCustomerId?: string;
      loyaltyDiscountAmount?: number;
      roomId?: string;
      deferParentClose?: boolean;
    }) => {
      try {
        let currentTable = selectedTable;
        const currentMode = orderMode;
        const finalMethod = paymentDetails?.method || (currentMode === "nc" ? "nc" : "paid");
        const finalPaymentStatus = paymentDetails?.paymentStatus || (currentMode === "nc" ? "nc" : "paid");
        const splitPayments = paymentDetails?.splitPayments || null;
        const wasQueuedOffline =
          paymentDetails?.offlineQueued !== undefined
            ? Boolean(paymentDetails.offlineQueued)
            : isOfflineNow();

        // Determine the effective kitchen order ID (pendingKitchenOrderId OR recalledKitchenOrderId)
        const effectiveKitchenOrderId = pendingKitchenOrderId || recalledKitchenOrderId;

        // If selectedTable was cleared (after Send to Kitchen), resolve table from local or online kitchen order
        if (!currentTable && currentMode === "dine_in" && effectiveKitchenOrderId) {
          try {
            const localKo = await getLocalOrder(effectiveKitchenOrderId);
            const koSource =
              localKo?.source ||
              activeOrders.find((o) => o.id === effectiveKitchenOrderId)?.source ||
              (!wasQueuedOffline && !isOfflineNow()
                ? (
                    await supabase
                      .from("kitchen_orders")
                      .select("source")
                      .eq("id", effectiveKitchenOrderId)
                      .maybeSingle()
                  ).data?.source
                : undefined);

            if (koSource) {
              const sortedTables = [...tables].sort((a, b) => b.name.length - a.name.length);
              const matched = sortedTables.find((t) =>
                koSource.toLowerCase().includes(t.name.toLowerCase()),
              );
              if (matched) currentTable = matched;
            }
          } catch (e) {
            console.warn("[QSR] Could not resolve table from kitchen order source:", e);
          }
        }

        const finalCustomerName =
          paymentDetails?.customerName?.trim() ||
          customerName.trim() ||
          (currentMode === "dine_in" && currentTable
            ? tableLabel(currentTable.name)
            : currentMode === "takeaway"
            ? "Takeaway Customer"
            : currentMode === "delivery"
            ? "Delivery Customer"
            : "Walk-in Customer");
        const finalCustomerPhone =
          paymentDetails?.customerMobile?.trim() || customerPhone.trim() || null;

        const persistPrePayOffline = async (
          existingServerKitchenOrderId?: string | null,
          existingServerOrderId?: string | null,
          existingServerTxnId?: string | null,
        ) => {
          if (!restaurantId) return;
          const activeItems =
            paymentDetails?.items && paymentDetails.items.length > 0
              ? paymentDetails.items
              : orderItems;
          if (activeItems.length === 0) return;

          const orderSource =
            currentMode === "dine_in" && currentTable
              ? tableLabel(currentTable.name)
              : currentMode === "takeaway"
              ? "Takeaway"
              : currentMode === "delivery"
              ? "Delivery"
              : "Non-Chargeable";

          const paymentCustomerName =
            paymentDetails?.customerName?.trim() ||
            customerName.trim() ||
            (currentMode === "dine_in" && currentTable
              ? tableLabel(currentTable.name)
              : currentMode === "takeaway"
              ? "Takeaway Customer"
              : currentMode === "delivery"
              ? "Delivery Customer"
              : "Walk-in Customer");

          const rawSubtotal = activeItems.reduce(
            (sum, item) =>
              sum +
              ((item as any).calculatedPrice ??
                (item as any).customPrice ??
                item.price) *
                item.quantity,
            0,
          );
          const orderTotal =
            paymentDetails?.total !== undefined
              ? paymentDetails.total
              : rawSubtotal;
          const isNC = currentMode === "nc" || finalMethod === "nc";
          const effectiveNcReason = paymentDetails?.ncReason || ncReason || null;
          const nowIso = new Date().toISOString();

          const kitchenItems = activeItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price:
              (item as any).calculatedPrice ??
              (item as any).customPrice ??
              item.price,
            menuItemId: item.menuItemId,
            notes: item.notes
              ? Array.isArray(item.notes)
                ? item.notes
                : [item.notes]
              : [],
          }));

          const orderItemsFormatted = activeItems.map((item) =>
            formatOrderItemString(
              item.quantity,
              item.name,
              (item as any).calculatedPrice ??
                (item as any).customPrice ??
                item.price,
              Array.isArray(item.notes) ? item.notes.join(", ") : item.notes,
            ),
          );

          const discountAmt = isNC
            ? rawSubtotal
            : paymentDetails?.discountAmount || 0;
          const discountPct = isNC
            ? 100
            : paymentDetails?.discountPercentage || 0;

          const fingerprint = `${restaurantId}|${isNC ? 0 : orderTotal}|${finalMethod}|${orderItemsFormatted.join(",")}`;
          const reused =
            pendingOfflinePrePayRef.current?.fingerprint === fingerprint
              ? pendingOfflinePrePayRef.current
              : null;
          const offlineOrderId =
            existingServerOrderId || reused?.orderId || crypto.randomUUID();
          // H-5: If server kitchen_order was already inserted before later failure, reuse its ID
          const offlineKitchenOrderId =
            existingServerKitchenOrderId || reused?.kitchenOrderId || crypto.randomUUID();
          const offlineToken =
            reused?.offlineToken || generateOfflineOrderNumber();
          // C-2: stable txnId for pos_transaction idempotency across retries
          const offlineTxnId = reused?.txnId || crypto.randomUUID();
          pendingOfflinePrePayRef.current = {
            fingerprint,
            orderId: offlineOrderId,
            kitchenOrderId: offlineKitchenOrderId,
            offlineToken,
            txnId: offlineTxnId,
          };

          await enqueueWrite(
            "order",
            {
              id: offlineOrderId,
              restaurant_id: restaurantId,
              customer_name: paymentCustomerName,
              customer_phone: finalCustomerPhone,
              items: orderItemsFormatted,
              status: isNC ? "nc" : "completed",
              total: isNC ? 0 : orderTotal,
              order_type: isNC ? "non-chargeable" : currentMode,
              nc_reason: isNC ? effectiveNcReason : null,
              source: "pos",
              payment_status: finalPaymentStatus,
              payment_method: finalMethod,
              ...(splitPayments &&
                splitPayments.length > 0 && {
                  split_payments: splitPayments,
                }),
              discount_amount: discountAmt,
              discount_percentage: discountPct,
              ...(paymentDetails?.discountNotes && {
                discount_notes: paymentDetails.discountNotes,
              }),
              attendant: attendantName,
              created_at: nowIso,
              updated_at: nowIso,
            },
            existingServerOrderId ? "update" : "insert",
          );

          await enqueueWrite(
            "kitchen_order",
            {
              id: offlineKitchenOrderId,
              order_id: offlineOrderId,
              restaurant_id: restaurantId,
              source: `QSR-${orderSource}`,
              status: "completed",
              items: kitchenItems,
              order_type: currentMode === "nc" ? "takeaway" : currentMode,
              customer_name: paymentCustomerName,
              customer_phone: finalCustomerPhone,
              server_name: attendantName,
              priority: "normal",
              _deductInventory: true,
              bumped_at: nowIso,
              created_at: nowIso,
              updated_at: nowIso,
            },
            existingServerKitchenOrderId ? "update" : "insert",
          );

          if (!isNC && !existingServerTxnId) {
            await enqueueWrite(
              "pos_transaction",
              {
                id: offlineTxnId, // C-2: stable idempotency key across retries
                restaurant_id: restaurantId,
                order_id: offlineOrderId,
                kitchen_order_id: offlineKitchenOrderId,
                amount: orderTotal,
                payment_method: finalMethod,
                status:
                  finalPaymentStatus === "pending" ? "pending" : "completed",
                customer_name: paymentCustomerName || null,
                customer_phone: finalCustomerPhone,
                staff_id: user?.id || null,
                discount_amount: discountAmt,
                ...(splitPayments && { split_payments: splitPayments }),
                created_at: nowIso,
                updated_at: nowIso,
              },
              "insert",
            );
          }

          if (
            (paymentDetails?.loyaltyPointsRedeemed || 0) > 0 &&
            (paymentDetails?.loyaltyCustomerId || finalCustomerPhone)
          ) {
            await enqueueWrite(
              "loyalty_redemption",
              {
                restaurant_id: restaurantId,
                customer_id: paymentDetails?.loyaltyCustomerId || null,
                customer_phone: finalCustomerPhone,
                transaction_type: "redeem",
                source: currentTable ? "pos" : "qsr",
                source_id: offlineOrderId,
                points_redeemed: paymentDetails?.loyaltyPointsRedeemed,
                notes: `Redeemed at checkout`,
                created_by: user?.id || null,
              },
              "insert",
            );
          }

          if (finalMethod === "room" && paymentDetails?.roomId) {
            await enqueueWrite(
              "room_food_order",
              {
                room_id: paymentDetails.roomId,
                order_id: offlineOrderId,
                total: orderTotal,
                status: "pending",
              },
              "insert",
            );
          }

          await saveLocalOrder({
            id: offlineKitchenOrderId,
            orderId: offlineOrderId,
            restaurant_id: restaurantId,
            source: `QSR-${orderSource}`,
            tableId: currentTable?.id || null,
            tableName: currentTable?.name || null,
            orderType: currentMode,
            status: "completed",
            priority: "normal",
            items: kitchenItems,
            total: isNC ? 0 : orderTotal,
            subtotal: rawSubtotal,
            discount: discountPct || discountAmt || undefined,
            discountType: discountPct
              ? "percentage"
              : discountAmt
              ? "amount"
              : undefined,
            customerName: paymentCustomerName,
            customerPhone: finalCustomerPhone || undefined,
            attendant: attendantName,
            paymentMethod: finalMethod,
            paymentStatus: finalPaymentStatus,
            splitPayments: splitPayments || undefined,
            offlineToken,
            createdAt: nowIso,
            updatedAt: nowIso,
            completedAt: nowIso,
            synced: false,
          });
          pendingOfflinePrePayRef.current = null;
        };

        const drawerSnap =
          checkoutSource === "drawer" ? drawerCheckoutSnapshotRef.current : null;
        const snapEffectiveId = drawerSnap
          ? drawerSnap.pendingKitchenOrderId || drawerSnap.recalledKitchenOrderId
          : null;
        const paidSameAsRecalled =
          !drawerSnap || snapEffectiveId === effectiveKitchenOrderId;

        if (wasQueuedOffline) {
          if (effectiveKitchenOrderId) {
            // POST-PAY OFFLINE: PaymentDialog / MobilePaymentDialog already queued the DB updates & localOrders mirror.
            if (paidSameAsRecalled) {
              setPendingOrderId(null);
              setPendingKitchenOrderId(null);
              setOrderItems([]);
              setRecalledKitchenOrderId(null);
            }
            setPaymentOrderItems([]);
          } else {
            await persistPrePayOffline();
          }

          drawerCheckoutSnapshotRef.current = null;
          if (paidSameAsRecalled) {
            setOrderItems([]);
            setRecalledKitchenOrderId(null);
            setPendingOrderId(null);
            setPendingKitchenOrderId(null);
            setCustomerName("");
            setCustomerPhone("");
            setNcReason("");
          } else if (drawerSnap) {
            setOrderMode(drawerSnap.orderMode);
            setSelectedTable(drawerSnap.selectedTable);
            setRecalledKitchenOrderId(drawerSnap.recalledKitchenOrderId);
            setPendingOrderId(drawerSnap.pendingOrderId);
            setPendingKitchenOrderId(drawerSnap.pendingKitchenOrderId ?? null);
          }
          setPaymentOrderItems([]);
          setCheckoutSource(null);

          if (currentMode === "dine_in" && currentTable) {
            await updateTableStatus(currentTable.id, "available");
            if (paidSameAsRecalled || drawerSnap?.selectedTable?.id === currentTable.id) {
              setSelectedTable(null);
            }
          }
          refetchTables();

          if (!paymentDetails?.deferParentClose) {
            toast({
              title: "Payment Saved Locally ✓",
              description:
                "No internet — bill queued and will sync automatically when connected.",
            });
            setShowPaymentDialog(false);
          }
          setShowActiveOrders(false);

          queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
          queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
          queryClient.invalidateQueries({ queryKey: ["active-orders"] });
          queryClient.invalidateQueries({ queryKey: ["all-orders"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
          queryClient.invalidateQueries({ queryKey: ["qsr-tables"] });
          queryClient.invalidateQueries({ queryKey: ["past-orders"] });
          queryClient.invalidateQueries({ queryKey: ["qsr-todays-revenue"] });
          return;
        }

        // Check if this is post-pay (order already in kitchen)
        let deferredToOffline = false;
        if (effectiveKitchenOrderId) {
          // POST-PAY: Order already in kitchen — update existing order, don't create a new one
          const activeItems = (paymentDetails?.items && paymentDetails.items.length > 0)
            ? paymentDetails.items
            : checkoutSource === "drawer"
            ? paymentOrderItems
            : (orderItems.length > 0 ? orderItems : paymentOrderItems);
          const orderTotal = paymentDetails?.total !== undefined
            ? paymentDetails.total
            : activeItems.reduce(
                (sum, item) => sum + ((item as any).calculatedPrice ?? (item as any).customPrice ?? item.price) * item.quantity, 0
              );
          const isNC = currentMode === "nc";

          const kitchenItems = activeItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: (item as any).calculatedPrice ?? (item as any).customPrice ?? item.price,
            menuItemId: item.menuItemId,
            notes: item.notes ? (Array.isArray(item.notes) ? item.notes : [item.notes]) : [],
          }));

          const orderItemsFormatted = activeItems.map(
            (item) => formatOrderItemString(
              item.quantity,
              item.name,
              (item as any).calculatedPrice ?? (item as any).customPrice ?? item.price,
              Array.isArray(item.notes) ? item.notes.join(", ") : item.notes,
            )
          );

          let resolvedPostPayOrderId: string | null = pendingOrderId || null;
          try {
            const { data: updatedKitchenOrder, error: kitchenUpdateError } = await supabase
              .from("kitchen_orders")
              .update({
                items: kitchenItems,
                bumped_at: new Date().toISOString(),
                status: "completed",
                ...(finalCustomerName && { customer_name: finalCustomerName }),
                ...(finalCustomerPhone && { customer_phone: finalCustomerPhone }),
              })
              .eq("id", effectiveKitchenOrderId)
              .select("order_id")
              .maybeSingle();

            if (kitchenUpdateError) throw kitchenUpdateError;

            const linkedOrderId = pendingOrderId || updatedKitchenOrder?.order_id;

            if (linkedOrderId) {
              const { error: orderUpdateError } = await supabase
                .from("orders")
                .update({
                  status: isNC ? "nc" : "completed",
                  items: orderItemsFormatted,
                  total: isNC ? 0 : orderTotal,
                  payment_status: finalPaymentStatus,
                  payment_method: finalMethod,
                  customer_name: finalCustomerName,
                  customer_phone: finalCustomerPhone,
                  ...(splitPayments && splitPayments.length > 0 && { split_payments: splitPayments }),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", linkedOrderId);
              if (orderUpdateError) throw orderUpdateError;
            } else if (restaurantId) {
              const { data: createdOrder, error: createOrderError } = await supabase
                .from("orders")
                .insert({
                  restaurant_id: restaurantId,
                  customer_name: finalCustomerName,
                  customer_phone: finalCustomerPhone,
                  items: orderItemsFormatted,
                  status: isNC ? "nc" : "completed",
                  total: isNC ? 0 : orderTotal,
                  order_type: isNC ? "non-chargeable" : currentMode.replace("_", "-"),
                  nc_reason: isNC ? ncReason || null : null,
                  source: "pos",
                  payment_status: finalPaymentStatus,
                  payment_method: finalMethod,
                  ...(splitPayments && splitPayments.length > 0 && { split_payments: splitPayments }),
                  attendant: attendantName,
                })
                .select()
                .maybeSingle();
              if (createOrderError) throw createOrderError;

              if (createdOrder?.id) {
                resolvedPostPayOrderId = createdOrder.id;
                const { error: linkErr } = await supabase
                  .from("kitchen_orders")
                  .update({ order_id: createdOrder.id })
                  .eq("id", effectiveKitchenOrderId);
                if (linkErr) throw linkErr;
              }
            }
          } catch (postPayErr) {
            console.warn("[QSR] Post-pay parent finalization deferred offline:", postPayErr);
            deferredToOffline = true;
            const nowIso = new Date().toISOString();
            const localExisting = await getLocalOrder(effectiveKitchenOrderId).catch(
              () => undefined,
            );
            const fallbackOrderId = resolvedPostPayOrderId || pendingOrderId || localExisting?.orderId || null;

            await enqueueWrite(
              "kitchen_order",
              {
                id: effectiveKitchenOrderId,
                items: kitchenItems,
                bumped_at: nowIso,
                status: "completed",
                ...(finalCustomerName && { customer_name: finalCustomerName }),
                ...(finalCustomerPhone && { customer_phone: finalCustomerPhone }),
              },
              "update",
            );
            await enqueueWrite(
              "order",
              {
                id: fallbackOrderId || effectiveKitchenOrderId,
                ...(!fallbackOrderId && {
                  _resolveOrderIdFromKitchenOrderId: effectiveKitchenOrderId,
                }),
                status: isNC ? "nc" : "completed",
                items: orderItemsFormatted,
                total: isNC ? 0 : orderTotal,
                payment_status: finalPaymentStatus,
                payment_method: finalMethod,
                customer_name: finalCustomerName,
                customer_phone: finalCustomerPhone,
                ...(splitPayments && splitPayments.length > 0 && { split_payments: splitPayments }),
                updated_at: nowIso,
              },
              "update",
            );
            if (restaurantId) {
              await saveLocalOrder({
                ...(localExisting || {
                  id: effectiveKitchenOrderId,
                  orderId: fallbackOrderId,
                  restaurant_id: restaurantId,
                  source: currentTable ? `QSR-${tableLabel(currentTable.name)}` : "QSR-POS",
                  orderType: currentMode,
                  priority: "normal",
                  createdAt: nowIso,
                }),
                id: effectiveKitchenOrderId,
                orderId: fallbackOrderId,
                status: "completed",
                items: kitchenItems,
                total: isNC ? 0 : orderTotal,
                customerName: finalCustomerName,
                customerPhone: finalCustomerPhone || undefined,
                paymentMethod: finalMethod,
                paymentStatus: finalPaymentStatus,
                splitPayments: splitPayments || undefined,
                updatedAt: nowIso,
                completedAt: nowIso,
                synced: false,
              });
            }
          }

          if (paidSameAsRecalled) {
            setPendingOrderId(null);
            setPendingKitchenOrderId(null);
            setOrderItems([]);
            setRecalledKitchenOrderId(null);
          }
          setPaymentOrderItems([]);
        } else if ((orderItems.length > 0 || (paymentDetails?.items && paymentDetails.items.length > 0)) && restaurantId) {
          // PRE-PAY: No existing kitchen order — create order directly as completed
          const activeItems = (paymentDetails?.items && paymentDetails.items.length > 0)
            ? paymentDetails.items
            : orderItems;
          const orderSource =
            currentMode === "dine_in" && currentTable
              ? tableLabel(currentTable.name)
              : currentMode === "takeaway"
                ? "Takeaway"
                : currentMode === "delivery"
                  ? "Delivery"
                  : "Non-Chargeable";

          const paymentCustomerName =
            customerName.trim() ||
            (currentMode === "dine_in" && currentTable
              ? tableLabel(currentTable.name)
              : currentMode === "takeaway"
              ? "Takeaway Customer"
              : currentMode === "delivery"
              ? "Delivery Customer"
              : "Walk-in Customer");

          const orderTotal = paymentDetails?.total !== undefined
            ? paymentDetails.total
            : activeItems.reduce(
                (sum, item) => sum + ((item as any).calculatedPrice ?? (item as any).customPrice ?? item.price) * item.quantity,
                0,
              );
          const isNC = currentMode === "nc";

          const kitchenItems = activeItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: (item as any).calculatedPrice ?? (item as any).customPrice ?? item.price,
            menuItemId: item.menuItemId,
            notes: item.notes ? (Array.isArray(item.notes) ? item.notes : [item.notes]) : [],
          }));

          const orderItemsFormatted = activeItems.map(
            (item) => formatOrderItemString(
              item.quantity,
              item.name,
              (item as any).calculatedPrice ?? (item as any).customPrice ?? item.price,
              Array.isArray(item.notes) ? item.notes.join(", ") : item.notes,
            )
          );
          const onlineFingerprint = `${restaurantId}|${isNC ? 0 : orderTotal}|${finalMethod}|${orderItemsFormatted.join(",")}`;
          const reusedOnline =
            pendingOnlinePrePayRef.current?.fingerprint === onlineFingerprint
              ? pendingOnlinePrePayRef.current
              : null;

          let createdKitchenOrderId: string | null = reusedOnline?.kitchenOrderId || null;
          let createdOrderId: string | null = reusedOnline?.orderId || null;
          let createdTxnId: string | null = reusedOnline?.txnId || null;
          const saveOnlineProgress = () => {
            pendingOnlinePrePayRef.current = {
              fingerprint: onlineFingerprint,
              kitchenOrderId: createdKitchenOrderId,
              orderId: createdOrderId,
              txnId: createdTxnId,
            };
          };

          try {
            if (!createdKitchenOrderId) {
              const { data: kitchenOrder, error: kitchenError } = await supabase
                .from("kitchen_orders")
                .insert({
                  restaurant_id: restaurantId,
                  source: `QSR-${orderSource}`,
                  status: "completed",
                  items: kitchenItems,
                  order_type: currentMode === "nc" ? "takeaway" : currentMode,
                  customer_name: paymentCustomerName,
                  server_name: attendantName,
                  priority: "normal",
                  bumped_at: new Date().toISOString(),
                })
                .select()
                .maybeSingle();

              if (kitchenError) throw kitchenError;
              createdKitchenOrderId = kitchenOrder?.id || null;
              saveOnlineProgress();
            }

            if (!createdOrderId) {
              const { data: createdOrder, error: orderError } = await supabase
                .from("orders")
                .insert({
                  restaurant_id: restaurantId,
                  customer_name: paymentCustomerName,
                  items: orderItemsFormatted,
                  status: "completed",
                  total: isNC ? 0 : orderTotal,
                  order_type: isNC ? "non-chargeable" : currentMode,
                  nc_reason: isNC ? ncReason || null : null,
                  source: "pos",
                  payment_status: finalPaymentStatus,
                  payment_method: finalMethod,
                  ...(splitPayments && splitPayments.length > 0 && { split_payments: splitPayments }),
                  discount_amount: isNC ? orderTotal : 0,
                  discount_percentage: isNC ? 100 : 0,
                  attendant: attendantName,
                })
                .select()
                .maybeSingle();

              if (orderError) throw orderError;
              createdOrderId = createdOrder?.id || null;
              saveOnlineProgress();

              if (createdOrderId && createdKitchenOrderId) {
                const { error: linkErr } = await supabase
                  .from("kitchen_orders")
                  .update({ order_id: createdOrderId })
                  .eq("id", createdKitchenOrderId);
                if (linkErr) throw linkErr;
              }
            }

            if (!isNC && restaurantId && !createdTxnId) {
              const { data: authData } = await supabase.auth.getUser();
              const prePayTxnId = crypto.randomUUID();
              const { error: txnErr } = await supabase.from("pos_transactions").insert({
                id: prePayTxnId,
                restaurant_id: restaurantId,
                order_id: createdOrderId || null,
                kitchen_order_id: createdKitchenOrderId || null,
                amount: orderTotal,
                payment_method: finalMethod,
                status: finalPaymentStatus === "pending" ? "pending" : "completed",
                customer_name: paymentCustomerName || null,
                staff_id: authData?.user?.id || user?.id || null,
                ...(splitPayments && { split_payments: splitPayments }),
              });
              if (txnErr) throw txnErr;
              createdTxnId = prePayTxnId;
              saveOnlineProgress();
            }

            if (finalMethod === "room" && paymentDetails?.roomId && createdOrderId && restaurantId) {
              const { error: roomErr } = await supabase.from("room_food_orders").insert({
                room_id: paymentDetails.roomId,
                order_id: createdOrderId,
                restaurant_id: restaurantId,
                customer_name: paymentCustomerName || "Room Guest",
                total: orderTotal,
                status: "pending",
              });
              if (roomErr) throw roomErr;
            }

            pendingOnlinePrePayRef.current = null;

            if (createdKitchenOrderId) {
              try {
                const { data: deductResult, error: deductError } =
                  await supabase.functions.invoke("deduct-inventory-on-prep", {
                    body: { order_id: createdKitchenOrderId },
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
                console.error("Inventory deduction failed (non-blocking):", invErr);
              }
            }
          } catch (prePayErr) {
            console.warn("[QSR] Pre-pay parent finalization deferred offline:", prePayErr);
            deferredToOffline = true;
            await persistPrePayOffline(createdKitchenOrderId, createdOrderId, createdTxnId);
          }
        }

        drawerCheckoutSnapshotRef.current = null;
        // Clear cart, order, and customer details (preserve unrelated cart if paying from drawer)
        if (paidSameAsRecalled) {
          setOrderItems([]);
          setRecalledKitchenOrderId(null);
          setPendingOrderId(null);
          setPendingKitchenOrderId(null);
          setCustomerName("");
          setCustomerPhone("");
          setNcReason("");
        } else if (drawerSnap) {
          setOrderMode(drawerSnap.orderMode);
          setSelectedTable(drawerSnap.selectedTable);
          setRecalledKitchenOrderId(drawerSnap.recalledKitchenOrderId);
          setPendingOrderId(drawerSnap.pendingOrderId);
          setPendingKitchenOrderId(drawerSnap.pendingKitchenOrderId ?? null);
        }
        setPaymentOrderItems([]);
        setCheckoutSource(null);

        // Free up table if dine-in
        if (currentMode === "dine_in" && currentTable) {
          try {
            await updateTableStatus(currentTable.id, "available");
          } catch {
            /* offline fallback handled inside useQSRTables */
          }
          if (paidSameAsRecalled || drawerSnap?.selectedTable?.id === currentTable.id) {
            setSelectedTable(null);
          }
        }
        refetchTables();

        if (!paymentDetails?.deferParentClose) {
          toast({
            title: deferredToOffline ? "Finalization Saved Locally ✓" : "Payment Complete",
            description: deferredToOffline
              ? "Order updates queued locally and will sync automatically when online."
              : "Order has been paid and completed",
          });
          setShowPaymentDialog(false);
        }
        setShowActiveOrders(false); // Close Active Orders drawer after successful payment

        // Invalidate active orders queries to reflect completed payment
        queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
        queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["all-orders"] }); // Orders Management view
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
        queryClient.invalidateQueries({ queryKey: ["qsr-tables"] });
        queryClient.invalidateQueries({ queryKey: ["past-orders"] });
        queryClient.invalidateQueries({ queryKey: ["qsr-todays-revenue"] });
      } catch (error) {
        console.error("Error completing payment:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to complete payment",
        });
        throw error; // C-4: propagate so callers (PaymentDialog/MobilePaymentDialog) don't show success UI
      }
    },
    [
      pendingOrderId,
      pendingKitchenOrderId,
      recalledKitchenOrderId,
      orderItems,
      paymentOrderItems,
      orderMode,
      selectedTable,
      tables,
      activeOrders,
      restaurantId,
      customerName,
      customerPhone,
      ncReason,
      attendantName,
      user?.id,
      isOfflineNow,
      updateTableStatus,
      refetchTables,
      queryClient,
      toast,
    ],
  );

  // Delete active order handler - initiates confirmation
  const handleDeleteActiveOrder = useCallback((order: ActiveKitchenOrder) => {
    setOrderToDelete({ order, type: "active" });
  }, []);

  // Delete past order handler - initiates confirmation
  const handleDeletePastOrder = useCallback((order: PastOrder) => {
    setOrderToDelete({ order, type: "past" });
  }, []);

  // Execute the actual deletion after confirmation (supports offline queue)
  const executeDeleteOrder = useCallback(async () => {
    const { order, type } = orderToDelete;
    if (!order) return;

    try {
      const offline = isOfflineNow();
      const localExisting = await getLocalOrder(order.id).catch(() => undefined);

      if (offline || localExisting) {
        const removedCount = await removeQueuedWritesForOrder(
          order.id,
          order.orderId,
        );

        if (removedCount > 0 && localExisting && !localExisting.synced) {
          // Purely local unsynced order — removing from queue & localOrders leaves no server footprint
          await deleteLocalOrder(order.id);
        } else {
          // Order already existed on server — store local tombstone and queue deletes
          if (restaurantId) {
            await saveLocalOrder({
              ...(localExisting || {
                id: order.id,
                orderId: order.orderId || null,
                restaurant_id: restaurantId,
                source: order.source,
                orderType: "takeaway",
                priority: "normal",
                items: order.items || [],
                total: order.total || 0,
                createdAt: order.createdAt,
              }),
              status: "deleted",
              updatedAt: new Date().toISOString(),
            });
          }
          await enqueueWrite(
            "kitchen_order_delete",
            { id: order.id },
            "delete",
          );
          if (order.orderId) {
            await enqueueWrite(
              "order_delete",
              { id: order.orderId },
              "delete",
            );
          }
        }

        if (type === "active") {
          queryClient.invalidateQueries({
            queryKey: ["active-kitchen-orders", restaurantId],
          });
        } else {
          queryClient.invalidateQueries({
            queryKey: ["past-orders", restaurantId],
          });
        }
        queryClient.invalidateQueries({ queryKey: ["qsr-tables"] });
        queryClient.invalidateQueries({ queryKey: ["qsr-todays-revenue"] });

        toast({
          title: offline ? "Order Deleted (Offline)" : "Order Deleted",
          description: offline
            ? `Order from ${order.source} removed locally and queued for sync`
            : `Order from ${order.source} has been deleted`,
        });
        return;
      }

      // Delete from kitchen_orders
      const { error: kitchenError } = await supabase
        .from("kitchen_orders")
        .delete()
        .eq("id", order.id);

      if (kitchenError) throw kitchenError;

      // If there's a linked order in orders table, delete it too
      if (order.orderId) {
        const { error: orderError } = await supabase
          .from("orders")
          .delete()
          .eq("id", order.orderId);

        if (orderError) {
          console.error("Error deleting linked order:", orderError);
        }
      }

      // Invalidate queries to refresh data
      if (type === "active") {
        queryClient.invalidateQueries({
          queryKey: ["active-kitchen-orders", restaurantId],
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: ["past-orders", restaurantId],
        });
      }
      // Always invalidate Orders Management and QSR caches
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });

      toast({
        title: "Order Deleted",
        description: `Order from ${order.source} has been deleted`,
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete order",
      });
    } finally {
      setOrderToDelete({ order: null, type: null });
    }
  }, [orderToDelete, restaurantId, isOfflineNow, queryClient, toast]);

  // Determine what to show in main area
  const showTableSelection = orderMode === "dine_in" && !selectedTable;
  const showMenu = orderMode !== "dine_in" || selectedTable;

  // Back-to-tables handler (shared)
  const handleBackToTables = useCallback(() => {
    setSelectedTable(null);
    if (orderItems.length > 0 && !pendingKitchenOrderId && !recalledKitchenOrderId) {
      setOrderItems([]);
    }
  }, [orderItems.length, pendingKitchenOrderId, recalledKitchenOrderId]);

  // Refresh tables with toast
  const handleRefreshTables = useCallback(() => {
    refetchTables();
    toast({ title: "Refreshed", description: "Tables status updated", duration: 1500 });
  }, [refetchTables, toast]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">

      {/* ═══ MOBILE HEADER (V2 feature-gated, hidden on md+) ═══ */}
      {useMobileV2 && (
        <div className="md:hidden">
          <QSRMobileHeader
            restaurantName={restaurantName}
            orderMode={orderMode}
            selectedTableName={selectedTable?.name ?? null}
            activeOrdersCount={activeOrders.length}
            todaysRevenue={canViewRevenue ? todaysRevenue : undefined}
            isPrinterConnected={isPrinterConnected}
            isReconnecting={isReconnecting}
            printerName={printerName}
            paperSize={paperSize}
            onBackToTables={handleBackToTables}
            onRefreshTables={handleRefreshTables}
            onOpenActiveOrders={() => setShowActiveOrders(true)}
            onOpenPastOrders={() => setShowPastOrders(true)}
            onPrinterToggle={() => setShowPrinterDialog(true)}
            onOpenPrinterSetup={() => setShowPrinterDialog(true)}
          >
            <QSRModeSelector
              selectedMode={orderMode}
              onModeChange={handleModeChange}
              compact
            />
          </QSRMobileHeader>
        </div>
      )}

      {/* ═══ DESKTOP HEADER (always shown on md+; shown on mobile when V2 is off) ═══ */}
      <div className={useMobileV2 ? "hidden md:block" : "block"}>
        <div className="flex-shrink-0 sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {orderMode === "dine_in" && selectedTable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToTables}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground border-dashed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Tables</span>
                  </Button>
                )}
                <Zap className="w-6 h-6 text-indigo-500" />
                <div>
                  {restaurantName && (
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-0.5">
                      {restaurantName}
                    </p>
                  )}
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {orderMode === "dine_in" && selectedTable
                      ? tableLabel(selectedTable.name)
                      : "QSR POS"}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPrinterDialog(true)}
                  className={`flex items-center gap-1.5 ${
                    isPrinterConnected
                      ? "border-green-400 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950/50"
                      : isReconnecting
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                      : "border-dashed"
                  }`}
                  disabled={isReconnecting}
                  title="Configure Printer & Paper Size"
                >
                  {isPrinterConnected ? (
                    <PrinterCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Printer className={`w-4 h-4 ${isReconnecting ? "animate-pulse text-amber-500" : "text-indigo-500"}`} />
                  )}
                  <span className="hidden sm:inline text-xs font-semibold">
                    {isPrinterConnected
                      ? `${printerName || "Printer"} (${paperSize}mm)`
                      : isReconnecting
                      ? "Reconnecting..."
                      : `Printer (${paperSize}mm)`}
                  </span>
                </Button>
                <HelpProvider />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshTables}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  title="Refresh Tables"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowActiveOrders(true)}
                  className="flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">Active Orders</span>
                  {activeOrders.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                      {activeOrders.length}
                    </span>
                  )}
                </Button>
                {canShowRiderTracking && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRiderTracking(true)}
                    className={`flex items-center gap-1.5 rounded-xl font-bold transition-all shadow-xs ${
                      ridersAtStore.length > 0
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse"
                        : "border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                    }`}
                    title="Live Aggregator Delivery Riders"
                  >
                    <Bike className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="hidden sm:inline text-xs">Riders</span>
                    {totalActiveRiders > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] bg-purple-600 text-white rounded-full font-extrabold">
                        {totalActiveRiders}
                      </span>
                    )}
                  </Button>
                )}
                {canShow86Button && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShow86Modal(true)}
                    className={`flex items-center gap-1.5 rounded-xl font-bold transition-all shadow-xs ${
                      unavailableCount > 0
                        ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                        : "border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                    }`}
                    title="1-Click 86 Out of Stock Cascade"
                  >
                    <Zap className="w-4 h-4 text-rose-600 dark:text-rose-400 fill-rose-600" />
                    <span className="hidden sm:inline text-xs">86 Items</span>
                    {unavailableCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] bg-rose-600 text-white rounded-full font-extrabold">
                        {unavailableCount}
                      </span>
                    )}
                  </Button>
                )}

                {/* Kitchen Load & Surge Throttle Gauge (only when online delivery active) */}
                {isOnlineDeliveryEnabled && <KitchenLoadGauge compact />}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPastOrders(true)}
                  className="flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  <span className="hidden sm:inline">Past Orders</span>
                </Button>
                {canViewRevenue && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg shadow-sm">
                    <TrendingUp className="w-4 h-4" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-[10px] font-medium opacity-90">TODAY'S REVENUE</span>
                      <span className="text-sm font-bold">{formatIndianCurrency(todaysRevenue).formatted}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <QSRModeSelector
              selectedMode={orderMode}
              onModeChange={handleModeChange}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4">
        {/* Left Panel - Order Pad (Desktop only) - Sticky */}
        <div className="hidden md:block w-[35%] min-w-[320px] max-w-[400px] sticky top-0 self-start h-[calc(100vh-140px)] overflow-y-auto">
          <QSROrderPad
            items={orderItems}
            mode={orderMode}
            selectedTable={selectedTable}
            subtotal={subtotal}
            tax={tax}
            total={total}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onAddNote={handleAddNote}
            onSendToKitchen={handleSendToKitchen}
            onHoldOrder={handleHoldOrder}
            onProceedToPayment={() => {
              setCheckoutSource("cart");
              setShowPaymentDialog(true);
            }}
            onClearOrder={handleClearOrder}
            onAddCustomItem={() => setShowCustomItemDialog(true)}
            onChangeTable={() => {
              setSelectedTable(null);
              // Clear cart if there are items and no order sent yet
              if (
                orderItems.length > 0 &&
                !pendingKitchenOrderId &&
                !recalledKitchenOrderId
              ) {
                setOrderItems([]);
              }
            }}
            isLoading={isLoading}
            itemCompletionStatus={itemCompletionStatus}
            onToggleItemCompletion={handleToggleItemCompletion}
            isRecalledOrder={
              !!(recalledKitchenOrderId || pendingKitchenOrderId)
            }
            onSetItemPriority={handleSetItemPriority}
            onReorderItems={handleReorderItems}
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
            customerPhone={customerPhone}
            onCustomerPhoneChange={handleCustomerPhoneChange}
            isLookingUpCustomer={isLookingUpCustomer}
          />
        </div>

        {/* Right Panel - Selection Area - Scrollable with fixed height */}
        {/* Mobile: h-[calc(100vh-200px)] to account for header + FAB, Desktop: h-[calc(100vh-140px)] */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-200px)] md:h-[calc(100vh-140px)]">
          <div className="h-full overflow-y-auto">
            {showTableSelection ? (
              <QSRTableGrid
                tables={tables}
                selectedTableId={selectedTable?.id || null}
                onSelectTable={handleSelectTable}
                isLoading={tablesLoading}
                onRetry={refetchTables}
              />
            ) : showMenu ? (
              <QSRMenuGrid
                menuItems={menuItems}
                categories={categories}
                onAddItem={handleAddItem}
                cartItemCounts={cartItemCounts}
                isLoading={menuLoading}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Cart FAB */}
      <QSRCartFAB
        itemCount={orderItems.reduce((sum, item) => sum + item.quantity, 0)}
        total={total}
        onClick={() => setShowMobileCart(true)}
      />

      {/* Mobile Cart Bottom Sheet */}
      <QSRCartBottomSheet
        isOpen={showMobileCart}
        onClose={() => setShowMobileCart(false)}
        items={orderItems}
        mode={orderMode}
        selectedTable={selectedTable}
        subtotal={subtotal}
        tax={tax}
        total={total}
        onIncrement={handleIncrement}
        onDecrement={handleDecrement}
        onRemove={handleRemove}
        onAddNote={handleAddNote}
        onSendToKitchen={handleSendToKitchen}
        onHoldOrder={handleHoldOrder}
        onProceedToPayment={() => {
          setCheckoutSource("cart");
          setShowPaymentDialog(true);
        }}
        onClearOrder={handleClearOrder}
        onAddCustomItem={() => setShowCustomItemDialog(true)}
        onChangeTable={() => {
          setSelectedTable(null);
          // Clear cart if there are items and no order sent yet
          if (
            orderItems.length > 0 &&
            !pendingKitchenOrderId &&
            !recalledKitchenOrderId
          ) {
            setOrderItems([]);
          }
        }}
        isLoading={isLoading}
        menuItems={menuItems}
        onAddMenuItem={handleAddItem}
        ncReason={ncReason}
        onNcReasonChange={setNcReason}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerPhone={customerPhone}
        onCustomerPhoneChange={handleCustomerPhoneChange}
        isLookingUpCustomer={isLookingUpCustomer}
        onSetItemPriority={handleSetItemPriority}
        onReorderItems={handleReorderItems}
      />

      {/* Active Orders Drawer */}
      <QSRActiveOrdersDrawer
        isOpen={showActiveOrders}
        onClose={() => setShowActiveOrders(false)}
        orders={activeOrders}
        isLoading={ordersLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRecallOrder={handleRecallOrder}
        onProceedToPayment={handleProceedToPayment}
        onToggleItemCompletion={toggleItemCompletion}
        onDeleteOrder={handleDeleteActiveOrder}
        onPriorityChange={handlePriorityChange}
        restaurantName={restaurantName}
      />

      {/* Past Orders Drawer */}
      <QSRPastOrdersDrawer
        isOpen={showPastOrders}
        onClose={() => setShowPastOrders(false)}
        orders={pastOrders}
        isLoading={pastOrdersLoading}
        searchQuery={pastSearchQuery}
        onSearchChange={setPastSearchQuery}
        dateFilter={pastDateFilter}
        onDateFilterChange={setPastDateFilter}
        onDeleteOrder={handleDeletePastOrder}
        customStartDate={pastCustomStartDate}
        customEndDate={pastCustomEndDate}
        onCustomStartDateChange={setPastCustomStartDate}
        onCustomEndDateChange={setPastCustomEndDate}
        restaurantName={restaurantName}
      />

      {/* Custom Item Dialog */}
      <QSRCustomItemDialog
        isOpen={showCustomItemDialog}
        onClose={() => setShowCustomItemDialog(false)}
        onAddItem={handleAddCustomItem}
      />

      {/* Payment Dialog - Uses cart items for pre-pay, stored items for post-pay */}
      <AdaptivePaymentDialog
        isOpen={showPaymentDialog}
        onClose={handlePaymentDialogClose}
        orderItems={paymentDialogItems}
        onSuccess={handlePaymentSuccess}
        tableNumber={selectedTable?.name || ""}
        onEditOrder={handlePaymentDialogClose}
        orderId={pendingKitchenOrderId || recalledKitchenOrderId || undefined}
        linkedOrderId={pendingOrderId || undefined}
        isNonChargeable={orderMode === "nc"}
        serverName={attendantName}
        initialCustomerName={customerName}
        initialCustomerMobile={customerPhone}
      />

      {/* Delete Order Confirmation Dialog */}
      <AlertDialog
        open={orderToDelete.order !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOrderToDelete({ order: null, type: null });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Order
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              {orderToDelete.type === "past" ? "completed " : ""}order from{" "}
              <span className="font-semibold">
                {orderToDelete.order?.source}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeleteOrder}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Printer Setup Dialog */}
      <QSRPrinterDialog
        isOpen={showPrinterDialog}
        onClose={() => setShowPrinterDialog(false)}
        onPrinterStateChange={refreshPrinterStatus}
      />
      {/* 1-Click 86 Stock Auto-Kill Dialog */}
      {canShow86Button && (
        <Quick86Modal
          isOpen={show86Modal}
          onClose={() => setShow86Modal(false)}
        />
      )}
    </div>
  );
};
