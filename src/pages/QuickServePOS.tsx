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
} from "@/components/QuickServe/QSOrderPanel";
import { QSCustomerInput } from "@/components/QuickServe/QSCustomerInput";
import { QSPaymentSheet } from "@/components/QuickServe/QSPaymentSheet";
import {
  QSOrderHistory,
  RecalledOrderItem,
} from "@/components/QuickServe/QSOrderHistory";
import { QSActiveOrders } from "@/components/QuickServe/QSActiveOrders";
import { QSCustomItemDialog } from "@/components/QuickServe/QSCustomItemDialog";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DailySummaryDialog } from "@/components/QuickServe/DailySummaryDialog";

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
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();

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
  const { restaurantId } = useRestaurantId();

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
        .eq("status", "completed")
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
        .eq("status", "completed")
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
    // Refresh active orders and stats
    queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
    queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
    queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });
    queryClient.invalidateQueries({ queryKey: ["food-truck-today-stats"] });
  }, [queryClient]);

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

  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const orderTotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

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

        {/* Action Buttons Row */}
        <div className="relative flex items-center gap-1.5 px-4 pb-3">
          <button
            onClick={() => setShowActiveOrders(true)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 transition-all active:scale-95"
          >
            <ChefHat className="h-3.5 w-3.5 text-amber-200" />
            <span className="text-xs font-semibold text-white">Active</span>
          </button>

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
          />
          <QSOrderPanel
            items={orderItems}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onRemove={handleRemove}
            onClear={handleClear}
            onProceedToPayment={() => setShowPayment(true)}
            discountAmount={discountAmount}
            discountPercentage={discountPercentage}
            onDiscountChange={handleDiscountChange}
            onAddCustomItem={() => setShowCustomItem(true)}
          />
        </div>
      </div>

      {/* ─── Mobile: Floating Cart Button ─── */}
      {itemCount > 0 && (
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
              discountAmount={discountAmount}
              discountPercentage={discountPercentage}
              onDiscountChange={handleDiscountChange}
              onAddCustomItem={() => setShowCustomItem(true)}
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
