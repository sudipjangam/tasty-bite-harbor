import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Volume2,
  VolumeX,
  Filter,
  Maximize2,
  ChefHat,
  RefreshCw,
  AlertTriangle,
  LayoutGrid,
  List,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HelpProvider from "@/components/Help/HelpProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OrderTicket from "./OrderTicket";
import OrdersColumn from "./OrdersColumn";
import DateFilter from "./DateFilter";
import { useKitchenSounds } from "@/hooks/useKitchenSounds";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  differenceInMinutes,
} from "date-fns";

// Enhanced KitchenOrder interface with all new fields
export interface KitchenOrder {
  id: string;
  source: string;
  status: "new" | "preparing" | "ready" | "bumped" | "completed";
  created_at: string;
  priority: "normal" | "rush" | "vip";
  station?: string;
  estimated_prep_time?: number;
  started_at?: string;
  completed_at?: string;
  bumped_at?: string;
  customer_name?: string;
  server_name?: string;
  order_type?: "dine_in" | "takeaway" | "delivery" | "room_service";
  items: {
    name: string;
    quantity: number;
    notes?: string[];
    has_allergy?: boolean;
    priority?: "first" | "normal" | "last";
    is_addition?: boolean;
    parent_order_number?: string | number;
  }[];
  item_completion_status?: boolean[];
}

// Station options for filtering
const STATION_OPTIONS = [
  { value: "all", label: "All Stations" },
  { value: "grill", label: "Grill" },
  { value: "fryer", label: "Fryer" },
  { value: "salad", label: "Salad & Cold" },
  { value: "drinks", label: "Drinks" },
  { value: "dessert", label: "Dessert" },
  { value: "expo", label: "Expo" },
];

// Page size for pagination
const PAGE_SIZE = 50;

// Time threshold in minutes to flag late orders
const LATE_ORDER_THRESHOLD = 15;

