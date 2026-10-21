/**
 * orderCalculations.ts
 *
 * Core Order Calculation & Billing Engine.
 * Handles subtotal, item totals, discount cascades, GST computation (inclusive & exclusive),
 * CGST/SGST paisa rounding symmetry, auto round-off, and non-chargeable (NC) orders.
 */

import {
  calculateOrderTotals as internalCalculateOrderTotals,
  CalculateOrderTotalsOptions,
  CalculatedTotals,
} from "@/components/Orders/POS/PaymentDialog/utils/paymentCalculations";

export {
  type CalculateOrderTotalsOptions,
  type CalculatedTotals,
};

export interface OrderItemCalculation {
  price: number;
  quantity: number;
  customPrice?: number;
}

/**
 * Calculates line-item total with non-negative constraints.
 */
export function calculateItemTotal(
  price: number,
  quantity: number,
  customPrice?: number
): number {
  const effectivePrice = customPrice !== undefined ? Math.max(0, customPrice) : Math.max(0, price);
  const safeQty = Math.max(0, quantity);
  return Number((effectivePrice * safeQty).toFixed(2));
}

/**
 * Calculates subtotal for an array of items.
 */
export function calculateSubtotal(items: OrderItemCalculation[]): number {
  return Number(
    items
      .reduce((sum, item) => sum + calculateItemTotal(item.price, item.quantity, item.customPrice), 0)
      .toFixed(2)
  );
}

/**
 * Calculates GST components (CGST & SGST) ensuring exact paisa balance.
 * cgst + sgst === totalTax (no lost fractions).
 */
export function calculateTaxSplit(
  netTaxableAmount: number,
  gstPercent: number,
  isTaxInclusive: boolean = true
): {
  taxableBase: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
} {
  const safeNet = Math.max(0, netTaxableAmount);
  const safeRate = Math.max(0, gstPercent);

  if (safeRate === 0 || safeNet === 0) {
    return {
      taxableBase: safeNet,
      taxAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
    };
  }

  let rawTax = 0;
  let taxableBase = 0;

  if (isTaxInclusive) {
    taxableBase = Number((safeNet / (1 + safeRate / 100)).toFixed(2));
    rawTax = safeNet - taxableBase;
  } else {
    taxableBase = safeNet;
    rawTax = (safeNet * safeRate) / 100;
  }

  const cgstAmount = Number((rawTax / 2).toFixed(2));
  const sgstAmount = Number((rawTax - cgstAmount).toFixed(2));
  const taxAmount = Number((cgstAmount + sgstAmount).toFixed(2));

  return {
    taxableBase,
    taxAmount,
    cgstAmount,
    sgstAmount,
  };
}

/**
 * Rounds an amount to the nearest whole integer (cash round-off)
 * and returns the rounded amount and round-off difference.
 */
export function calculateRoundOff(amount: number): {
  roundedAmount: number;
  roundOffAmount: number;
} {
  const safeAmount = Number(amount.toFixed(2));
  const roundedAmount = Math.round(safeAmount);
  const roundOffAmount = Number((roundedAmount - safeAmount).toFixed(2));

  return {
    roundedAmount,
    roundOffAmount,
  };
}

/**
 * Rounds a number to exactly two decimal places (currency paisa/cents).
 */
export function roundCurrency(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
}

/**
 * Core order calculation function.
 * Wraps and exposes the hardened payment calculations.
 */
export const calculateOrderTotals = internalCalculateOrderTotals;
