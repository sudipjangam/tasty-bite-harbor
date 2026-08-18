import type { OrderItem } from "@/types/orders";
import type { AppliedPromotion } from "../types";

export interface CalculateOrderTotalsOptions {
  orderItems: (OrderItem & { customPrice?: number })[];
  appliedPromotion: AppliedPromotion | null;
  manualDiscountPercent: number;
  manualDiscountCash?: number;
  loyaltyDiscount?: number;
  tipAmount?: number;
  isAutoRoundOff?: boolean;
  gstPercent?: number; // e.g. 5 for 5% GST
  isTaxInclusive?: boolean;
  customTotalOverride?: number | null;
  isNonChargeable?: boolean;
}

export interface CalculatedTotals {
  subtotal: number;
  promotionDiscountAmount: number;
  manualDiscountAmount: number;
  loyaltyDiscountAmount: number;
  totalDiscountAmount: number;
  netTaxableAmount: number;
  gstPercent: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  tipAmount: number;
  roundOffAmount: number;
  customAdjustmentAmount: number;
  total: number;
}

export function calculateOrderTotals({
  orderItems,
  appliedPromotion,
  manualDiscountPercent,
  manualDiscountCash = 0,
  loyaltyDiscount = 0,
  tipAmount = 0,
  isAutoRoundOff = true,
  gstPercent = 5,
  isTaxInclusive = true,
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
      netTaxableAmount: 0,
      gstPercent: 0,
      taxAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      tipAmount: 0,
      roundOffAmount: 0,
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

  // 3. Manual discount: percentage or flat cash
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

  // 6. Net taxable amount
  const netTaxableAmount = Math.max(0, subtotal - totalDiscountAmount);

  // 7. Taxes (GST - CGST / SGST)
  let taxAmount = 0;
  if (gstPercent > 0 && netTaxableAmount > 0) {
    if (isTaxInclusive) {
      const taxableBase = netTaxableAmount / (1 + gstPercent / 100);
      taxAmount = netTaxableAmount - taxableBase;
    } else {
      taxAmount = (netTaxableAmount * gstPercent) / 100;
    }
  }
  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;

  // 8. Raw total before round-off & tip
  const baseOrderTotal = isTaxInclusive ? netTaxableAmount : netTaxableAmount + taxAmount;
  const rawTotalWithTip = baseOrderTotal + Math.max(0, tipAmount);

  // 9. Round-off calculation
  let roundOffAmount = 0;
  let total = rawTotalWithTip;

  if (isAutoRoundOff) {
    const rounded = Math.round(rawTotalWithTip);
    roundOffAmount = rounded - rawTotalWithTip;
    total = rounded;
  }

  // 10. Custom Total Override Adjustment
  let customAdjustmentAmount = 0;
  if (customTotalOverride !== null && !isNaN(customTotalOverride) && customTotalOverride >= 0) {
    total = customTotalOverride;
    customAdjustmentAmount = customTotalOverride - rawTotalWithTip;
    roundOffAmount = 0;
  }

  return {
    subtotal,
    promotionDiscountAmount,
    manualDiscountAmount,
    loyaltyDiscountAmount,
    totalDiscountAmount,
    netTaxableAmount,
    gstPercent,
    taxAmount,
    cgstAmount,
    sgstAmount,
    tipAmount: Math.max(0, tipAmount),
    roundOffAmount,
    customAdjustmentAmount,
    total,
  };
}
