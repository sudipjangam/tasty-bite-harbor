import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShoppingCart,
  CheckCircle2,
  ArrowRight,
  BellRing,
  Receipt,
  UtensilsCrossed,
} from "lucide-react";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { MenuBrowser } from "@/components/CustomerOrder/MenuBrowser";
import { CartDrawer } from "@/components/CustomerOrder/CartDrawer";
import { CheckoutForm } from "@/components/CustomerOrder/CheckoutForm";
import { supabase } from "@/integrations/supabase/client";
import { OrderTracker } from "@/components/CustomerOrder/OrderTracker";
import { DynamicUPIQRCode } from "@/components/CustomerOrder/DynamicUPIQRCode";
import { WelcomeScreen } from "@/components/CustomerOrder/WelcomeScreen";
import { TableServiceActions } from "@/components/CustomerOrder/TableServiceActions";
import {
  RunningBillModal,
  ActiveTableOrder,
} from "@/components/CustomerOrder/RunningBillModal";
import { ItemCustomizationSheet } from "@/components/CustomerOrder/ItemCustomizationSheet";
import { CustomerMenuItem } from "@/components/CustomerOrder/MenuItemCard";

type OrderStep = "welcome" | "menu" | "checkout" | "payment" | "success";

interface OrderData {
  restaurantId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  token?: string;
  restaurantLogo?: string;
  sessionId?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  is_available: boolean;
  dietary?: "veg" | "non_veg" | "egg";
  is_bestseller?: boolean;
}

interface CustomerInfo {
  name: string;
  phone: string;
  specialInstructions?: string;
}

