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
  orderNumber?: string;
  paymentStatus?: string;
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

      // Fetch completed orders from unified table with profile join for staff names
      const { data, error } = await supabase
        .from("orders_unified")
        .select(
          `id, source, items, kitchen_status, status, created_at, completed_at, total_amount, subtotal, discount_amount, customer_name, waiter_id, order_number, payment_status, payment_method, profiles:waiter_id(first_name, last_name)`
        )
        .eq("restaurant_id", restaurantId)
        .eq("kitchen_status", "completed")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("completed_at", { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Error fetching past orders:", error);
        throw error;
      }

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

          // Calculate subtotal from items if not available
          const calculatedSubtotal = items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          const subtotal = order.subtotal || calculatedSubtotal;
          const total = order.total_amount || subtotal;
          const discount = order.discount_amount || 0;

          // Get staff name from joined profile
          const profileData = order.profiles as unknown;
          const profile = Array.isArray(profileData)
            ? (profileData[0] as
                | { first_name: string | null; last_name: string | null }
                | undefined)
            : (profileData as {
                first_name: string | null;
                last_name: string | null;
              } | null);
          const staffName = profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
            : undefined;

          return {
            id: order.id,
            orderId: order.id, // In unified table, order ID is the same
            source: order.source || "pos",
            items,
            status: order.status || "completed",
            createdAt: order.created_at,
            completedAt: order.completed_at,
            total,
            subtotal,
            discount: discount > 0 ? discount : undefined,
            discountType: discount > 0 ? "amount" : undefined,
            customerName: order.customer_name || undefined,
            attendant: staffName || undefined,
            orderNumber: order.order_number || undefined,
            paymentStatus: order.payment_status || undefined,
            paymentMethod: order.payment_method || undefined,
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
            (order.customerName?.toLowerCase().includes(query) ?? false) ||
            (order.orderNumber?.toLowerCase().includes(query) ?? false)
          );
        });

      return mappedOrders;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 30, // 30 sec cache - past orders don't change often
    gcTime: 1000 * 60 * 10, // 10 min garbage collection
  });

  // Real-time subscription for orders becoming completed
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("past-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders_unified",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          // Refetch when an order becomes completed
          if ((payload.new as any)?.kitchen_status === "completed") {
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
      .from("orders_unified")
      .select("*, profiles:waiter_id(first_name, last_name)")
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

    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const subtotal = data.subtotal || calculatedSubtotal;
    const total = data.total_amount || subtotal;
    const discount = data.discount_amount || 0;

    // Get staff name from joined profile
    const profileData = data.profiles as unknown;
    const profile = Array.isArray(profileData)
      ? (profileData[0] as
          | { first_name: string | null; last_name: string | null }
          | undefined)
      : (profileData as {
          first_name: string | null;
          last_name: string | null;
        } | null);
    const staffName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : undefined;

    return {
      id: data.id,
      orderId: data.id,
      source: data.source || "pos",
      items,
      status: data.status || "completed",
      createdAt: data.created_at,
      completedAt: data.completed_at,
      total,
      subtotal,
      discount: discount > 0 ? discount : undefined,
      discountType: discount > 0 ? "amount" : undefined,
      customerName: data.customer_name || undefined,
      attendant: staffName || undefined,
      orderNumber: data.order_number || undefined,
      paymentStatus: data.payment_status || undefined,
      paymentMethod: data.payment_method || undefined,
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
