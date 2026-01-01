import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQSRMenuItems, QSRMenuItem } from "@/hooks/useQSRMenuItems";
import { useQSRTables } from "@/hooks/useQSRTables";
import { useActiveKitchenOrders } from "@/hooks/useActiveKitchenOrders";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { QSRCustomItemDialog } from "./QSRCustomItemDialog";
import { QSRCartBottomSheet, QSRCartFAB } from "./QSRCartBottomSheet";
import { Clock, Zap, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentDialog from "@/components/Orders/POS/PaymentDialog";

const TAX_RATE = 0.05; // 5% tax

export const QSRPosMain: React.FC = () => {
  // State
  const [orderMode, setOrderMode] = useState<QSROrderMode>("dine_in");
  const [selectedTable, setSelectedTable] = useState<QSRTable | null>(null);
  const [orderItems, setOrderItems] = useState<QSROrderItem[]>([]);
  const [showActiveOrders, setShowActiveOrders] = useState(false);
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
    []
  );

  // Hooks
  const { restaurantId } = useRestaurantId();
  const { user } = useAuth();
  const { toast } = useToast();
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
  } = useActiveKitchenOrders();

  // Get attendant name
  const attendantName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Staff";

  // Calculations - No tax in QSR POS (per user request)
  const subtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [orderItems]
  );
  const tax = 0; // No tax in QSR POS
  const total = subtotal;

  // Cart item counts for menu badges
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

  // Mode change handler - clear table when switching away from dine_in
  const handleModeChange = useCallback((mode: QSROrderMode) => {
    setOrderMode(mode);
    if (mode !== "dine_in") {
      setSelectedTable(null);
    }
  }, []);

  // Table selection handler
  const handleSelectTable = useCallback(
    async (table: QSRTable) => {
      if (table.status === "occupied" && table.activeOrderId) {
        // Load existing order for this table
        try {
          const { data: kitchenOrder, error } = await supabase
            .from("kitchen_orders")
            .select("*")
            .eq("id", table.activeOrderId)
            .single();

          if (error) throw error;

          if (kitchenOrder) {
            const items =
              (kitchenOrder.items as {
                name: string;
                quantity: number;
                price: number;
              }[]) || [];
            const mappedItems: QSROrderItem[] = items.map((item, idx) => {
              // Try to find matching menu item
              const menuItem = menuItems.find(
                (m) => m.name.toLowerCase() === item.name.toLowerCase()
              );
              return {
                id: `${kitchenOrder.id}-${idx}`,
                menuItemId: menuItem?.id || `custom-${idx}`,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                isCustom: !menuItem,
              };
            });

            setOrderItems(mappedItems);
            setRecalledKitchenOrderId(kitchenOrder.id);

            // Restore payment state if order exists
            if (kitchenOrder.order_id) {
              setPendingOrderId(kitchenOrder.order_id);
              setPendingKitchenOrderId(kitchenOrder.id);
              setPaymentOrderItems(mappedItems);
            }

            toast({
              title: "Order Recalled",
              description: `Loaded existing order for ${table.name}`,
            });
          }
        } catch (error) {
          console.error("Error loading table order:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load table order",
          });
        }
      }
      setSelectedTable(table);
    },
    [menuItems, toast]
  );

  // Add menu item to cart
  const handleAddItem = useCallback(
    (menuItem: QSRMenuItem) => {
      setOrderItems((prev) => {
        const existing = prev.find(
          (item) => item.menuItemId === menuItem.id && !item.isCustom
        );
        if (existing) {
          return prev.map((item) =>
            item.menuItemId === menuItem.id && !item.isCustom
              ? { ...item, quantity: item.quantity + 1 }
              : item
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
    [toast]
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
    [toast]
  );

  // Cart operations
  const handleIncrement = useCallback((id: string) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }, []);

  const handleDecrement = useCallback((id: string) => {
    setOrderItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleRemove = useCallback((id: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddNote = useCallback((id: string, note: string) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: note } : item))
    );
  }, []);

  const handleClearOrder = useCallback(() => {
    setOrderItems([]);
    setRecalledKitchenOrderId(null);
    toast({
      title: "Order Cleared",
      description: "All items removed from order",
    });
  }, [toast]);

  // Send to kitchen
  const handleSendToKitchen = useCallback(async () => {
    if (orderItems.length === 0 || !restaurantId) return;

    setIsLoading(true);
    try {
      // Determine order source
      let orderSource =
        orderMode === "dine_in" && selectedTable
          ? `Table ${selectedTable.name}`
          : orderMode.charAt(0).toUpperCase() +
            orderMode.slice(1).replace("_", " ");

      const kitchenItems = orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      }));

      if (recalledKitchenOrderId) {
        // Update existing kitchen order - also reset created_at so it appears in KDS "Today" filter
        const { error: updateError } = await supabase
          .from("kitchen_orders")
          .update({
            items: kitchenItems,
            status: "new",
            source: `QSR-${orderSource}`,
            created_at: new Date().toISOString(), // Reset to now for KDS date filtering
            started_at: null, // Reset preparation status
            completed_at: null,
            bumped_at: null,
          })
          .eq("id", recalledKitchenOrderId);

        if (updateError) throw updateError;
        console.log(
          "[QSR POS] Kitchen order updated and reset:",
          recalledKitchenOrderId
        );
      } else {
        // Build order type for KDS
        const orderTypeMap: Record<QSROrderMode, string> = {
          dine_in: "dine_in",
          takeaway: "takeaway",
          delivery: "delivery",
          nc: "takeaway", // NC treated as takeaway in KDS
        };

        // Create new kitchen order with all required fields
        const { data: kitchenOrder, error: kitchenError } = await supabase
          .from("kitchen_orders")
          .insert({
            restaurant_id: restaurantId,
            source: `QSR-${orderSource}`,
            status: "new",
            items: kitchenItems,
            order_type: orderTypeMap[orderMode],
            customer_name: orderSource,
            server_name: attendantName,
            priority: "normal",
          })
          .select()
          .single();

        console.log("[QSR POS] Kitchen order created:", kitchenOrder);

        if (kitchenError) throw kitchenError;

        // Create corresponding order record
        const { data: createdOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            customer_name: orderSource,
            items: orderItems.map((item) => {
              const notes = item.notes ? ` (${item.notes})` : "";
              return `${item.quantity}x ${item.name}${notes} @${item.price}`;
            }),
            total: total,
            status: "pending",
            source: "pos",
            order_type: orderMode.replace("_", "-"),
            attendant: attendantName,
          })
          .select()
          .single();

        if (orderError) throw orderError;

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

      // Update table status if dine-in
      if (orderMode === "dine_in" && selectedTable) {
        await updateTableStatus(selectedTable.id, "occupied");
      }

      toast({
        title: "Sent to Kitchen",
        description: "Order sent. Ready for payment when customer is done.",
      });

      // Reset cart but keep table selected for dine-in
      setOrderItems([]);
      setRecalledKitchenOrderId(null);
      if (orderMode !== "dine_in") {
        setSelectedTable(null);
      }
      refetchTables();
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
    recalledKitchenOrderId,
    toast,
    updateTableStatus,
    refetchTables,
  ]);

  // Hold order
  const handleHoldOrder = useCallback(async () => {
    if (orderItems.length === 0 || !restaurantId) return;

    setIsLoading(true);
    try {
      let orderSource =
        orderMode === "dine_in" && selectedTable
          ? `Table ${selectedTable.name}`
          : orderMode.charAt(0).toUpperCase() +
            orderMode.slice(1).replace("_", " ");

      const kitchenItems = orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
      }));

      if (recalledKitchenOrderId) {
        // Update existing
        await supabase
          .from("kitchen_orders")
          .update({
            items: kitchenItems,
            status: "held",
            source: `QSR-${orderSource}`,
          })
          .eq("id", recalledKitchenOrderId);
      } else {
        // Create new held order
        await supabase.from("kitchen_orders").insert({
          restaurant_id: restaurantId,
          source: `QSR-${orderSource}`,
          status: "held",
          items: kitchenItems,
          server_name: attendantName,
        });
      }

      toast({
        title: "Order Held",
        description: "Order saved and can be recalled later",
      });

      setOrderItems([]);
      setRecalledKitchenOrderId(null);
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
    toast,
  ]);

  // Recall order from active orders drawer
  const handleRecallOrder = useCallback(
    (order: ActiveKitchenOrder) => {
      if (orderItems.length > 0) {
        toast({
          variant: "destructive",
          title: "Clear Current Order",
          description:
            "Please clear the current order before recalling another",
        });
        return;
      }

      const mappedItems: QSROrderItem[] = order.items.map((item, idx) => {
        const menuItem = menuItems.find(
          (m) => m.name.toLowerCase() === item.name.toLowerCase()
        );
        return {
          id: `${order.id}-${idx}`,
          menuItemId: menuItem?.id || `custom-${idx}`,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          isCustom: !menuItem,
        };
      });

      setOrderItems(mappedItems);
      setRecalledKitchenOrderId(order.id);
      setShowActiveOrders(false);

      // Try to extract table from source
      const sourceMatch = order.source.match(/table\s+(\w+)/i);
      if (sourceMatch && orderMode === "dine_in") {
        const table = tables.find(
          (t) => t.name.toLowerCase() === sourceMatch[1].toLowerCase()
        );
        if (table) {
          setSelectedTable(table);
        }
      }

      toast({
        title: "Order Recalled",
        description: `Recalled order from ${order.source}`,
      });
    },
    [orderItems.length, menuItems, tables, orderMode, toast]
  );

  // Payment success handler - Supports both pre-pay and post-pay flows
  const handlePaymentSuccess = useCallback(async () => {
    try {
      // Capture current table before any state changes
      const currentTable = selectedTable;
      const currentMode = orderMode;

      // Check if this is post-pay (order already in kitchen)
      if (pendingOrderId && pendingKitchenOrderId) {
        // POST-PAY: Order already in kitchen, just mark as completed
        await supabase
          .from("orders")
          .update({ status: "completed" })
          .eq("id", pendingOrderId);

        await supabase
          .from("kitchen_orders")
          .update({
            bumped_at: new Date().toISOString(),
            status: "completed",
          })
          .eq("id", pendingKitchenOrderId);

        // Clear pending order state
        setPendingOrderId(null);
        setPendingKitchenOrderId(null);
        setPaymentOrderItems([]);
      } else if (orderItems.length > 0 && restaurantId) {
        // PRE-PAY: Create order directly as completed (skip kitchen queue since paid)
        const orderSource =
          currentMode === "dine_in" && currentTable
            ? `Table ${currentTable.name}`
            : currentMode === "takeaway"
            ? "Takeaway"
            : currentMode === "delivery"
            ? "Delivery"
            : "NC";

        // Prepare kitchen items
        const kitchenItems = orderItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        }));

        // Create kitchen order as bumped (completed) - for record keeping
        const { data: kitchenOrder, error: kitchenError } = await supabase
          .from("kitchen_orders")
          .insert({
            restaurant_id: restaurantId,
            source: `QSR-${orderSource}`,
            status: "completed", // Already completed since paid
            items: kitchenItems,
            order_type: currentMode === "nc" ? "takeaway" : currentMode,
            customer_name: orderSource,
            server_name: attendantName,
            priority: "normal",
            bumped_at: new Date().toISOString(), // Mark as completed immediately
          })
          .select()
          .single();

        if (kitchenError) throw kitchenError;
        console.log(
          "[QSR POS] Pre-pay order created (completed):",
          kitchenOrder?.id
        );

        // Create order record as completed
        const { data: createdOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            status: "completed", // Already completed since paid
            total: orderItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            ),
            order_type: currentMode,
            table_number:
              currentMode === "dine_in" && currentTable
                ? currentTable.name
                : null,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Link kitchen order to order record
        if (createdOrder?.id && kitchenOrder?.id) {
          await supabase
            .from("kitchen_orders")
            .update({ order_id: createdOrder.id })
            .eq("id", kitchenOrder.id);
        }

        // Clear cart
        setOrderItems([]);
        setRecalledKitchenOrderId(null);
      }

      // Free up table if dine-in
      if (currentMode === "dine_in" && currentTable) {
        await updateTableStatus(currentTable.id, "available");
        setSelectedTable(null);
        refetchTables();
      }

      toast({
        title: "Payment Complete",
        description: "Order has been paid and completed",
      });

      setShowPaymentDialog(false);
    } catch (error) {
      console.error("Error completing payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete payment",
      });
    }
  }, [
    pendingOrderId,
    pendingKitchenOrderId,
    orderItems,
    orderMode,
    selectedTable,
    restaurantId,
    attendantName,
    updateTableStatus,
    refetchTables,
    toast,
  ]);

  // Determine what to show in main area
  const showTableSelection = orderMode === "dine_in" && !selectedTable;
  const showMenu = orderMode !== "dine_in" || selectedTable;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Header */}
      <div className="flex-shrink-0 sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-indigo-500" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                QSR POS
              </h1>
            </div>
            <div className="flex items-center gap-2">
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
            </div>
          </div>

          {/* Mode Selector */}
          <QSRModeSelector
            selectedMode={orderMode}
            onModeChange={handleModeChange}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4">
        {/* Left Panel - Order Pad (Desktop only) */}
        <div className="hidden md:block w-[35%] min-w-[320px] max-w-[400px]">
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
            onProceedToPayment={() => setShowPaymentDialog(true)}
            onClearOrder={handleClearOrder}
            onAddCustomItem={() => setShowCustomItemDialog(true)}
            onChangeTable={() => setSelectedTable(null)}
            isLoading={isLoading}
          />
        </div>

        {/* Right Panel - Selection Area */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {showTableSelection ? (
            <QSRTableGrid
              tables={tables}
              selectedTableId={selectedTable?.id || null}
              onSelectTable={handleSelectTable}
              isLoading={tablesLoading}
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
        onProceedToPayment={() => setShowPaymentDialog(true)}
        onClearOrder={handleClearOrder}
        onAddCustomItem={() => setShowCustomItemDialog(true)}
        onChangeTable={() => setSelectedTable(null)}
        isLoading={isLoading}
        menuItems={menuItems}
        onAddMenuItem={handleAddItem}
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
      />

      {/* Custom Item Dialog */}
      <QSRCustomItemDialog
        isOpen={showCustomItemDialog}
        onClose={() => setShowCustomItemDialog(false)}
        onAddItem={handleAddCustomItem}
      />

      {/* Payment Dialog - Uses cart items for pre-pay, stored items for post-pay */}
      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        orderItems={(orderItems.length > 0
          ? orderItems
          : paymentOrderItems
        ).map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
        }))}
        onSuccess={handlePaymentSuccess}
        tableNumber={selectedTable?.name || ""}
        onEditOrder={() => setShowPaymentDialog(false)}
      />
    </div>
  );
};
