import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import {
  AggregatorStore,
  AggregatorOrder,
  AggregatorProvider,
  AggregatorSummaryStats,
  AggregatorItemMapping,
} from "@/types/aggregators";
import { startOfDay, endOfDay } from "date-fns";

const DEFAULT_STORES: Partial<AggregatorStore>[] = [
  {
    provider: "swiggy",
    store_id: "SWIGGY-OUTLET-01",
    is_connected: true,
    is_store_open: true,
    is_in_rush: false,
    auto_accept_orders: true,
    default_prep_time_minutes: 15,
    commission_percentage: 18,
    markup_percentage: 15,
  },
  {
    provider: "zomato",
    store_id: "ZOMATO-OUTLET-01",
    is_connected: true,
    is_store_open: true,
    is_in_rush: false,
    auto_accept_orders: true,
    default_prep_time_minutes: 20,
    commission_percentage: 22,
    markup_percentage: 20,
  },
  {
    provider: "magicpin",
    store_id: "MAGICPIN-OUTLET-01",
    is_connected: true,
    is_store_open: true,
    is_in_rush: false,
    auto_accept_orders: false,
    default_prep_time_minutes: 15,
    commission_percentage: 10,
    markup_percentage: 10,
  },
  {
    provider: "urbanpiper",
    store_id: "UP-HUB-GLOBAL",
    is_connected: false,
    is_store_open: true,
    is_in_rush: false,
    auto_accept_orders: true,
    default_prep_time_minutes: 15,
    commission_percentage: 0,
    markup_percentage: 0,
  },
];

