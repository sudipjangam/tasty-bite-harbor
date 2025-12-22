import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Volume2, VolumeX, Filter, Maximize2, ChefHat, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OrderTicket from "./OrderTicket";
import OrdersColumn from "./OrdersColumn";
import DateFilter from "./DateFilter";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";

// Enhanced KitchenOrder interface with all new fields
export interface KitchenOrder {
  id: string;
  source: string;
  status: "new" | "preparing" | "ready" | "bumped";
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
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dateFilter, setDateFilter] = useState("today");
  const [stationFilter, setStationFilter] = useState("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Create the audio element with error handling
  const [notification] = useState(() => {
    const audio = new Audio();
    try {
      audio.src = "/notification.mp3";
      audio.addEventListener('error', () => {
        // Suppress - notification.mp3 may not exist, fallback handled silently
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audio.src = createBeepSound(audioContext);
        } catch {
          // Could not create fallback sound - continue without audio
        }
      });
    } catch {
      // Could not initialize audio - continue without notifications
    }
    return audio;
  });

  // Function to create a simple beep sound as fallback
  const createBeepSound = (audioContext: AudioContext): string => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.5;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const length = 0.3;
    oscillator.start();
    oscillator.stop(audioContext.currentTime + length);
    
    return 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18=';
  };

  // Transform raw order data to KitchenOrder type
  const transformOrderData = useCallback((order: any): KitchenOrder => {
    const itemsArray = Array.isArray(order.items) ? order.items : [];
    const itemCompletionStatus = Array.isArray(order.item_completion_status) 
      ? order.item_completion_status 
      : new Array(itemsArray.length).fill(false);
    
    const transformedItems = itemsArray.map((item: any, idx: number) => ({
      name: typeof item.name === 'string' ? item.name : 'Unknown Item',
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      notes: Array.isArray(item.notes) ? item.notes : undefined,
      has_allergy: item.has_allergy || 
        (Array.isArray(item.notes) && item.notes.some((note: string) => 
          /allerg|gluten|dairy|nut|vegan|vegetarian/i.test(note)
        ))
    }));
    
    return {
      id: order.id,
      source: order.source,
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
      item_completion_status: itemCompletionStatus
    };
  }, []);

  // Fetch restaurant ID on mount
  useEffect(() => {
    const fetchRestaurantId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", user.id)
        .single();

      if (profile?.restaurant_id) {
        setRestaurantId(profile.restaurant_id);
      }
    };

    fetchRestaurantId();
  }, []);

  // Fetch orders with server-side filtering and pagination
  const fetchOrders = useCallback(async (resetPage = false) => {
    if (!restaurantId) return;
    
    setIsLoading(true);
    const currentPage = resetPage ? 0 : page;
    
    try {
      let query = supabase
        .from("kitchen_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .is("bumped_at", null) // Exclude bumped orders
        .order("priority", { ascending: true }) // VIP first, then rush, then normal (alphabetically vip < rush < normal is false, so we use custom)
        .order("created_at", { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      const today = new Date();
      
      // Apply date filters
      switch (dateFilter) {
        case "today":
          query = query
            .gte('created_at', startOfDay(today).toISOString())
            .lte('created_at', endOfDay(today).toISOString());
          break;
        case "yesterday":
          const yesterday = subDays(today, 1);
          query = query
            .gte('created_at', startOfDay(yesterday).toISOString())
            .lte('created_at', endOfDay(yesterday).toISOString());
          break;
        case "last7days":
          query = query
            .gte('created_at', startOfDay(subDays(today, 6)).toISOString())
            .lte('created_at', endOfDay(today).toISOString());
          break;
        case "thisMonth":
          query = query
            .gte('created_at', startOfMonth(today).toISOString())
            .lte('created_at', endOfMonth(today).toISOString());
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
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        if (resetPage) {
          setOrders(sortedOrders);
          setPage(0);
        } else {
          setOrders(prev => currentPage === 0 ? sortedOrders : [...prev, ...sortedOrders]);
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
  }, [restaurantId, dateFilter, stationFilter, page, transformOrderData, toast]);

  // Re-fetch when filters change
  useEffect(() => {
    if (restaurantId) {
      fetchOrders(true);
    }
  }, [restaurantId, dateFilter, stationFilter]);

  // Helper function to check if an order falls within the current date filter
  const isWithinDateFilter = useCallback((orderCreatedAt: string): boolean => {
    const orderDate = new Date(orderCreatedAt);
    const today = new Date();

    switch (dateFilter) {
      case "today":
        return orderDate >= startOfDay(today) && orderDate <= endOfDay(today);
      case "yesterday":
        const yesterday = subDays(today, 1);
        return orderDate >= startOfDay(yesterday) && orderDate <= endOfDay(yesterday);
      case "last7days":
        return orderDate >= startOfDay(subDays(today, 6)) && orderDate <= endOfDay(today);
      case "thisMonth":
        return orderDate >= startOfMonth(today) && orderDate <= endOfMonth(today);
      case "all":
        return true;
      default:
        return true;
    }
  }, [dateFilter]);

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
          if (payload.eventType === "INSERT") {
            const newOrderData = payload.new;
            
            // Check if the new order falls within current date filter
            if (!isWithinDateFilter(newOrderData.created_at)) {
              return;
            }

            // Check station filter
            if (stationFilter !== "all" && newOrderData.station !== stationFilter) {
              return;
            }

            const newOrder = transformOrderData(newOrderData);
            
            setOrders((prev) => {
              const updated = [newOrder, ...prev];
              // Re-sort by priority
              return updated.sort((a, b) => {
                const priorityOrder = { vip: 0, rush: 1, normal: 2 };
                const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });
            });
            
            if (soundEnabled) {
              try {
                notification.play().catch(err => {
                  console.error("Error playing notification sound:", err);
                });
                toast({
                  title: newOrder.priority === "vip" ? "🌟 VIP Order!" : 
                         newOrder.priority === "rush" ? "🔥 RUSH Order!" : "New Order",
                  description: `Order from ${newOrder.source}${newOrder.customer_name ? ` - ${newOrder.customer_name}` : ''}`,
                });
              } catch (e) {
                console.error("Could not play notification:", e);
                toast({
                  title: "New Order",
                  description: `New order from ${newOrder.source}`,
                });
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedOrderData = payload.new;
            
            // If order was bumped, remove from list
            if (updatedOrderData.bumped_at) {
              setOrders((prev) => prev.filter(order => order.id !== updatedOrderData.id));
              return;
            }
            
            const updatedOrder = transformOrderData(updatedOrderData);
            
            setOrders((prev) =>
              prev.map((order) =>
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setOrders((prev) => prev.filter(order => order.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, soundEnabled, toast, notification, dateFilter, stationFilter, isWithinDateFilter, transformOrderData]);

  // Handle status update with time tracking
  const handleStatusUpdate = async (orderId: string, newStatus: KitchenOrder["status"]) => {
    try {
      const updateData: any = { status: newStatus };
      
      // Add time tracking
      if (newStatus === "preparing") {
        updateData.started_at = new Date().toISOString();
        
        // Deduct inventory
        const { data: { session } } = await supabase.auth.getSession();
        
        const { data: deductResult, error: deductError } = await supabase.functions.invoke(
          'deduct-inventory-on-prep',
          {
            body: { order_id: orderId },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          }
        );

        if (deductError) {
          throw new Error(deductError.message);
        }

        if (!deductResult?.success) {
          const errorMessage = deductResult?.errors 
            ? deductResult.errors.join('\n') 
            : deductResult?.error || 'Failed to deduct inventory';
          
          toast({
            variant: "destructive",
            title: "Insufficient Stock",
            description: errorMessage,
            duration: 8000,
          });
          return;
        }
        
        console.log('Inventory deducted successfully:', deductResult);
      } else if (newStatus === "ready") {
        updateData.completed_at = new Date().toISOString();
      }

      // Update kitchen order status
      const { data: kitchenOrder, error: kitchenError } = await supabase
        .from("kitchen_orders")
        .update(updateData)
        .eq("id", orderId)
        .select("order_id")
        .single();

      if (kitchenError) throw kitchenError;

      // Also update the corresponding order status in orders table
      if (kitchenOrder?.order_id) {
        let orderStatus = 'pending';
        if (newStatus === 'preparing') orderStatus = 'preparing';
        if (newStatus === 'ready') orderStatus = 'completed';
        
        await supabase
          .from("orders")
          .update({ status: orderStatus })
          .eq("id", kitchenOrder.order_id);
      }

      toast({
        title: "Status Updated",
        description: `Order marked as ${newStatus}${newStatus === 'preparing' ? ' - Inventory updated' : ''}`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update order status",
      });
    }
  };

  // Handle bumping (archiving) an order
  const handleBumpOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("kitchen_orders")
        .update({ bumped_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      // Optimistically remove from UI (realtime will also handle this)
      setOrders((prev) => prev.filter(order => order.id !== orderId));

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
  const handleItemComplete = async (orderId: string, itemIndex: number, completed: boolean) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const newCompletionStatus = [...(order.item_completion_status || new Array(order.items.length).fill(false))];
      newCompletionStatus[itemIndex] = completed;

      const { error } = await supabase
        .from("kitchen_orders")
        .update({ item_completion_status: newCompletionStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, item_completion_status: newCompletionStatus } : o
        )
      );
    } catch (error) {
      console.error("Error updating item completion:", error);
    }
  };

  // Filter orders by status, excluding bumped
  const filterOrdersByStatus = (status: KitchenOrder["status"]) => {
    return orders.filter((order) => order.status === status && !order.bumped_at);
  };

  // Check if an order is late (exceeds threshold)
  const isOrderLate = (order: KitchenOrder): boolean => {
    if (order.status === "ready" || order.bumped_at) return false;
    const minutesSinceCreation = differenceInMinutes(new Date(), new Date(order.created_at));
    return minutesSinceCreation > (order.estimated_prep_time || LATE_ORDER_THRESHOLD);
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
      setPage(prev => prev + 1);
      fetchOrders(false);
    }
  };

  const totalOrders = orders.length;
  const newOrders = filterOrdersByStatus("new").length;
  const preparingOrders = filterOrdersByStatus("preparing").length;
  const readyOrders = filterOrdersByStatus("ready").length;
  const lateOrders = orders.filter(isOrderLate).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950 p-6">
      {/* Modern Header with Glass Effect */}
      <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-3xl shadow-xl p-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Kitchen Display System
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">Real-time order management dashboard</p>
          </div>
          
          {/* Action Buttons with Modern Design */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Station Filter */}
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="w-40 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-gray-600">
                <ChefHat className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Station" />
              </SelectTrigger>
              <SelectContent>
                {STATION_OPTIONS.map(option => (
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
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`rounded-xl transition-all duration-300 ${
                  soundEnabled 
                    ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
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
      
      {/* Enhanced Date Filter */}
      <div className="mb-6">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {/* Modern Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OrdersColumn
          title="New Orders"
          orders={filterOrdersByStatus("new")}
          onStatusUpdate={handleStatusUpdate}
          onBumpOrder={handleBumpOrder}
          onItemComplete={handleItemComplete}
          variant="new"
          isOrderLate={isOrderLate}
        />
        <OrdersColumn
          title="Preparing"
          orders={filterOrdersByStatus("preparing")}
          onStatusUpdate={handleStatusUpdate}
          onBumpOrder={handleBumpOrder}
          onItemComplete={handleItemComplete}
          variant="preparing"
          isOrderLate={isOrderLate}
        />
        <OrdersColumn
          title="Ready"
          orders={filterOrdersByStatus("ready")}
          onStatusUpdate={handleStatusUpdate}
          onBumpOrder={handleBumpOrder}
          onItemComplete={handleItemComplete}
          variant="ready"
          isOrderLate={isOrderLate}
        />
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={loadMore}
            disabled={isLoading}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl px-8 py-3 shadow-lg"
          >
            {isLoading ? "Loading..." : "Load More Orders"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
