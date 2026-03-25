import { useState, useCallback, useEffect } from "react";
import { QSOrderItem } from "@/components/QuickServe/QSOrderPanel";
import { LoyaltyCustomerInfo } from "@/components/QuickServe/QSCustomerInput";

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

const STORAGE_KEY = "qs-held-orders";

function loadHeldOrders(): HeldOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHeldOrders(orders: HeldOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error("Failed to save held orders:", err);
  }
}

export function useHeldOrders() {
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(loadHeldOrders);

  // Sync back to localStorage on any change
  useEffect(() => {
    saveHeldOrders(heldOrders);
  }, [heldOrders]);

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
    let found: HeldOrder | null = null;
    setHeldOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === id);
      if (idx === -1) return prev;
      found = prev[idx];
      return prev.filter((o) => o.id !== id);
    });
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