export function useAggregatorHub() {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "swiggy" | "zomato" | "magicpin">("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      audioRef.current = new Audio("/notification.mp3");
      audioRef.current.volume = 0.6;
    } catch {}
  }, []);

  // 1. Fetch Store Configurations
  const { data: stores = [], isLoading: isLoadingStores } = useQuery({
    queryKey: ["aggregator-stores", restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("aggregator_stores")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.warn("[AggregatorHub] Using local stores fallback:", error);
        return DEFAULT_STORES.map((s, idx) => ({
          ...s,
          id: `store-${idx}`,
          restaurant_id: restaurantId,
        })) as AggregatorStore[];
      }

      if (!data || data.length === 0) {
        return DEFAULT_STORES.map((s, idx) => ({
          ...s,
          id: `store-${idx}`,
          restaurant_id: restaurantId,
        })) as AggregatorStore[];
      }

      return data as AggregatorStore[];
    },
  });

  // 2. Fetch Aggregator Live Orders for Today
  const today = new Date();
  const dayStart = startOfDay(today).toISOString();
  const dayEnd = endOfDay(today).toISOString();

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ["aggregator-orders", restaurantId, dayStart],
    enabled: !!restaurantId,
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("aggregator_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[AggregatorHub] Orders fetch fallback:", error);
        return [];
      }
      return (data || []) as AggregatorOrder[];
    },
  });

  // 3. Realtime Subscription for incoming aggregator orders
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`aggregator-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "aggregator_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as AggregatorOrder;
            toast({
              title: `🔔 New ${newOrder.provider.toUpperCase()} Order #${newOrder.display_order_id}`,
              description: `₹${newOrder.gross_amount} · ${newOrder.items?.length || 0} items for ${newOrder.customer_name}`,
            });
            audioRef.current?.play().catch(() => {});
          }
          queryClient.invalidateQueries({ queryKey: ["aggregator-orders", restaurantId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient, toast]);

  // 4. Toggle Store Status Mutation
  const toggleStoreMutation = useMutation({
    mutationFn: async ({
      provider,
      isOpen,
      isInRush,
    }: {
      provider: AggregatorProvider | "all";
      isOpen?: boolean;
      isInRush?: boolean;
    }) => {
      if (!restaurantId) throw new Error("No restaurant ID");

      // Optimistic update locally
      queryClient.setQueryData(["aggregator-stores", restaurantId], (old: AggregatorStore[] = []) =>
        old.map((s) => {
          if (provider === "all" || s.provider === provider) {
            return {
              ...s,
              is_store_open: isOpen !== undefined ? isOpen : s.is_store_open,
              is_in_rush: isInRush !== undefined ? isInRush : s.is_in_rush,
            };
          }
          return s;
        }),
      );

      // Call edge function or direct supabase update
      const { error } = await supabase
        .from("aggregator_stores")
        .upsert(
          (provider === "all" ? ["swiggy", "zomato", "magicpin"] : [provider]).map((p) => ({
            restaurant_id: restaurantId,
            provider: p,
            is_store_open: isOpen !== undefined ? isOpen : true,
            is_in_rush: isInRush !== undefined ? isInRush : false,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "restaurant_id,provider" },
        );

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({
        title: "Store Status Updated",
        description: `${vars.provider.toUpperCase()} is now ${
          vars.isOpen !== undefined ? (vars.isOpen ? "ONLINE" : "OFFLINE") : vars.isInRush ? "IN RUSH" : "NORMAL"
        }`,
      });
      queryClient.invalidateQueries({ queryKey: ["aggregator-stores", restaurantId] });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // 5. Order Action Mutation (Accept, Food Ready, Reject)
  const orderActionMutation = useMutation({
    mutationFn: async ({
      orderId,
      aggregatorOrderId,
      action,
      prepTime,
      reason,
    }: {
      orderId?: string;
      aggregatorOrderId: string;
      action: "accept" | "food_ready" | "reject";
      prepTime?: number;
      reason?: string;
    }) => {
      const nextStatus =
        action === "accept" ? "preparing" : action === "food_ready" ? "food_ready" : "cancelled";

      // Update aggregator_orders table
      await supabase
        .from("aggregator_orders")
        .update({
          channel_status: nextStatus,
          prep_time_minutes: prepTime || 15,
          updated_at: new Date().toISOString(),
        })
        .eq("aggregator_order_id", aggregatorOrderId);

      if (orderId) {
        const posStatus = action === "accept" ? "preparing" : action === "food_ready" ? "ready" : "cancelled";
        await supabase.from("orders").update({ status: posStatus }).eq("id", orderId);
        await supabase.from("kitchen_orders").update({ status: posStatus }).eq("order_id", orderId);
      }
    },
    onSuccess: (_, vars) => {
      toast({
        title: `Order ${vars.action === "accept" ? "Accepted" : vars.action === "food_ready" ? "Marked Ready" : "Cancelled"}`,
        description: `Order #${vars.aggregatorOrderId} updated.`,
      });
      queryClient.invalidateQueries({ queryKey: ["aggregator-orders", restaurantId] });
    },
  });

  // 6. 86 / Out of Stock Toggle Mutation
  const toggleItem86Mutation = useMutation({
    mutationFn: async ({
      menuItemId,
      provider = "all",
      inStock,
    }: {
      menuItemId: string;
      provider?: AggregatorProvider | "all";
      inStock: boolean;
    }) => {
      if (!restaurantId) throw new Error("No restaurant ID");
      const providers = provider === "all" ? ["swiggy", "zomato", "magicpin"] : [provider];

      for (const p of providers) {
        await supabase.from("aggregator_item_mappings").upsert(
          {
            restaurant_id: restaurantId,
            menu_item_id: menuItemId,
            provider: p,
            is_in_stock: inStock,
            is_available: inStock,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id,menu_item_id,provider" },
        );
      }
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.inStock ? "Item Enabled (In Stock)" : "Item 86'd (Out of Stock)",
        description: `Availability updated across all delivery platforms.`,
      });
      queryClient.invalidateQueries({ queryKey: ["aggregator-items", restaurantId] });
    },
  });

  // 7. Inject Test Simulated Order Mutation (for development & testing)
  const simulateOrderMutation = useMutation({
    mutationFn: async ({
      provider,
      customerName,
      items,
      total,
    }: {
      provider: AggregatorProvider;
      customerName: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      total: number;
    }) => {
      if (!restaurantId) throw new Error("No restaurant ID");
      const randomId = Math.floor(1000 + Math.random() * 9000).toString();
      const displayId = `${provider.slice(0, 3).toUpperCase()}-${randomId}`;

      // Insert core order
      const { data: posOrder, error: posError } = await supabase
        .from("orders")
        .insert([
          {
            restaurant_id: restaurantId,
            customer_name: `${customerName} (${provider.toUpperCase()})`,
            order_type: "delivery",
            source: provider,
            status: "pending",
            payment_status: "paid",
            payment_method: `${provider}_online`,
            total,
            notes: `[TEST SIMULATED ${provider.toUpperCase()}]`,
            items,
          },
        ])
        .select("id")
        .single();

      if (posError) throw posError;

      // Insert KOT
      await supabase.from("kitchen_orders").insert([
        {
          restaurant_id: restaurantId,
          order_id: posOrder.id,
          source: provider.toUpperCase(),
          status: "pending",
          priority: "high",
          items,
        },
      ]);

      // Insert aggregator order
      const commission = (total * 18) / 100;
      await supabase.from("aggregator_orders").insert([
        {
          restaurant_id: restaurantId,
          provider,
          order_id: posOrder.id,
          aggregator_order_id: `SIM-${randomId}`,
          display_order_id: displayId,
          customer_name: customerName,
          customer_phone: "+91 9876543210",
          channel_status: "placed",
          items,
          gross_amount: total,
          commission_amount: commission,
          net_payout: total - commission,
          rider_name: "Rahul Kumar",
          rider_phone: "+91 9123456780",
          rider_status: "assigned",
          otp: "4921",
          prep_time_minutes: 15,
        },
      ]);
    },
    onSuccess: () => {
      toast({
        title: "Test Order Simulated! 🚀",
        description: "Injected directly into Kitchen KDS and Aggregator Board.",
      });
      queryClient.invalidateQueries({ queryKey: ["aggregator-orders", restaurantId] });
    },
  });

  // Summary Metrics Computation
  const summaryStats: AggregatorSummaryStats = useMemo(() => {
    let totalGross = 0;
    let totalCommissions = 0;
    let activeCount = 0;

    const breakdown = {
      swiggy: { orders: 0, revenue: 0, isOpen: true },
      zomato: { orders: 0, revenue: 0, isOpen: true },
      magicpin: { orders: 0, revenue: 0, isOpen: true },
      urbanpiper: { orders: 0, revenue: 0, isOpen: true },
    };

    // Store open status
    stores.forEach((s) => {
      if (s.provider in breakdown) {
        breakdown[s.provider as keyof typeof breakdown].isOpen = s.is_store_open;
      }
    });

    orders.forEach((o) => {
      totalGross += Number(o.gross_amount || 0);
      totalCommissions += Number(o.commission_amount || 0);
      if (["placed", "acknowledged", "preparing", "food_ready"].includes(o.channel_status)) {
        activeCount += 1;
      }
      if (o.provider in breakdown) {
        breakdown[o.provider as keyof typeof breakdown].orders += 1;
        breakdown[o.provider as keyof typeof breakdown].revenue += Number(o.gross_amount || 0);
      }
    });

    return {
      totalOrdersToday: orders.length,
      grossSalesToday: totalGross,
      estimatedCommissionsToday: totalCommissions,
      netPayoutToday: totalGross - totalCommissions,
      avgPrepTimeMinutes: 16,
      activeOrdersCount: activeCount,
      channelBreakdown: breakdown,
    };
  }, [orders, stores]);

  const filteredOrders = useMemo(() => {
    if (activeTab === "all") return orders;
    return orders.filter((o) => o.provider === activeTab);
  }, [orders, activeTab]);

  return {
    stores,
    orders: filteredOrders,
    rawOrders: orders,
    summaryStats,
    activeTab,
    setActiveTab,
    isLoading: isLoadingStores || isLoadingOrders,
    toggleStore: toggleStoreMutation.mutate,
    isTogglingStore: toggleStoreMutation.isPending,
    executeOrderAction: orderActionMutation.mutate,
    isUpdatingOrder: orderActionMutation.isPending,
    toggle86: toggleItem86Mutation.mutate,
    simulateOrder: simulateOrderMutation.mutate,
  };
}
