import type { OrderItem } from "@/types/orders";
import type { AppliedPromotion } from "../types";

/**
 * Calculate subtotal from order items
 * Handles both regular and weight-based pricing
 */
export const calculateSubtotal = (items: OrderItem[]): number => {
  return items.reduce((sum, item) => {
    // Use calculatedPrice for weight-based items
    if (item.calculatedPrice !== undefined) {
      return sum + item.calculatedPrice;
    }
    return sum + item.price * item.quantity;
  }, 0);
};

/**
 * Calculate promotion discount amount
 */
export const calculatePromotionDiscount = (
  subtotal: number,
  promotion: AppliedPromotion | null
): number => {
  if (!promotion) return 0;
  
  if (promotion.discount_percentage) {
    return (subtotal * promotion.discount_percentage) / 100;
  }
  
  return promotion.discount_amount || 0;
};

/**
 * Calculate manual discount amount from percentage
 */
export const calculateManualDiscount = (
  subtotal: number,
  discountPercent: number
): number => {
  if (discountPercent <= 0) return 0;
  return (subtotal * discountPercent) / 100;
};

/**
 * Calculate final total after all discounts
 */
export const calculateTotal = (
  subtotal: number,
  promotionDiscount: number,
  manualDiscount: number
): number => {
  const total = subtotal - promotionDiscount - manualDiscount;
  return Math.max(0, total); // Never return negative
};

/**
 * Format currency value
 */
export const formatCurrency = (
  amount: number,
  symbol: string = "₹"
): string => {
  return `${symbol}${amount.toFixed(2)}`;
};

/**
 * Calculate order total from kitchen order items
 * Used when syncing with orders table
 */
export const calculateOrderTotalFromItems = (items: any[]): number => {
  return items.reduce((sum, item) => {
    const price = item.price || 0;
    const quantity = item.quantity || 1;
    return sum + price * quantity;
  }, 0);
};
