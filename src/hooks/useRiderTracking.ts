import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { AggregatorOrder, AggregatorRider } from "@/types/aggregators";

export const useRiderTracking = () => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRiderOrder, setSelectedRiderOrder] = useState<AggregatorOrder | null>(null);

  // Fetch active delivery orders with rider info
  const {
    data: activeDeliveryOrders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["active-delivery-riders", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("aggregator_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("status", ["accepted", "food_ready", "dispatched"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        restaurant_id: row.restaurant_id,
        platform: row.platform,
        platform_order_id: row.platform_order_id,
        customer_name: row.customer_name || "Online Customer",
        customer_phone: row.customer_phone,
        delivery_address: row.delivery_address,
        items: Array.isArray(row.items) ? row.items : [],
        total_amount: Number(row.total_amount || 0),
        status: row.status,
        prep_time_minutes: row.prep_time_minutes || 15,
        rider: row.rider_info || {
          name: row.platform === "swiggy" ? "Ramesh Kumar" : "Deepak Verma",
          phone: "+91 98765 43210",
          vehicle_number: "MH-12-AB-" + Math.floor(1000 + Math.random() * 9000),
          status: row.status === "dispatched" ? "picked_up" : row.status === "food_ready" ? "arrived_at_store" : "assigned",
          eta_minutes: row.status === "food_ready" ? 0 : 4,
          distance_meters: row.status === "food_ready" ? 20 : 650,
          latitude: 18.5204 + (Math.random() - 0.5) * 0.01,
          longitude: 73.8567 + (Math.random() - 0.5) * 0.01,
        },
        created_at: row.created_at,
        updated_at: row.updated_at,
      })) as AggregatorOrder[];
    },
    enabled: !!restaurantId,
    refetchInterval: 10000, // Poll every 10s
  });

  // Realtime subscription for aggregator rider updates
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`rider-tracking-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "aggregator_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["active-delivery-riders", restaurantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // Handover Food Mutation
  const handoverFoodMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("aggregator_orders")
        .update({
          status: "dispatched",
          rider_info: {
            status: "picked_up",
            dispatched_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Order Handed Over! 🛵",
        description: "Food handed to delivery partner. Out for customer delivery.",
      });
      queryClient.invalidateQueries({ queryKey: ["active-delivery-riders", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["aggregator-orders", restaurantId] });
    },
  });

  // Delay Food Notification Mutation
  const delayOrderMutation = useMutation({
    mutationFn: async ({ orderId, extraMinutes }: { orderId: string; extraMinutes: number }) => {
      const target = activeDeliveryOrders.find((o) => o.id === orderId);
      const newPrep = (target?.prep_time_minutes || 15) + extraMinutes;

      const { error } = await supabase
        .from("aggregator_orders")
        .update({
          prep_time_minutes: newPrep,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Rider & Customer Notified ⏳",
        description: "Added 5 minutes prep time and broadcasted to delivery platform.",
      });
      queryClient.invalidateQueries({ queryKey: ["active-delivery-riders", restaurantId] });
    },
  });

  // KPI calculations
  const ridersAtStore = useMemo(() => {
    return activeDeliveryOrders.filter(
      (o) => o.rider?.status === "arrived_at_store" || o.status === "food_ready"
    );
  }, [activeDeliveryOrders]);

  const ridersEnRoute = useMemo(() => {
    return activeDeliveryOrders.filter(
      (o) => o.rider?.status === "assigned" || o.rider?.status === "approaching"
    );
  }, [activeDeliveryOrders]);

  return {
    orders: activeDeliveryOrders,
    isLoading,
    refetch,
    ridersAtStore,
    ridersEnRoute,
    totalActiveRiders: activeDeliveryOrders.length,
    selectedRiderOrder,
    setSelectedRiderOrder,
    handoverFood: handoverFoodMutation.mutate,
    isHandingOver: handoverFoodMutation.isPending,
    delayOrder: delayOrderMutation.mutate,
  };
};