const CustomerOrderContent = ({ orderData }: { orderData: OrderData }) => {
  const [currentStep, setCurrentStep] = useState<OrderStep>("welcome");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantLogo, setRestaurantLogo] = useState<string | undefined>(
    orderData.restaurantLogo,
  );
  // Tracks the authoritative session ID (may be updated from server response)
  const [effectiveSessionId, setEffectiveSessionId] = useState<string | undefined>(
    orderData.sessionId ||
      (typeof window !== "undefined"
        ? sessionStorage.getItem(`table_session_${orderData.entityId}`) || undefined
        : undefined),
  );
  const [serviceChargePercent, setServiceChargePercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Sheets
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCallWaiterOpen, setIsCallWaiterOpen] = useState(false);
  const [isRequestBillOpen, setIsRequestBillOpen] = useState(false);
  const [isViewBillOpen, setIsViewBillOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<CustomerMenuItem | null>(
    null,
  );

  // Active Table Orders & Running Tab
  const [activeTableOrders, setActiveTableOrders] = useState<ActiveTableOrder[]>([]);
  const [runningTotal, setRunningTotal] = useState(0);
  const [upiPaymentData, setUpiPaymentData] = useState<{
    upiId: string;
    payeeName: string;
  } | null>(null);

  // Completed Single Order State
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [placedOrderDetails, setPlacedOrderDetails] = useState<{
    items: any[];
    total: number;
  } | null>(null);

  const { itemCount, clearCart, items, total, addItem } = useCart();

  // Clear cart when switching to a different table/room
  useEffect(() => {
    const currentEntityKey = `${orderData.restaurantId}-${orderData.entityType}-${orderData.entityId}`;
    const storedEntityKey = localStorage.getItem("qr_order_entity");

    if (storedEntityKey && storedEntityKey !== currentEntityKey) {
      clearCart();
    }
    localStorage.setItem("qr_order_entity", currentEntityKey);
  }, [
    orderData.restaurantId,
    orderData.entityType,
    orderData.entityId,
    clearCart,
  ]);

  // Fetch active orders for this table to maintain running tab (restricted by table session)
  const fetchActiveTableOrders = useCallback(async () => {
    if (!orderData.entityId) return;

    try {
      // Include all unpaid orders for this table session until settled (payment_status not paid, not cancelled)
      let ordersQuery = supabase
        .from("orders")
        .select("id, status, total, items, created_at, payment_status, qr_session_id")
        .eq("table_id", orderData.entityId);

      // Prefer server-authoritative effectiveSessionId over orderData.sessionId
      const sessionIdentifier =
        effectiveSessionId ||
        orderData.sessionId ||
        (typeof window !== "undefined"
          ? sessionStorage.getItem(`table_session_${orderData.entityId}`)
          : null);

      // Get order IDs explicitly associated with the current bill/session (scoped by session)
      const currentBillOrderIds: string[] = [];
      if (orderId) {
        currentBillOrderIds.push(orderId);
      }
      if (typeof window !== "undefined") {
        try {
          // Use session-scoped key so prior-session IDs are excluded
          const scopedKey = sessionIdentifier
            ? `table_bill_orders_${orderData.entityId}_${sessionIdentifier}`
            : `table_bill_orders_${orderData.entityId}`;
          const stored = sessionStorage.getItem(scopedKey);
          const scopedIds: string[] = [];
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              scopedIds.push(...parsed);
              currentBillOrderIds.push(...parsed);
            }
          }

          // Migrate eligible IDs from legacy unscoped key into the session-scoped key
          if (sessionIdentifier) {
            const legacyKey = `table_bill_orders_${orderData.entityId}`;
            const legacyStored = sessionStorage.getItem(legacyKey);
            if (legacyStored) {
              const legacyParsed = JSON.parse(legacyStored);
              if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
                // Verify each legacy ID against the current table's unpaid orders
                // before migrating — only include IDs already tracked by the server
                // for this table (the ordersQuery will confirm payment status).
                // We check via a quick Supabase call restricted to this table so
                // we don't migrate orders belonging to a different table's session.
                const { data: legacyRows } = await supabase
                  .from("orders")
                  .select("id")
                  .eq("table_id", orderData.entityId)
                  .in("id", legacyParsed)
                  .or("payment_status.eq.pending,payment_status.eq.unpaid,payment_status.is.null")
                  .neq("status", "cancelled");

                if (legacyRows && legacyRows.length > 0) {
                  const eligibleIds = legacyRows.map((r: { id: string }) => r.id);
                  const merged = Array.from(new Set([...scopedIds, ...eligibleIds]));
                  // Write migrated IDs back to the scoped key
                  sessionStorage.setItem(scopedKey, JSON.stringify(merged));
                  // Add to current query set (dedup handled later)
                  currentBillOrderIds.push(...eligibleIds);
                }

                // Remove legacy key to avoid re-migrating on next load
                sessionStorage.removeItem(legacyKey);
              }
            }
          }
        } catch {
          // ignore parsing error
        }
      }
      const uniqueBillOrderIds = Array.from(new Set(currentBillOrderIds)).filter(Boolean);

      if (sessionIdentifier) {
        // Match current session orders, or recorded orders belonging to current bill regardless of qr_session_id
        if (uniqueBillOrderIds.length > 0) {
          ordersQuery = ordersQuery.or(
            `qr_session_id.eq.${sessionIdentifier},id.in.(${uniqueBillOrderIds.join(",")})`
          );
        } else {
          ordersQuery = ordersQuery.eq("qr_session_id", sessionIdentifier);
        }
      } else if (uniqueBillOrderIds.length > 0) {
        ordersQuery = ordersQuery.in("id", uniqueBillOrderIds);
      }

      const { data, error: ordersError } = await ordersQuery
        .neq("status", "cancelled")
        .or("payment_status.eq.pending,payment_status.eq.unpaid,payment_status.is.null")
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.warn("Could not fetch table active orders (RLS or network):", ordersError.message);
        return;
      }

      if (data) {
        setActiveTableOrders(data as ActiveTableOrder[]);
        const sum = data.reduce(
          (acc, o) => acc + (Number(o.total) || 0),
          0,
        );
        setRunningTotal(sum);
      }
    } catch (e) {
      console.warn("Could not fetch table active orders:", e);
    }
  }, [orderData.entityId, orderData.sessionId, orderId, effectiveSessionId]);

  // Subscribe to table orders via Supabase Realtime
  useEffect(() => {
    fetchActiveTableOrders();

    if (!orderData.entityId) return;

    const channel = supabase
      .channel(`table-orders-${orderData.entityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `table_id=eq.${orderData.entityId}`,
        },
        () => {
          fetchActiveTableOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderData.entityId, fetchActiveTableOrders]);

  // Fetch menu and restaurant data
  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        // Fetch restaurant details
        const { data: restaurant, error: restaurantError } = await supabase
          .from("restaurants")
          .select(
            "id, name, logo_url, qr_ordering_enabled, qr_service_charge_percent",
          )
          .eq("id", orderData.restaurantId)
          .single();

        if (restaurantError || !restaurant) {
          throw new Error("Restaurant not found");
        }

        // Fetch payment settings for UPI details (gracefully handles anonymous RLS restriction)
        try {
          const { data: paymentSettings, error: payError } = await supabase
            .from("payment_settings")
            .select("upi_id, upi_name")
            .eq("restaurant_id", orderData.restaurantId)
            .eq("is_active", true)
            .maybeSingle();

          if (!payError && paymentSettings?.upi_id) {
            setUpiPaymentData({
              upiId: paymentSettings.upi_id,
              payeeName: paymentSettings.upi_name || restaurant.name,
            });
          }
        } catch {
          // Anonymous read may be blocked by RLS; fallback to paymentData from submit-qr-order
        }

        // Fetch menu items
        const { data: menuData, error: menuError } = await supabase
          .from("menu_items")
          .select(
            "id, name, description, price, category, image_url, is_available",
          )
          .eq("restaurant_id", orderData.restaurantId)
          .eq("is_available", true)
          .order("category")
          .order("name");

        if (menuError) {
          throw new Error("Failed to fetch menu items");
        }

        // Transform menu items
        const transformedItems: MenuItem[] = (menuData || []).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          price: item.price,
          category: item.category || "Other",
          image: item.image_url || undefined,
          is_available: item.is_available,
        }));

        setMenuItems(transformedItems);
        setRestaurantName(restaurant.name || "Restaurant");
        if (restaurant.logo_url) setRestaurantLogo(restaurant.logo_url);
        setServiceChargePercent(restaurant.qr_service_charge_percent || 0);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching menu:", err);
        setError(err.message || "Failed to load menu. Please try again.");
        setLoading(false);
      }
    };

    fetchMenuData();
  }, [orderData.restaurantId]);

  const handleCheckout = () => {
    setCurrentStep("checkout");
  };

  const handleSubmitOrder = async (customerInfo: CustomerInfo) => {
    try {
      const { data, error: submitError } = await supabase.functions.invoke(
        "submit-qr-order",
        {
          body: {
            restaurantId: orderData.restaurantId,
            entityType: orderData.entityType,
            entityId: orderData.entityId,
            customerName: customerInfo.name,
            customerPhone: customerInfo.phone,
            specialInstructions: customerInfo.specialInstructions,
            sessionId:
              effectiveSessionId ||
              orderData.sessionId ||
              (typeof window !== "undefined"
                ? sessionStorage.getItem(`table_session_${orderData.entityId}`) || undefined
                : undefined),
            items: items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              modifiers: item.modifiers || [],
              specialInstructions: item.specialInstructions || undefined,
            })),
            totalAmount: total,
          },
        },
      );

      if (submitError) throw submitError;

      setOrderId(data.orderId);
      setPaymentData(data.payment);

      // Associate order with current bill in session (session-scoped key)
      if (data.orderId && typeof window !== "undefined") {
        try {
          const resolvedSession =
            data?.sessionId || effectiveSessionId || orderData.sessionId ||
            sessionStorage.getItem(`table_session_${orderData.entityId}`);
          const key = resolvedSession
            ? `table_bill_orders_${orderData.entityId}_${resolvedSession}`
            : `table_bill_orders_${orderData.entityId}`;
          const existing = JSON.parse(sessionStorage.getItem(key) || "[]");
          if (!existing.includes(data.orderId)) {
            existing.push(data.orderId);
            sessionStorage.setItem(key, JSON.stringify(existing));
          }
        } catch (e) {
          console.warn("Could not record bill order ID:", e);
        }
      }

      // If server returned authoritative sessionId, update both sessionStorage and component state
      if (data?.sessionId && typeof window !== "undefined") {
        sessionStorage.setItem(`table_session_${orderData.entityId}`, data.sessionId);
        if (data.sessionId !== effectiveSessionId) {
          setEffectiveSessionId(data.sessionId);
        }
      }

      // Update UPI identity when data.payment.upi.id is supplied
      if (data?.payment?.upi?.id) {
        setUpiPaymentData({
          upiId: data.payment.upi.id,
          payeeName: data.payment.upi.name || restaurantName,
        });
      }

      setPlacedOrderDetails({
        items: [...items],
        total: total,
      });

      clearCart();
      setCurrentStep("success");
      fetchActiveTableOrders();
    } catch (err: any) {
      throw new Error(err.message || "Failed to submit order");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm font-bold tracking-wide text-stone-300">
            Loading Menu for Table {orderData.entityName}...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/30 bg-stone-800 text-white rounded-3xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-white">Menu Unavailable</h3>
          <p className="text-xs text-stone-400">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* 1. Petpooja-style Welcome Screen */}
      {currentStep === "welcome" && (
        <WelcomeScreen
          restaurantName={restaurantName}
          restaurantLogo={restaurantLogo}
          tableName={orderData.entityName}
          entityType={orderData.entityType as any}
          activeOrdersCount={activeTableOrders.length}
          runningTotal={runningTotal}
          onStartOrder={() => setCurrentStep("menu")}
          onViewBill={() => setIsViewBillOpen(true)}
          onCallWaiter={() => setIsCallWaiterOpen(true)}
        />
      )}

      {/* 2. Menu Browser Step */}
      {currentStep === "menu" && (
        <div className="max-w-2xl mx-auto p-4 pb-28">
          <MenuBrowser
            menuItems={menuItems}
            restaurantName={restaurantName}
            tableName={orderData.entityName}
            activeOrdersCount={activeTableOrders.length}
            onCustomize={(item) => setCustomizingItem(item)}
            onCallWaiter={() => setIsCallWaiterOpen(true)}
            onViewBill={() => setIsViewBillOpen(true)}
          />

          {/* Sticky Petpooja Bottom Cart Bar */}
          {itemCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border-t border-stone-200 dark:border-stone-800 z-40 shadow-2xl">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative p-2.5 bg-amber-500/10 rounded-2xl text-amber-500">
                    <ShoppingCart className="w-5 h-5" />
                    <Badge className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white font-extrabold text-[10px] h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full border-2 border-white dark:border-stone-900">
                      {itemCount}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 block uppercase tracking-wider">
                      {itemCount} {itemCount === 1 ? "Item" : "Items"} Added
                    </span>
                    <span className="text-base font-black text-stone-900 dark:text-white">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setIsCartOpen(true)}
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs py-5 px-6 rounded-2xl shadow-lg shadow-orange-900/30 flex items-center gap-2"
                >
                  <span>View Cart</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            onCheckout={handleCheckout}
          />
        </div>
      )}

      {/* 3. Checkout Form Step */}
      {currentStep === "checkout" && (
        <div className="max-w-2xl mx-auto p-4 pb-20">
          <CheckoutForm
            orderData={orderData}
            onBack={() => setCurrentStep("menu")}
            onSubmit={handleSubmitOrder}
          />
        </div>
      )}

      {/* 4. Success / Order Placed Step */}
      {currentStep === "success" && orderId && (
        <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
          <OrderTracker orderId={orderId} />

          <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-3xl">
            <CardContent className="pt-6 text-center space-y-3">
              <div className="inline-flex p-3 bg-emerald-500 rounded-full text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-stone-900 dark:text-white">
                Order Sent to Kitchen!
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Your food is being prepared and will be served at Table{" "}
                <span className="font-extrabold text-stone-900 dark:text-white">
                  {orderData.entityName}
                </span>
                .
              </p>

              {/* Placed Items Summary */}
              {placedOrderDetails && (
                <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/50 text-left space-y-2 mt-4 shadow-xs">
                  <h3 className="font-black text-xs uppercase tracking-wider text-stone-500">
                    Order Summary
                  </h3>
                  {placedOrderDetails.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="text-stone-700 dark:text-stone-300 font-medium">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-bold text-stone-900 dark:text-white">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex justify-between items-center">
                    <span className="font-black text-xs">Total Amount</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      ₹{placedOrderDetails.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dynamic Real-time UPI Payment Section - only if configured */}
          {paymentData?.upi?.id ? (
            <DynamicUPIQRCode
              amount={paymentData.upi.amount || placedOrderDetails?.total || 0}
              upiId={paymentData.upi.id}
              payeeName={paymentData.upi.name || restaurantName}
              orderNumber={orderId.slice(-6).toUpperCase()}
              tableName={orderData.entityName}
            />
          ) : upiPaymentData?.upiId && placedOrderDetails ? (
            <DynamicUPIQRCode
              amount={placedOrderDetails.total}
              upiId={upiPaymentData.upiId}
              payeeName={upiPaymentData.payeeName || restaurantName}
              orderNumber={orderId.slice(-6).toUpperCase()}
              tableName={orderData.entityName}
            />
          ) : (
            <div className="bg-stone-100 dark:bg-stone-900 rounded-2xl p-4 text-center border border-stone-200 dark:border-stone-800 space-y-1">
              <p className="font-bold text-xs text-stone-800 dark:text-stone-200">
                Pay at Counter / Table
              </p>
              <p className="text-[11px] text-stone-500">
                Please settle your bill with your server or at the payment counter.
              </p>
            </div>
          )}

          {/* Append to Table Order CTA */}
          <Button
            onClick={() => setCurrentStep("menu")}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-5 rounded-2xl text-xs shadow-lg shadow-orange-900/20"
          >
            + Add More Items to Table {orderData.entityName}
          </Button>

          {/* View Full Running Bill */}
          <Button
            variant="outline"
            onClick={() => setIsViewBillOpen(true)}
            className="w-full rounded-2xl py-5 text-xs font-bold border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300"
          >
            <Receipt className="w-3.5 h-3.5 mr-2 text-amber-500" />
            View Table Running Tab (₹{runningTotal.toFixed(2)})
          </Button>
        </div>
      )}

      {/* Item Customization Drawer */}
      <ItemCustomizationSheet
        item={customizingItem}
        isOpen={!!customizingItem}
        onClose={() => setCustomizingItem(null)}
        onAddToCart={(customizedItem) => {
          addItem(customizedItem);
        }}
      />

      {/* Table Service Actions (Call Waiter & Request Bill) */}
      <TableServiceActions
        restaurantId={orderData.restaurantId}
        tableName={orderData.entityName}
        entityType={orderData.entityType as any}
        entityId={orderData.entityId}
        isCallWaiterOpen={isCallWaiterOpen}
        onCallWaiterClose={() => setIsCallWaiterOpen(false)}
        isRequestBillOpen={isRequestBillOpen}
        onRequestBillClose={() => setIsRequestBillOpen(false)}
      />

      {/* Running Bill Modal */}
      <RunningBillModal
        isOpen={isViewBillOpen}
        onClose={() => setIsViewBillOpen(false)}
        tableName={orderData.entityName}
        entityType={orderData.entityType as any}
        restaurantName={restaurantName}
        activeOrders={activeTableOrders}
        runningTotal={runningTotal}
        upiPaymentData={upiPaymentData}
        onAddMoreItems={() => {
          setIsViewBillOpen(false);
          setCurrentStep("menu");
        }}
        onRequestBill={() => {
          setIsViewBillOpen(false);
          setIsRequestBillOpen(true);
        }}
      />
    </div>
  );
};

const CustomerOrder = () => {
  const { encodedData, restaurantSlug, tableIdentifier } = useParams<{
    encodedData?: string;
    restaurantSlug?: string;
    tableIdentifier?: string;
  }>();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveContext = async () => {
      setLoading(true);
      setError(null);

      try {
        // Case A: Human-readable Petpooja URL format: /qr/:restaurantSlug/:tableIdentifier
        if (restaurantSlug) {
          // 1. Find restaurant by slug or id (safe parameterized query - Finding 3)
          const isUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              restaurantSlug,
            );

          const restaurantQuery = supabase
            .from("restaurants")
            .select("id, name, logo_url, slug, qr_ordering_enabled");

          const { data: restaurant, error: restErr } = await (isUuid
            ? restaurantQuery.eq("id", restaurantSlug)
            : restaurantQuery.eq("slug", restaurantSlug)
          ).maybeSingle();

          if (restErr || !restaurant) {
            throw new Error(`Restaurant '${restaurantSlug}' not found.`);
          }

          // Use already-decoded tableIdentifier directly without double-decoding (Finding 2)
          const rawTable = tableIdentifier ? tableIdentifier.trim() : "";

          // 2. Find table by name or ID
          const { data: tables, error: tablesErr } = await supabase
            .from("restaurant_tables")
            .select("id, name")
            .eq("restaurant_id", restaurant.id);

          if (tablesErr) {
            throw new Error("Failed to load restaurant tables.");
          }

          // Case-insensitive match on name or ID; do not arbitrarily select first table (Finding 4)
          const matchedTable =
            tables?.find(
              (t) =>
                rawTable &&
                (t.name.toLowerCase() === rawTable.toLowerCase() ||
                  t.name.toLowerCase().replace(/\s+/g, "") ===
                    rawTable.toLowerCase().replace(/\s+/g, "") ||
                  t.id === rawTable),
            ) ||
            (!rawTable && tables?.length === 1 ? tables[0] : null);

          if (!matchedTable) {
            throw new Error(
              `Table '${rawTable || "unspecified"}' not configured for ${restaurant.name}.`,
            );
          }

          const sessionKey = `table_session_${matchedTable.id}`;
          let sessionId = sessionStorage.getItem(sessionKey);
          if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem(sessionKey, sessionId);
          }

          setOrderData({
            restaurantId: restaurant.id,
            entityType: "table",
            entityId: matchedTable.id,
            entityName: matchedTable.name,
            restaurantLogo: restaurant.logo_url || undefined,
            sessionId,
          });
          setLoading(false);
          return;
        }

        // Case B: Base64 JSON token: /order/:encodedData
        if (encodedData) {
          const decodedString = atob(encodedData);
          const data = JSON.parse(decodedString);
          const sessionKey = `table_session_${data.entityId}`;
          const sessionId =
            data.sessionId ||
            sessionStorage.getItem(sessionKey) ||
            crypto.randomUUID();
          sessionStorage.setItem(sessionKey, sessionId);
          setOrderData({
            ...data,
            sessionId,
          });
          setLoading(false);
          return;
        }

        throw new Error("No table or order information provided.");
      } catch (err: any) {
        console.error("Resolution error:", err);
        setError(err.message || "Invalid QR code link.");
        setLoading(false);
      }
    };

    resolveContext();
  }, [encodedData, restaurantSlug, tableIdentifier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm font-bold tracking-wide text-stone-300">
            Connecting to Table...
          </p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-500/30 bg-stone-800 text-white rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-white">Invalid QR Link</h3>
          <p className="text-xs text-stone-400">{error || "Please re-scan table QR code."}</p>
        </Card>
      </div>
    );
  }

  return (
    <CartProvider serviceChargePercent={0}>
      <CustomerOrderContent orderData={orderData} />
    </CartProvider>
  );
};

export default CustomerOrder;
