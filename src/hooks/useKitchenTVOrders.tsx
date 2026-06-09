import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KitchenOrder } from "@/components/Kitchen/KitchenDisplay";
import { useToast } from "@/hooks/use-toast";
import { useKitchenSounds } from "@/hooks/useKitchenSounds";

export const useKitchenTVOrders = (restaurantId: string | null, pin: string | null) => {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { playNewOrder, playModified, playRushOrder } = useKitchenSounds();

  // Determine auth mode: PIN-based RPC or direct table query (email login)
  const useDirectQuery = !pin;

  const ordersRef = useRef<KitchenOrder[]>([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const transformOrderData = useCallback((order: any): KitchenOrder => {
    const itemsArray = Array.isArray(order.items) ? order.items : [];
    const itemCompletionStatus = Array.isArray(order.item_completion_status)
      ? order.item_completion_status
      : new Array(itemsArray.length).fill(false);

    const transformedItems = itemsArray.map((item: any) => ({
      name: item.name || "Unknown Item",
      quantity: item.quantity || 1,
      notes: Array.isArray(item.notes) ? item.notes : undefined,
      priority: item.priority || "normal",
      is_addition: !!item.is_addition,
      parent_order_number: item.parent_order_number,
      has_allergy:
        item.has_allergy ||
        (Array.isArray(item.notes) &&
          item.notes.some((note: string) =>
            /allerg|gluten|dairy|nut|vegan|vegetarian/i.test(note)
          )),
    }));

    return {
      id: order.id,
      source: order.source || "Order",
      status: order.status,
      created_at: order.created_at,
      priority: order.priority || "normal",
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

  const sortOrders = useCallback((list: KitchenOrder[]) => {
    return [...list].sort((a, b) => {
      const priorityOrder: Record<string, number> = { vip: 0, rush: 1, normal: 2 };
      const pA = priorityOrder[a.priority] ?? 2;
      const pB = priorityOrder[b.priority] ?? 2;
      if (pA !== pB) return pA - pB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, []);

  const triggerSounds = useCallback((sorted: KitchenOrder[]) => {
    if (ordersRef.current.length === 0) return;

    let hasNew = false;
    let hasModified = false;
    let isRush = false;

    const oldMap = new Map(ordersRef.current.map(o => [o.id, o]));

    sorted.forEach(newOrd => {
      const oldOrd = oldMap.get(newOrd.id);
      if (!oldOrd) {
        hasNew = true;
        if (newOrd.priority === "vip" || newOrd.priority === "rush") isRush = true;
      } else if (JSON.stringify(oldOrd.items) !== JSON.stringify(newOrd.items)) {
        hasModified = true;
        if (newOrd.priority === "vip" || newOrd.priority === "rush") isRush = true;
      }
    });

    if (hasNew) {
      if (isRush) playRushOrder(); else playNewOrder();
    } else if (hasModified) {
      if (isRush) playRushOrder(); else playModified();
    }
  }, [playNewOrder, playModified, playRushOrder]);

  // ── Fetch via direct table query (email auth) ──
  const fetchOrdersDirect = useCallback(async (isSilent = false) => {
    if (!restaurantId) return;
    if (!isSilent) setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("kitchen_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("status", ["new", "preparing", "ready", "held"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = (data as any[]).map(transformOrderData);
        const sorted = sortOrders(mapped);
        triggerSounds(sorted);
        setOrders(sorted);
      }
    } catch (err) {
      console.error("Error fetching TV orders (direct):", err);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, transformOrderData, sortOrders, triggerSounds]);

  // ── Fetch via PIN RPC ──
  const fetchOrdersPin = useCallback(async (isSilent = false) => {
    if (!restaurantId || !pin) return;
    if (!isSilent) setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_kitchen_orders_by_pin", {
        p_restaurant_id: restaurantId,
        p_pin: pin,
      });

      if (error) throw error;

      if (data) {
        const mapped = (data as any[]).map(transformOrderData);
        const sorted = sortOrders(mapped);
        triggerSounds(sorted);
        setOrders(sorted);
      }
    } catch (err) {
      console.error("Error fetching TV orders (pin):", err);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, pin, transformOrderData, sortOrders, triggerSounds]);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (useDirectQuery) {
      return fetchOrdersDirect(isSilent);
    }
    return fetchOrdersPin(isSilent);
  }, [useDirectQuery, fetchOrdersDirect, fetchOrdersPin]);

  // Polling + realtime
  useEffect(() => {
    if (!restaurantId) return;
    // Need either pin or direct query mode
    if (!useDirectQuery && !pin) return;

    fetchOrders(false);

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 5000);

    // Also subscribe to realtime for immediate updates
    const channel = supabase
      .channel("kitchen-tv-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchOrders(true);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, pin, useDirectQuery, fetchOrders]);

  // ── Status update ──
  const updateStatus = async (orderId: string, newStatus: KitchenOrder["status"]) => {
    if (!restaurantId) return;
    try {
      const startedAt = newStatus === "preparing" ? new Date().toISOString() : null;
      const completedAt = newStatus === "ready" ? new Date().toISOString() : null;

      if (useDirectQuery) {
        // Direct table update
        const updatePayload: any = { status: newStatus };
        if (startedAt) updatePayload.started_at = startedAt;
        if (completedAt) updatePayload.completed_at = completedAt;

        const { error } = await supabase
          .from("kitchen_orders")
          .update(updatePayload)
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);

        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("update_kitchen_order_status_by_pin", {
          p_order_id: orderId,
          p_restaurant_id: restaurantId,
          p_pin: pin,
          p_status: newStatus,
          p_started_at: startedAt,
          p_completed_at: completedAt,
        });
        if (error) throw error;
      }

      setOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? {
                ...o,
                status: newStatus,
                ...(startedAt ? { started_at: startedAt } : {}),
                ...(completedAt ? { completed_at: completedAt } : {}),
              }
            : o
        )
      );

      toast({ title: "Status Updated", description: `Order marked as ${newStatus}` });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to update order status." });
    }
  };

  // ── Item completion ──
  const updateItemComplete = async (orderId: string, itemIndex: number, completed: boolean) => {
    if (!restaurantId) return;
    try {
      const order = ordersRef.current.find(o => o.id === orderId);
      if (!order) return;

      const newStatus = [...(order.item_completion_status || new Array(order.items.length).fill(false))];
      newStatus[itemIndex] = completed;

      if (useDirectQuery) {
        const { error } = await supabase
          .from("kitchen_orders")
          .update({ item_completion_status: newStatus })
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("update_kitchen_item_complete_by_pin", {
          p_order_id: orderId,
          p_restaurant_id: restaurantId,
          p_pin: pin,
          p_item_completion_status: newStatus,
        });
        if (error) throw error;
      }

      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, item_completion_status: newStatus } : o))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ── Bump order ──
  const bumpOrder = async (orderId: string) => {
    if (!restaurantId) return;
    try {
      if (useDirectQuery) {
        const { error } = await supabase
          .from("kitchen_orders")
          .update({ status: "completed", bumped_at: new Date().toISOString() })
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("bump_kitchen_order_by_pin", {
          p_order_id: orderId,
          p_restaurant_id: restaurantId,
          p_pin: pin,
        });
        if (error) throw error;
      }

      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast({ title: "Order Bumped", description: "Order has been archived" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to bump order." });
    }
  };

  // ── Priority update ──
  const updatePriority = async (orderId: string, newPriority: KitchenOrder["priority"]) => {
    if (!restaurantId) return;
    try {
      if (useDirectQuery) {
        const { error } = await supabase
          .from("kitchen_orders")
          .update({ priority: newPriority })
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("update_kitchen_order_priority_by_pin", {
          p_order_id: orderId,
          p_restaurant_id: restaurantId,
          p_pin: pin,
          p_priority: newPriority,
        });
        if (error) throw error;
      }

      setOrders(prev => {
        const updated = prev.map(o => (o.id === orderId ? { ...o, priority: newPriority } : o));
        return sortOrders(updated);
      });

      toast({ title: "Priority Updated", description: `Order priority changed to ${newPriority.toUpperCase()}` });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to update priority." });
    }
  };

  return {
    orders,
    isLoading,
    refetch: fetchOrders,
    updateStatus,
    updateItemComplete,
    bumpOrder,
    updatePriority,
  };
};

