import { describe, it, expect } from "vitest";
import {
  calculateSplitBill,
  calculateGSTBreakdown,
  roundToPaisa,
} from "@/utils/billCalculation";

describe("Bill Calculation Engine", () => {
  describe("calculateSplitBill", () => {
    it("splits evenly when divisible", () => {
      const summary = calculateSplitBill(300, 3);
      expect(summary.total).toBe(300);
      expect(summary.splitCount).toBe(3);
      expect(summary.perPersonAmount).toBe(100);
      expect(summary.remainderPaisa).toBe(0);
      expect(summary.splits.length).toBe(3);
      expect(summary.splits[0].amount).toBe(100);
      expect(summary.splits[1].amount).toBe(100);
      expect(summary.splits[2].amount).toBe(100);
    });

    it("distributes odd paise without losing or creating money", () => {
      // 100 divided by 3 = 33.333333...
      // In paise: 10000 paise / 3 = 3333 paise each + 1 remainder paisa
      // Person 1 gets 33.34, Person 2 gets 33.33, Person 3 gets 33.33
      // Total sum: 33.34 + 33.33 + 33.33 = 100.00 EXACT!
      const summary = calculateSplitBill(100, 3);
      expect(summary.total).toBe(100);
      expect(summary.remainderPaisa).toBe(1);
      const sumSplits = summary.splits.reduce((acc, s) => acc + s.amount, 0);
      expect(Number(sumSplits.toFixed(2))).toBe(100);
      expect(summary.splits[0].amount).toBe(33.34);
      expect(summary.splits[1].amount).toBe(33.33);
      expect(summary.splits[2].amount).toBe(33.33);
    });

    it("handles single-person split", () => {
      const summary = calculateSplitBill(250.5, 1);
      expect(summary.total).toBe(250.5);
      expect(summary.perPersonAmount).toBe(250.5);
      expect(summary.splits.length).toBe(1);
      expect(summary.splits[0].amount).toBe(250.5);
    });

    it("guards against zero or negative totals and split counts", () => {
      const summary = calculateSplitBill(-50, 0);
      expect(summary.total).toBe(0);
      expect(summary.splitCount).toBe(1);
      expect(summary.perPersonAmount).toBe(0);
    });
  });

  describe("calculateGSTBreakdown", () => {
    it("breaks down inclusive GST across items", () => {
      const items = [
        { price: 105, quantity: 1, gstPercent: 5 }, // base 100, tax 5
        { price: 210, quantity: 1, gstPercent: 5 }, // base 200, tax 10
      ];
      const breakdown = calculateGSTBreakdown(items, true);

      expect(breakdown.subtotal).toBe(315);
      expect(breakdown.taxableTotal).toBe(300);
      expect(breakdown.taxTotal).toBe(15);
      expect(breakdown.cgstTotal + breakdown.sgstTotal).toBe(breakdown.taxTotal);
      expect(breakdown.rates[5].taxable).toBe(300);
      expect(breakdown.rates[5].tax).toBe(15);
    });

    it("handles multiple tax slabs (5% food and 18% beverages)", () => {
      const items = [
        { price: 100, quantity: 2, gstPercent: 5 }, // 200 at 5% excl -> 10 tax
        { price: 100, quantity: 1, gstPercent: 18 }, // 100 at 18% excl -> 18 tax
      ];
      const breakdown = calculateGSTBreakdown(items, false);

      expect(breakdown.subtotal).toBe(300);
      expect(breakdown.taxableTotal).toBe(300);
      expect(breakdown.taxTotal).toBe(28);
      expect(breakdown.rates[5].tax).toBe(10);
      expect(breakdown.rates[18].tax).toBe(18);
    });
  });

  describe("roundToPaisa", () => {
    it("rounds numbers accurately to 2 decimals", () => {
      expect(roundToPaisa(12.345)).toBe(12.35);
      expect(roundToPaisa(12.344)).toBe(12.34);
      expect(roundToPaisa(0)).toBe(0);
    });
  });
});
