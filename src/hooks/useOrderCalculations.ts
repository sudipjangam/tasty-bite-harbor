/**
 * useOrderCalculations
 * 
 * Unified calculation hook and pure utility for all order, cart, and payment math across:
 * - QSR POS (Dine-in / Table orders)
 * - QuickServe POS (Express / Counter / Food truck orders)
 * - AdaptivePaymentDialog / PaymentDialog / MobilePaymentDialog
 * - Invoice & Receipt generation
 * 
 * Guarantees consistent rounding, discount application, GST (CGST/SGST) split, and service charge math.
 */

import { useMemo } from "react";

export interface OrderCalculationItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  tax_rate?: number;
  discount?: number;
  [key: string]: any;
}

export interface OrderCalculationOptions {
  items: OrderCalculationItem[];
  discountPercentage?: number;
  discountAmount?: number;
  loyaltyDiscount?: number;
  taxRate?: number; // e.g. 5 for 5% GST
  taxInclusive?: boolean;
  serviceChargePercentage?: number;
  tipAmount?: number;
  roundToNearestRupee?: boolean;
}

export interface OrderCalculationResult {
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  discountFromPercentage: number;
  discountFromFixed: number;
  loyaltyDiscount: number;
  totalDiscount: number;
  discountedSubtotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
  serviceCharge: number;
  tip: number;
  rawTotal: number;
  roundOff: number;
  finalTotal: number;
}

/**
 * Pure calculation function (usable outside React components, e.g. in printers & background jobs)
 */
export function calculateOrderTotals(options: OrderCalculationOptions): OrderCalculationResult {
  const {
    items = [],
    discountPercentage = 0,
    discountAmount = 0,
    loyaltyDiscount = 0,
    taxRate = 0,
    taxInclusive = false,
    serviceChargePercentage = 0,
    tipAmount = 0,
    roundToNearestRupee = true,
  } = options;

  let subtotal = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    subtotal += price * qty;
    totalQuantity += qty;
  }

  // 1. Calculate Discounts
  const pct = Math.max(0, Math.min(100, Number(discountPercentage) || 0));
  const discountFromPercentage = (subtotal * pct) / 100;
  const discountFromFixed = Math.max(0, Number(discountAmount) || 0);
  const loyalty = Math.max(0, Number(loyaltyDiscount) || 0);

  const totalDiscount = Math.min(subtotal, discountFromPercentage + discountFromFixed + loyalty);
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);

  // 2. Calculate Taxes (GST: split into equal CGST + SGST)
  let taxableAmount = discountedSubtotal;
  let totalTax = 0;

  const validTaxRate = Math.max(0, Number(taxRate) || 0);

  if (validTaxRate > 0) {
    if (taxInclusive) {
      // Inclusive: tax is already inside the discounted price
      totalTax = (taxableAmount * validTaxRate) / (100 + validTaxRate);
      taxableAmount = taxableAmount - totalTax;
    } else {
      // Exclusive: tax added on top of discounted subtotal
      totalTax = (taxableAmount * validTaxRate) / 100;
    }
  }

  const cgst = totalTax / 2;
  const sgst = totalTax / 2;

  // 3. Service Charge & Tip
  const scPct = Math.max(0, Number(serviceChargePercentage) || 0);
  const serviceCharge = (discountedSubtotal * scPct) / 100;
  const tip = Math.max(0, Number(tipAmount) || 0);

  // 4. Raw Total
  const rawTotal = taxInclusive
    ? discountedSubtotal + serviceCharge + tip
    : discountedSubtotal + totalTax + serviceCharge + tip;

  // 5. Rounding
  let finalTotal = rawTotal;
  let roundOff = 0;

  if (roundToNearestRupee) {
    finalTotal = Math.round(rawTotal);
    roundOff = Number((finalTotal - rawTotal).toFixed(2));
  } else {
    finalTotal = Number(rawTotal.toFixed(2));
  }

  return {
    itemCount: items.length,
    totalQuantity,
    subtotal: Number(subtotal.toFixed(2)),
    discountFromPercentage: Number(discountFromPercentage.toFixed(2)),
    discountFromFixed: Number(discountFromFixed.toFixed(2)),
    loyaltyDiscount: Number(loyalty.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    discountedSubtotal: Number(discountedSubtotal.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    serviceCharge: Number(serviceCharge.toFixed(2)),
    tip: Number(tip.toFixed(2)),
    rawTotal: Number(rawTotal.toFixed(2)),
    roundOff,
    finalTotal,
  };
}

/**
 * React Hook for memoized reactive order calculations
 */
export function useOrderCalculations(options: OrderCalculationOptions): OrderCalculationResult {
  return useMemo(() => calculateOrderTotals(options), [
    options.items,
    options.discountPercentage,
    options.discountAmount,
    options.loyaltyDiscount,
    options.taxRate,
    options.taxInclusive,
    options.serviceChargePercentage,
    options.tipAmount,
    options.roundToNearestRupee,
  ]);
}

export default useOrderCalculations;
