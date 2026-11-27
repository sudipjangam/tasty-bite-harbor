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
  Wallet,
  Plus,
  UtensilsCrossed,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useKitchenSounds } from "@/hooks/useKitchenSounds";
import {
  formatOrderItemString,
  sanitizeOrderItemDisplay,
} from "@/lib/order-utils";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { startOfDay, endOfDay } from "date-fns";
import { QSPaymentSheet } from "./QSPaymentSheet";
import {
  commitLocalOrderAndWritesAtomic,
  deleteLocalOrder,
  getDB,
  getLocalOrder,
  getLocalOrdersByRestaurant,
  LOCAL_ORDERS_EVENT,
  OfflineQsrOrder,
  saveLocalOrder,
  SYNC_COMPLETED_EVENT,
} from "@/utils/offlineDB";
import { enqueueWrite, removeQueuedWritesForOrder } from "@/utils/syncManager";

export interface ActiveOrder {
  id: string;
  order_number: number | null;
  customer_name: string;
  customer_phone: string | null;
  items: string[];
  total: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  item_completion_status: boolean[] | null;
  created_at: string;
  source: string | null;
  paidAmount?: number;
  isOfflinePending?: boolean;
}

interface QSActiveOrdersProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems?: (order: ActiveOrder) => void;
}

type StatusFilter =
  | "all"
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "unpaid";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType; bg: string }
> = {
  pending: {
    label: "New",
    color: "text-indigo-600 dark:text-indigo-400",
    icon: Clock,
    bg: "bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-700",
  },
  preparing: {
    label: "Preparing",
    color: "text-orange-600 dark:text-orange-400",
    icon: ChefHat,
    bg: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 border-orange-200 dark:border-orange-700",
  },
  ready: {
    label: "Ready",
    color: "text-emerald-600 dark:text-emerald-400",
    icon: Bell,
    bg: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20 border-emerald-200 dark:border-emerald-700",
  },
  served: {
    label: "Served",
    color: "text-emerald-600 dark:text-emerald-400",
    icon: UtensilsCrossed,
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700",
  },
  completed: {
    label: "Done",
    color: "text-blue-600 dark:text-blue-400",
    icon: CheckCircle2,
    bg: "bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-900/30 dark:to-sky-900/20 border-blue-200 dark:border-blue-700",
  },
};

// Parse "2x Veg Manchurian (extra spicy) @150" into structured items without losing notes
function parseOrderItem(itemStr: string) {
  const match = String(itemStr).match(/^(\d+)x\s+([\s\S]+?)\s+@(\d+(?:\.\d+)?)$/);
  if (match) {
    const rawName = sanitizeOrderItemDisplay(match[2]);
    return {
      quantity: parseInt(match[1], 10),
      name: rawName,
      price: parseFloat(match[3]),
    };
  }
  return { quantity: 1, name: String(itemStr), price: 0 };
}

function splitItemNameAndNote(displayName: string): {
  cleanName: string;
  notes?: string[];
} {
  const noteMatch = displayName.match(/^(.*?)\s*\(([^()]+)\)$/);
  if (noteMatch && noteMatch[1].trim()) {
    return {
      cleanName: noteMatch[1].trim(),
      notes: [noteMatch[2].trim()],
    };
  }
  return { cleanName: displayName };
}

