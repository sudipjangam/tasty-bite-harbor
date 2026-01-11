import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ToggleLeft,
  ToggleRight,
  ChevronUp,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { startOfDay, endOfDay } from "date-fns";
import POSHeader from "./POSHeader";
import ActiveOrdersList from "../ActiveOrdersList";
import MenuCategories from "../MenuCategories";
import MenuItemsGrid from "../MenuItemsGrid";
import CurrentOrder from "../CurrentOrder";
import PaymentDialog from "./PaymentDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { POSPayment } from "../Payment/POSPayment";
import { OrderPayment } from "../Payment/OrderPayment";
import type { OrderItem, TableData } from "@/types/orders";
import { WeightQuantityDialog } from "../WeightQuantityDialog";
import { CustomExtrasPanel } from "../CustomExtrasPanel";
import { DuplicateOrderWarningDialog } from "../DuplicateOrderWarningDialog";
import { useAuth } from "@/hooks/useAuth";
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

const POSMode = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [tableNumber, setTableNumber] = useState("");
  const [orderType, setOrderType] = useState("Dine-In");
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showActiveOrders, setShowActiveOrders] = useState(true);
  const [recalledKitchenOrderId, setRecalledKitchenOrderId] = useState<
    string | null
  >(null);
  const [recalledSource, setRecalledSource] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [pendingWeightItem, setPendingWeightItem] = useState<any>(null);
  const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);

  // Duplicate order warning state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [existingDuplicateOrder, setExistingDuplicateOrder] = useState<{
    id: string;
    source: string;
    items: { name: string; quantity: number }[];
    created_at: string;
  } | null>(null);
  const [pendingCustomerDetails, setPendingCustomerDetails] = useState<
    | {
        name: string;
        phone: string;
      }
    | undefined
  >(undefined);

  // Active Orders panel expand state
  const [activeOrdersExpanded, setActiveOrdersExpanded] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();

  // Handle order type change - clear table number when not Dine-In
  const handleOrderTypeChange = (type: string) => {
    setOrderType(type);
    if (type !== "Dine-In") {
      setTableNumber(""); // Clear stale table number
    }
  };

  // Query for today's revenue (completed orders)
  const { data: todaysRevenue = 0 } = useQuery({
    queryKey: ["todays-pos-revenue"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) return 0;

      const today = new Date();
      const { data: orders } = await supabase
        .from("orders_unified")
        .select("total_amount, order_type")
        .eq("restaurant_id", profile.restaurant_id)
        .eq("status", "completed")
        .neq("order_type", "nc") // Exclude non-chargeable orders from revenue
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      if (!orders) return 0;

      return orders.reduce(
        (sum, order) => sum + (Number(order.total_amount) || 0),
        0
      );
    },
    refetchInterval: 30000, // Refresh every 30 seconds as fallback
  });

  // Realtime subscription for instant revenue updates
  useEffect(() => {
    const channel = supabase
      .channel("pos-revenue-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders_unified",
        },
        (payload) => {
          // Only refresh if status changed to/from completed
          const newStatus = (payload.new as any)?.status;
          const oldStatus = (payload.old as any)?.status;

          if (newStatus === "completed" || oldStatus === "completed") {
            queryClient.invalidateQueries({ queryKey: ["todays-pos-revenue"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Get attendant name from logged-in user
  const attendantName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : null;

  const { data: tables } = useQuery({
    queryKey: ["restaurant-tables"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", profile.restaurant_id);

      if (error) throw error;
      return data as TableData[];
    },
  });

  const handleAddItem = (item: any) => {
    // Check if item has weight/volume-based pricing
    if (item.pricing_type && item.pricing_type !== "fixed") {
      // Show weight/quantity dialog for this item
      setPendingWeightItem(item);
      setShowWeightDialog(true);
      return;
    }

    // Standard fixed-price item handling
    const existingItem = currentOrderItems.find(
      (orderItem) =>
        orderItem.menuItemId === item.id && !orderItem.isCustomExtra
    );

    if (existingItem) {
      setCurrentOrderItems(
        currentOrderItems.map((orderItem) =>
          orderItem.menuItemId === item.id && !orderItem.isCustomExtra
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem
        )
      );
    } else {
      setCurrentOrderItems([
        ...currentOrderItems,
        {
          id: crypto.randomUUID(),
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          pricingType: "fixed",
        },
      ]);
    }

    toast({
      title: "Item Added",
      description: `${item.name} added to order`,
    });
  };

  // Handle weight-based item confirmation from dialog
  const handleWeightItemConfirm = (
    actualQuantity: number,
    unit: string,
    calculatedPrice: number
  ) => {
    if (!pendingWeightItem) return;

    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      menuItemId: pendingWeightItem.id,
      name: pendingWeightItem.name,
      price: pendingWeightItem.price,
      quantity: 1,
      actualQuantity: actualQuantity,
      unit: unit,
      pricingType: pendingWeightItem.pricing_type,
      baseUnitQuantity: pendingWeightItem.base_unit_quantity || 1,
      calculatedPrice: calculatedPrice,
    };

    setCurrentOrderItems([...currentOrderItems, newItem]);
    setPendingWeightItem(null);

    toast({
      title: "Item Added",
      description: `${pendingWeightItem.name} (${actualQuantity} ${unit}) added to order`,
    });
  };

  // Handle adding custom extras
  const handleAddCustomExtra = (item: OrderItem) => {
    setCurrentOrderItems([...currentOrderItems, item]);
    toast({
      title: "Custom Item Added",
      description: `${item.name} added to order`,
    });
  };

  // Handle removing custom extras
  const handleRemoveCustomExtra = (id: string) => {
    setCurrentOrderItems(currentOrderItems.filter((item) => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCurrentOrderItems(currentOrderItems.filter((item) => item.id !== id));
      return;
    }

    setCurrentOrderItems(
      currentOrderItems.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setCurrentOrderItems(currentOrderItems.filter((item) => item.id !== id));
  };

  const handleHoldOrder = async () => {
    if (currentOrderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Cannot hold an empty order",
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("Restaurant not found");

      const payloadItems = currentOrderItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        modifiers: item.modifiers || [],
        notes: item.notes ? [item.notes] : [],
      }));

      const orderTotal = currentOrderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      if (recalledKitchenOrderId) {
        // Update existing held order
        const { error: updateError } = await supabase
          .from("orders_unified")
          .update({
            items: payloadItems,
            kitchen_status: "held",
            status: "held",
            source: recalledSource || "POS",
            total_amount: orderTotal,
          })
          .eq("id", recalledKitchenOrderId);

        if (updateError) throw updateError;

        setCurrentOrderItems([]);
        setRecalledKitchenOrderId(null);
        setRecalledSource(null);

        toast({
          title: "Order Held",
          description: "Held order has been updated successfully",
        });
      } else {
        // Create new held order in unified table
        const { error: orderError } = await supabase
          .from("orders_unified")
          .insert({
            restaurant_id: profile.restaurant_id,
            source:
              orderType === "table" && tableNumber
                ? `Table ${tableNumber}`
                : "POS",
            status: "held",
            kitchen_status: "held",
            items: payloadItems,
            total_amount: orderTotal,
            subtotal: orderTotal,
            waiter_id: user.id,
          });

        if (orderError) throw orderError;

        // Clear current order
        setCurrentOrderItems([]);

        toast({
          title: "Order Held",
          description:
            "Order has been held successfully and can be recalled later",
        });
      }
    } catch (error) {
      console.error("Error holding order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to hold order. Please try again.",
      });
    }
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setCurrentOrderItems(
      currentOrderItems.map((item) =>
        item.id === id ? { ...item, notes } : item
      )
    );
  };

  const handleClearOrder = () => {
    if (currentOrderItems.length > 0) {
      setShowClearConfirm(true);
    }
  };

  const confirmClearOrder = () => {
    setCurrentOrderItems([]);
    setRecalledKitchenOrderId(null);
    setRecalledSource(null);
    setShowClearConfirm(false);
    toast({
      title: "Order Cleared",
      description: "All items have been cleared from the order",
    });
  };

  // Local cache for recently sent orders to prevent rapid duplicates
  // Stores a hash of the order content with a timestamp
  const recentlySentHashes = useState<{ [hash: string]: number }>({})[0];

  // Helper to generate a simple hash for order items
  const generateOrderHash = (items: OrderItem[], source: string) => {
    const itemString = items
      .map((i) => `${i.menuItemId}:${i.quantity}:${i.price}`)
      .sort()
      .join("|");
    return `${source}|${itemString}`;
  };

  // Check for duplicate orders before sending to kitchen
  const checkForDuplicateOrder = async (
    orderSource: string
  ): Promise<{
    isDuplicate: boolean;
    existingOrder?: {
      id: string;
      source: string;
      items: { name: string; quantity: number }[];
      created_at: string;
    };
  }> => {
    try {
      // 1. Check local cache first (Immediate response for rapid double-clicks)
      const currentHash = generateOrderHash(currentOrderItems, orderSource);
      const lastSentTime = recentlySentHashes[currentHash];

      // If sent within the last 10 seconds, block it immediately
      if (lastSentTime && Date.now() - lastSentTime < 10000) {
        console.log("Blocked by local duplicate cache");
        return { isDuplicate: true };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) return { isDuplicate: false };

      // Check for orders from the same source in the last 30 minutes
      const thirtyMinutesAgo = new Date(
        Date.now() - 30 * 60 * 1000
      ).toISOString();

      // Query orders_unified for active kitchen orders
      let query = supabase
        .from("orders_unified")
        .select("id, source, items, created_at")
        .eq("restaurant_id", profile.restaurant_id)
        .in("kitchen_status", ["new", "preparing"])
        .gte("created_at", thirtyMinutesAgo)
        .order("created_at", { ascending: false });

      // Apply server-side text search
      const sourceQuery = `source.ilike.%${orderSource}%${
        orderType === "Dine-In" && tableNumber
          ? `,source.ilike.%Table ${tableNumber}%`
          : ""
      }`;

      query = query.or(sourceQuery);

      const { data: existingOrders } = await query;

      if (!existingOrders || existingOrders.length === 0) {
        return { isDuplicate: false };
      }

      // Find orders with similar source (same table/customer)
      const currentOrderItemNames = currentOrderItems.map((item) =>
        item.name.toLowerCase()
      );

      for (const existingOrder of existingOrders) {
        const existingItems = (existingOrder.items || []) as {
          name: string;
          quantity: number;
        }[];
        const existingItemNames = existingItems.map((item: { name: string }) =>
          item.name.toLowerCase()
        );

        const matchingItems = currentOrderItemNames.filter((name) =>
          existingItemNames.includes(name)
        );

        // If more than 50% of items match, consider it a potential duplicate
        const overlapPercentage =
          matchingItems.length / currentOrderItemNames.length;

        if (overlapPercentage >= 0.5) {
          return {
            isDuplicate: true,
            existingOrder: {
              id: existingOrder.id,
              source: existingOrder.source,
              items: existingItems,
              created_at: existingOrder.created_at,
            },
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error("Error checking for duplicate orders:", error);
      return { isDuplicate: false };
    }
  };

  // Wrapper to check duplicates before sending
  const handleSendToKitchen = async (customerDetails?: {
    name: string;
    phone: string;
  }) => {
    if (currentOrderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Cannot send an empty order to the kitchen",
      });
      return;
    }

    // Skip duplicate check for Non-Chargeable orders (they are intentionally duplicates)
    if (orderType !== "Non-Chargeable") {
      const computedOrderSource = customerDetails?.name
        ? `${customerDetails.name} ${
            customerDetails.phone ? "(" + customerDetails.phone + ")" : ""
          }`
        : `${orderType === "Dine-In" ? "Table " + tableNumber : orderType}`;

      const orderSource = recalledSource || computedOrderSource;

      // Check for duplicate orders
      const { isDuplicate, existingOrder } = await checkForDuplicateOrder(
        orderSource
      );

      if (isDuplicate && existingOrder) {
        setPendingCustomerDetails(customerDetails);
        setExistingDuplicateOrder(existingOrder);
        setShowDuplicateWarning(true);
        return;
      }
    }

    // No duplicate found, proceed with sending
    await performSendToKitchen(customerDetails);
  };

  // Actual send to kitchen logic (called after duplicate check or when user confirms)
  const performSendToKitchen = async (
    customerDetails?: {
      name: string;
      phone: string;
    },
    forceNonChargeable: boolean = false
  ) => {
    if (isSendingToKitchen) return; // Prevent double-clicks
    setIsSendingToKitchen(true);

    // Determine effective order type (may be forced to non-chargeable from duplicate dialog)
    const effectiveOrderType = forceNonChargeable
      ? "Non-Chargeable"
      : orderType;

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("User not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", currentUser.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const computedOrderSource = customerDetails?.name
        ? `${customerDetails.name} ${
            customerDetails.phone ? "(" + customerDetails.phone + ")" : ""
          }`
        : `${
            effectiveOrderType === "Dine-In"
              ? "Table " + tableNumber
              : effectiveOrderType
          }`;

      const orderSource = recalledSource || computedOrderSource;
      const posOrderSource = `POS-${orderSource}`;

      const orderTotal = currentOrderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const orderItems = currentOrderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: [...(item.modifiers || []), ...(item.notes ? [item.notes] : [])],
      }));

      if (recalledKitchenOrderId) {
        // Update existing order from held to active
        const { error: updateError } = await supabase
          .from("orders_unified")
          .update({
            source: posOrderSource,
            items: orderItems,
            kitchen_status: "new",
            status: "pending",
            total_amount: orderTotal,
            subtotal: orderTotal,
            customer_name: orderSource,
            order_type: effectiveOrderType.toLowerCase().replace("-", "_"),
          })
          .eq("id", recalledKitchenOrderId);

        if (updateError) throw updateError;
      } else {
        // Create new unified order
        const { error: orderError } = await supabase
          .from("orders_unified")
          .insert({
            restaurant_id: profile.restaurant_id,
            source: posOrderSource,
            items: orderItems,
            kitchen_status: "new",
            status: "pending",
            total_amount: orderTotal,
            subtotal: orderTotal,
            customer_name: orderSource,
            order_type: effectiveOrderType.toLowerCase().replace("-", "_"),
            waiter_id: currentUser.id,
            server_name: attendantName,
          });

        if (orderError) throw orderError;
      }

      // Add to local duplicate prevention cache
      const hash = generateOrderHash(currentOrderItems, orderSource);
      recentlySentHashes[hash] = Date.now();

      toast({
        title: "Order Sent",
        description: "The order has been sent to the kitchen",
      });

      setCurrentOrderItems([]);
      setRecalledKitchenOrderId(null);
      setRecalledSource(null);
    } catch (error) {
      console.error("Error sending order to kitchen:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send order to kitchen",
      });
    } finally {
      setIsSendingToKitchen(false);
    }
  };

  const handlePaymentClick = () => {
    if (currentOrderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Cannot process payment for an empty order",
      });
      return;
    }
    setShowPayment(true);
  };

  const handleEditOrder = () => {
    setShowPayment(false);
    // Order is already visible, just close the payment dialog
  };

  const handlePaymentSuccess = () => {
    handleSendToKitchen();
    setShowPayment(false);
    setCurrentOrderItems([]);
    toast({
      title: "Payment Successful",
      description: "Order has been processed and sent to kitchen",
    });
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="grid grid-cols-1 lg:grid-cols-4 h-full gap-3 md:gap-4 p-3 md:p-4 pb-24 lg:pb-4">
        {/* Left Section - Menu & Orders */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Compact Header Section */}
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* POS controls */}
              <POSHeader
                orderType={orderType}
                setOrderType={handleOrderTypeChange}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                tables={tables}
              />

              {/* Revenue + Hide button grouped together */}
              <div className="flex items-center gap-2">
                {/* Today's Revenue Badge - Only visible to admin/manager/owner */}
                {(user?.role?.toLowerCase() === "admin" ||
                  user?.role?.toLowerCase() === "manager" ||
                  user?.role?.toLowerCase() === "owner") && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 rounded-xl border border-emerald-200 dark:border-emerald-700/50">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-medium">
                        Today's Revenue
                      </span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {currencySymbol}
                        {todaysRevenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Hide/Show Orders button */}
                <Button
                  variant="outline"
                  onClick={() => setShowActiveOrders(!showActiveOrders)}
                  size="sm"
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-300 ${
                    showActiveOrders
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/30"
                      : "bg-white/80 dark:bg-gray-700/80 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                  }`}
                >
                  {showActiveOrders ? (
                    <>
                      <ToggleRight className="h-4 w-4" />
                      <span className="hidden sm:inline">Hide</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Orders</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Active Orders Panel */}
            {showActiveOrders && (
              <div
                className="mt-3 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/30 dark:via-amber-900/30 dark:to-yellow-900/30 backdrop-blur-sm rounded-xl border-2 border-orange-200/60 dark:border-orange-700/60 shadow-lg shadow-orange-100/50 dark:shadow-orange-900/30 overflow-hidden transition-all duration-300 flex flex-col"
                style={{
                  height: activeOrdersExpanded ? "350px" : "150px",
                }}
              >
                <div className="flex-shrink-0 flex items-center justify-between p-3 bg-gradient-to-r from-orange-400/20 to-amber-400/20 dark:from-orange-600/30 dark:to-amber-600/30 border-b border-orange-200/50 dark:border-orange-700/50">
                  <h2 className="text-sm font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse shadow-lg shadow-orange-500/50"></div>
                    📋 Active Orders
                  </h2>

                  {/* Expand/Collapse Toggle */}
                  <button
                    onClick={() =>
                      setActiveOrdersExpanded(!activeOrdersExpanded)
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300 text-sm font-medium ${
                      activeOrdersExpanded
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                        : "bg-white/60 dark:bg-gray-700/60 hover:bg-orange-100 dark:hover:bg-orange-800/40 text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-700/50"
                    }`}
                    title={activeOrdersExpanded ? "Collapse" : "Expand"}
                  >
                    {activeOrdersExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Collapse</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span className="hidden sm:inline">Expand</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Scrollable Content - takes remaining space */}
                <div className="flex-1 overflow-auto p-3 min-h-0">
                  <ActiveOrdersList
                    onRecallOrder={({ items, kitchenOrderId, source }) => {
                      setCurrentOrderItems(items as OrderItem[]);
                      setRecalledKitchenOrderId(kitchenOrderId);
                      setRecalledSource(source);
                      toast({
                        title: "Order Recalled",
                        description:
                          "Held order has been recalled successfully",
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Menu Section - with fixed max-height and scroll */}
          <div
            className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg overflow-hidden flex flex-col"
            style={{ maxHeight: "calc(100vh - 320px)", minHeight: "400px" }}
          >
            {/* Compact Category Bar */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="text-xl">🍽️</span> Menu
                </h2>
              </div>
              <div className="mt-2">
                <MenuCategories
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                />
              </div>
            </div>

            {/* Scrollable menu items area with fixed height */}
            <div className="flex-1 overflow-auto p-3 min-h-0">
              <MenuItemsGrid
                selectedCategory={selectedCategory}
                onSelectItem={handleAddItem}
              />
            </div>
          </div>
        </div>

        {/* Right Section - Custom Extras & Current Order (Sticky on desktop) */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] flex flex-col gap-4 overflow-hidden">
          {/* Custom Extras Panel - Now at top for better visibility */}
          <div className="flex-shrink-0">
            <CustomExtrasPanel
              onAddCustomItem={handleAddCustomExtra}
              customItems={currentOrderItems.filter(
                (item) => item.isCustomExtra
              )}
              onRemoveCustomItem={handleRemoveCustomExtra}
            />
          </div>

          <CurrentOrder
            items={currentOrderItems}
            tableNumber={tableNumber}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onHoldOrder={handleHoldOrder}
            onSendToKitchen={() => handleSendToKitchen()}
            onProceedToPayment={handlePaymentClick}
            onClearOrder={handleClearOrder}
            onUpdateNotes={handleUpdateNotes}
          />
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        orderItems={currentOrderItems}
        onSuccess={handlePaymentSuccess}
        tableNumber={tableNumber}
        onEditOrder={handleEditOrder}
      />

      {/* Clear Order Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear this order? All items will be
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Weight/Quantity Dialog for weight-based items */}
      {pendingWeightItem && (
        <WeightQuantityDialog
          open={showWeightDialog}
          onClose={() => {
            setShowWeightDialog(false);
            setPendingWeightItem(null);
          }}
          onConfirm={handleWeightItemConfirm}
          item={{
            name: pendingWeightItem.name,
            price: pendingWeightItem.price,
            pricingType: pendingWeightItem.pricing_type as
              | "weight"
              | "volume"
              | "unit",
            pricingUnit: pendingWeightItem.pricing_unit || "kg",
            baseUnitQuantity: pendingWeightItem.base_unit_quantity || 1,
          }}
        />
      )}

      {/* Duplicate Order Warning Dialog */}
      <DuplicateOrderWarningDialog
        open={showDuplicateWarning}
        onClose={() => {
          setShowDuplicateWarning(false);
          setExistingDuplicateOrder(null);
          setPendingCustomerDetails(undefined);
        }}
        existingOrder={existingDuplicateOrder}
        newOrderItems={currentOrderItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
        }))}
        onSendAnyway={async () => {
          setShowDuplicateWarning(false);
          await performSendToKitchen(pendingCustomerDetails, false);
          setExistingDuplicateOrder(null);
          setPendingCustomerDetails(undefined);
        }}
        onMarkNonChargeable={async () => {
          setShowDuplicateWarning(false);
          await performSendToKitchen(pendingCustomerDetails, true);
          setExistingDuplicateOrder(null);
          setPendingCustomerDetails(undefined);
          toast({
            title: "Order Marked as Non-Chargeable",
            description:
              "This order has been marked as an accidental KOT and won't count towards revenue.",
          });
        }}
      />
    </div>
  );
};

export default POSMode;
