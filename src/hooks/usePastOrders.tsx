import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useEffect, useState } from "react";

export type DateFilter =
  | "today"
  | "yesterday"
  | "last7days"
  | "thisMonth"
  | "custom";

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
  paymentMethod?: string;
}

interface UsePastOrdersOptions {
  dateFilter?: DateFilter;
  searchQuery?: string;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
}

export const usePastOrders = (options: UsePastOrdersOptions = {}) => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState(options.searchQuery || "");
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    options.dateFilter || "today"
  );
  const [customStartDate, setCustomStartDate] = useState<Date | null>(
    options.customStartDate || null
  );
  const [customEndDate, setCustomEndDate] = useState<Date | null>(
    options.customEndDate || null
  );

  // Calculate date range based on filter (using UTC to match database timestamps)
  const getDateRange = () => {
    const now = new Date();
    // Use UTC dates to match database timestamps
    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0
      )
    );
    const todayEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    switch (dateFilter) {
      case "today":
        return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
      case "yesterday":
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
        const yesterdayEnd = new Date(todayStart);
        yesterdayEnd.setUTCMilliseconds(-1);
        return {
          start: yesterdayStart.toISOString(),
          end: yesterdayEnd.toISOString(),
        };
      case "last7days":
        const weekAgoStart = new Date(todayStart);
        weekAgoStart.setUTCDate(weekAgoStart.getUTCDate() - 7);
        return {
          start: weekAgoStart.toISOString(),
          end: todayEnd.toISOString(),
        };
      case "thisMonth":
        const monthStart = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
        );
        return { start: monthStart.toISOString(), end: todayEnd.toISOString() };
      case "custom":
        if (customStartDate && customEndDate) {
          const customStart = new Date(
            Date.UTC(
              customStartDate.getFullYear(),
              customStartDate.getMonth(),
              customStartDate.getDate(),
              0,
              0,
              0
            )
          );
          const customEnd = new Date(
            Date.UTC(
              customEndDate.getFullYear(),
              customEndDate.getMonth(),
              customEndDate.getDate(),
              23,
              59,
              59,
              999
            )
          );
          return {
            start: customStart.toISOString(),
            end: customEnd.toISOString(),
          };
        }
        // Fallback to today if custom dates not set
        return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
      default:
        return { start: todayStart.toISOString(), end: todayEnd.toISOString() };
    }
  };

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
    queryFn: async () => {
      if (!restaurantId) return [];

      const { start, end } = getDateRange();

      // Fetch completed kitchen orders
      const { data: kitchenData, error: kitchenError } = await supabase
        .from("kitchen_orders")
        .select(
          "id, source, items, status, created_at, bumped_at, order_id, server_name, customer_name"
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

      // Get all linked order IDs
      const orderIds = (kitchenData || [])
        .map((o) => o.order_id)
        .filter((id): id is string => id !== null && id !== undefined);

      // Fetch linked orders for discount info (if any)
      let ordersMap: Record<
        string,
        {
          total?: string | number;
          discount_amount?: string | number;
          discount_percentage?: string | number;
          payment_method?: string;
        }
      > = {};

      if (orderIds.length > 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(
            "id, total, discount_amount, discount_percentage, payment_method"
          )
          .in("id", orderIds);

        if (!ordersError && ordersData) {
          ordersMap = ordersData.reduce((acc, order) => {
            acc[order.id] = order;
            return acc;
          }, {} as typeof ordersMap);
        }
      }

      const data = kitchenData;

      // Map to PastOrder format and apply search filter
      const mappedOrders: PastOrder[] = (data || [])
        .map((order) => {
          const items =
            (order.items as {
              name: string;
              quantity: number;
              price: number;
              notes?: string[];
            }[]) || [];

          // Calculate subtotal from items
          const subtotal = items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          // Get linked order data (if available) for actual total with discount
          const linkedOrder = order.order_id ? ordersMap[order.order_id] : null;

          // Use linked order total if available (includes discount), otherwise fallback to subtotal
          const total =
            linkedOrder?.total !== undefined && linkedOrder?.total !== null
              ? Number(linkedOrder.total)
              : subtotal;

          // Get discount info - use percentage if available
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
          const paymentMethod = linkedOrder?.payment_method || undefined;

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
            paymentMethod,
          };
        })
        .filter((order) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            order.source.toLowerCase().includes(query) ||
            order.items.some((item) =>
              item.name.toLowerCase().includes(query)
            ) ||
            (order.customerName?.toLowerCase().includes(query) ?? false)
          );
        });

      return mappedOrders;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 30, // 30 sec cache - past orders don't change often
    gcTime: 1000 * 60 * 10, // 10 min garbage collection
  });

  // Real-time subscription for kitchen orders becoming completed
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("past-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "kitchen_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          // Refetch when an order becomes completed
          if ((payload.new as any)?.status === "completed") {
            queryClient.invalidateQueries({
              queryKey: ["past-orders", restaurantId],
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  // Get order by ID for printing
  const getOrderById = async (orderId: string): Promise<PastOrder | null> => {
    const { data, error } = await supabase
      .from("kitchen_orders")
      .select(
        `*, orders:order_id (total, discount_amount, discount_percentage, payment_method)`
      )
      .eq("id", orderId)
      .single();

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
      0
    );

    // Get linked order data (if available) for actual total with discount
    const linkedOrder = data.orders as {
      total?: number | string;
      discount_amount?: number | string;
      discount_percentage?: number | string;
      payment_method?: string;
    } | null;

    // Use linked order total if available (includes discount), otherwise fallback to subtotal
    const total =
      linkedOrder?.total !== undefined && linkedOrder?.total !== null
        ? Number(linkedOrder.total)
        : subtotal;

    // Get discount info - use percentage if available
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
    const paymentMethod = linkedOrder?.payment_method || undefined;

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
      paymentMethod,
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
