import React, { useState, useCallback, useMemo } from "react";
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
import { QSActiveOrders } from "@/components/QuickServe/QSActiveOrders";
import { QSCustomItemDialog } from "@/components/QuickServe/QSCustomItemDialog";
import { QSHeldOrdersDrawer } from "@/components/QuickServe/QSHeldOrdersDrawer";
import { useHeldOrders } from "@/hooks/useHeldOrders";
import { useAuth } from "@/hooks/useAuth";
import { useCRMSync } from "@/hooks/useCRMSync";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import {
  History,
  ShoppingBag,
  ChefHat,
  FileText,
  TrendingUp,
  Hash,
  Zap,
  PauseCircle,
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
  const [editingOrderItems, setEditingOrderItems] = useState<QSOrderItem[]>([]);
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  const { user } = useAuth();
  const { syncCustomerToCRM } = useCRMSync();
  const { heldOrders, heldCount, holdOrder, resumeOrder, deleteHeldOrder } = useHeldOrders();

  // Fetch loyalty program settings for redemption cap and point value
  const { data: loyaltyProgram } = useQuery({
    queryKey: ["loyalty-program-qs", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from("loyalty_programs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") {
        console.error("Loyalty program fetch error:", error);
        return null;
      }
      return data;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 30,
  });

  // Fetch active coupons
  const { data: availableCoupons = [] } = useQuery({
    queryKey: ["active-coupons", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const today = new Date().toISOString();
      const { data, error } = await supabase
        .from("promotion_campaigns")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today);
        
      if (error) {
        console.error("Failed to fetch coupons:", error);
        return [];
      }
      return data;
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

  // Today's revenue
  const { data: todaysRevenue = 0 } = useQuery({
    queryKey: ["quickserve-todays-revenue", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      const today = new Date();
      const { data } = await supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .in("status", ["preparing", "ready", "completed"])
        .eq("payment_status", "paid")
        .neq("order_type", "non-chargeable")
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString());
      if (!data) return 0;
      return data.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Today's order count
  const { data: todaysOrderCount = 0 } = useQuery({
    queryKey: ["quickserve-todays-count", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      const today = new Date();
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .in("status", ["preparing", "ready", "completed"])
        .eq("payment_status", "paid")
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString());
      return count || 0;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
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

  const handleClear = useCallback(() => {
    setOrderItems([]);
    setCustomerName("");
    setCustomerPhone("");
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
        notes: [],
      }));
      const formattedItems = orderItems.map(
        (item) => `${item.quantity}x ${item.name} @${item.price}`,
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

      // Generate daily sequential order token
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

      // Initialize item completion status
      const initialCompletionStatus = orderItems.map(() => false);

      // ─── UPDATE MODE: Append items to existing order ───────────────
      if (editingOrderId) {
        // Fetch current order to get existing items
        const { data: existingOrder, error: fetchErr } = await supabase
          .from("orders")
          .select("items, total, item_completion_status, order_number")
          .eq("id", editingOrderId)
          .single();

        if (fetchErr) throw fetchErr;

        const existingItems: string[] = existingOrder?.items || [];
        const existingTotal: number = existingOrder?.total || 0;
        const existingCompletion: boolean[] = existingOrder?.item_completion_status || [];
        const orderNumber = existingOrder?.order_number || 0;

        // Merge items + total + completion status
        const mergedItems = [...existingItems, ...formattedItems];
        const mergedTotal = existingTotal + orderTotal;
        const mergedCompletion = [...existingCompletion, ...initialCompletionStatus];

        // 1. Update the existing order record
        const { error: updateErr } = await supabase
          .from("orders")
          .update({
            items: mergedItems,
            total: mergedTotal,
            item_completion_status: mergedCompletion,
          })
          .eq("id", editingOrderId);

        if (updateErr) throw updateErr;

        // 2. Create a NEW kitchen order for the new items only
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
              const { data: { session } } = await supabase.auth.getSession();
              await supabase.functions.invoke("deduct-inventory-on-prep", {
                body: { order_id: kitchenOrder.id },
                headers: { Authorization: `Bearer ${session?.access_token}` },
              });
            } catch (err) {
              console.error("Inventory deduction failed:", err);
            }
          })();
        }

        toast({
          title: `Token #${String(orderNumber).padStart(3, "0")} — Items Added`,
          description: `${orderItems.length} new items sent to kitchen`,
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
        setEditingOrderItems([]);

        queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
        queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
        queryClient.invalidateQueries({ queryKey: ["food-truck-today-stats"] });
        return; // skip new order creation
      }
      // ────────────────────────────────────────────────────────────────

      // 1. Create kitchen order
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

      const totalDiscountAmount =
        discountValue + couponDiscountAmount + (loyaltyDiscountAmount || 0);

      // Build discount notes
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

      // 2. Create order with payment_status: "pending"
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

      // Link kitchen order → order & inventory deduction (background)
      if (order?.id && kitchenOrder?.id) {
        (async () => {
          try {
            await supabase
              .from("kitchen_orders")
              .update({ order_id: order.id })
              .eq("id", kitchenOrder.id);
          } catch (err) {
            console.error("Link kitchen→order error:", err);
          }
        })();
        (async () => {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            await supabase.functions.invoke("deduct-inventory-on-prep", {
              body: { order_id: kitchenOrder.id },
              headers: { Authorization: `Bearer ${session?.access_token}` },
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
    loyaltyDiscountAmount, loyaltyPointsUsed, appliedCoupon, toast,
    queryClient, syncCustomerToCRM, editingOrderId,
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
        const todayStr = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from("promotion_campaigns")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("promotion_code", code.trim())
          .eq("is_active", true)
          .lte("start_date", todayStr)
          .gte("end_date", todayStr)
          .maybeSingle();

        if (error || !data) {
          setCouponError("Invalid or expired coupon");
          return;
        }

        setAppliedCoupon({
          id: data.id,
          code: data.promotion_code,
          name: data.name,
          discount_percentage: data.discount_percentage,
          discount_amount: data.discount_amount,
        });
        
        // Reset manual discount when applying a coupon to avoid double dipping
        setDiscountAmount(0);
        setDiscountPercentage(0);

        toast({
          title: "Coupon Applied",
          description: `${data.name} applied successfully!`,
          duration: 2000,
        });
      } catch (e) {
        setCouponError("Failed to apply coupon");
      } finally {
        setCouponLoading(false);
      }
    },
    [restaurantId, toast],
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

      // Parse existing items and load them as read-only reference
      const existingParsed: QSOrderItem[] = order.items.map((itemStr, idx) => {
        const match = itemStr.match(/^(\d+)x\s+(.+?)\s+@(\d+(?:\.\d+)?)$/);
        if (match) {
          return {
            id: `existing-${idx}`,
            menuItemId: `existing-menu-${idx}`,
            name: match[2],
            price: parseFloat(match[3]),
            quantity: parseInt(match[1]),
            isCustom: true,
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
      setEditingOrderItems(existingParsed);
      setOrderItems([]); // Start fresh cart for new items
      setCustomerName(order.customer_name || "");
      setCustomerPhone(order.customer_phone || "");
      setShowActiveOrders(false);
      setShowMobileCart(false);

      toast({
        title: `Editing Order #${String(order.order_number || 0).padStart(3, "0")}`,
        description: "Add new items and click Kitchen to send them",
        duration: 3000,
      });
    },
    [orderItems, toast],
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
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/10">
              <TrendingUp className="h-3 w-3 text-emerald-300" />
              <span className="text-xs font-bold text-white">
                {currencySymbol}
                {todaysRevenue.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5 px-4 pb-3">
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
            onClick={() => setShowDailySummary(true)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 transition-all active:scale-95 ml-auto"
          >
            <FileText className="h-3.5 w-3.5 text-pink-200" />
            <span className="text-xs font-semibold text-white">End Day</span>
          </button>
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
        <div className="hidden md:flex flex-col w-80 lg:w-96 bg-white/60 dark:bg-white/5 backdrop-blur-xl border-l border-white/20 dark:border-white/5 min-h-0 overflow-hidden">
          <QSCustomerInput
            customerName={customerName}
            customerPhone={customerPhone}
            onNameChange={setCustomerName}
            onPhoneChange={setCustomerPhone}
            onCustomerFound={handleCustomerFound}
          />
          <QSOrderPanel
            items={orderItems}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onClear={handleClear}
            onProceedToPayment={() => setShowPayment(true)}
            onHoldOrder={handleHoldOrder}
            onSendToKitchen={handleSendToKitchen}
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
              setEditingOrderItems([]);
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
            />
            <QSOrderPanel
              items={orderItems}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onClear={handleClear}
              onProceedToPayment={() => {
                setShowMobileCart(false);
                setShowPayment(true);
              }}
              onHoldOrder={handleHoldOrder}
              onSendToKitchen={handleSendToKitchen}
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
                setEditingOrderItems([]);
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
        isOpen={showDailySummary}
        onClose={() => setShowDailySummary(false)}
      />
    </div>
  );
};

export default QuickServePOS;
