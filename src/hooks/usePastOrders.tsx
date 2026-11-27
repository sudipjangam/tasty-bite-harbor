import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import { useEffect, useRef, useState } from "react";
import { getDateRange, DateFilter } from "@/utils/dateRangeUtils";
import {
  getLocalOrder,
  getLocalOrdersByRestaurant,
  LOCAL_ORDERS_EVENT,
  OfflineQsrOrder,
} from "@/utils/offlineDB";

export type { DateFilter } from "@/utils/dateRangeUtils";

export interface PastOrder {
  id: string;
  orderId: string | null;
  source: string;
  items: { name: string; quantity: number; price: number; notes?: string[] }[];
  status: string;
  createdAt: string;
  completedAt: string | null;
  total: number;
  subtotal: number;
  discount?: number;
  discountType?: string;
  customerName?: string;
  attendant?: string;
  orderType?: string; // To identify NC (non-chargeable) orders
  paymentMethod?: string;
  paymentStatus?: string;
  splitPayments?: any;
  isOfflinePending?: boolean;
  offlineToken?: string;
}

interface UsePastOrdersOptions {
  dateFilter?: DateFilter;
  searchQuery?: string;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
}

const PAST_SNAPSHOT_KEY_PREFIX = "qsr_past_orders_snapshot_";

function getLocalDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadPastSnapshot(restaurantId: string): PastOrder[] | null {
  try {
    const raw = localStorage.getItem(
      `${PAST_SNAPSHOT_KEY_PREFIX}${restaurantId}_${getLocalDateKey()}`,
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function savePastSnapshot(restaurantId: string, orders: PastOrder[]) {
  try {
    localStorage.setItem(
      `${PAST_SNAPSHOT_KEY_PREFIX}${restaurantId}_${getLocalDateKey()}`,
      JSON.stringify(orders.slice(0, 100)),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function mapLocalToPastOrder(lo: OfflineQsrOrder): PastOrder {
  const subtotal =
    lo.subtotal ??
    (lo.items || []).reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  return {
    id: lo.id,
    orderId: lo.orderId,
    source: lo.source || "QSR",
    items: (lo.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: Array.isArray(item.notes)
        ? item.notes
        : item.notes
        ? [item.notes]
        : undefined,
    })),
    status: lo.status,
    createdAt: lo.createdAt,
    completedAt: lo.completedAt || lo.updatedAt,
    total: lo.total,
    subtotal,
    discount: lo.discount,
    discountType: lo.discountType,
    customerName: lo.customerName,
    attendant: lo.attendant,
    orderType:
      lo.orderType === "nc"
        ? "non-chargeable"
        : lo.orderType?.replace("_", "-"),
    paymentMethod: lo.paymentMethod,
    paymentStatus: lo.paymentStatus,
    splitPayments: lo.splitPayments,
    isOfflinePending: lo.synced !== true,
    offlineToken: lo.offlineToken,
  };
}

export const usePastOrders = (options: UsePastOrdersOptions = {}) => {
  const { restaurantId } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState(options.searchQuery || "");
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    options.dateFilter || "today",
  );
  const [customStartDate, setCustomStartDate] = useState<Date | null>(
    options.customStartDate || null,
  );
  const [customEndDate, setCustomEndDate] = useState<Date | null>(
    options.customEndDate || null,
  );

  const isOfflineNow = () =>
    !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "past-orders",
      restaurantId,
      dateFilter,
      searchQuery,
      customStartDate?.toISOString(),
      customEndDate?.toISOString(),
    ],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return [];

      const { start, end } = getDateRange(
        dateFilter,
        customStartDate,
        customEndDate,
      );

      let baseOrders: PastOrder[] = [];
      let serverFetchSucceeded = false;
      const offline = isOfflineNow();
      const localOrders = await getLocalOrdersByRestaurant(restaurantId);

      if (offline) {
        if (dateFilter !== "today") {
          if (localOrders.length === 0) {
            throw new Error("Past orders for this date range are unavailable offline");
          }
          baseOrders = [];
        } else {
          const snap = loadPastSnapshot(restaurantId);
          if (snap === null && localOrders.length === 0) {
            throw new Error("Offline past orders snapshot unavailable");
          }
          baseOrders = snap ?? [];
        }
      } else {
        try {
          const { data: kitchenData, error: kitchenError } = await supabase
            .from("kitchen_orders")
            .select(
              "id, source, items, status, created_at, bumped_at, order_id, server_name, customer_name",
            )
            .eq("restaurant_id", restaurantId)
            .eq("status", "completed")
            .gte("created_at", start)
            .lte("created_at", end)
            .order("bumped_at", { ascending: false });

          if (kitchenError) {
            console.error("Error fetching kitchen orders:", kitchenError);
            throw kitchenError;
          }

          const orderIds = (kitchenData || [])
            .map((o) => o.order_id)
            .filter((id): id is string => id !== null && id !== undefined);

          let ordersMap: Record<
            string,
            {
              total?: string | number;
              discount_amount?: string | number;
              discount_percentage?: string | number;
              order_type?: string;
              payment_method?: string;
              payment_status?: string;
              split_payments?: any;
            }
          > = {};

          if (orderIds.length > 0) {
            const { data: ordersData, error: ordersError } = await supabase
              .from("orders")
              .select(
                "id, total, discount_amount, discount_percentage, order_type, payment_method, payment_status, split_payments",
              )
              .in("id", orderIds);

            // H-25: Don't silently overwrite totals with subtotals if orders enrichment failed
            if (ordersError) {
              throw ordersError;
            }
            if (ordersData) {
              ordersMap = ordersData.reduce(
                (acc, order) => {
                  acc[order.id] = order;
                  return acc;
                },
                {} as typeof ordersMap,
              );
            }
          }

          baseOrders = (kitchenData || []).map((order) => {
            const items =
              (order.items as {
                name: string;
                quantity: number;
                price: number;
                notes?: string[];
              }[]) || [];

            const subtotal = items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );

            const linkedOrder = order.order_id
              ? ordersMap[order.order_id]
              : null;

            const total =
              linkedOrder?.total !== undefined && linkedOrder?.total !== null
                ? Number(linkedOrder.total)
                : subtotal;

            const discountPercentage = linkedOrder?.discount_percentage
              ? Number(linkedOrder.discount_percentage)
              : undefined;
            const discountAmount = linkedOrder?.discount_amount
              ? Number(linkedOrder.discount_amount)
              : undefined;
            const discount = discountPercentage || discountAmount;
            const discountType = discountPercentage
              ? "percentage"
              : discountAmount
                ? "amount"
                : undefined;

            return {
              id: order.id,
              orderId: order.order_id,
              source: order.source || "Unknown",
              items,
              status: order.status,
              createdAt: order.created_at,
              completedAt: order.bumped_at,
              total,
              subtotal,
              discount,
              discountType,
              customerName: order.customer_name || undefined,
              attendant: order.server_name || undefined,
              orderType: linkedOrder?.order_type || undefined,
              paymentMethod:
                linkedOrder?.payment_method ||
                (order as any).payment_method ||
                undefined,
              paymentStatus:
                linkedOrder?.payment_status ||
                (order as any).payment_status ||
                undefined,
              splitPayments: linkedOrder?.split_payments || undefined,
            };
          });

          if (dateFilter === "today" && !searchQuery) {
            savePastSnapshot(restaurantId, baseOrders);
          }
          serverFetchSucceeded = true;
        } catch (err) {
          console.warn("[usePastOrders] Falling back to offline snapshot:", err);
          if (dateFilter !== "today") {
            if (localOrders.length === 0) throw err;
            baseOrders = [];
          } else {
            const snap = loadPastSnapshot(restaurantId);
            if (snap === null && localOrders.length === 0) {
              throw err;
            }
            baseOrders = snap ?? [];
          }
        }
      }

      // Merge locally completed or deleted offline orders
      const mergedMap = new Map<string, PastOrder>();
      for (const ord of baseOrders) {
        mergedMap.set(ord.id, ord);
      }
      for (const lo of localOrders) {
        if (lo.synced === true && serverFetchSucceeded) {
          continue;
        }
        if (lo.status === "completed") {
          mergedMap.set(lo.id, mapLocalToPastOrder(lo));
        } else {
          // H-26: Remove deleted or non-completed (e.g. re-opened) local mirrors from past orders
          mergedMap.delete(lo.id);
        }
      }

      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();

      return Array.from(mergedMap.values())
        .filter((order) => {
          const createdMs = new Date(order.createdAt).getTime();
          return createdMs >= startMs && createdMs <= endMs;
        })
        .filter((order) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            order.source.toLowerCase().includes(query) ||
            order.items.some((item) =>
              item.name.toLowerCase().includes(query),
            ) ||
            (order.customerName?.toLowerCase().includes(query) ?? false)
          );
        })
        .sort(
          (a, b) =>
            new Date(b.completedAt || b.createdAt).getTime() -
            new Date(a.completedAt || a.createdAt).getTime(),
        );
    },
    enabled: !!restaurantId,
    retry: (failureCount) => !isOfflineNow() && failureCount < 2,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,
  });

  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;
    if (!wasOnline && isOnline && restaurantId) {
      queryClient.invalidateQueries({ queryKey: ["past-orders", restaurantId] });
    }
  }, [isOnline, restaurantId, queryClient]);

  // Real-time subscription + local offline order listener
  useEffect(() => {
    if (!restaurantId) return;

    const handleLocalOrdersChange = () => {
      queryClient.invalidateQueries({
        queryKey: ["past-orders", restaurantId],
      });
    };
    window.addEventListener(LOCAL_ORDERS_EVENT, handleLocalOrdersChange);

    const channel = supabase
      .channel(`past-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "kitchen_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if ((payload.new as any)?.status === "completed") {
            queryClient.invalidateQueries({
              queryKey: ["past-orders", restaurantId],
            });
          }
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener(LOCAL_ORDERS_EVENT, handleLocalOrdersChange);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // Get order by ID for printing (M-12: avoid stale synced local mirror when online)
  const getOrderById = async (orderId: string): Promise<PastOrder | null> => {
    const local = await getLocalOrder(orderId);
    if (local && local.restaurantId === restaurantId) {
      if (local.status === "deleted") return null;
      if (local.status === "completed" && local.synced !== true) {
        return mapLocalToPastOrder(local);
      }
    }

    if (isOfflineNow()) {
      const fromList = orders.find((o) => o.id === orderId);
      if (fromList) return fromList;
      if (
        local &&
        local.restaurantId === restaurantId &&
        local.status === "completed"
      ) {
        return mapLocalToPastOrder(local);
      }
      return null;
    }

    const { data, error } = await supabase
      .from("kitchen_orders")
      .select(
        `*, orders:order_id (total, discount_amount, discount_percentage, order_type, payment_method, payment_status, split_payments)`,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error || !data) return null;

    const items =
      (data.items as {
        name: string;
        quantity: number;
        price: number;
        notes?: string[];
      }[]) || [];

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const linkedOrder = data.orders as {
      total?: number | string;
      discount_amount?: number | string;
      discount_percentage?: number | string;
      order_type?: string | null;
      payment_method?: string | null;
      payment_status?: string | null;
      split_payments?: any;
    } | null;

    const total =
      linkedOrder?.total !== undefined && linkedOrder?.total !== null
        ? Number(linkedOrder.total)
        : subtotal;

    const discountPercentage = linkedOrder?.discount_percentage
      ? Number(linkedOrder.discount_percentage)
      : undefined;
    const discountAmount = linkedOrder?.discount_amount
      ? Number(linkedOrder.discount_amount)
      : undefined;
    const discount = discountPercentage || discountAmount;
    const discountType = discountPercentage
      ? "percentage"
      : discountAmount
        ? "amount"
        : undefined;

    return {
      id: data.id,
      orderId: data.order_id,
      source: data.source || "Unknown",
      items,
      status: data.status,
      createdAt: data.created_at,
      completedAt: data.bumped_at,
      total,
      subtotal,
      discount,
      discountType,
      customerName: data.customer_name || undefined,
      attendant: data.server_name || undefined,
      orderType: linkedOrder?.order_type || data.order_type || undefined,
      paymentMethod: linkedOrder?.payment_method || undefined,
      paymentStatus: linkedOrder?.payment_status || undefined,
      splitPayments: linkedOrder?.split_payments || undefined,
    };
  };

  return {
    orders,
    isLoading,
    refetch,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    getOrderById,
  };
};