const KitchenDisplay = () => {
  const { restaurantName } = useRestaurantId();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const {
    isAudioEnabled,
    enableAudio,
    disableAudio,
    playNewOrder,
    playModified,
    playRushOrder,
    playReadyChime
  } = useKitchenSounds();
  const [dateFilter, setDateFilter] = useState("today");
  const [stationFilter, setStationFilter] = useState("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"detailed" | "compact">("compact");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Transform raw order data to KitchenOrder type
  const transformOrderData = useCallback((order: any): KitchenOrder => {
    const itemsArray = Array.isArray(order.items) ? order.items : [];
    const itemCompletionStatus = Array.isArray(order.item_completion_status)
      ? order.item_completion_status
      : new Array(itemsArray.length).fill(false);

    const transformedItems = itemsArray.map((item: any, idx: number) => ({
      name: typeof item.name === "string" ? item.name : "Unknown Item",
      quantity: typeof item.quantity === "number" ? item.quantity : 1,
      notes: Array.isArray(item.notes) ? item.notes : undefined,
      priority: item.priority || "normal",
      is_addition: !!item.is_addition,
      parent_order_number: item.parent_order_number,
      has_allergy:
        item.has_allergy ||
        (Array.isArray(item.notes) &&
          item.notes.some((note: string) =>
            /allerg|gluten|dairy|nut|vegan|vegetarian/i.test(note),
          )),
    }));

    let displaySource = order.source;
    if (displaySource && displaySource.toLowerCase() === "qr") {
      displaySource = order.table_number
        ? `Table ${order.table_number} (QR)`
        : "QR Order";
    }

    return {
      id: order.id,
      source: displaySource,
      status: order.status as KitchenOrder["status"],
      created_at: order.created_at,
      priority: (order.priority as KitchenOrder["priority"]) || "normal",
      station: order.station,
      estimated_prep_time: order.estimated_prep_time,
      started_at: order.started_at,
      completed_at: order.completed_at,
      bumped_at: order.bumped_at,
      customer_name: order.customer_name,
      server_name: order.server_name,
      order_type: order.order_type,
      items: transformedItems,
      item_completion_status: itemCompletionStatus,
    };
  }, []);

  // Fetch restaurant ID on mount
  useEffect(() => {
    const fetchRestaurantId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.restaurant_id) {
        setRestaurantId(profile.restaurant_id);
      }
    };

    fetchRestaurantId();
  }, []);

  // Fetch orders with server-side filtering and pagination
  const fetchOrders = useCallback(
    async (resetPage = false) => {
      if (!restaurantId) return;

      setIsLoading(true);
      const currentPage = resetPage ? 0 : page;

      try {
        let query = supabase
          .from("kitchen_orders")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .not("source", "ilike", "QuickServe%") // Food truck orders use QS Active Orders, not KDS
          .is("bumped_at", null) // Exclude bumped orders
          .order("priority", { ascending: true }) // VIP first, then rush, then normal (alphabetically vip < rush < normal is false, so we use custom)
          .order("created_at", { ascending: false })
          .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

        const today = new Date();

        // Apply date filters
        switch (dateFilter) {
          case "today":
            query = query
              .gte("created_at", startOfDay(today).toISOString())
              .lte("created_at", endOfDay(today).toISOString());
            break;
          case "yesterday":
            const yesterday = subDays(today, 1);
            query = query
              .gte("created_at", startOfDay(yesterday).toISOString())
              .lte("created_at", endOfDay(yesterday).toISOString());
            break;
          case "last7days":
            query = query
              .gte("created_at", startOfDay(subDays(today, 6)).toISOString())
              .lte("created_at", endOfDay(today).toISOString());
            break;
          case "thisMonth":
            query = query
              .gte("created_at", startOfMonth(today).toISOString())
              .lte("created_at", endOfMonth(today).toISOString());
            break;
        }

        // Apply station filter
        if (stationFilter !== "all") {
          query = query.eq("station", stationFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data) {
          const typedOrders = data.map(transformOrderData);

          // Sort by priority (vip > rush > normal) then by created_at
          const sortedOrders = typedOrders.sort((a, b) => {
            const priorityOrder = { vip: 0, rush: 1, normal: 2 };
            const priorityDiff =
              priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          });

          if (resetPage) {
            setOrders(sortedOrders);
            setPage(0);
          } else {
            setOrders((prev) =>
              currentPage === 0 ? sortedOrders : [...prev, ...sortedOrders],
            );
          }

          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch orders",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [restaurantId, dateFilter, stationFilter, page, transformOrderData, toast],
  );

  // Re-fetch when filters change
  useEffect(() => {
    if (restaurantId) {
      fetchOrders(true);
    }
  }, [restaurantId, dateFilter, stationFilter]);

  // Helper function to check if an order falls within the current date filter
  const isWithinDateFilter = useCallback(
    (orderCreatedAt: string): boolean => {
      const orderDate = new Date(orderCreatedAt);
      const today = new Date();

      switch (dateFilter) {
        case "today":
          return orderDate >= startOfDay(today) && orderDate <= endOfDay(today);
        case "yesterday":
          const yesterday = subDays(today, 1);
          return (
            orderDate >= startOfDay(yesterday) &&
            orderDate <= endOfDay(yesterday)
          );
        case "last7days":
          return (
            orderDate >= startOfDay(subDays(today, 6)) &&
            orderDate <= endOfDay(today)
          );
        case "thisMonth":
          return (
            orderDate >= startOfMonth(today) && orderDate <= endOfMonth(today)
          );
        case "all":
          return true;
        default:
          return true;
      }
    },
    [dateFilter],
  );

  // Subscribe to real-time updates with restaurant_id filter
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`kitchen-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const isQuickServeTicket = (source: unknown) =>
            typeof source === "string" &&
            source.toLowerCase().startsWith("quickserve");

          if (payload.eventType === "INSERT") {
            const newOrderData = payload.new;

            if (isQuickServeTicket(newOrderData.source)) {
              return;
            }

            // Check if the new order falls within current date filter
            if (!isWithinDateFilter(newOrderData.created_at)) {
              return;
            }

            // Check station filter
            if (
              stationFilter !== "all" &&
              newOrderData.station !== stationFilter
            ) {
              return;
            }

            const newOrder = transformOrderData(newOrderData);

            setOrders((prev) => {
              const updated = [newOrder, ...prev];
              // Re-sort by priority
              return updated.sort((a, b) => {
                const priorityOrder = { vip: 0, rush: 1, normal: 2 };
                const priorityDiff =
                  priorityOrder[a.priority] - priorityOrder[b.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return (
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
                );
              });
            });

            if (newOrder.priority === "vip" || newOrder.priority === "rush") {
              playRushOrder();
            } else {
              playNewOrder();
            }

            toast({
              title:
                newOrder.priority === "vip"
                  ? "🌟 VIP Order!"
                  : newOrder.priority === "rush"
                    ? "🔥 RUSH Order!"
                    : "New Order",
              description: `Order from ${newOrder.source}${
                newOrder.customer_name ? ` - ${newOrder.customer_name}` : ""
              }`,
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedOrderData = payload.new;

            if (isQuickServeTicket(updatedOrderData.source)) {
              setOrders((prev) =>
                prev.filter((order) => order.id !== updatedOrderData.id),
              );
              return;
            }

            // If order was bumped, remove from list
            if (updatedOrderData.bumped_at) {
              setOrders((prev) =>
                prev.filter((order) => order.id !== updatedOrderData.id),
              );
              return;
            }

            // Check if the updated order now falls within current date filter
            const nowWithinDateFilter = isWithinDateFilter(
              updatedOrderData.created_at,
            );

            // Check station filter
            const matchesStationFilter =
              stationFilter === "all" ||
              updatedOrderData.station === stationFilter;

            const updatedOrder = transformOrderData(updatedOrderData);

            let itemsChanged = false;

            setOrders((prev) => {
              const existingIndex = prev.findIndex(
                (order) => order.id === updatedOrder.id,
              );

              if (existingIndex >= 0) {
                const oldOrder = prev[existingIndex];
                itemsChanged = JSON.stringify(oldOrder.items) !== JSON.stringify(updatedOrder.items);
              }

              if (nowWithinDateFilter && matchesStationFilter) {
                if (existingIndex >= 0) {
                  // Order exists, update it
                  const updated = [...prev];
                  updated[existingIndex] = updatedOrder;
                  return updated;
                } else {
                  // Order doesn't exist but now matches filters, add it (e.g., created_at was updated to today)
                  const updated = [updatedOrder, ...prev];
                  // Re-sort by priority
                  return updated.sort((a, b) => {
                    const priorityOrder = { vip: 0, rush: 1, normal: 2 };
                    const priorityDiff =
                      priorityOrder[a.priority] - priorityOrder[b.priority];
                    if (priorityDiff !== 0) return priorityDiff;
                    return (
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                    );
                  });
                }
              } else {
                // Order no longer matches filters, remove if present
                if (existingIndex >= 0) {
                  return prev.filter((order) => order.id !== updatedOrder.id);
                }
                return prev;
              }
            });

            // Play notification on item modifications or status refreshes
            if (itemsChanged) {
              if (updatedOrder.priority === "vip" || updatedOrder.priority === "rush") {
                playRushOrder();
              } else {
                playModified();
              }
              toast({
                title: "Order Items Modified",
                description: `Items for ${updatedOrder.source} have been updated`,
              });
            } else if (
              updatedOrderData.status === "new" &&
              nowWithinDateFilter &&
              matchesStationFilter
            ) {
              if (updatedOrder.priority === "vip" || updatedOrder.priority === "rush") {
                playRushOrder();
              } else {
                playNewOrder();
              }
              toast({
                title: "Order Updated",
                description: `Order from ${updatedOrder.source} status is updated`,
              });
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setOrders((prev) => prev.filter((order) => order.id !== deletedId));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    restaurantId,
    toast,
    dateFilter,
    stationFilter,
    isWithinDateFilter,
    transformOrderData,
    playNewOrder,
    playModified,
    playRushOrder,
  ]);

  // Handle status update with time tracking
  const handleStatusUpdate = async (
    orderId: string,
    newStatus: KitchenOrder["status"],
  ) => {
    try {
      const updateData: any = { status: newStatus };

      // Add time tracking
      if (newStatus === "preparing") {
        updateData.started_at = new Date().toISOString();

        // Inventory deduction is non-blocking - show warnings but don't prevent order progression
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          const { data: deductResult, error: deductError } =
            await supabase.functions.invoke("deduct-inventory-on-prep", {
              body: { order_id: orderId },
              headers: {
                Authorization: `Bearer ${session?.access_token}`,
              },
            });

          if (deductError) {
            console.warn("Inventory deduction error:", deductError.message);
            toast({
              variant: "destructive",
              title: "Inventory Warning",
              description: "Could not deduct inventory. Check stock levels.",
              duration: 5000,
            });
          } else if (deductResult && !deductResult.success) {
            const errorMessage = deductResult.errors
              ? deductResult.errors.join("\n")
              : deductResult.error || "Some ingredients could not be deducted";
            toast({
              variant: "destructive",
              title: "Inventory Warning",
              description: errorMessage,
              duration: 8000,
            });
          } else {
          }
        } catch (inventoryError) {
          console.error("Inventory deduction failed:", inventoryError);
          toast({
            variant: "destructive",
            title: "Inventory Warning",
            description: "Inventory deduction failed, but order will proceed.",
            duration: 5000,
          });
        }
      } else if (newStatus === "ready") {
        updateData.completed_at = new Date().toISOString();
      }

      // Fetch order_id FIRST to avoid circular trigger issues with .select() after update
      const { data: existingOrder } = await supabase
        .from("kitchen_orders")
        .select("order_id")
        .eq("id", orderId)
        .maybeSingle();

      // Update kitchen order status WITHOUT select to avoid triggering circular database triggers
      const { error: kitchenError } = await supabase
        .from("kitchen_orders")
        .update(updateData)
        .eq("id", orderId);

      if (kitchenError) throw kitchenError;

      // Also update the corresponding order status in orders table
      if (existingOrder?.order_id) {
        let orderStatus = "pending";
        if (newStatus === "preparing") orderStatus = "preparing";
        if (newStatus === "ready") orderStatus = "ready";
        if (newStatus === "completed") orderStatus = "completed";

        await supabase
          .from("orders")
          .update({ status: orderStatus, updated_at: new Date().toISOString() })
          .eq("id", existingOrder.order_id);
      }

      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });

      // Optimistic UI update - immediately move the order in local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: newStatus,
                ...(newStatus === "preparing"
                  ? { started_at: updateData.started_at }
                  : {}),
                ...(newStatus === "ready"
                  ? { completed_at: updateData.completed_at }
                  : {}),
              }
            : o,
        ),
      );

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus}${
          newStatus === "preparing" ? " - Inventory updated" : ""
        }`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update order status",
      });
    }
  };

  // Handle bumping (archiving) an order
  const handleBumpOrder = async (orderId: string) => {
    try {
      const { data: existingOrder } = await supabase
        .from("kitchen_orders")
        .select("order_id")
        .eq("id", orderId)
        .maybeSingle();

      const { error } = await supabase
        .from("kitchen_orders")
        .update({ bumped_at: new Date().toISOString(), status: "completed" })
        .eq("id", orderId);

      if (error) throw error;

      // Sync status to orders table
      if (existingOrder?.order_id) {
        await supabase
          .from("orders")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", existingOrder.order_id);
      }

      // Optimistically remove from UI (realtime will also handle this)
      setOrders((prev) => prev.filter((order) => order.id !== orderId));

      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });

      toast({
        title: "Order Bumped",
        description: "Order has been archived",
      });
    } catch (error) {
      console.error("Error bumping order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to bump order",
      });
    }
  };

  // Handle item completion persistence
  const handleItemComplete = async (
    orderId: string,
    itemIndex: number,
    completed: boolean,
  ) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      const newCompletionStatus = [
        ...(order.item_completion_status ||
          new Array(order.items.length).fill(false)),
      ];
      newCompletionStatus[itemIndex] = completed;

      const { error } = await supabase
        .from("kitchen_orders")
        .update({ item_completion_status: newCompletionStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, item_completion_status: newCompletionStatus }
            : o,
        ),
      );
    } catch (error) {
      console.error("Error updating item completion:", error);
    }
  };

  // Handle item order update (DND)
  const handleUpdateItems = async (
    orderId: string,
    newItems: any[],
    newCompletionStatus: boolean[],
  ) => {
    try {
      const { error } = await supabase
        .from("kitchen_orders")
        .update({
          items: newItems,
          item_completion_status: newCompletionStatus,
        })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state optimistically
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, items: newItems, item_completion_status: newCompletionStatus }
            : o,
        ),
      );
    } catch (error) {
      console.error("Error updating item order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update item order",
      });
    }
  };

  // Handle priority change
  const handlePriorityChange = async (
    orderId: string,
    newPriority: KitchenOrder["priority"],
  ) => {
    try {
      const { data: existingOrder } = await supabase
        .from("kitchen_orders")
        .select("order_id")
        .eq("id", orderId)
        .maybeSingle();

      const { error } = await supabase
        .from("kitchen_orders")
        .update({ priority: newPriority })
        .eq("id", orderId);

      if (error) throw error;

      if (existingOrder?.order_id) {
        await supabase
          .from("orders")
          .update({ priority: newPriority, updated_at: new Date().toISOString() })
          .eq("id", existingOrder.order_id);
      }

      queryClient.invalidateQueries({ queryKey: ["all-orders"] });

      // Update local state and re-sort by priority
      setOrders((prev) => {
        const updated = prev.map((o) =>
          o.id === orderId ? { ...o, priority: newPriority } : o,
        );

        // Sort by priority: vip (0) -> rush (1) -> normal (2), then by created_at
        return updated.sort((a, b) => {
          const priorityOrder = { vip: 0, rush: 1, normal: 2 };
          const aPriority =
            priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
          const bPriority =
            priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;

          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }

          // If same priority, sort by created_at (newest first)
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
      });

      toast({
        title: "Priority Updated",
        description: `Order priority changed to ${newPriority.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Error updating priority:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update order priority",
      });
    }
  };

  // Filter orders by status, excluding bumped
  const filterOrdersByStatus = (status: KitchenOrder["status"]) => {
    return orders.filter(
      (order) => order.status === status && !order.bumped_at,
    );
  };

  // Check if an order is late (exceeds threshold)
  const isOrderLate = (order: KitchenOrder): boolean => {
    if (order.status === "ready" || order.bumped_at) return false;
    const minutesSinceCreation = differenceInMinutes(
      new Date(),
      new Date(order.created_at),
    );
    return (
      minutesSinceCreation > (order.estimated_prep_time || LATE_ORDER_THRESHOLD)
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((prev) => prev + 1);
      fetchOrders(false);
    }
  };

  const handleToggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"new" | "preparing" | "ready" | "all">("new");

  const totalOrders = orders.length;
  const newOrders = filterOrdersByStatus("new").length;
  const preparingOrders = filterOrdersByStatus("preparing").length;
  const readyOrders = filterOrdersByStatus("ready").length;
  const lateOrders = orders.filter(isOrderLate).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-3 sm:p-6 pb-28 sm:pb-8">
      {isMobile ? (
        /* Mobile Top Bar */
        <div className="mb-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3 shadow-md">
          {/* Row 1: Brand / Title + Quick Action Icons */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-sm flex-shrink-0">
                <ChefHat className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    Kitchen Display System
                  </h1>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" title="Live connection" />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  Real-time order management dashboard
                </p>
              </div>
            </div>

            {/* Action icons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => isAudioEnabled ? disableAudio() : enableAudio()}
                className={`h-8 w-8 rounded-lg transition-all ${
                  isAudioEnabled
                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                }`}
                title={isAudioEnabled ? "Mute kitchen alerts" : "Enable kitchen audio alerts"}
              >
                {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchOrders(true)}
                disabled={isLoading}
                className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                title="Refresh orders"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode(viewMode === "detailed" ? "compact" : "detailed")}
                className={`h-8 w-8 rounded-lg ${
                  viewMode === "compact"
                    ? "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
                title={viewMode === "compact" ? "Detailed tickets" : "Compact tickets"}
              >
                {viewMode === "compact" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open("/kitchen-tv", "_blank")}
                className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                title="Kitchen TV Mode"
              >
                <Tv className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Row 2: Station Filter & Quick Date Filter */}
          <div className="flex items-center gap-2">
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="h-8 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl text-xs flex-1">
                <ChefHat className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                <SelectValue placeholder="Station" />
              </SelectTrigger>
              <SelectContent>
                {STATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-8 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl text-xs">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today" className="text-xs">📅 Today</SelectItem>
                  <SelectItem value="yesterday" className="text-xs">Yesterday</SelectItem>
                  <SelectItem value="last7days" className="text-xs">Last 7 Days</SelectItem>
                  <SelectItem value="thisMonth" className="text-xs">This Month</SelectItem>
                  <SelectItem value="all" className="text-xs">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Status Segmented Control Tabs with Counters */}
          <div className="grid grid-cols-4 gap-1.5 mt-2.5 p-1 bg-gray-100/90 dark:bg-gray-900/90 rounded-2xl border border-gray-200/60 dark:border-gray-700/60">
            <button
              type="button"
              onClick={() => setMobileTab("new")}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                mobileTab === "new"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/25"
                  : "text-amber-700 dark:text-amber-400 hover:bg-white/50 dark:hover:bg-gray-800"
              }`}
            >
              <span className="flex items-center gap-1 leading-none text-[11px]">
                ⚡ New
              </span>
              <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${
                mobileTab === "new" ? "bg-white/25 text-white" : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
              }`}>
                {newOrders}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab("preparing")}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                mobileTab === "preparing"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-blue-700 dark:text-blue-400 hover:bg-white/50 dark:hover:bg-gray-800"
              }`}
            >
              <span className="flex items-center gap-1 leading-none text-[11px]">
                🍳 Prep
              </span>
              <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${
                mobileTab === "preparing" ? "bg-white/25 text-white" : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
              }`}>
                {preparingOrders}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab("ready")}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                mobileTab === "ready"
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-600/25"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-white/50 dark:hover:bg-gray-800"
              }`}
            >
              <span className="flex items-center gap-1 leading-none text-[11px]">
                ✅ Ready
              </span>
              <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${
                mobileTab === "ready" ? "bg-white/25 text-white" : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
              }`}>
                {readyOrders}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab("all")}
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                mobileTab === "all"
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-gray-800"
              }`}
            >
              <span className="flex items-center gap-1 leading-none text-[11px]">
                📋 All
              </span>
              <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${
                mobileTab === "all" ? "bg-white/25 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
              }`}>
                {totalOrders}
              </span>
            </button>
          </div>

          {lateOrders > 0 && (
            <div className="mt-2 flex items-center justify-between px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold animate-pulse">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lateOrders} Late {lateOrders === 1 ? 'Order' : 'Orders'} (&gt;15 min)
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Desktop Header */
        <>
          <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-3xl shadow-xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                {restaurantName && (
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-purple-300 mb-0.5">
                    {restaurantName}
                  </p>
                )}
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  Kitchen Display System
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Real-time order management dashboard
                </p>
              </div>

              {/* Action Buttons with Modern Design */}
              <div className="flex items-center gap-4 flex-wrap">
                <HelpProvider />
                {/* Station Filter */}
                <Select value={stationFilter} onValueChange={setStationFilter}>
                  <SelectTrigger className="w-40 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-gray-600">
                    <ChefHat className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Station" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-2xl p-2 border border-white/30 dark:border-gray-600">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fetchOrders(true)}
                    disabled={isLoading}
                    className="rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-all duration-300"
                  >
                    <RefreshCw
                      className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
                    />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => isAudioEnabled ? disableAudio() : enableAudio()}
                    className={`rounded-xl transition-all duration-300 ${
                      isAudioEnabled
                        ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {isAudioEnabled ? (
                      <Volume2 className="h-5 w-5" />
                    ) : (
                      <VolumeX className="h-5 w-5" />
                    )}
                  </Button>

                  {/* View Mode Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setViewMode(viewMode === "detailed" ? "compact" : "detailed")
                    }
                    className={`rounded-xl transition-all duration-300 ${
                      viewMode === "compact"
                        ? "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                    title={
                      viewMode === "compact"
                        ? "Switch to Detailed View"
                        : "Switch to Compact View"
                    }
                  >
                    {viewMode === "compact" ? (
                      <List className="h-5 w-5" />
                    ) : (
                      <LayoutGrid className="h-5 w-5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900 transition-all duration-300"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open("/kitchen-tv", "_blank")}
                    className="rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-all duration-300"
                    title="Open Kitchen TV Mode"
                  >
                    <Tv className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="text-2xl font-bold">{totalOrders}</div>
                <div className="text-blue-100">Total Orders</div>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
                <div className="text-2xl font-bold">{newOrders}</div>
                <div className="text-amber-100">New Orders</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="text-2xl font-bold">{preparingOrders}</div>
                <div className="text-purple-100">Preparing</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-4 text-white shadow-lg">
                <div className="text-2xl font-bold">{readyOrders}</div>
                <div className="text-green-100">Ready</div>
              </div>
              {lateOrders > 0 && (
                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <div className="text-2xl font-bold">{lateOrders}</div>
                  </div>
                  <div className="text-red-100">Late Orders</div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </>
      )}

      {/* Columns: On Mobile render selected tab; On Desktop render 3-column grid */}
      {isMobile ? (
        <div>
          {mobileTab === "new" && (
            <OrdersColumn
              title="New Orders"
              orders={filterOrdersByStatus("new")}
              onStatusUpdate={handleStatusUpdate}
              onBumpOrder={handleBumpOrder}
              onItemComplete={handleItemComplete}
              onPriorityChange={handlePriorityChange}
              onUpdateItems={handleUpdateItems}
              variant="new"
              isOrderLate={isOrderLate}
              isCompact={viewMode === "compact"}
              expandedOrders={expandedOrders}
              onToggleExpand={handleToggleExpand}
            />
          )}
          {mobileTab === "preparing" && (
            <OrdersColumn
              title="Preparing"
              orders={filterOrdersByStatus("preparing")}
              onStatusUpdate={handleStatusUpdate}
              onBumpOrder={handleBumpOrder}
              onItemComplete={handleItemComplete}
              onPriorityChange={handlePriorityChange}
              onUpdateItems={handleUpdateItems}
              variant="preparing"
              isOrderLate={isOrderLate}
              isCompact={viewMode === "compact"}
              expandedOrders={expandedOrders}
              onToggleExpand={handleToggleExpand}
            />
          )}
          {mobileTab === "ready" && (
            <OrdersColumn
              title="Ready"
              orders={filterOrdersByStatus("ready")}
              onStatusUpdate={handleStatusUpdate}
              onBumpOrder={handleBumpOrder}
              onItemComplete={handleItemComplete}
              onUpdateItems={handleUpdateItems}
              variant="ready"
              isOrderLate={isOrderLate}
              isCompact={viewMode === "compact"}
              expandedOrders={expandedOrders}
              onToggleExpand={handleToggleExpand}
            />
          )}
          {mobileTab === "all" && (
            <div className="space-y-4">
              <OrdersColumn
                title="New Orders"
                orders={filterOrdersByStatus("new")}
                onStatusUpdate={handleStatusUpdate}
                onBumpOrder={handleBumpOrder}
                onItemComplete={handleItemComplete}
                onPriorityChange={handlePriorityChange}
                onUpdateItems={handleUpdateItems}
                variant="new"
                isOrderLate={isOrderLate}
                isCompact={viewMode === "compact"}
                expandedOrders={expandedOrders}
                onToggleExpand={handleToggleExpand}
              />
              <OrdersColumn
                title="Preparing"
                orders={filterOrdersByStatus("preparing")}
                onStatusUpdate={handleStatusUpdate}
                onBumpOrder={handleBumpOrder}
                onItemComplete={handleItemComplete}
                onPriorityChange={handlePriorityChange}
                onUpdateItems={handleUpdateItems}
                variant="preparing"
                isOrderLate={isOrderLate}
                isCompact={viewMode === "compact"}
                expandedOrders={expandedOrders}
                onToggleExpand={handleToggleExpand}
              />
              <OrdersColumn
                title="Ready"
                orders={filterOrdersByStatus("ready")}
                onStatusUpdate={handleStatusUpdate}
                onBumpOrder={handleBumpOrder}
                onItemComplete={handleItemComplete}
                onUpdateItems={handleUpdateItems}
                variant="ready"
                isOrderLate={isOrderLate}
                isCompact={viewMode === "compact"}
                expandedOrders={expandedOrders}
                onToggleExpand={handleToggleExpand}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <OrdersColumn
            title="New Orders"
            orders={filterOrdersByStatus("new")}
            onStatusUpdate={handleStatusUpdate}
            onBumpOrder={handleBumpOrder}
            onItemComplete={handleItemComplete}
            onPriorityChange={handlePriorityChange}
            onUpdateItems={handleUpdateItems}
            variant="new"
            isOrderLate={isOrderLate}
            isCompact={viewMode === "compact"}
            expandedOrders={expandedOrders}
            onToggleExpand={handleToggleExpand}
          />
          <OrdersColumn
            title="Preparing"
            orders={filterOrdersByStatus("preparing")}
            onStatusUpdate={handleStatusUpdate}
            onBumpOrder={handleBumpOrder}
            onItemComplete={handleItemComplete}
            onPriorityChange={handlePriorityChange}
            onUpdateItems={handleUpdateItems}
            variant="preparing"
            isOrderLate={isOrderLate}
            isCompact={viewMode === "compact"}
            expandedOrders={expandedOrders}
            onToggleExpand={handleToggleExpand}
          />
          <OrdersColumn
            title="Ready"
            orders={filterOrdersByStatus("ready")}
            onStatusUpdate={handleStatusUpdate}
            onBumpOrder={handleBumpOrder}
            onItemComplete={handleItemComplete}
            onUpdateItems={handleUpdateItems}
            variant="ready"
            isOrderLate={isOrderLate}
            isCompact={viewMode === "compact"}
            expandedOrders={expandedOrders}
            onToggleExpand={handleToggleExpand}
          />
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={loadMore}
            disabled={isLoading}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl px-6 py-2.5 text-sm shadow-lg"
          >
            {isLoading ? "Loading..." : "Load More Orders"}
          </Button>
        </div>
      )}
      {!isAudioEnabled && (
        <div 
          className="fixed top-3 left-1/2 transform -translate-x-1/2 z-50 bg-amber-500 text-white font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce cursor-pointer hover:bg-amber-600 transition-all border border-amber-400 text-xs sm:text-sm max-w-[90vw] text-center justify-center" 
          onClick={enableAudio}
        >
          <VolumeX className="w-4 h-4 animate-pulse flex-shrink-0" />
          <span>Tap to enable sound alerts</span>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
