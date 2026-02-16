import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Search,
  Check,
  Clock,
  ChefHat,
  Bell,
  CheckCircle2,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { startOfDay, endOfDay } from "date-fns";

export interface ActiveOrder {
  id: string;
  order_number: number | null;
  customer_name: string;
  customer_phone: string | null;
  items: string[];
  total: number;
  status: string;
  item_completion_status: boolean[] | null;
  created_at: string;
  source: string | null;
}

interface QSActiveOrdersProps {
  isOpen: boolean;
  onClose: () => void;
}

type StatusFilter = "all" | "preparing" | "ready" | "completed";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType; bg: string }
> = {
  preparing: {
    label: "Preparing",
    color: "text-orange-600 dark:text-orange-400",
    icon: ChefHat,
    bg: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 border-orange-200 dark:border-orange-700",
  },
  ready: {
    label: "Ready",
    color: "text-green-600 dark:text-green-400",
    icon: Bell,
    bg: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border-green-200 dark:border-green-700",
  },
  completed: {
    label: "Done",
    color: "text-blue-600 dark:text-blue-400",
    icon: CheckCircle2,
    bg: "bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/20 border-blue-200 dark:border-blue-700",
  },
};

// Parse "2x Veg Manchurian @150" into structured items
function parseOrderItem(itemStr: string) {
  const match = itemStr.match(/^(\d+)x\s+(.+?)\s+@(\d+(?:\.\d+)?)$/);
  if (match) {
    return {
      quantity: parseInt(match[1]),
      name: match[2],
      price: parseFloat(match[3]),
    };
  }
  return { quantity: 1, name: itemStr, price: 0 };
}

