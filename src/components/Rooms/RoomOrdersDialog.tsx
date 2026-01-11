import React, { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { OrderItem } from "@/integrations/supabase/client";
import {
  ShoppingCart,
  History,
  Plus,
  Minus,
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  Store,
  BedDouble,
  Trash2,
  X,
  Search,
  Package,
  ArrowLeft,
} from "lucide-react";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface RoomOrdersDialogProps {
  roomId: string;
  roomName: string;
  reservationId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurantId: string;
  customerName: string;
}

const RoomOrdersDialog: React.FC<RoomOrdersDialogProps> = ({
  roomId,
  roomName,
  reservationId,
  open,
  onClose,
  onSuccess,
  restaurantId,
  customerName,
}) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "newOrder">("history");
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();

  // Fetch existing orders for this reservation
  const { data: existingOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["room-orders", reservationId],
    queryFn: async () => {
      if (!reservationId) return [];

      const { data, error } = await supabase
        .from("orders_unified")
        .select("*")
        .eq("reservation_id", reservationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching room orders:", error);
        return [];
      }

      // Map to expected format
      return (data || []).map((order) => ({
        ...order,
        status: order.kitchen_status || order.payment_status,
        total: order.total_amount,
      }));
    },
    enabled: open && !!reservationId,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  // Fetch menu items
  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ["menu-items", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate total pending amount
  const pendingTotal = useMemo(() => {
    return existingOrders
      .filter((o) => o.payment_status === "Pending - Room Charge")
      .reduce((sum, o) => sum + (o.total || 0), 0);
  }, [existingOrders]);

  const handleAddToOrder = useCallback(
    (menuItem: any) => {
      const existingItemIndex = orderItems.findIndex(
        (item) => item.menuItemId === menuItem.id
      );

      if (existingItemIndex !== -1) {
        const updatedItems = [...orderItems];
        updatedItems[existingItemIndex].quantity += 1;
        setOrderItems(updatedItems);
      } else {
        setOrderItems([
          ...orderItems,
          {
            id: uuidv4(),
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
          },
        ]);
      }

      toast({
        title: "Item Added",
        description: `${menuItem.name} added to order`,
      });
    },
    [orderItems, toast]
  );

  const handleUpdateQuantity = useCallback(
    (itemId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
        return;
      }
      setOrderItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    },
    []
  );

  const handleRemoveItem = useCallback((itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const calculateTotal = useMemo(() => {
    return orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [orderItems]);

  // Submit order to kitchen
  const handleSubmitOrder = useCallback(async () => {
    if (orderItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Order",
        description: "Please add items to your order.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderSource = `Room Service - ${roomName}`;
      const total = calculateTotal;

      // Create single order in orders_unified
      const { data: createdOrder, error: orderError } = await supabase
        .from("orders_unified")
        .insert({
          restaurant_id: restaurantId,
          source: orderSource,
          items: orderItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          kitchen_status: "new",
          payment_status: "Pending - Room Charge",
          total_amount: total,
          order_type: "room-service",
          reservation_id: reservationId,
          customer_name: customerName,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Also create room_food_orders entry
      if (createdOrder?.id) {
        await supabase.from("room_food_orders").insert({
          room_id: roomId,
          order_id: createdOrder.id,
          total: total,
          status: "pending",
          restaurant_id: restaurantId,
        });
      }

      toast({
        title: "Order Sent to Kitchen",
        description: `Order for ${roomName} has been sent to the kitchen.`,
      });

      setOrderItems([]);
      setActiveTab("history");
      queryClient.invalidateQueries({
        queryKey: ["room-orders", reservationId],
      });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      onSuccess();
    } catch (error) {
      console.error("Error creating room order:", error);
      toast({
        variant: "destructive",
        title: "Order Failed",
        description: "Failed to place your order. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    orderItems,
    roomId,
    roomName,
    restaurantId,
    customerName,
    reservationId,
    calculateTotal,
    toast,
    queryClient,
    onSuccess,
  ]);

  // Cancel an order
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      // Update orders_unified
      await supabase
        .from("orders_unified")
        .update({ kitchen_status: "cancelled", payment_status: "Cancelled" })
        .eq("id", orderId);

      toast({
        title: "Order Cancelled",
        description: "The order has been cancelled.",
      });

      queryClient.invalidateQueries({
        queryKey: ["room-orders", reservationId],
      });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel order.",
      });
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const baseClass = "text-xs px-3 py-1 rounded-full font-semibold shadow-sm";
    switch (status?.toLowerCase()) {
      case "new":
      case "pending":
        return (
          <span
            className={`${baseClass} bg-gradient-to-r from-amber-400 to-orange-400 text-white`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            New
          </span>
        );
      case "preparing":
        return (
          <span
            className={`${baseClass} bg-gradient-to-r from-blue-400 to-cyan-400 text-white`}
          >
            <ChefHat className="w-3 h-3 inline mr-1" />
            Preparing
          </span>
        );
      case "ready":
        return (
          <span
            className={`${baseClass} bg-gradient-to-r from-green-400 to-emerald-400 text-white`}
          >
            <Utensils className="w-3 h-3 inline mr-1" />
            Ready
          </span>
        );
      case "completed":
        return (
          <span
            className={`${baseClass} bg-gradient-to-r from-emerald-500 to-teal-500 text-white`}
          >
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span
            className={`${baseClass} bg-gradient-to-r from-red-400 to-rose-400 text-white`}
          >
            <X className="w-3 h-3 inline mr-1" />
            Cancelled
          </span>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get source badge
  const getSourceBadge = (source: string) => {
    const baseClass = "text-xs px-3 py-1 rounded-full font-semibold shadow-sm";
    if (source === "room_service" || source?.includes("Room")) {
      return (
        <span
          className={`${baseClass} bg-gradient-to-r from-pink-500 to-rose-500 text-white`}
        >
          <BedDouble className="w-3 h-3 inline mr-1" />
          Room
        </span>
      );
    }
    return (
      <span
        className={`${baseClass} bg-gradient-to-r from-blue-500 to-cyan-500 text-white`}
      >
        <Store className="w-3 h-3 inline mr-1" />
        POS
      </span>
    );
  };

  // Filter menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesSearch =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, categoryFilter, searchQuery]);

  const categories = useMemo(() => {
    return [
      "all",
      ...new Set(menuItems.map((item) => item.category).filter(Boolean)),
    ];
  }, [menuItems]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[95vh] p-0 gap-0 overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 [&>button]:hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BedDouble className="h-6 w-6 md:h-8 md:w-8 text-white" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  Room Orders - {roomName}
                </h1>
                <p className="text-white/80 text-sm">
                  Guest: <span className="font-semibold">{customerName}</span>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="lg:hidden flex border-b bg-white/80 dark:bg-slate-800/80">
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
              activeTab === "history"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50 dark:bg-purple-900/30"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Order History ({existingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("newOrder")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
              activeTab === "newOrder"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50 dark:bg-purple-900/30"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            New Order {orderItems.length > 0 && `(${orderItems.length})`}
          </button>
        </div>

        {/* Main Content - 3 Column Layout */}
        <div className="flex-1 overflow-hidden pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(95vh-140px)] lg:h-[calc(95vh-120px)]">
            {/* Left Panel - Order History */}
            <div
              className={`${
                activeTab === "history" ? "flex" : "hidden"
              } lg:flex flex-col bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-r border-purple-200 dark:border-purple-900 overflow-hidden`}
            >
              {/* History Header */}
              <div className="p-4 border-b border-purple-100 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                      Order History
                    </h2>
                    <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      {existingOrders.length}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Pending Total
                  </p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {currencySymbol}
                    {pendingTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Orders List */}
              <div className="flex-1 overflow-y-auto p-4">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : existingOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                      <ShoppingCart className="h-10 w-10 text-purple-400" />
                    </div>
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      No orders yet
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Place an order to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {existingOrders.map((order) => (
                      <Card
                        key={order.id}
                        className="p-4 bg-white dark:bg-slate-700/50 border border-purple-100 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] rounded-2xl"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getSourceBadge(order.source)}
                            {getStatusBadge(order.status)}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(order.created_at)}{" "}
                            {formatTime(order.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {Array.isArray(order.items)
                            ? order.items.join(", ")
                            : String(order.items)}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-gray-800 dark:text-white">
                            {currencySymbol}
                            {(order.total || 0).toFixed(2)}
                          </span>
                          {order.status !== "completed" &&
                            order.status !== "cancelled" && (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm font-medium"
                              >
                                <Trash2 className="w-4 h-4" /> Cancel
                              </button>
                            )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Panel - Menu */}
            <div
              className={`${
                activeTab === "newOrder" ? "flex" : "hidden"
              } lg:flex flex-col bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm overflow-hidden`}
            >
              {/* Menu Header */}
              <div className="p-4 border-b border-purple-100 dark:border-purple-800">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> New Order
                </h2>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl border-purple-200 dark:border-purple-700 focus:ring-purple-500"
                  />
                </div>

                {/* Category Filter */}
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="rounded-xl border-purple-200 dark:border-purple-700">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "all" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Menu Items Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {menuLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredMenuItems.map((item) => (
                      <Card
                        key={item.id}
                        className="p-3 bg-white dark:bg-slate-700/50 border border-purple-100 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] rounded-xl"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-800 dark:text-white truncate flex-1">
                            {item.name}
                          </h3>
                          <span className="font-bold text-purple-600 dark:text-purple-400 ml-2">
                            {currencySymbol}
                            {item.price.toFixed(2)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 text-cyan-700 dark:text-cyan-300 text-xs px-2 py-0.5 rounded-full">
                            {item.category}
                          </span>
                          {item.is_vegetarian && (
                            <span className="bg-gradient-to-r from-green-400 to-emerald-400 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                              🌱 Veg
                            </span>
                          )}
                          <Button
                            size="sm"
                            className="ml-auto h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToOrder(item);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Order Summary */}
            <div
              className={`${
                activeTab === "newOrder" ? "flex" : "hidden"
              } lg:flex flex-col bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-l border-purple-200 dark:border-purple-900 overflow-hidden`}
            >
              {/* Summary Header */}
              <div className="p-4 border-b border-purple-100 dark:border-purple-800">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Order Summary
                </h2>
              </div>

              {/* Order Items - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4">
                {orderItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
                      <Package className="h-12 w-12 text-purple-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      No items in order
                    </h3>
                    <p className="text-sm text-gray-400">
                      Add items from the menu to start
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <Card
                        key={item.id}
                        className="p-3 bg-white dark:bg-slate-700/50 border border-purple-100 dark:border-purple-800 rounded-xl"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-800 dark:text-white flex-1 truncate">
                            {item.name}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-lg"
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 rounded-lg"
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {currencySymbol}
                            {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Total and Submit Button */}
              <div className="p-4 border-t border-purple-100 dark:border-purple-800 bg-white/90 dark:bg-slate-800/90">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-800 dark:text-white">
                    Total:
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {currencySymbol}
                    {calculateTotal.toFixed(2)}
                  </span>
                </div>
                <Button
                  onClick={handleSubmitOrder}
                  disabled={orderItems.length === 0 || isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  {isSubmitting ? "Sending..." : "Send to Kitchen 🍳"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoomOrdersDialog;