export const QSActiveOrders: React.FC<QSActiveOrdersProps> = ({
  isOpen,
  onClose,
  onAddItems,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { isAudioEnabled: soundEnabled, enableAudio, disableAudio, playReadyChime } = useKitchenSounds();
  const playReadyChimeRef = useRef(playReadyChime);
  playReadyChimeRef.current = playReadyChime;
  const { restaurantId } = useRestaurantId();
  const { isOnline } = useNetworkStatus();
  const { symbol: currencySymbol } = useCurrencyContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkoutOrder, setCheckoutOrder] = useState<ActiveOrder | null>(null);
  const mirrorLocksRef = useRef(new Map<string, Promise<void>>());

  const runOrderLocked = useCallback(
    async <T,>(lockKey: string, fn: () => Promise<T>): Promise<T> => {
      const prev = mirrorLocksRef.current.get(lockKey) || Promise.resolve();
      const next = prev.then(fn, fn);
      const settled = next.then(
        () => undefined,
        () => undefined,
      );
      mirrorLocksRef.current.set(lockKey, settled);
      return next;
    },
    [],
  );

  const isOfflineNow = useCallback(
    () => !isOnline || (typeof navigator !== "undefined" && !navigator.onLine),
    [isOnline],
  );

  // Fetch active orders with offline snapshot + localOrders fallback
  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["qs-active-orders", restaurantId],
    networkMode: "always",
    queryFn: async () => {
      if (!restaurantId) return [];
      const today = new Date();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);
      const dayStartMs = dayStart.getTime();
      const dayEndMs = dayEnd.getTime();
      const cacheKey = `qs_active_orders_snapshot_${restaurantId}`;

      const readLocalSnapshot = async (): Promise<{
        localOrders: OfflineQsrOrder[];
        queuedPaymentTsById: Map<string, number>;
      }> => {
        let localOrders: OfflineQsrOrder[] = [];
        const queuedPaymentTsById = new Map<string, number>();
        try {
          const db = await getDB();
          const tx = db.transaction(["localOrders", "writeQueue"], "readonly");
          const [rawLocalOrders, queuedWrites] = await Promise.all([
            tx.objectStore("localOrders").getAll(),
            tx.objectStore("writeQueue").getAll(),
          ]);
          localOrders = (rawLocalOrders as OfflineQsrOrder[]).filter((lo) => {
            if (lo.restaurant_id !== restaurantId) return false;
            const src = (lo.source || "").toLowerCase();
            if (src && src !== "quickserve" && src !== "pos") return false;
            const ts = new Date(lo.createdAt).getTime();
            return ts >= dayStartMs && ts <= dayEndMs;
          });
          for (const w of queuedWrites) {
            const p = w.payload || {};
            const isPaymentWrite =
              w.type === "pos_transaction" ||
              (w.type === "order" &&
                (p.payment_status !== undefined || p.payment_method !== undefined));
            if (isPaymentWrite) {
              const ts = typeof w.timestamp === "number" ? w.timestamp : 0;
              if (typeof p.order_id === "string") {
                queuedPaymentTsById.set(
                  p.order_id,
                  Math.max(queuedPaymentTsById.get(p.order_id) ?? 0, ts),
                );
              }
              if (typeof p.id === "string") {
                queuedPaymentTsById.set(
                  p.id,
                  Math.max(queuedPaymentTsById.get(p.id) ?? 0, ts),
                );
              }
            }
          }
        } catch {
          try {
            localOrders = (await getLocalOrdersByRestaurant(restaurantId)).filter(
              (lo) => {
                const src = (lo.source || "").toLowerCase();
                if (src && src !== "quickserve" && src !== "pos") return false;
                const ts = new Date(lo.createdAt).getTime();
                return ts >= dayStartMs && ts <= dayEndMs;
              },
            );
          } catch {
            localOrders = [];
          }
        }
        return { localOrders, queuedPaymentTsById };
      };

      const mapLocalToActiveOrder = (lo: OfflineQsrOrder): ActiveOrder => ({
        id: lo.orderId || lo.id,
        order_number: lo.orderNumber ?? null,
        customer_name: lo.customerName || "Walk-in Customer",
        customer_phone: lo.customerPhone || null,
        items:
          lo.formattedItems ||
          (lo.items || []).map((i) =>
            formatOrderItemString(
              i.quantity,
              i.name,
              i.price,
              Array.isArray(i.notes) ? i.notes.join(", ") : i.notes,
            ),
          ),
        total: lo.total,
        status: lo.status === "held" || lo.status === "new" ? "pending" : lo.status,
        payment_status: lo.paymentStatus || "pending",
        payment_method: lo.paymentMethod || null,
        item_completion_status: lo.itemCompletionStatus || null,
        created_at: lo.createdAt,
        source: lo.source || "quickserve",
        ...(typeof lo.paidAmount === "number" && { paidAmount: lo.paidAmount }),
        isOfflinePending: !lo.synced,
      });

      const loadSnapshot = (): ActiveOrder[] => {
        try {
          const raw = localStorage.getItem(cacheKey);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      };

      const mergeOrders = (
        baseRows: ActiveOrder[],
        localOrders: OfflineQsrOrder[],
        queuedPaymentTsById: Map<string, number>,
        serverSucceeded = false,
      ): ActiveOrder[] => {
        const merged = new Map<string, ActiveOrder>();
        for (const r of baseRows) {
          const rTs = new Date(r.created_at).getTime();
          if (rTs < dayStartMs || rTs > dayEndMs) continue;
          merged.set(r.id, r);
        }
        for (const lo of localOrders) {
          const targetId = lo.orderId || lo.id;
          if (lo.status === "deleted") {
            if (!serverSucceeded || !lo.synced) {
              merged.delete(targetId);
              merged.delete(lo.id);
            }
            continue;
          }
          if (serverSucceeded && lo.synced === true) {
            continue;
          }
          const mapped = mapLocalToActiveOrder(lo);
          const existing = merged.get(mapped.id);
          if (!existing) {
            merged.set(mapped.id, mapped);
            continue;
          }
          const existingTs = (existing as any).updated_at
            ? new Date((existing as any).updated_at).getTime()
            : 0;
          const localTs = lo.updatedAt ? new Date(lo.updatedAt).getTime() : 0;
          if (existingTs > localTs && lo.synced) {
            continue;
          }
          const queuedPaymentTs = Math.max(
            queuedPaymentTsById.get(mapped.id) ?? 0,
            lo.id ? (queuedPaymentTsById.get(lo.id) ?? 0) : 0,
          );
          const hasQueuedPayment =
            queuedPaymentTsById.has(mapped.id) ||
            (Boolean(lo.id) && queuedPaymentTsById.has(lo.id));
          const localPaymentTs = Math.max(queuedPaymentTs, localTs);
          const serverPaymentNewer =
            Boolean(existing.payment_status) &&
            existing.payment_status !== "pending" &&
            (!hasQueuedPayment || (existingTs > 0 && existingTs > localPaymentTs));
          merged.set(mapped.id, {
            ...existing,
            ...mapped,
            ...(serverPaymentNewer
              ? {
                  payment_status: existing.payment_status,
                  payment_method: existing.payment_method,
                }
              : {}),
          });
        }
        return Array.from(merged.values()).sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      };

      if (isOfflineNow()) {
        const snap = await readLocalSnapshot();
        return mergeOrders(loadSnapshot(), snap.localOrders, snap.queuedPaymentTsById, false);
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, order_number, customer_name, customer_phone, items, total, status, payment_status, payment_method, item_completion_status, created_at, updated_at, source",
          )
          .eq("restaurant_id", restaurantId)
          .in("source", ["quickserve", "pos"])
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString())
          .in("status", ["pending", "preparing", "ready", "served", "completed"])
          .order("created_at", { ascending: false });

        if (error) throw error;
        const rows = (data || []) as ActiveOrder[];
        try {
          localStorage.setItem(cacheKey, JSON.stringify(rows));
        } catch {
          /* ignore storage quota */
        }
        const snap = await readLocalSnapshot();
        return mergeOrders(rows, snap.localOrders, snap.queuedPaymentTsById, true);
      } catch (err) {
        const snapRows = loadSnapshot();
        const localSnap = await readLocalSnapshot();
        if (snapRows.length > 0 || localSnap.localOrders.some((lo) => lo.status !== "deleted")) {
          return mergeOrders(snapRows, localSnap.localOrders, localSnap.queuedPaymentTsById, false);
        }
        throw err;
      }
    },
    enabled: !!restaurantId && isOpen,
    refetchInterval: 60000, // Fallback refresh every 60s (Realtime handles instant updates)
  });

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "unpaid" && order.payment_status !== "pending") return false;
    if (statusFilter === "pending" && order.status !== "pending") return false;
    if (statusFilter === "preparing" && order.status !== "preparing") return false;
    if (statusFilter === "ready" && order.status !== "ready") return false;
    if (statusFilter === "served" && order.status !== "served") return false;
    if (statusFilter === "completed" && order.status !== "completed") return false;
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
  const newCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const servedCount = orders.filter((o) => o.status === "served").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const unpaidCount = orders.filter((o) => o.payment_status === "pending").length;
  const unpaidTotal = orders
    .filter((o) => o.payment_status === "pending")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Real-time subscription + local offline change listener
  useEffect(() => {
    if (!restaurantId || !isOpen) return;

    // M-21: Coalesce burst realtime query invalidations within a 300ms window
    let coalesceTimer: ReturnType<typeof setTimeout> | null = null;
    const invalidateOrderQueries = () => {
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });
    };
    const scheduleCoalescedInvalidate = () => {
      if (coalesceTimer) return;
      coalesceTimer = setTimeout(() => {
        coalesceTimer = null;
        invalidateOrderQueries();
      }, 300);
    };

    const handleLocalRefresh = () => {
      invalidateOrderQueries();
    };
    window.addEventListener(LOCAL_ORDERS_EVENT, handleLocalRefresh);
    window.addEventListener(SYNC_COMPLETED_EVENT, handleLocalRefresh);

    const channel = supabase
      .channel(`qs-active-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: any) => {
          scheduleCoalescedInvalidate();

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
          invalidateOrderQueries();
        }
      });

    return () => {
      if (coalesceTimer) clearTimeout(coalesceTimer);
      window.removeEventListener(LOCAL_ORDERS_EVENT, handleLocalRefresh);
      window.removeEventListener(SYNC_COMPLETED_EVENT, handleLocalRefresh);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, isOpen, queryClient]);

  // Resolve local mirror by either mirror key (`id`) or linked `orderId`
  const findLocalMirror = useCallback(
    async (id: string): Promise<OfflineQsrOrder | undefined> => {
      const direct = await getLocalOrder(id);
      if (direct) return direct;
      if (!restaurantId) return undefined;
      const all = await getLocalOrdersByRestaurant(restaurantId);
      return all.find((lo) => lo.id === id || lo.orderId === id);
    },
    [restaurantId],
  );

  const upsertQuickServeLocalMirror = async (
    orderId: string,
    patch: Partial<OfflineQsrOrder>,
  ): Promise<{ mirror: OfflineQsrOrder; prevMirror: OfflineQsrOrder | undefined } | null> => {
    if (!restaurantId) return null;
    const existing = await findLocalMirror(orderId);
    if (existing) {
      if (existing.status === "deleted") return null;
      const updated: OfflineQsrOrder = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
        synced: false,
        syncFailed: false,
      };
      await saveLocalOrder(updated);
      return { mirror: updated, prevMirror: existing };
    }
    const fromList = orders.find((o) => o.id === orderId);
    if (!fromList) return null;
    const created: OfflineQsrOrder = {
      id: fromList.id,
      orderId: fromList.id,
      restaurant_id: restaurantId,
      source: fromList.source || "quickserve",
      orderType: "takeaway",
      status: (fromList.status === "pending"
        ? "new"
        : fromList.status) as OfflineQsrOrder["status"],
      priority: "normal",
      orderNumber: fromList.order_number ?? null,
      items: fromList.items.map((itemStr) => {
        const parsed = parseOrderItem(itemStr);
        const { cleanName, notes } = splitItemNameAndNote(parsed.name);
        return {
          name: cleanName,
          quantity: parsed.quantity,
          price: parsed.price,
          ...(notes && { notes }),
        };
      }),
      formattedItems: fromList.items,
      itemCompletionStatus: fromList.item_completion_status || [],
      total: fromList.total,
      customerName: fromList.customer_name,
      customerPhone: fromList.customer_phone || undefined,
      paymentMethod: fromList.payment_method || undefined,
      paymentStatus: fromList.payment_status || undefined,
      createdAt: fromList.created_at,
      updatedAt: new Date().toISOString(),
      synced: false,
      ...patch,
    };
    await saveLocalOrder(created);
    return { mirror: created, prevMirror: undefined };
  };

  // Toggle item completion (supports offline queue fallback)
  const toggleItemMutation = useMutation({
    networkMode: "always",
    mutationFn: async ({
      orderId,
      itemIndex,
      currentStatus,
    }: {
      orderId: string;
      itemIndex: number;
      currentStatus: boolean[];
    }) => {
      const localExisting = await findLocalMirror(orderId);

      if (isOfflineNow() || localExisting) {
        return runOrderLocked(orderId, async () => {
          const latest = await findLocalMirror(orderId);
          const baseStatus =
            latest &&
            latest.synced !== true &&
            latest.itemCompletionStatus &&
            latest.itemCompletionStatus.length > 0
              ? latest.itemCompletionStatus
              : currentStatus;
          const newStatus = [...baseStatus];
          const fullCount = Math.max(
            newStatus.length,
            latest?.items?.length || 0,
            itemIndex + 1,
          );
          while (newStatus.length < fullCount) newStatus.push(false);
          newStatus[itemIndex] = !newStatus[itemIndex];
          const allDone = newStatus.every((s) => s === true);

          const res = await upsertQuickServeLocalMirror(orderId, {
            itemCompletionStatus: newStatus,
            ...(allDone ? { status: "served" } : {}),
          });
          if (!res) throw new Error("Unable to update local order mirror");
          const targetOrderId = res.mirror.orderId || latest?.orderId || orderId;
          const kitchenKey = res.mirror.id || latest?.id;
          const hasDistinctKitchenKey = Boolean(kitchenKey && kitchenKey !== targetOrderId);
          await commitLocalOrderAndWritesAtomic(res.mirror, [
            {
              type: "order",
              operation: "update",
              payload: {
                id: targetOrderId,
                item_completion_status: newStatus,
                ...(allDone ? { status: "served" } : {}),
              },
            },
            {
              type: "kitchen_order",
              operation: "update",
              payload: {
                ...(hasDistinctKitchenKey
                  ? { id: kitchenKey }
                  : { _updateByOrderId: targetOrderId }),
                item_completion_status: newStatus,
                ...(allDone
                  ? { status: "served", bumped_at: new Date().toISOString() }
                  : {}),
              },
            },
          ]);
          return { allDone, orderId };
        });
      }

      const newStatus = [...currentStatus];
      newStatus[itemIndex] = !newStatus[itemIndex];

      // Auto-set order to "served" when all items are done (NOT "completed")
      // "completed" only happens when bill is paid
      const allDone = newStatus.every((s) => s === true);

      const { error } = await supabase
        .from("orders")
        .update({
          item_completion_status: newStatus,
          ...(allDone ? { status: "served" } : {}),
        })
        .eq("id", orderId);

      if (error) throw error;

      // Keep the linked KDS ticket aligned with front-of-house item checks.
      if (allDone) {
        await supabase
          .from("kitchen_orders")
          .update({
            item_completion_status: newStatus,
            status: "served",
            bumped_at: new Date().toISOString(),
          })
          .eq("order_id", orderId);
      } else {
        await supabase
          .from("kitchen_orders")
          .update({ item_completion_status: newStatus })
          .eq("order_id", orderId);
      }

      return { allDone, orderId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({
        queryKey: ["quickserve-todays-revenue"],
      });

      if (result.allDone && soundEnabled) {
        playReadyChime();
      }
    },
    onError: () => {
      toast({
        title: "Failed to update item",
        description: "Could not save item status change. Please retry.",
        variant: "destructive",
      });
    },
  });

  // Change order status (supports offline queue fallback)
  const changeStatusMutation = useMutation({
    networkMode: "always",
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: string;
    }) => {
      const localExisting = await findLocalMirror(orderId);
      if (isOfflineNow() || localExisting) {
        return runOrderLocked(orderId, async () => {
          const latest = await findLocalMirror(orderId);
          const nowIso = new Date().toISOString();
          const res = await upsertQuickServeLocalMirror(orderId, {
            status: newStatus as OfflineQsrOrder["status"],
            ...(newStatus === "completed" ? { completedAt: nowIso } : {}),
          });
          if (!res) throw new Error("Unable to update local order mirror");
          const targetOrderId = res.mirror.orderId || latest?.orderId || orderId;
          const kitchenKey = res.mirror.id || latest?.id;
          const hasDistinctKitchenKey = Boolean(kitchenKey && kitchenKey !== targetOrderId);
          const writes: Array<{
            type: "order" | "kitchen_order";
            operation: "update";
            payload: Record<string, unknown>;
          }> = [
            {
              type: "order",
              operation: "update",
              payload: { id: targetOrderId, status: newStatus },
            },
          ];
          if (newStatus === "completed") {
            writes.push({
              type: "kitchen_order",
              operation: "update",
              payload: {
                ...(hasDistinctKitchenKey
                  ? { id: kitchenKey }
                  : { _updateByOrderId: targetOrderId }),
                status: "completed",
                bumped_at: nowIso,
              },
            });
          }
          await commitLocalOrderAndWritesAtomic(res.mirror, writes);
          return { newStatus, offline: isOfflineNow() };
        });
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      // Also bump linked kitchen tickets out of the live KDS when completing.
      if (newStatus === "completed") {
        const { error: koErr } = await supabase
          .from("kitchen_orders")
          .update({
            status: "completed",
            bumped_at: new Date().toISOString(),
          })
          .eq("order_id", orderId);
        if (koErr) throw koErr;
      }

      return { newStatus, offline: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
      queryClient.invalidateQueries({
        queryKey: ["quickserve-todays-revenue"],
      });
      toast({
        title: result.offline
          ? "Order updated locally — will sync when online"
          : result.newStatus === "completed"
            ? "Order Completed ✓"
            : `Order → ${result.newStatus}`,
        duration: 1500,
      });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
      toast({
        title: "Failed to update order",
        description: "Could not persist order status update. Please retry.",
        variant: "destructive",
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
    },
    [changeStatusMutation],
  );



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
                {newCount} new, {preparingCount} preparing, {readyCount} ready
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => soundEnabled ? disableAudio() : enableAudio()}
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
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "preparing", "ready", "served", "unpaid", "completed"] as StatusFilter[]).map(
              (sf) => (
                <button
                  key={sf}
                  onClick={() => setStatusFilter(sf)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    statusFilter === sf
                      ? sf === "unpaid"
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md"
                        : sf === "served"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                          : "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
                  )}
                >
                  {sf === "all"
                    ? `All (${orders.length})`
                    : sf === "pending"
                      ? `New (${newCount})`
                    : sf === "preparing"
                      ? `🔥 Preparing (${preparingCount})`
                      : sf === "ready"
                        ? `Ready (${readyCount})`
                      : sf === "served"
                        ? `🍽️ Served (${servedCount})`
                      : sf === "unpaid"
                        ? `💰 Unpaid (${unpaidCount})`
                        : `✓ Done (${completedCount})`}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Orders Grid */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {statusFilter === "unpaid" && unpaidTotal > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/10 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 animate-pulse">Total Outstanding Book</h4>
                  <p className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{currencySymbol}{unpaidTotal.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            )}

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
                            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate max-w-[200px]">
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
                          {order.isOfflinePending && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              <WifiOff className="w-2.5 h-2.5" />
                              Pending Sync
                            </span>
                          )}
                          <StatusIcon className={cn("w-4 h-4", config.color)} />
                          <span
                            className={cn(
                              "text-xs font-bold uppercase",
                              config.color,
                            )}
                          >
                            {config.label}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {totalItems > 0 && order.status !== "completed" && order.status !== "served" && (
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
                      <div className="px-3 pb-3 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800/60 mt-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            {currencySymbol}
                            {order.total.toFixed(0)}
                          </p>
                          {order.payment_status === "pending" && (
                            order.payment_method === "pay_later" ? (
                              <span className="inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-700/50 animate-pulse">
                                <Clock className="w-3 h-3" />
                                Pay Later
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700/50">
                                <Wallet className="w-3 h-3" />
                                Unpaid
                              </span>
                            )
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-1.5 max-w-[70%] sm:max-w-none">
                          {/* Add Items to existing order — visible for all non-completed */}
                          {order.status !== "completed" && onAddItems && (
                            <Button
                              size="sm"
                              onClick={() => {
                                if (order.payment_status === "paid") {
                                  const ok = window.confirm(
                                    "This order is already PAID. Adding items will require collecting an additional payment for the new items. Do you want to proceed?"
                                  );
                                  if (!ok) return;
                                }
                                onAddItems(order);
                              }}
                              className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-[11px] sm:text-xs font-bold rounded-lg px-2 sm:px-2.5 h-8 sm:h-7"
                            >
                              <Plus className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1 shrink-0" />
                              <span className="whitespace-nowrap">Add</span>
                            </Button>
                          )}
                          {/* Collect Payment for unpaid orders */}
                          {order.payment_status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => setCheckoutOrder(order)}
                              className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white text-[11px] sm:text-xs font-bold rounded-lg px-2 sm:px-2.5 h-8 sm:h-7"
                            >
                              <Wallet className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1 shrink-0" />
                              <span className="whitespace-nowrap">Pay</span>
                            </Button>
                          )}
                          {/* Done button — only for non-completed, non-served orders OR served+paid */}
                          {order.status !== "completed" && order.status !== "served" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusChange(order.id, "completed")
                              }
                              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-[11px] sm:text-xs font-bold rounded-lg px-2 sm:px-2.5 h-8 sm:h-7"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1 shrink-0" />
                              <span className="whitespace-nowrap">Done</span>
                            </Button>
                          )}
                          {/* Served orders that are paid — show Done to finalize */}
                          {order.status === "served" && order.payment_status === "paid" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusChange(order.id, "completed")
                              }
                              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-[11px] sm:text-xs font-bold rounded-lg px-2 sm:px-2.5 h-8 sm:h-7"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 mr-1 shrink-0" />
                              <span className="whitespace-nowrap">Done</span>
                            </Button>
                          )}
                          {order.status === "completed" && order.payment_status !== "pending" && (
                            <span className="text-xs font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1 w-full sm:w-auto justify-center">
                              <CheckCircle2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Payment Modal for Pending Orders */}
      {checkoutOrder && (
        <QSPaymentSheet
          isOpen={!!checkoutOrder}
          onClose={() => setCheckoutOrder(null)}
          items={checkoutOrder.items.map((itemStr, idx) => {
            const parsed = parseOrderItem(itemStr);
            const { cleanName, notes } = splitItemNameAndNote(parsed.name);
            return {
              id: `existing-item-${idx}`,
              menuItemId: `existing-menu-item-${idx}`,
              name: cleanName,
              price: parsed.price,
              quantity: parsed.quantity,
              ...(notes && { notes: notes.join(", ") }),
            };
          })}
          customerName={checkoutOrder.customer_name || ""}
          customerPhone={checkoutOrder.customer_phone || ""}
          existingOrder={{
            id: checkoutOrder.id,
            total: checkoutOrder.total,
            orderNumber: checkoutOrder.order_number,
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["qs-active-orders"] });
            queryClient.invalidateQueries({ queryKey: ["quickserve-todays-revenue"] });
            queryClient.invalidateQueries({ queryKey: ["food-truck-today-stats"] });
            queryClient.invalidateQueries({ queryKey: ["quickserve-todays-count"] });
          }}
        />
      )}
    </>
  );
};
