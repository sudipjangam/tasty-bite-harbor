import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  // Active Orders panel expand state
  const [activeOrdersExpanded, setActiveOrdersExpanded] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const { symbol: currencySymbol } = useCurrencyContext();

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
        .from("orders")
        .select("total, discount_amount")
        .eq("restaurant_id", profile.restaurant_id)
        .eq("status", "completed")
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      if (!orders) return 0;

      return orders.reduce(
        (sum, order) => sum + (order.total - (order.discount_amount || 0)),
        0
      );
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
      }));

      if (recalledKitchenOrderId) {
        // Update existing held order
        const { error: updateError } = await supabase
          .from("kitchen_orders")
          .update({
            items: payloadItems,
            status: "held",
            source: recalledSource || "POS",
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
        // Create new held order
        const { error: kitchenError } = await supabase
          .from("kitchen_orders")
          .insert({
            restaurant_id: profile.restaurant_id,
            source:
              orderType === "table" && tableNumber
                ? `Table ${tableNumber}`
                : "POS",
            status: "held",
            items: payloadItems,
          });

        if (kitchenError) throw kitchenError;

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

    if (isSendingToKitchen) return; // Prevent double-clicks
    setIsSendingToKitchen(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const computedOrderSource = customerDetails?.name
        ? `${customerDetails.name} ${
            customerDetails.phone ? "(" + customerDetails.phone + ")" : ""
          }`
        : `${orderType === "Dine-In" ? "Table " + tableNumber : orderType}`;

      const orderSource = recalledSource || computedOrderSource;

      if (recalledKitchenOrderId) {
        // Update existing kitchen order from held to active
        const { error: updateError } = await supabase
          .from("kitchen_orders")
          .update({
            source: orderSource,
            items: currentOrderItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            status: "new",
          })
          .eq("id", recalledKitchenOrderId);

        if (updateError) throw updateError;

        // Create corresponding order record
        const { data: createdOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: profile.restaurant_id,
            customer_name: orderSource,
            items: currentOrderItems.map((item) => {
              const notes = [...(item.modifiers || []), item.notes]
                .filter(Boolean)
                .join(", ");
              const meta = notes ? ` (${notes})` : "";
              return `${item.quantity}x ${item.name}${meta} @${item.price}`;
            }),
            total: currentOrderItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            ),
            status: "pending",
            source: "pos",
            order_type: orderType.toLowerCase(),
            attendant: attendantName,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Link the kitchen order to the created order
        if (createdOrder?.id) {
          await supabase
            .from("kitchen_orders")
            .update({ order_id: createdOrder.id })
            .eq("id", recalledKitchenOrderId);
        }
      } else {
        const posOrderSource = `POS-${orderSource}`;

        const { error: kitchenError, data: kitchenOrder } = await supabase
          .from("kitchen_orders")
          .insert({
            restaurant_id: profile.restaurant_id,
            source: posOrderSource,
            items: currentOrderItems.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
            status: "new",
          })
          .select()
          .single();

        if (kitchenError) throw kitchenError;

        const { error: orderError, data: createdOrder } = await supabase
          .from("orders")
          .insert({
            restaurant_id: profile.restaurant_id,
            customer_name: orderSource,
            items: currentOrderItems.map((item) => {
              const notes = [...(item.modifiers || []), item.notes]
                .filter(Boolean)
                .join(", ");
              const meta = notes ? ` (${notes})` : "";
              return `${item.quantity}x ${item.name}${meta} @${item.price}`;
            }),
            total: currentOrderItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            ),
            status: "pending",
            source: "pos",
            order_type: orderType.toLowerCase(),
            attendant: attendantName,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Link the kitchen order to the created orders record so status sync works
        if (createdOrder?.id && kitchenOrder?.id) {
          await supabase
            .from("kitchen_orders")
            .update({ order_id: createdOrder.id })
            .eq("id", kitchenOrder.id);
        }
      }

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
                setOrderType={setOrderType}
                tableNumber={tableNumber}
                setTableNumber={setTableNumber}
                tables={tables}
              />

              {/* Revenue + Hide button grouped together */}
              <div className="flex items-center gap-2">
                {/* Today's Revenue Badge */}
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
    </div>
  );
};

export default POSMode;
