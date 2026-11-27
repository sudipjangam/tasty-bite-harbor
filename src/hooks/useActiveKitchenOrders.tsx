import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import { useEffect, useState, useRef } from "react";
import { ActiveKitchenOrder } from "@/types/qsr";
import { useToast } from "@/hooks/use-toast";
import { getDateRange, DateFilter } from "@/utils/dateRangeUtils";
import { useKitchenSounds } from "@/hooks/useKitchenSounds";
import {
  getLocalOrder,
  getLocalOrdersByRestaurant,
  commitLocalOrderAndWritesAtomic,
  QueuedWrite,
  LOCAL_ORDERS_EVENT,
  OfflineQsrOrder,
} from "@/utils/offlineDB";
import { enqueueWrite } from "@/utils/syncManager";

export type { DateFilter } from "@/utils/dateRangeUtils";
export type StatusFilter =
  | "all"
  | "new"
  | "preparing"
  | "ready"
  | "held"
  | "unpaid";

interface UseActiveKitchenOrdersOptions {
  dateFilter?: DateFilter;
  statusFilter?: StatusFilter;
  searchQuery?: string;
}

const SNAPSHOT_KEY_PREFIX = "qsr_active_orders_snapshot_";

function getSnapshotKey(restaurantId: string, filter: StatusFilter): string {
  return filter === "unpaid"
    ? `${SNAPSHOT_KEY_PREFIX}unpaid_${restaurantId}`
    : `${SNAPSHOT_KEY_PREFIX}${restaurantId}`;
}