export const QSActiveOrders: React.FC<QSActiveOrdersProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const readyAudioRef = useRef<HTMLAudioElement | null>(null);
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch active orders (today's orders that aren't fully done, or completed within last 30 min)
  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["qs-active-orders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const today = new Date();
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_phone, items, total, status, item_completion_status, created_at, source",
        )
        .eq("restaurant_id", restaurantId)
        .in("source", ["quickserve", "pos"])
        .gte("created_at", startOfDay(today).toISOString())
        .lte("created_at", endOfDay(today).toISOString())
        .in("status", ["preparing", "ready", "completed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ActiveOrder[];
    },
    enabled: !!restaurantId && isOpen,
    refetchInterval: 5000, // Auto-refresh every 5s
  });

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        order.customer_name?.toLowerCase().includes(q) ||
        order.order_number?.toString().includes(q) ||
        order.items.some((i) => i.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Counts by status
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  // Toggle item completion
  const toggleItemMutation = useMutation({
    mutationFn: async ({
      orderId,
      itemIndex,
      currentStatus,
    }: {
      orderId: string;
      itemIndex: number;
      currentStatus: boolean[];
    }) => {
      const newStatus = [...currentStatus];
      newStatus[itemIndex] = !newStatus[itemIndex];

      // Auto-set order to "ready" when all items are done
      const allDone = newStatus.every((s) => s === true);

      const { error } = await supabase
        .from("orders")
        .update({
          item_completion_status: newStatus,
          ...(allDone ? { status: "ready" } : {}),
        })
        .eq("id", orderId);

      if (error) throw error;
      return { allDone, orderId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({
        queryKey: ["quickserve-todays-revenue"],
      });

      if (result.allDone && soundEnabled) {
        playReadySound();
      }
    },
  });

  // Change order status
  const changeStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: string;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Also update kitchen_orders if completing
      if (newStatus === "completed") {
        await supabase
          .from("kitchen_orders")
          .update({ status: "completed" })
          .eq("order_id", orderId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({
        queryKey: ["quickserve-todays-revenue"],
      });
    },
  });

  const handleToggleItem = useCallback(
    (orderId: string, itemIndex: number, currentStatus: boolean[]) => {
      // Ensure status array is correct length
      const items = orders.find((o) => o.id === orderId)?.items || [];
      const paddedStatus = [...currentStatus];
      while (paddedStatus.length < items.length) paddedStatus.push(false);

      toggleItemMutation.mutate({
        orderId,
        itemIndex,
        currentStatus: paddedStatus,
      });
      if (navigator.vibrate) navigator.vibrate(15);
    },
    [orders, toggleItemMutation],
  );

  const handleStatusChange = useCallback(
    (orderId: string, newStatus: string) => {
      changeStatusMutation.mutate({ orderId, newStatus });
      toast({
        title:
          newStatus === "completed"
            ? "Order Completed ✓"
            : `Order → ${newStatus}`,
        duration: 1500,
      });
    },
    [changeStatusMutation, toast],
  );

  // Play notification sound
  const playReadySound = () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Sound not available:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[95vw] lg:max-w-3xl bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500 to-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                Active Orders
              </h2>
              <p className="text-white/70 text-xs mt-0.5">
                {preparingCount} preparing • {readyCount} ready •{" "}
                {completedCount} done
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  soundEnabled
                    ? "bg-white/20 text-white"
                    : "bg-white/10 text-white/40",
                )}
                title={soundEnabled ? "Sound ON" : "Sound OFF"}
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => refetch()}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="shrink-0 p-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, token, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "preparing", "ready", "completed"] as StatusFilter[]).map(
              (sf) => (
                <button
                  key={sf}
                  onClick={() => setStatusFilter(sf)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    statusFilter === sf
                      ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
                  )}
                >
                  {sf === "all"
                    ? `All (${orders.length})`
                    : sf === "preparing"
                      ? `🔥 Preparing (${preparingCount})`
                      : sf === "ready"
                        ? `✅ Ready (${readyCount})`
                        : `✓ Done (${completedCount})`}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Orders Grid */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 animate-pulse" />
                <p className="text-gray-500 font-medium">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <ChefHat className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-600 dark:text-gray-300">
                  No active orders
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Orders will appear here when placed
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredOrders.map((order) => {
                  const config =
                    statusConfig[order.status] || statusConfig.preparing;
                  const StatusIcon = config.icon;
                  const parsedItems = order.items.map(parseOrderItem);
                  const completionStatus = order.item_completion_status || [];
                  const completedItems =
                    completionStatus.filter(Boolean).length;
                  const totalItems = parsedItems.length;
                  const allDone =
                    totalItems > 0 && completedItems >= totalItems;

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        "rounded-2xl border-2 overflow-hidden transition-all duration-300",
                        allDone && order.status !== "completed"
                          ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border-green-300 dark:border-green-600 shadow-lg shadow-green-200/50 dark:shadow-green-900/30"
                          : config.bg,
                      )}
                    >
                      {/* Card Header */}
                      <div className="px-3 pt-3 pb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {/* Token number */}
                          <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-2.5 py-1 rounded-lg">
                            <span className="text-lg font-black leading-none">
                              #
                              {String(order.order_number || 0).padStart(3, "0")}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate max-w-[160px]">
                              {order.customer_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(
                                  new Date(order.created_at),
                                  { addSuffix: true },
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={cn("w-4 h-4", config.color)} />
                          <span
                            className={cn(
                              "text-xs font-bold uppercase",
                              config.color,
                            )}
                          >
                            {allDone && order.status !== "completed"
                              ? "✓ Ready"
                              : config.label}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {totalItems > 0 && order.status !== "completed" && (
                        <div className="px-3 pb-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
                                style={{
                                  width: `${(completedItems / totalItems) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                              {completedItems}/{totalItems}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Items List with strikethrough */}
                      <div className="px-3 py-1 space-y-1">
                        {parsedItems.map((item, idx) => {
                          const isCompleted = completionStatus[idx] === true;
                          return (
                            <button
                              key={idx}
                              onClick={() =>
                                order.status !== "completed" &&
                                handleToggleItem(
                                  order.id,
                                  idx,
                                  completionStatus,
                                )
                              }
                              disabled={order.status === "completed"}
                              className={cn(
                                "w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg transition-all duration-200 text-left",
                                order.status === "completed"
                                  ? "cursor-default"
                                  : "cursor-pointer hover:bg-white/60 dark:hover:bg-gray-700/60 active:scale-[0.98]",
                                isCompleted
                                  ? "bg-green-100/60 dark:bg-green-900/20"
                                  : "",
                              )}
                            >
                              {/* Checkbox */}
                              <div
                                className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all",
                                  isCompleted
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm"
                                    : "border-2 border-gray-300 dark:border-gray-500",
                                )}
                              >
                                {isCompleted && (
                                  <Check className="w-3 h-3" strokeWidth={3} />
                                )}
                              </div>
                              {/* Item details */}
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0",
                                  isCompleted
                                    ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                                    : "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
                                )}
                              >
                                {item.quantity}x
                              </span>
                              <span
                                className={cn(
                                  "flex-1 text-sm font-medium transition-all truncate",
                                  isCompleted
                                    ? "line-through text-gray-400 dark:text-gray-500"
                                    : "text-gray-700 dark:text-gray-200",
                                )}
                              >
                                {item.name}
                              </span>
                              {item.price > 0 && (
                                <span
                                  className={cn(
                                    "text-xs font-semibold shrink-0",
                                    isCompleted
                                      ? "line-through text-gray-400 dark:text-gray-500"
                                      : "text-gray-500 dark:text-gray-400",
                                  )}
                                >
                                  {currencySymbol}
                                  {(item.price * item.quantity).toFixed(0)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer: Total + Action */}
                      <div className="px-3 pb-3 pt-1 flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                          {currencySymbol}
                          {order.total.toFixed(0)}
                        </p>
                        {order.status === "preparing" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleStatusChange(order.id, "ready")
                            }
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-bold rounded-lg px-3 h-7"
                          >
                            <Bell className="w-3 h-3 mr-1" />
                            Mark Ready
                          </Button>
                        )}
                        {(order.status === "ready" ||
                          (allDone && order.status !== "completed")) && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleStatusChange(order.id, "completed")
                            }
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold rounded-lg px-3 h-7"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Done
                          </Button>
                        )}
                        {order.status === "completed" && (
                          <span className="text-xs font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};
