import type { OrderItem } from "@/types/orders";
import type { AppliedPromotion } from "../types";

export interface CalculateOrderTotalsOptions {
  orderItems: (OrderItem & { customPrice?: number })[];
  appliedPromotion: AppliedPromotion | null;
  manualDiscountPercent: number;
  manualDiscountCash?: number;
  loyaltyDiscount?: number;
  customTotalOverride?: number | null;
  isNonChargeable?: boolean;
}

export interface CalculatedTotals {
  subtotal: number;
  promotionDiscountAmount: number;
  manualDiscountAmount: number;
  loyaltyDiscountAmount: number;
  totalDiscountAmount: number;
  customAdjustmentAmount: number;
  total: number;
}

export function calculateOrderTotals({
  orderItems,
  appliedPromotion,
  manualDiscountPercent,
  manualDiscountCash = 0,
  loyaltyDiscount = 0,
  customTotalOverride = null,
  isNonChargeable = false,
}: CalculateOrderTotalsOptions): CalculatedTotals {
  // 1. Calculate base subtotal
  const subtotal = orderItems.reduce((sum, item) => {
    const unitPrice = item.customPrice !== undefined ? item.customPrice : item.price;
    return sum + unitPrice * item.quantity;
  }, 0);

  if (isNonChargeable) {
    return {
      subtotal,
      promotionDiscountAmount: 0,
      manualDiscountAmount: 0,
      loyaltyDiscountAmount: 0,
      totalDiscountAmount: subtotal,
      customAdjustmentAmount: 0,
      total: 0,
    };
  }

  // 2. Promotion discount
  let promotionDiscountAmount = 0;
  if (appliedPromotion) {
    if (appliedPromotion.discount_percentage) {
      promotionDiscountAmount = (subtotal * appliedPromotion.discount_percentage) / 100;
    } else if (appliedPromotion.discount_amount) {
      promotionDiscountAmount = Math.min(appliedPromotion.discount_amount, subtotal);
    }
  }

  // 3. Manual discount: either percentage or fixed cash off
  const taxableAmountAfterPromo = Math.max(0, subtotal - promotionDiscountAmount);
  let manualDiscountAmount = 0;
  if (manualDiscountPercent > 0) {
    manualDiscountAmount = (taxableAmountAfterPromo * manualDiscountPercent) / 100;
  } else if (manualDiscountCash > 0) {
    manualDiscountAmount = Math.min(manualDiscountCash, taxableAmountAfterPromo);
  }

  // 4. Loyalty points discount
  const loyaltyDiscountAmount = Math.min(
    loyaltyDiscount,
    Math.max(0, taxableAmountAfterPromo - manualDiscountAmount)
  );

  // 5. Total discount
  const totalDiscountAmount = Math.min(
    subtotal,
    promotionDiscountAmount + manualDiscountAmount + loyaltyDiscountAmount
  );

  // 6. Base calculated total
  const calculatedTotal = Math.max(0, subtotal - totalDiscountAmount);

  // 7. Custom Total Override Adjustment (if user manually typed custom amount e.g. ₹350 -> ₹490 or ₹300)
  let total = calculatedTotal;
  let customAdjustmentAmount = 0;

  if (customTotalOverride !== null && !isNaN(customTotalOverride) && customTotalOverride >= 0) {
    total = customTotalOverride;
    customAdjustmentAmount = customTotalOverride - calculatedTotal;
  }

  return {
    subtotal,
    promotionDiscountAmount,
    manualDiscountAmount,
    loyaltyDiscountAmount,
    totalDiscountAmount,
    customAdjustmentAmount,
    total,
  };
}