function loadSnapshot(
  restaurantId: string,
  filter: StatusFilter = "all",
): ActiveKitchenOrder[] | null {
  try {
    const raw = localStorage.getItem(getSnapshotKey(restaurantId, filter));
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    }
    if (filter === "unpaid") {
      const fallbackRaw = localStorage.getItem(
        getSnapshotKey(restaurantId, "all"),
      );
      if (fallbackRaw !== null) {
        const parsed = JSON.parse(fallbackRaw);
        return Array.isArray(parsed) ? parsed : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function saveSnapshot(
  restaurantId: string,
  orders: ActiveKitchenOrder[],
  filter: StatusFilter = "all",
) {
  try {
    localStorage.setItem(
      getSnapshotKey(restaurantId, filter),
      JSON.stringify(orders),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function mapLocalToActiveOrder(lo: OfflineQsrOrder): ActiveKitchenOrder {
  return {
    id: lo.id,
    orderId: lo.orderId || undefined,
    source: lo.source || "QSR",
    items: lo.items || [],
    status: lo.status as ActiveKitchenOrder["status"],
    priority: lo.priority || "normal",
    createdAt: lo.createdAt,
    total: lo.total,
    itemCompletionStatus: lo.itemCompletionStatus || [],
    orderType: lo.orderType,
    paymentMethod: lo.paymentMethod,
    paymentStatus: lo.paymentStatus,
    customerName: lo.customerName,
    customerPhone: lo.customerPhone,
    isOfflinePending: lo.synced !== true,
    offlineToken: lo.offlineToken,
  };
}

export const useActiveKitchenOrders = (
  options: UseActiveKitchenOrdersOptions = {},
) => {
  const { restaurantId } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { playReadyChime } = useKitchenSounds();
  const playReadyChimeRef = useRef(playReadyChime);
  playReadyChimeRef.current = playReadyChime;
  const [searchQuery, setSearchQuery] = useState(options.searchQuery || "");
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    options.dateFilter || "today",
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    options.statusFilter || "all",
  );

  const isOfflineNow = () =>
    !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "active-kitchen-orders",
      restaurantId,
      dateFilter,
      statusFilter,
      searchQuery,
    ],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return [];

      const { start, end } = getDateRange(dateFilter);
      const offline = isOfflineNow();

      let baseOrders: ActiveKitchenOrder[] = [];
      let serverFetchSucceeded = false;

      if (offline) {
        baseOrders =
          dateFilter === "today"
            ? loadSnapshot(restaurantId, statusFilter) || []
            : [];
      } else {
        try {
          let query = supabase
            .from("kitchen_orders")
            .select(
              "id, source, items, status, priority, created_at, order_id, item_completion_status, order_type, table_number, customer_name, customer_phone",
            )
            .eq("restaurant_id", restaurantId)
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: false });

          if (statusFilter === "unpaid") {
            query = query.in("status", [
              "new",
              "preparing",
              "ready",
              "held",
              "completed",
            ]);
          } else if (statusFilter !== "all") {
            query = query.eq("status", statusFilter);
          } else {
            query = query.in("status", ["new", "preparing", "ready", "held"]);
          }

          const { data, error } = await query;
          if (error) throw error;

          const orderIds = (data || [])
            .map((o) => o.order_id)
            .filter((id): id is string => id !== null && id !== undefined);

          let paymentMap: Record<
            string,
            {
              total?: number | string;
              payment_method?: string;
              payment_status?: string;
              customer_name?: string;
              customer_phone?: string;
            }
          > = {};
          let enrichmentFailed = false;
          if (orderIds.length > 0) {
            const { data: ordersData, error: ordersError } = await supabase
              .from("orders")
              .select(
                "id, total, payment_method, payment_status, customer_name, customer_phone",
              )
              .in("id", orderIds);
            // H-24: Throw if unpaid filter requires payment classification; otherwise keep kitchen rows & skip snapshot overwrite
            if (ordersError) {
              if (statusFilter === "unpaid") {
                throw ordersError;
              }
              enrichmentFailed = true;
              console.warn("[useActiveKitchenOrders] orders enrichment failed, preserving kitchen rows:", ordersError);
            } else if (ordersData) {
              paymentMap = ordersData.reduce(
                (acc, o) => {
                  acc[o.id] = {
                    total: o.total,
                    payment_method: o.payment_method,
                    payment_status: o.payment_status,
                    customer_name: o.customer_name,
                    customer_phone: o.customer_phone,
                  };
                  return acc;
                },
                {} as typeof paymentMap,
              );
            }
          }

          baseOrders = (data || []).map((order) => {
            const items =
              (order.items as {
                name: string;
                quantity: number;
                price: number;
              }[]) || [];
            const subtotal = items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );

            let displaySource = order.source || "Unknown";
            if (displaySource.toLowerCase() === "qr") {
              displaySource = order.table_number
                ? `QSR-Table ${order.table_number} (QR)`
                : "QSR-QR Order";
            }

            const linkedPayment = order.order_id
              ? paymentMap[order.order_id]
              : null;

            const total =
              linkedPayment?.total !== undefined && linkedPayment?.total !== null
                ? Number(linkedPayment.total)
                : order.order_type === "nc"
                ? 0
                : subtotal;

            return {
              id: order.id,
              orderId: order.order_id,
              source: displaySource,
              items,
              status: order.status as ActiveKitchenOrder["status"],
              priority: order.priority as ActiveKitchenOrder["priority"],
              createdAt: order.created_at,
              total,
              itemCompletionStatus:
                (order.item_completion_status as boolean[]) || [],
              orderType: order.order_type as ActiveKitchenOrder["orderType"],
              paymentMethod: linkedPayment?.payment_method || undefined,
              paymentStatus: linkedPayment?.payment_status || undefined,
              customerName:
                linkedPayment?.customer_name || order.customer_name || undefined,
              customerPhone:
                linkedPayment?.customer_phone ||
                order.customer_phone ||
                undefined,
            };
          });

          serverFetchSucceeded = true;

          if (
            !enrichmentFailed &&
            dateFilter === "today" &&
            !searchQuery &&
            (statusFilter === "all" || statusFilter === "unpaid")
          ) {
            saveSnapshot(restaurantId, baseOrders, statusFilter);
          }
        } catch (err) {
          console.warn(
            "[useActiveKitchenOrders] Falling back to offline snapshot:",
            err,
          );
          const snap =
            dateFilter === "today"
              ? loadSnapshot(restaurantId, statusFilter)
              : null;
          if (snap !== null) {
            baseOrders = snap;
          } else {
            const fallbackLocals = await getLocalOrdersByRestaurant(restaurantId);
            if (fallbackLocals.length === 0) {
              throw err;
            }
            baseOrders = [];
          }
        }
      }

      // Merge locally queued offline orders (unsynced local mutations override snapshot/server)
      const localOrders = await getLocalOrdersByRestaurant(restaurantId);
      const mergedMap = new Map<string, ActiveKitchenOrder>();
      for (const ord of baseOrders) {
        mergedMap.set(ord.id, ord);
      }
      for (const lo of localOrders) {
        if (lo.synced === true) {
          continue;
        }
        if (lo.status === "deleted") {
          mergedMap.delete(lo.id);
        } else if (lo.status === "completed") {
          if (statusFilter === "unpaid") {
            mergedMap.set(lo.id, mapLocalToActiveOrder(lo));
          } else {
            mergedMap.delete(lo.id);
          }
        } else {
          mergedMap.set(lo.id, mapLocalToActiveOrder(lo));
        }
      }

      const startMs = new Date(start).getTime();
      const endMs = new Date(end).getTime();

      return Array.from(mergedMap.values())
        .filter((order) => {
          const createdMs = new Date(order.createdAt).getTime();
          if (createdMs < startMs || createdMs > endMs) return false;

          if (statusFilter === "unpaid") {
            return (
              order.paymentMethod === "pay_later" ||
              order.paymentStatus === "pending"
            );
          }
          if (statusFilter !== "all") {
            return order.status === statusFilter;
          }
          return ["new", "preparing", "ready", "held"].includes(order.status);
        })
        .filter((order) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            order.source.toLowerCase().includes(query) ||
            order.items.some((item) => item.name.toLowerCase().includes(query))
          );
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 5,
    gcTime: 1000 * 60 * 5,
  });

  // Real-time subscription + local offline order listener
  useEffect(() => {
    if (!restaurantId) return;

    const handleLocalOrdersChange = () => {
      queryClient.invalidateQueries({
        queryKey: ["active-kitchen-orders"],
      });
    };
    window.addEventListener(LOCAL_ORDERS_EVENT, handleLocalOrdersChange);

    const channel = supabase
      .channel(`active-kitchen-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kitchen_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: any) => {
          queryClient.invalidateQueries({
            queryKey: ["active-kitchen-orders", restaurantId],
          });

          if (
            payload.eventType === "UPDATE" &&
            payload.new &&
            payload.old &&
            payload.new.status === "ready" &&
            payload.old.status !== "ready"
          ) {
            playReadyChimeRef.current();
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          queryClient.invalidateQueries({
            queryKey: ["active-kitchen-orders"],
          });
        }
      });

    return () => {
      window.removeEventListener(LOCAL_ORDERS_EVENT, handleLocalOrdersChange);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, queryClient]);

  const fallbackLocksRef = useRef(new Map<string, Promise<void>>());
  const runOrderLocked = <T,>(
    orderId: string,
    fn: () => Promise<T>,
  ): Promise<T> => {
    if (typeof withLocalOrderLock === "function") {
      return withLocalOrderLock(orderId, fn);
    }
    const prev = fallbackLocksRef.current.get(orderId) || Promise.resolve();
    const next = prev.then(fn, fn);
    const settled = next.then(
      () => undefined,
      () => undefined,
    );
    fallbackLocksRef.current.set(orderId, settled);
    return next;
  };

  const buildLocalMirror = async (
    orderId: string,
    patch:
      | Partial<OfflineQsrOrder>
      | ((existing: OfflineQsrOrder | undefined) => Partial<OfflineQsrOrder>),
  ): Promise<OfflineQsrOrder | null> => {
    const existing = await getLocalOrder(orderId);
    const fromList = orders.find((o) => o.id === orderId);
    if (existing) {
      if (existing.status === "deleted") return null;
      const resolvedPatch = typeof patch === "function" ? patch(existing) : patch;
      return {
        ...existing,
        ...(existing.synced === true && fromList
          ? {
              status: fromList.status as OfflineQsrOrder["status"],
              priority: (fromList.priority || "normal") as OfflineQsrOrder["priority"],
              items: fromList.items,
              itemCompletionStatus: fromList.itemCompletionStatus || existing.itemCompletionStatus,
              total: fromList.total,
            }
          : {}),
        ...resolvedPatch,
        syncFailed: false,
        synced: false,
        updatedAt: new Date().toISOString(),
      };
    }

    if (fromList && restaurantId) {
      const base: OfflineQsrOrder = {
        id: fromList.id,
        orderId: fromList.orderId || null,
        restaurant_id: restaurantId,
        source: fromList.source,
        orderType: (fromList.orderType || "dine_in") as OfflineQsrOrder["orderType"],
        status: fromList.status as OfflineQsrOrder["status"],
        priority: (fromList.priority || "normal") as OfflineQsrOrder["priority"],
        items: fromList.items,
        itemCompletionStatus: fromList.itemCompletionStatus || [],
        total: fromList.total,
        customerName: fromList.customerName,
        customerPhone: fromList.customerPhone,
        paymentMethod: fromList.paymentMethod,
        paymentStatus: fromList.paymentStatus,
        createdAt: fromList.createdAt,
        updatedAt: new Date().toISOString(),
        synced: false,
      };
      const nextPatch =
        typeof patch === "function" ? patch(base) : patch;
      return {
        ...base,
        ...nextPatch,
        syncFailed: false,
        synced: false,
      };
    }
    return null;
  };

  const commitMirrorAndEnqueue = async (
    orderId: string,
    patch:
      | Partial<OfflineQsrOrder>
      | ((existing: OfflineQsrOrder | undefined) => Partial<OfflineQsrOrder>),
    buildWrites: (
      mirror: OfflineQsrOrder | null,
    ) => Array<{
      type: QueuedWrite["type"];
      payload: Record<string, unknown>;
      operation?: QueuedWrite["operation"];
    }>,
  ) => {
    const mirror = await buildLocalMirror(orderId, patch);
    const writes = buildWrites(mirror);
    await commitLocalOrderAndWritesAtomic(mirror, writes);
    return mirror;
  };

  // Get order by ID for recall (H-22: don't serve stale synced local mirror; verify restaurantId)
  const getOrderById = async (
    orderId: string,
  ): Promise<ActiveKitchenOrder | null> => {
    const local = await getLocalOrder(orderId);
    const matchesRestaurant =
      !restaurantId || !local?.restaurant_id || local.restaurant_id === restaurantId;
    if (local && matchesRestaurant) {
      if (local.status === "deleted") return null;
      if (local.synced !== true) return mapLocalToActiveOrder(local);
    }

    if (isOfflineNow()) {
      const fromList = orders.find((o) => o.id === orderId);
      if (fromList) return fromList;
      return local && matchesRestaurant && local.status !== "deleted"
        ? mapLocalToActiveOrder(local)
        : null;
    }

    const { data, error } = await supabase
      .from("kitchen_orders")
      .select("*, orders:order_id(payment_method, payment_status, customer_name, customer_phone)")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !data) return null;

    const items =
      (data.items as { name: string; quantity: number; price: number }[]) || [];
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const linked = (data as any).orders;

    return {
      id: data.id,
      orderId: data.order_id,
      source: data.source || "Unknown",
      items,
      status: data.status as ActiveKitchenOrder["status"],
      priority: data.priority as ActiveKitchenOrder["priority"],
      createdAt: data.created_at,
      total,
      itemCompletionStatus: (data.item_completion_status as boolean[]) || [],
      orderType: data.order_type as ActiveKitchenOrder["orderType"],
      paymentMethod: linked?.payment_method || undefined,
      paymentStatus: linked?.payment_status || undefined,
      customerName: linked?.customer_name || data.customer_name || undefined,
      customerPhone: linked?.customer_phone || data.customer_phone || undefined,
    };
  };

  // Toggle item completion status (strikethrough)
  const toggleItemCompletion = async (
    orderId: string,
    itemIndex: number,
    currentStatus: boolean[] = [],
  ): Promise<boolean> => {
    const buildNextCompletionStatus = (base: boolean[]) => {
      const next = [...base];
      while (next.length <= itemIndex) {
        next.push(false);
      }
      next[itemIndex] = !next[itemIndex];
      return next;
    };

    const localExisting = await getLocalOrder(orderId);
    if (isOfflineNow() || localExisting) {
      try {
        await commitMirrorAndEnqueue(
          orderId,
          (existing) => {
            // H-23: Empty array [] is a valid persisted state; only fall back when undefined
            const baseStatus = Array.isArray(existing?.itemCompletionStatus)
              ? existing.itemCompletionStatus
              : currentStatus;
            return {
              itemCompletionStatus: buildNextCompletionStatus(baseStatus),
            };
          },
          (mirror) => {
            const nextStatus =
              mirror?.itemCompletionStatus ||
              buildNextCompletionStatus(currentStatus);
            return [
              {
                type: "kitchen_order",
                payload: { id: orderId, item_completion_status: nextStatus },
                operation: "update",
              },
            ];
          },
        );
        queryClient.invalidateQueries({
          queryKey: ["active-kitchen-orders", restaurantId],
        });
        queryClient.invalidateQueries({
          queryKey: ["qsr-tables", restaurantId],
        });
        return true;
      } catch (error) {
        console.error("Error queuing item completion:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save item status offline. Changes rolled back.",
        });
        return false;
      }
    }

    try {
      const newCompletionStatus = buildNextCompletionStatus(currentStatus);
      const { error } = await supabase
        .from("kitchen_orders")
        .update({ item_completion_status: newCompletionStatus })
        .eq("id", orderId);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["active-kitchen-orders", restaurantId],
      });

      return true;
    } catch (error) {
      console.error("Error toggling item completion:", error);
      return false;
    }
  };

  // Update order items array (for drag and drop reordering or quantity/price updates)
  const updateOrderItems = async (
    orderId: string,
    newItems: any[],
    newCompletionStatus?: boolean[],
  ) => {
    const payload: any = { items: newItems };
    if (newCompletionStatus) {
      payload.item_completion_status = newCompletionStatus;
    }
    const newItemsSubtotal = (newItems || []).reduce(
      (sum, item) =>
        sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
      0,
    );

    const localExisting = await getLocalOrder(orderId);
    if (isOfflineNow() || localExisting) {
      try {
        await commitMirrorAndEnqueue(
          orderId,
          (existing) => {
            const prevItems =
              existing?.items || orders.find((o) => o.id === orderId)?.items || [];
            const prevSubtotal = prevItems.reduce(
              (sum, item) =>
                sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
              0,
            );
            const subtotalChanged =
              Math.abs(newItemsSubtotal - prevSubtotal) > 0.001;
            const isNC =
              existing?.orderType === "nc" || existing?.paymentStatus === "nc";
            return {
              items: newItems,
              ...(subtotalChanged && {
                subtotal: newItemsSubtotal,
                total: isNC ? 0 : newItemsSubtotal,
              }),
              ...(newCompletionStatus && {
                itemCompletionStatus: newCompletionStatus,
              }),
            };
          },
          () => [
            {
              type: "kitchen_order",
              payload: { id: orderId, ...payload },
              operation: "update",
            },
          ],
        );
        queryClient.invalidateQueries({
          queryKey: ["active-kitchen-orders", restaurantId],
        });
        return true;
      } catch (error) {
        console.error("Error queueing order items update:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to queue item updates offline. Changes rolled back.",
        });
        return false;
      }
    }

    try {
      const { error } = await supabase
        .from("kitchen_orders")
        .update(payload)
        .eq("id", orderId);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["active-kitchen-orders", restaurantId],
      });
      return true;
    } catch (error) {
      console.error("Error updating order items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update items order.",
      });
      return false;
    }
  };

  // Update order priority
  const handlePriorityChange = async (
    orderId: string,
    priority: "normal" | "rush" | "vip",
  ) => {
    const localExisting = await getLocalOrder(orderId);
    if (isOfflineNow() || localExisting) {
      try {
        await commitMirrorAndEnqueue(
          orderId,
          { priority },
          (mirror) => {
            const linkedOrderId =
              mirror?.orderId || orders.find((o) => o.id === orderId)?.orderId;
            return [
              {
                type: "kitchen_order",
                payload: { id: orderId, priority },
                operation: "update",
              },
              {
                type: "order",
                payload: {
                  id: linkedOrderId || orderId,
                  ...(!linkedOrderId && {
                    _resolveOrderIdFromKitchenOrderId: orderId,
                  }),
                  priority,
                },
                operation: "update",
              },
            ];
          },
        );
        toast({
          title: "Priority Updated (Offline)",
          description: `Order priority set to ${priority.toUpperCase()} — will sync when online`,
        });
        await refetch();
        return;
      } catch (error) {
        console.error("Error queuing priority update:", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not queue priority update offline.",
        });
        throw error;
      }
    }

    try {
      const { data: existingKitchen } = await supabase
        .from("kitchen_orders")
        .select("order_id")
        .eq("id", orderId)
        .maybeSingle();

      const { error } = await supabase
        .from("kitchen_orders")
        .update({ priority })
        .eq("id", orderId);

      if (error) throw error;

      if (existingKitchen?.order_id) {
        const { error: orderPriorityErr } = await supabase
          .from("orders")
          .update({ priority, updated_at: new Date().toISOString() })
          .eq("id", existingKitchen.order_id);
        if (orderPriorityErr) throw orderPriorityErr;
      }

      toast({
        title: "Priority Updated",
        description: `Order priority changed to ${priority.toUpperCase()}`,
      });

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
    } catch (error) {
      console.error("Error updating priority:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update order priority",
      });
      throw error;
    }
  };

  // Update order status
  const handleStatusChange = async (
    orderId: string,
    status: ActiveKitchenOrder["status"],
  ) => {
    const updateData: any = { status };
    if (status === "completed") {
      updateData.bumped_at = new Date().toISOString();
    }

    let orderStatus = "pending";
    if (status === "preparing") orderStatus = "preparing";
    if (status === "ready") orderStatus = "ready";
    if (status === "completed") orderStatus = "completed";

    const localExisting = await getLocalOrder(orderId);
    if (isOfflineNow() || localExisting) {
      try {
        await commitMirrorAndEnqueue(
          orderId,
          {
            status,
            ...(status === "completed" && { completedAt: updateData.bumped_at }),
          },
          (mirror) => {
            const linkedOrderId =
              mirror?.orderId || orders.find((o) => o.id === orderId)?.orderId;
            return [
              {
                type: "kitchen_order",
                payload: { id: orderId, ...updateData },
                operation: "update",
              },
              {
                type: "order",
                payload: {
                  id: linkedOrderId || orderId,
                  ...(!linkedOrderId && {
                    _resolveOrderIdFromKitchenOrderId: orderId,
                  }),
                  status: orderStatus,
                },
                operation: "update",
              },
            ];
          },
        );
        toast({
          title: "Status Updated (Offline)",
          description: `Order marked as ${status} — will sync when online`,
        });
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["qsr-tables"] });
        queryClient.invalidateQueries({ queryKey: ["past-orders"] });
        return;
      } catch (error) {
        console.error("Error queuing status update:", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not queue status update offline. Changes rolled back.",
        });
        throw error;
      }
    }

    try {
      const { data: existingKitchen } = await supabase
        .from("kitchen_orders")
        .select("order_id")
        .eq("id", orderId)
        .maybeSingle();

      const { error } = await supabase
        .from("kitchen_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      if (existingKitchen?.order_id) {
        await supabase
          .from("orders")
          .update({ status: orderStatus, updated_at: new Date().toISOString() })
          .eq("id", existingKitchen.order_id);
      }

      toast({
        title: "Status Updated",
        description: `Order marked as ${status}`,
      });

      await refetch();
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["qsr-tables"] });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update order status",
      });
      throw error;
    }
  };

  return {
    orders,
    isLoading,
    refetch,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    getOrderById,
    toggleItemCompletion,
    handlePriorityChange,
    handleStatusChange,
    updateOrderItems,
  };
};
