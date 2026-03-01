import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQSRMenuItems, QSRMenuItem } from "@/hooks/useQSRMenuItems";
import { useQSRTables } from "@/hooks/useQSRTables";
import { useActiveKitchenOrders } from "@/hooks/useActiveKitchenOrders";
import { usePastOrders, PastOrder } from "@/hooks/usePastOrders";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import PaymentDialog from "@/components/Orders/POS/PaymentDialog";

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
  // Delete confirmation state
  const [orderToDelete, setOrderToDelete] = useState<{
    order: ActiveKitchenOrder | PastOrder | null;
    type: "active" | "past" | null;
  }>({ order: null, type: null });

  // NC (Non-Chargeable) Reason state
  const [ncReason, setNcReason] = useState<string>("");

  // Customer name state for takeaway, delivery, and NC orders
  const [customerName, setCustomerName] = useState<string>("");

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

  // Query for today's revenue
  const queryClient = useQueryClient();
  const { data: todaysRevenue = 0 } = useQuery({
    queryKey: ["qsr-todays-revenue", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;

      const today = new Date();
      const { data: orders } = await supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .neq("order_type", "non-chargeable")
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString());

      if (!orders) return 0;
      return orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Query for restaurant name (for export filename)
  const { data: restaurantName = "Restaurant" } = useQuery({
    queryKey: ["restaurant-name", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return "Restaurant";

      const { data } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", restaurantId)
        .single();

      return data?.name || "Restaurant";
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  // Real-time subscription for revenue updates
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("qsr-revenue-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          const oldStatus = (payload.old as any)?.status;
          if (newStatus === "completed" || oldStatus === "completed") {
            queryClient.invalidateQueries({ queryKey: ["qsr-todays-revenue"] });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // Calculations - No tax in QSR POS (per user request)
  const subtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [orderItems],
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

  // Mode change handler - clear table and cart when switching modes
  const handleModeChange = useCallback(
    (mode: QSROrderMode) => {
      setOrderMode(mode);
      if (mode !== "dine_in") {
        setSelectedTable(null);
      }
      // Clear cart when switching modes (only if no pending/recalled order)
      if (
        orderItems.length > 0 &&
        !pendingKitchenOrderId &&
        !recalledKitchenOrderId
      ) {
        setOrderItems([]);
        setCustomerName(""); // Clear customer name when switching modes
        setNcReason(""); // Clear NC reason when switching modes
      }
    },
    [orderItems.length, pendingKitchenOrderId, recalledKitchenOrderId],
  );

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
                (m) => m.name.toLowerCase() === item.name.toLowerCase(),
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
            setItemCompletionStatus(
              (kitchenOrder.item_completion_status as boolean[]) || [],
            );

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
      } else {
        // Table is available - clear any existing order data from previous table
        // This prevents showing stale data when switching from an occupied table
        setOrderItems([]);
        setRecalledKitchenOrderId(null);
        setItemCompletionStatus([]);
        setPendingOrderId(null);
        setPendingKitchenOrderId(null);
        setPaymentOrderItems([]);
      }
      setSelectedTable(table);
    },
    [menuItems, toast],
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

  const handleClearOrder = useCallback(() => {
    setOrderItems([]);
    setRecalledKitchenOrderId(null);
    setItemCompletionStatus([]);
    setCustomerName(""); // Clear customer name
    setNcReason(""); // Clear NC reason
    toast({
      title: "Order Cleared",
      description: "All items removed from order",
    });
  }, [toast]);

  // Toggle item completion status in order pad (for recalled orders)
  const handleToggleItemCompletion = useCallback(
    async (index: number) => {
      const kitchenOrderId = recalledKitchenOrderId || pendingKitchenOrderId;
      if (!kitchenOrderId) return;

      // Create a copy of current status or initialize new array
      const newCompletionStatus = [...itemCompletionStatus];

      // Ensure array is long enough
      while (newCompletionStatus.length <= index) {
        newCompletionStatus.push(false);
      }

      // Toggle status
      newCompletionStatus[index] = !newCompletionStatus[index];

      // Update local state immediately
      setItemCompletionStatus(newCompletionStatus);

      // Update database
      try {
        const { error } = await supabase
          .from("kitchen_orders")
          .update({ item_completion_status: newCompletionStatus })
          .eq("id", kitchenOrderId);

        if (error) throw error;
      } catch (error) {
        console.error("Error toggling item completion:", error);
        // Revert on error
        setItemCompletionStatus(itemCompletionStatus);
      }
    },
    [recalledKitchenOrderId, pendingKitchenOrderId, itemCompletionStatus],
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
      let orderSource =
        orderMode === "dine_in" && selectedTable
          ? `Table ${selectedTable.name}`
          : orderMode.charAt(0).toUpperCase() +
            orderMode.slice(1).replace("_", " ");

      // Use customer name if provided (for takeaway/delivery/NC)
      const finalCustomerName = customerName.trim() || orderSource;

      const kitchenItems = orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes ? [item.notes] : [],
      }));

      if (recalledKitchenOrderId) {
        // Update existing kitchen order - preserve original created_at for timing display
        const { error: updateError } = await supabase
          .from("kitchen_orders")
          .update({
            items: kitchenItems,
            status: "new",
            source: `QSR-${orderSource}`,
            // Note: NOT resetting created_at - preserves original order timing
            started_at: null, // Reset preparation status
            completed_at: null,
            bumped_at: null,
          })
          .eq("id", recalledKitchenOrderId);

        if (updateError) throw updateError;
        console.log(
          "[QSR POS] Kitchen order updated and reset:",
          recalledKitchenOrderId,
        );
      } else {
        // Build order type for KDS
        const orderTypeMap: Record<QSROrderMode, string> = {
          dine_in: "dine_in",
          takeaway: "takeaway",
          delivery: "delivery",
          nc: "nc", // NC stored as 'nc' for proper recall
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
            customer_name: finalCustomerName, // Use actual customer name
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
            customer_name: finalCustomerName, // Use actual customer name
            items: orderItems.map((item) => {
              const notes = item.notes ? ` (${item.notes})` : "";
              return `${item.quantity}x ${item.name}${notes} @${item.price}`;
            }),
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
      setShowMobileCart(false); // Close cart sheet on mobile
      if (orderMode !== "dine_in") {
        setSelectedTable(null);
      }
      refetchTables();

      // Invalidate active orders query immediately
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
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
      // Determine order source/customer name
      let orderSource =
        orderMode === "dine_in" && selectedTable
          ? `Table ${selectedTable.name}`
          : orderMode.charAt(0).toUpperCase() +
            orderMode.slice(1).replace("_", " ");

      // Use customer name if provided (for takeaway/delivery/NC)
      const finalCustomerName = customerName.trim() || orderSource;

      const kitchenItems = orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes ? [item.notes] : [],
      }));

      const total = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

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
            items: orderItems.map((item) => {
              const notes = item.notes ? ` (${item.notes})` : "";
              return `${item.quantity}x ${item.name}${notes} @${item.price}`;
            }),
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

      // Invalidate active orders query immediately
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
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
    attendantName,
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
          (m) => m.name.toLowerCase() === item.name.toLowerCase(),
        );
        return {
          id: `${order.id}-${idx}`,
          menuItemId: menuItem?.id || `custom-${idx}`,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
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
        const sourceMatch = order.source.match(/table\s+(\w+)/i);
        if (sourceMatch) {
          const table = tables.find(
            (t) => t.name.toLowerCase() === sourceMatch[1].toLowerCase(),
          );
          if (table) {
            setSelectedTable(table);
          }
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
      orderItems.length,
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
          isCustom: !menuItem,
          notes: Array.isArray(item.notes) ? item.notes.join(", ") : item.notes,
        };
      });

      // Store the items for payment dialog
      setPaymentOrderItems(mappedItems);
      setPendingKitchenOrderId(order.id);
      setRecalledKitchenOrderId(order.id);

      // Try to extract table from source
      const sourceMatch = order.source.match(/table\s+(\w+)/i);
      if (sourceMatch && orderMode === "dine_in") {
        const table = tables.find(
          (t) => t.name.toLowerCase() === sourceMatch[1].toLowerCase(),
        );
        if (table) {
          setSelectedTable(table);
        }
      }

      // Open payment dialog (drawer stays open in background)
      setShowPaymentDialog(true);
    },
    [menuItems, tables, orderMode],
  );

  // Handle payment dialog close - Clear all payment state
  const handlePaymentDialogClose = useCallback(() => {
    setShowPaymentDialog(false);
    // Clear payment state to prevent stale data on next open
    setPaymentOrderItems([]);
    setPendingKitchenOrderId(null);
    // Note: We don't clear recalledKitchenOrderId here as it may be needed if user recalls the order again
  }, []);

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

        // Clear cart items (they were loaded from the recalled order)
        setOrderItems([]);
        setRecalledKitchenOrderId(null);
      } else if (orderItems.length > 0 && restaurantId) {
        // PRE-PAY: Create order directly as completed (skip kitchen queue since paid)
        const orderSource =
          currentMode === "dine_in" && currentTable
            ? `Table ${currentTable.name}`
            : currentMode === "takeaway"
              ? "Takeaway"
              : currentMode === "delivery"
                ? "Delivery"
                : "Non-Chargeable";

        // Prepare kitchen items
        const kitchenItems = orderItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes ? [item.notes] : [],
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
          kitchenOrder?.id,
        );

        // Create order record as completed
        const orderTotal = orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        const isNC = currentMode === "nc";

        // Prepare items array for orders table
        const orderItemsFormatted = orderItems.map(
          (item) => `${item.quantity}x ${item.name} @${item.price}`,
        );

        const { data: createdOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurantId,
            customer_name: orderSource, // Required field
            items: orderItemsFormatted, // Required field - array of strings
            status: "completed", // Already completed since paid
            total: isNC ? 0 : orderTotal,
            // For NC orders, store original value in discount_amount (100% discount)
            order_type: isNC ? "non-chargeable" : currentMode,
            nc_reason: isNC ? ncReason || null : null, // Save NC reason if provided
            source: "pos",
            payment_status: isNC ? "nc" : "paid",
            discount_amount: isNC ? orderTotal : 0, // Original value for NC orders
            discount_percentage: isNC ? 100 : 0,
            attendant: attendantName,
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

        // Deduct inventory based on recipe ingredients (non-blocking)
        if (kitchenOrder?.id) {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            const { data: deductResult, error: deductError } =
              await supabase.functions.invoke("deduct-inventory-on-prep", {
                body: { order_id: kitchenOrder.id },
                headers: {
                  Authorization: `Bearer ${session?.access_token}`,
                },
              });

            if (deductError) {
              console.error("Inventory deduction error:", deductError.message);
            } else if (!deductResult?.success && deductResult?.errors) {
              console.warn(
                "Inventory deduction warnings:",
                deductResult.errors,
              );
              toast({
                variant: "destructive",
                title: "Inventory Warning",
                description: deductResult.errors.join("\n"),
                duration: 6000,
              });
            } else {
              console.log(
                "Inventory deducted successfully for QSR pre-pay order",
              );
            }
          } catch (invErr) {
            console.error("Inventory deduction failed (non-blocking):", invErr);
          }
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
      setShowActiveOrders(false); // Close Active Orders drawer after successful payment

      // Invalidate active orders queries to reflect completed payment
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
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

  // Delete active order handler - initiates confirmation
  const handleDeleteActiveOrder = useCallback((order: ActiveKitchenOrder) => {
    setOrderToDelete({ order, type: "active" });
  }, []);

  // Delete past order handler - initiates confirmation
  const handleDeletePastOrder = useCallback((order: PastOrder) => {
    setOrderToDelete({ order, type: "past" });
  }, []);

  // Execute the actual deletion after confirmation
  const executeDeleteOrder = useCallback(async () => {
    const { order, type } = orderToDelete;
    if (!order) return;

    try {
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
  }, [orderToDelete, restaurantId, queryClient, toast]);

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
              {/* Back to Tables button - shows when table is selected in dine-in mode */}
              {orderMode === "dine_in" && selectedTable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
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
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground border-dashed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">Tables</span>
                </Button>
              )}
              <Zap className="w-6 h-6 text-indigo-500" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {orderMode === "dine_in" && selectedTable
                  ? `Table ${selectedTable.name}`
                  : "QSR POS"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Refresh Tables Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  refetchTables();
                  toast({
                    title: "Refreshed",
                    description: "Tables status updated",
                    duration: 1500,
                  });
                }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                title="Refresh Tables"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              {/* Active Orders Button */}
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
              {/* Past Orders Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPastOrders(true)}
                className="flex items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Past Orders</span>
              </Button>
              {/* Today's Revenue Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg shadow-sm">
                <TrendingUp className="w-4 h-4" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] font-medium opacity-90">
                    TODAY'S REVENUE
                  </span>
                  <span className="text-sm font-bold">
                    {formatIndianCurrency(todaysRevenue).formatted}
                  </span>
                </div>
              </div>
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
            onProceedToPayment={() => setShowPaymentDialog(true)}
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
        onProceedToPayment={() => setShowPaymentDialog(true)}
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
      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={handlePaymentDialogClose}
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
        onEditOrder={handlePaymentDialogClose}
        orderId={pendingKitchenOrderId || recalledKitchenOrderId || undefined}
        isNonChargeable={orderMode === "nc"}
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
    </div>
  );
};
