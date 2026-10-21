/**
 * billCalculation.ts
 *
 * Billing and invoice engine utilities.
 * Handles split bill distribution, tax invoice breakdowns, tip calculations,
 * and currency formatting for receipts/bills.
 */

import { roundCurrency } from "./orderCalculations";

export interface SplitResult {
  shareNumber: number;
  amount: number;
  roundedAmount: number;
}

export interface BillSplitSummary {
  total: number;
  splitCount: number;
  perPersonAmount: number;
  splits: SplitResult[];
  remainderPaisa: number;
}

/**
 * Splits a bill evenly across N people, handling uneven paisa division
 * so the sum of all individual splits matches the total amount exactly.
 */
export function calculateSplitBill(total: number, splitCount: number): BillSplitSummary {
  const safeTotal = roundCurrency(Math.max(0, total));
  const count = Math.max(1, Math.floor(splitCount));

  if (count === 1) {
    return {
      total: safeTotal,
      splitCount: 1,
      perPersonAmount: safeTotal,
      splits: [{ shareNumber: 1, amount: safeTotal, roundedAmount: Math.round(safeTotal) }],
      remainderPaisa: 0,
    };
  }

  // Exact division in paise (integer arithmetic)
  const totalInPaise = Math.round(safeTotal * 100);
  const baseShareInPaise = Math.floor(totalInPaise / count);
  const remainderPaise = totalInPaise % count;

  const splits: SplitResult[] = [];
  for (let i = 0; i < count; i++) {
    // Distribute remainder paise one-by-one to early payers
    const extra = i < remainderPaise ? 1 : 0;
    const sharePaise = baseShareInPaise + extra;
    const shareAmount = Number((sharePaise / 100).toFixed(2));
    splits.push({
      shareNumber: i + 1,
      amount: shareAmount,
      roundedAmount: Math.round(shareAmount),
    });
  }

  return {
    total: safeTotal,
    splitCount: count,
    perPersonAmount: Number((baseShareInPaise / 100).toFixed(2)),
    splits,
    remainderPaisa: remainderPaise,
  };
}

/**
 * Calculates itemized GST breakdown for tax invoicing.
 */
export function calculateGSTBreakdown(
  items: { price: number; quantity: number; gstPercent?: number }[],
  isTaxInclusive: boolean = true,
  defaultGstPercent: number = 5
): {
  subtotal: number;
  taxableTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  rates: Record<number, { taxable: number; tax: number; cgst: number; sgst: number }>;
} {
  let subtotal = 0;
  let taxableTotal = 0;
  let taxTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;

  const rates: Record<number, { taxable: number; tax: number; cgst: number; sgst: number }> = {};

  for (const item of items) {
    const rate = item.gstPercent !== undefined ? Math.max(0, item.gstPercent) : defaultGstPercent;
    const qty = Math.max(0, item.quantity);
    const lineAmount = Number((Math.max(0, item.price) * qty).toFixed(2));
    subtotal += lineAmount;

    let lineTaxable = 0;
    let lineTax = 0;

    if (rate === 0) {
      lineTaxable = lineAmount;
      lineTax = 0;
    } else if (isTaxInclusive) {
      lineTaxable = Number((lineAmount / (1 + rate / 100)).toFixed(2));
      lineTax = Number((lineAmount - lineTaxable).toFixed(2));
    } else {
      lineTaxable = lineAmount;
      lineTax = Number(((lineAmount * rate) / 100).toFixed(2));
    }

    const lineCgst = Number((lineTax / 2).toFixed(2));
    const lineSgst = Number((lineTax - lineCgst).toFixed(2));

    taxableTotal += lineTaxable;
    taxTotal += lineTax;
    cgstTotal += lineCgst;
    sgstTotal += lineSgst;

    if (!rates[rate]) {
      rates[rate] = { taxable: 0, tax: 0, cgst: 0, sgst: 0 };
    }
    rates[rate].taxable = roundCurrency(rates[rate].taxable + lineTaxable);
    rates[rate].tax = roundCurrency(rates[rate].tax + lineTax);
    rates[rate].cgst = roundCurrency(rates[rate].cgst + lineCgst);
    rates[rate].sgst = roundCurrency(rates[rate].sgst + lineSgst);
  }

  return {
    subtotal: roundCurrency(subtotal),
    taxableTotal: roundCurrency(taxableTotal),
    taxTotal: roundCurrency(taxTotal),
    cgstTotal: roundCurrency(cgstTotal),
    sgstTotal: roundCurrency(sgstTotal),
    rates,
  };
}

/**
 * Rounds an amount to integer paisa.
 */
export function roundToPaisa(amount: number): number {
  return roundCurrency(amount);
}
