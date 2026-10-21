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
  // 1. Calculate base subtotal (sanitizing negative/invalid values)
  const subtotal = Number(
    orderItems
      .reduce((sum, item) => {
        const unitPrice =
          item.customPrice !== undefined
            ? Math.max(0, item.customPrice)
            : Math.max(0, item.price || 0);
        const qty = Math.max(0, item.quantity || 0);
        return sum + unitPrice * qty;
      }, 0)
      .toFixed(2)
  );

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
  if (appliedPromotion && subtotal > 0) {
    if (appliedPromotion.discount_percentage) {
      const pct = Math.min(100, Math.max(0, appliedPromotion.discount_percentage));
      promotionDiscountAmount = Number(((subtotal * pct) / 100).toFixed(2));
    } else if (appliedPromotion.discount_amount) {
      promotionDiscountAmount = Number(
        Math.min(Math.max(0, appliedPromotion.discount_amount), subtotal).toFixed(2)
      );
    }
  }

  // 3. Manual discount: percentage or flat cash
  const taxableAmountAfterPromo = Number(Math.max(0, subtotal - promotionDiscountAmount).toFixed(2));
  let manualDiscountAmount = 0;
  if (manualDiscountPercent > 0) {
    const pct = Math.min(100, Math.max(0, manualDiscountPercent));
    manualDiscountAmount = Number(((taxableAmountAfterPromo * pct) / 100).toFixed(2));
  } else if (manualDiscountCash > 0) {
    manualDiscountAmount = Number(
      Math.min(Math.max(0, manualDiscountCash), taxableAmountAfterPromo).toFixed(2)
    );
  }

  // 4. Loyalty points discount
  const loyaltyDiscountAmount = Number(
    Math.min(
      Math.max(0, loyaltyDiscount),
      Math.max(0, taxableAmountAfterPromo - manualDiscountAmount)
    ).toFixed(2)
  );

  // 5. Total discount
  const totalDiscountAmount = Number(
    Math.min(
      subtotal,
      promotionDiscountAmount + manualDiscountAmount + loyaltyDiscountAmount
    ).toFixed(2)
  );

  // 6. Net taxable amount
  const netTaxableAmount = Number(Math.max(0, subtotal - totalDiscountAmount).toFixed(2));

  // 7. Taxes (GST - CGST / SGST)
  let taxAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  const safeGstPercent = Math.max(0, gstPercent);
  if (safeGstPercent > 0 && netTaxableAmount > 0) {
    let rawTax = 0;
    if (isTaxInclusive) {
      const taxableBase = netTaxableAmount / (1 + safeGstPercent / 100);
      rawTax = netTaxableAmount - taxableBase;
    } else {
      rawTax = (netTaxableAmount * safeGstPercent) / 100;
    }
    // Half tax rounded to 2 decimal places, remaining assigned to SGST for exact sum equality
    cgstAmount = Number((rawTax / 2).toFixed(2));
    sgstAmount = Number((rawTax - cgstAmount).toFixed(2));
    taxAmount = Number((cgstAmount + sgstAmount).toFixed(2));
  }

  // 8. Raw total before round-off & tip
  const safeTipAmount = Number(Math.max(0, tipAmount).toFixed(2));
  const baseOrderTotal = isTaxInclusive
    ? netTaxableAmount
    : Number((netTaxableAmount + taxAmount).toFixed(2));
  const rawTotalWithTip = Number((baseOrderTotal + safeTipAmount).toFixed(2));

  // 9. Round-off calculation
  let roundOffAmount = 0;
  let total = rawTotalWithTip;

  if (isAutoRoundOff) {
    const rounded = Math.round(rawTotalWithTip);
    roundOffAmount = Number((rounded - rawTotalWithTip).toFixed(2));
    total = rounded;
  }

  // 10. Custom Total Override Adjustment
  let customAdjustmentAmount = 0;
  if (customTotalOverride !== null && !isNaN(customTotalOverride) && customTotalOverride >= 0) {
    total = Number(customTotalOverride.toFixed(2));
    customAdjustmentAmount = Number((total - rawTotalWithTip).toFixed(2));
    roundOffAmount = 0;
  }

  return {
    subtotal,
    promotionDiscountAmount,
    manualDiscountAmount,
    loyaltyDiscountAmount,
    totalDiscountAmount,
    netTaxableAmount,
    gstPercent: safeGstPercent,
    taxAmount,
    cgstAmount,
    sgstAmount,
    tipAmount: safeTipAmount,
    roundOffAmount,
    customAdjustmentAmount,
    total,
  };
}
