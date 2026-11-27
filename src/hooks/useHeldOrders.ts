import { useState, useCallback, useEffect, useRef } from "react";
import { QSOrderItem } from "@/components/QuickServe/QSOrderPanel";
import { LoyaltyCustomerInfo } from "@/components/QuickServe/QSCustomerInput";
import { useRestaurantId } from "@/hooks/useRestaurantId";

export interface HeldOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  items: QSOrderItem[];
  heldAt: string; // ISO timestamp
  subtotal: number;
  loyaltyCustomer?: LoyaltyCustomerInfo | null;
  loyaltyPointsUsed?: number;
  loyaltyDiscountAmount?: number;
  discountAmount?: number;
  discountPercentage?: number;
  appliedCoupon?: any;
  couponDiscountAmount?: number;
}

const STORAGE_KEY_PREFIX = "qs-held-orders";

function getStorageKey(restaurantId?: string | null): string {
  return restaurantId ? `${STORAGE_KEY_PREFIX}_${restaurantId}` : STORAGE_KEY_PREFIX;
}

function loadHeldOrders(restaurantId?: string | null): HeldOrder[] {
  if (!restaurantId) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(restaurantId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHeldOrders(orders: HeldOrder[], restaurantId?: string | null) {
  if (!restaurantId) return;
  try {
    localStorage.setItem(getStorageKey(restaurantId), JSON.stringify(orders));
  } catch (err) {
    console.error("Failed to save held orders:", err);
  }
}

export function useHeldOrders() {
  const { restaurantId } = useRestaurantId();
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() =>
    loadHeldOrders(restaurantId),
  );
  // Track which restaurant owns the currently loaded heldOrders state to avoid switch-render overwrites
  const loadedRestaurantIdRef = useRef<string | null>(restaurantId ?? null);
  // BUG-05 fix: keep a ref in sync so resumeOrder can read synchronously
  const heldOrdersRef = useRef(heldOrders);
  useEffect(() => {
    heldOrdersRef.current = heldOrders;
  }, [heldOrders]);

  // Reload tenant-scoped held orders when switching branches (and migrate legacy unscoped key once)
  useEffect(() => {
    if (!restaurantId) {
      loadedRestaurantIdRef.current = null;
      setHeldOrders([]);
      return;
    }
    let orders = loadHeldOrders(restaurantId);
    try {
      const legacyRaw = localStorage.getItem(STORAGE_KEY_PREFIX);
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0 && orders.length === 0) {
          orders = parsedLegacy;
          saveHeldOrders(orders, restaurantId);
        }
        localStorage.removeItem(STORAGE_KEY_PREFIX);
      }
    } catch {
      /* ignore legacy parse errors */
    }
    loadedRestaurantIdRef.current = restaurantId;
    setHeldOrders(orders);
  }, [restaurantId]);

  // Sync back to localStorage only when state belongs to active restaurantId
  useEffect(() => {
    if (!restaurantId || loadedRestaurantIdRef.current !== restaurantId) return;
    saveHeldOrders(heldOrders, restaurantId);
  }, [heldOrders, restaurantId]);

  const holdOrder = useCallback((order: Omit<HeldOrder, "id" | "heldAt">) => {
    const newHeld: HeldOrder = {
      ...order,
      id: crypto.randomUUID(),
      heldAt: new Date().toISOString(),
    };
    setHeldOrders((prev) => [newHeld, ...prev]);
    return newHeld.id;
  }, []);

  const resumeOrder = useCallback((id: string): HeldOrder | null => {
    // Read from ref synchronously — state updater runs async in React 18
    const current = heldOrdersRef.current;
    const found = current.find((o) => o.id === id) ?? null;
    if (found) {
      setHeldOrders((prev) => prev.filter((o) => o.id !== id));
    }
    return found;
  }, []);

  const deleteHeldOrder = useCallback((id: string) => {
    setHeldOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return {
    heldOrders,
    heldCount: heldOrders.length,
    holdOrder,
    resumeOrder,
    deleteHeldOrder,
  };
}
