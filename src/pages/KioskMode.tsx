import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  Sparkles,
  Leaf,
  Drumstick,
  Flame,
  Clock,
  RotateCcw,
  CheckCircle2,
  Smartphone,
  ArrowRight,
  Monitor,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { DynamicUPIQRCode } from "@/components/CustomerOrder/DynamicUPIQRCode";
import { useToast } from "@/hooks/use-toast";

interface KioskItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export const KioskMode: React.FC = () => {
  const { restaurantId, restaurantName } = useRestaurantId();
  const { toast } = useToast();

  // Kiosk Flow State: 'attract' | 'menu' | 'payment' | 'success'
  const [stage, setStage] = useState<"attract" | "menu" | "payment" | "success">("attract");
  const [orderType, setOrderType] = useState<"Dine-In" | "Takeaway">("Dine-In");
  const [selectedTable, setSelectedTable] = useState<string>("Kiosk 1");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "veg" | "non_veg">("all");

  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [placedOrderTotal, setPlacedOrderTotal] = useState<number>(0);

  // Inactivity timeout: auto-reset if idle for 60 seconds during ordering
  const [idleSeconds, setIdleSeconds] = useState(0);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivity = () => {
    setIdleSeconds(0);
  };

  useEffect(() => {
    if (stage === "attract") return;

    const interval = setInterval(() => {
      setIdleSeconds((prev) => {
        if (prev >= 60) {
          // Timeout reached: return to attract screen
          setCart([]);
          setStage("attract");
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  // Fetch Menu Items
  const { data: menuItems = [], isLoading: isLoadingMenu } = useQuery({
    queryKey: ["kiosk-menu-items", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, price, category, image_url, is_available")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("category")
        .order("name");

      if (error) throw error;
      return (data || []) as KioskItem[];
    },
  });

  // Unique Categories
  const categories = useMemo(() => {
    const counts = menuItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
    }, {} as Record<string, number>);

    const cats = Array.from(new Set(menuItems.map((m) => m.category)));
    return ["All", ...cats];
  }, [menuItems]);

  // Filtered Menu
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCategory === "All" || item.category === selectedCategory;

      const isVeg =
        !item.name.toLowerCase().includes("chicken") &&
        !item.name.toLowerCase().includes("mutton") &&
        !item.name.toLowerCase().includes("fish") &&
        !item.name.toLowerCase().includes("egg");

      let matchDiet = true;
      if (dietaryFilter === "veg") matchDiet = isVeg;
      if (dietaryFilter === "non_veg") matchDiet = !isVeg;

      return matchSearch && matchCat && matchDiet;
    });
  }, [menuItems, searchTerm, selectedCategory, dietaryFilter]);

  // Cart Handlers
  const addToCart = (item: KioskItem) => {
    resetInactivity();
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          category: item.category,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    resetInactivity();
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.id === id) {
            const newQ = c.quantity + delta;
            return newQ > 0 ? { ...c, quantity: newQ } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05; // 5% GST
  const grandTotal = subtotal + tax;

  // Place Kiosk Order
  const handlePlaceOrder = async (payMethod: "upi" | "counter") => {
    if (!restaurantId || cart.length === 0) return;

    try {
      // 1. Create Order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          order_number: `KIOSK-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_name: customerName || "Self-Serve Guest",
          customer_phone: customerPhone || "N/A",
          table_number: orderType === "Dine-In" ? selectedTable : "Takeaway",
          order_type: orderType.toLowerCase(),
          status: "pending",
          payment_status: payMethod === "upi" ? "paid" : "pending",
          payment_method: payMethod,
          total: grandTotal,
          items: cart.map((c) => ({
            name: c.name,
            quantity: c.quantity,
            price: c.price,
          })),
          notes: `Self-Service Kiosk • ${orderType}`,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Dispatch KOT to Kitchen Display
      await supabase.from("kitchen_orders").insert({
        restaurant_id: restaurantId,
        order_id: order.id,
        source: `KIOSK (${orderType})`,
        status: "preparing",
        priority: "normal",
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
        })),
      });

      setPlacedOrderId(order.id);
      setPlacedOrderTotal(grandTotal);
      setStage("success");
      setCart([]);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Order Failed",
        description: err.message || "Failed to submit kiosk order.",
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: ATTRACT / WELCOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (stage === "attract") {
    return (
      <div
        onClick={() => setStage("menu")}
        className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white flex flex-col justify-between p-8 sm:p-12 cursor-pointer select-none relative overflow-hidden"
      >
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xl border border-white/20 shadow-lg">
              <UtensilsCrossed className="h-8 w-8 text-purple-300" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{restaurantName || "SWADESHI RESTAURANT"}</h2>
              <span className="text-xs uppercase tracking-widest text-purple-300 font-bold">
                Touchscreen Self-Service Kiosk
              </span>
            </div>
          </div>

          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1 font-bold">
            🟢 KIOSK ACTIVE
          </Badge>
        </div>

        {/* Center Prompt */}
        <div className="text-center space-y-6 z-10 max-w-xl mx-auto my-auto">
          <div className="inline-flex p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl animate-bounce">
            <Sparkles className="h-10 w-10 text-yellow-300" />
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-purple-100 to-indigo-200 bg-clip-text text-transparent">
            Tap Anywhere to Order
          </h1>
          <p className="text-base sm:text-lg text-purple-200/80 font-medium">
            Fast, contactless dining & takeaway ordering with instant UPI QR settlement.
          </p>

          {/* Dine-In vs Takeaway Selector */}
          <div className="grid grid-cols-2 gap-4 pt-6 max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setOrderType("Dine-In");
                setStage("menu");
              }}
              className="p-6 rounded-3xl bg-white/10 hover:bg-white/20 border-2 border-purple-500/50 hover:border-purple-400 transition-all flex flex-col items-center gap-3 shadow-xl group"
            >
              <div className="text-4xl group-hover:scale-110 transition-transform">🍽️</div>
              <span className="font-black text-lg">Dine-In</span>
              <span className="text-[11px] text-purple-300 font-semibold">Eat at restaurant table</span>
            </button>

            <button
              onClick={() => {
                setOrderType("Takeaway");
                setStage("menu");
              }}
              className="p-6 rounded-3xl bg-white/10 hover:bg-white/20 border-2 border-indigo-500/50 hover:border-indigo-400 transition-all flex flex-col items-center gap-3 shadow-xl group"
            >
              <div className="text-4xl group-hover:scale-110 transition-transform">🛍️</div>
              <span className="font-black text-lg">Takeaway</span>
              <span className="text-[11px] text-indigo-300 font-semibold">Parcel & Pick-up</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-purple-300/60 font-semibold z-10">
          Powered by Swadeshi Solutions Intelligent Restaurant POS
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 2 & 3: MENU & LIVE CART ORDERING
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      onMouseMove={resetInactivity}
      onTouchStart={resetInactivity}
      className="min-h-screen bg-slate-100 dark:bg-gray-950 flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Top Kiosk Bar */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCart([]);
              setStage("attract");
            }}
            className="rounded-xl font-bold text-xs gap-1"
          >
            <RotateCcw className="h-4 w-4 text-purple-600" /> Start Over
          </Button>

          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white font-black text-xs px-3 py-1">
              {orderType === "Dine-In" ? "🍽️ DINE-IN" : "🛍️ TAKEAWAY"}
            </Badge>
            <span className="text-xs text-gray-500 font-semibold hidden sm:inline">
              {restaurantName}
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-64 sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search food & drinks..."
            className="pl-9 rounded-2xl h-9 text-xs"
          />
        </div>

        {/* Dietary Filters */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={dietaryFilter === "all" ? "default" : "outline"}
            onClick={() => setDietaryFilter("all")}
            className={`rounded-xl text-xs font-bold h-8 ${dietaryFilter === "all" ? "bg-gray-900 text-white" : ""}`}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={dietaryFilter === "veg" ? "default" : "outline"}
            onClick={() => setDietaryFilter(dietaryFilter === "veg" ? "all" : "veg")}
            className={`rounded-xl text-xs font-bold h-8 text-emerald-700 ${dietaryFilter === "veg" ? "bg-emerald-600 text-white" : "border-emerald-300"}`}
          >
            <Leaf className="w-3.5 h-3.5 mr-1" /> Veg
          </Button>
        </div>
      </div>

      {/* Main Split Body: Menu Grid (Left 70%) + Running Cart (Right 30%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Category Sidebar + Menu Cards */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          {/* Horizontal Category Strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl font-black text-xs whitespace-nowrap transition-all shadow-xs ${
                  selectedCategory === cat
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredItems.map((item) => {
                const inCart = cart.find((c) => c.id === item.id);
                return (
                  <Card
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="cursor-pointer group rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between active:scale-95"
                  >
                    <div className="relative aspect-[16/11] bg-slate-100 dark:bg-gray-800 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          🍽️
                        </div>
                      )}

                      {inCart && (
                        <Badge className="absolute top-2 right-2 bg-purple-600 text-white font-black text-xs px-2 py-0.5 shadow-md">
                          {inCart.quantity} in cart
                        </Badge>
                      )}
                    </div>

                    <div className="p-3 space-y-1.5">
                      <h4 className="font-extrabold text-xs text-gray-900 dark:text-white line-clamp-1">
                        {item.name}
                      </h4>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                          ₹{item.price}
                        </span>
                        <div className="p-1 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          <Plus className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Touch Cart Tray */}
        <div className="w-80 sm:w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-5 flex flex-col justify-between shadow-2xl z-10">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
                <h3 className="font-black text-base text-gray-900 dark:text-white">Your Order</h3>
              </div>
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-xs font-bold">
                {cart.reduce((s, c) => s + c.quantity, 0)} Items
              </Badge>
            </div>

            {/* Cart Items Scroll */}
            <div className="mt-4 max-h-[calc(100vh-360px)] overflow-y-auto space-y-2.5 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-gray-400 space-y-2">
                  <ShoppingBag className="h-10 w-10 mx-auto text-gray-300" />
                  <p className="text-xs font-bold">Cart is empty</p>
                  <p className="text-[11px]">Touch any menu item to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <span className="font-bold text-xs text-emerald-600">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-7 w-7 rounded-xl"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="h-3 w-3 text-rose-500" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                      </Button>
                      <span className="font-black text-xs w-5 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-7 w-7 rounded-xl bg-purple-600 text-white"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout Totals & Buttons */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="space-y-1 text-xs font-bold text-gray-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 dark:text-white pt-1 border-t">
                <span>Grand Total</span>
                <span className="text-purple-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-2 pt-1">
              <Button
                disabled={cart.length === 0}
                onClick={() => setStage("payment")}
                className="w-full py-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-500/25 gap-2"
              >
                <Smartphone className="h-5 w-5" />
                Pay with UPI QR (₹{grandTotal.toFixed(2)})
              </Button>

              <Button
                disabled={cart.length === 0}
                variant="outline"
                onClick={() => handlePlaceOrder("counter")}
                className="w-full rounded-2xl text-xs font-bold py-4"
              >
                Pay at Cash Counter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* STAGE 3 MODAL: ON-SCREEN UPI QR PAYMENT */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {stage === "payment" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-4">
            <DynamicUPIQRCode
              amount={grandTotal}
              upiId="swadeshi.pos@upi"
              payeeName={restaurantName || "Restaurant"}
              orderNumber="KIOSK-PAY"
              tableName={orderType === "Dine-In" ? selectedTable : "Takeaway"}
            />

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setStage("menu")}
                className="rounded-2xl bg-white font-bold text-xs py-5"
              >
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>

              <Button
                onClick={() => handlePlaceOrder("upi")}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs py-5 shadow-lg"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> I Have Paid
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* STAGE 4: SUCCESS / KOT PRINTED */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {stage === "success" && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-950 to-purple-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="p-6 bg-emerald-500 rounded-full shadow-2xl animate-bounce">
            <CheckCircle2 className="h-16 w-16 text-white" />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-3xl font-black">Order Sent to Kitchen!</h2>
            <p className="text-sm text-purple-200">
              Your token number is being prepared. Please collect your receipt at the counter.
            </p>
            <div className="p-4 bg-white/10 rounded-2xl border border-white/20 mt-4 text-left font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span>Order Type:</span>
                <span className="font-bold">{orderType}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-400">₹{placedOrderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setStage("attract")}
            className="px-8 py-6 rounded-2xl bg-white text-purple-950 font-black text-sm hover:bg-gray-100 shadow-xl"
          >
            Finish & Next Customer
          </Button>
        </div>
      )}
    </div>
  );
};

export default KioskMode;
