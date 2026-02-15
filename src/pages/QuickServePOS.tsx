import React, { useState, useCallback, useMemo } from "react";
import { useQSRMenuItems, QSRMenuItem } from "@/hooks/useQSRMenuItems";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import { QSMenuGrid } from "@/components/QuickServe/QSMenuGrid";
import {
  QSOrderPanel,
  QSOrderItem,
} from "@/components/QuickServe/QSOrderPanel";
import { QSCustomerInput } from "@/components/QuickServe/QSCustomerInput";
import { QSPaymentSheet } from "@/components/QuickServe/QSPaymentSheet";
import { QSOrderHistory } from "@/components/QuickServe/QSOrderHistory";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { History, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const QuickServePOS: React.FC = () => {
  const [orderItems, setOrderItems] = useState<QSOrderItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();

  // Menu data
  const { menuItems, categories, isLoading: menuLoading } = useQSRMenuItems();
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
  }, []);

  const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const orderTotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">
              QuickServe POS
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-white/40">
              Counter & Takeaway
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Today Stats */}
          <div className="hidden sm:flex items-center gap-4 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-xl">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 dark:text-white/40">
                Orders
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {todaysOrderCount}
              </p>
            </div>
            <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] text-gray-500 dark:text-white/40">
                Revenue
              </p>
              <p className="text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                {currencySymbol}
                {todaysRevenue.toFixed(0)}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 h-8"
          >
            <History className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </div>
      </header>

      {/* Main Content: Menu + Order Panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Menu Grid */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-white/5">
          <QSMenuGrid
            menuItems={menuItems}
            categories={categories}
            isLoading={menuLoading}
            cartItemCounts={cartItemCounts}
            onAddItem={handleAddItem}
          />
        </div>

        {/* Right: Order Panel (desktop only) */}
        <div className="hidden md:flex flex-col w-80 lg:w-96 bg-gray-100 dark:bg-gray-900/50">
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
          />
        </div>
      </div>

      {/* Mobile: Floating Cart Button */}
      {itemCount > 0 && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 z-40">
          <Button
            onClick={() => setShowMobileCart(true)}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-base rounded-2xl shadow-2xl shadow-orange-500/30 active:scale-95 transition-all"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            View Order • {itemCount} items • {currencySymbol}
            {orderTotal.toFixed(2)}
          </Button>
        </div>
      )}

      {/* Mobile: Order Cart Sheet */}
      <Sheet open={showMobileCart} onOpenChange={setShowMobileCart}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-3xl bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Your Order</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-white/20 rounded-full" />
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
      />

      {/* Order History */}
      <QSOrderHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
};

export default QuickServePOS;
