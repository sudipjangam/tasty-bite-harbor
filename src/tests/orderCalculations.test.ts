import { describe, it, expect } from "vitest";
import {
  calculateOrderTotals,
  calculateItemTotal,
  calculateSubtotal,
  calculateTaxSplit,
  calculateRoundOff,
  roundCurrency,
} from "@/utils/orderCalculations";

describe("Order Calculations Engine", () => {
  describe("calculateItemTotal & calculateSubtotal", () => {
    it("calculates item total with standard price and quantity", () => {
      expect(calculateItemTotal(150, 2)).toBe(300);
      expect(calculateItemTotal(99.99, 3)).toBe(299.97);
    });

    it("prefers customPrice over regular price", () => {
      expect(calculateItemTotal(150, 2, 120)).toBe(240);
    });

    it("guards against negative price and quantity", () => {
      expect(calculateItemTotal(-100, 2)).toBe(0);
      expect(calculateItemTotal(100, -2)).toBe(0);
      expect(calculateItemTotal(100, 2, -50)).toBe(0);
    });

    it("calculates subtotal across items correctly", () => {
      const items = [
        { price: 100, quantity: 2 },
        { price: 50, quantity: 3 },
        { price: 200, quantity: 1, customPrice: 180 },
      ];
      // 200 + 150 + 180 = 530
      expect(calculateSubtotal(items)).toBe(530);
    });

    it("returns 0 for empty item list", () => {
      expect(calculateSubtotal([])).toBe(0);
    });
  });

  describe("calculateTaxSplit (GST calculations)", () => {
    it("calculates 5% tax-inclusive GST and splits CGST/SGST equally", () => {
      // 105 total inclusive -> base 100, tax 5 -> CGST 2.5, SGST 2.5
      const split = calculateTaxSplit(105, 5, true);
      expect(split.taxableBase).toBe(100);
      expect(split.taxAmount).toBe(5);
      expect(split.cgstAmount).toBe(2.5);
      expect(split.sgstAmount).toBe(2.5);
      expect(split.cgstAmount + split.sgstAmount).toBe(split.taxAmount);
    });

    it("handles odd paisa rounding without losing 1 paisa (CBIC compliance)", () => {
      // Net 201 at 5% tax inclusive:
      // taxableBase = 201 / 1.05 = 191.43, rawTax = 9.57
      // cgst = 4.79, sgst = 4.78 -> sum = 9.57
      const split = calculateTaxSplit(201, 5, true);
      expect(split.cgstAmount + split.sgstAmount).toBe(split.taxAmount);
    });

    it("calculates 5% tax-exclusive GST", () => {
      // 100 base -> tax 5 -> CGST 2.5, SGST 2.5
      const split = calculateTaxSplit(100, 5, false);
      expect(split.taxableBase).toBe(100);
      expect(split.taxAmount).toBe(5);
      expect(split.cgstAmount).toBe(2.5);
      expect(split.sgstAmount).toBe(2.5);
      expect(split.cgstAmount + split.sgstAmount).toBe(5);
    });

    it("returns zero tax when rate is 0 or amount is 0", () => {
      const split0 = calculateTaxSplit(100, 0, true);
      expect(split0.taxAmount).toBe(0);
      expect(split0.cgstAmount).toBe(0);
      expect(split0.sgstAmount).toBe(0);

      const splitZero = calculateTaxSplit(0, 5, true);
      expect(splitZero.taxAmount).toBe(0);
    });
  });

  describe("calculateRoundOff", () => {
    it("rounds up when fraction >= 0.5", () => {
      const result = calculateRoundOff(100.6);
      expect(result.roundedAmount).toBe(101);
      expect(result.roundOffAmount).toBe(0.4);
    });

    it("rounds down when fraction < 0.5", () => {
      const result = calculateRoundOff(100.2);
      expect(result.roundedAmount).toBe(100);
      expect(result.roundOffAmount).toBe(-0.2);
    });

    it("avoids JavaScript floating point noise like -0.09999999999999432", () => {
      const result = calculateRoundOff(100.1);
      expect(result.roundedAmount).toBe(100);
      expect(result.roundOffAmount).toBe(-0.1);
    });
  });

  describe("calculateOrderTotals comprehensive scenarios", () => {
    const baseItems = [
      { id: "1", name: "Dish A", price: 200, quantity: 2 },
      { id: "2", name: "Dish B", price: 100, quantity: 1 },
    ]; // subtotal = 500

    it("calculates simple order with default inclusive 5% GST and auto round-off", () => {
      const totals = calculateOrderTotals({
        orderItems: baseItems,
        appliedPromotion: null,
        manualDiscountPercent: 0,
        gstPercent: 5,
        isTaxInclusive: true,
        isAutoRoundOff: true,
      });

      expect(totals.subtotal).toBe(500);
      expect(totals.totalDiscountAmount).toBe(0);
      expect(totals.netTaxableAmount).toBe(500);
      expect(totals.total).toBe(500);
      expect(Number((totals.cgstAmount + totals.sgstAmount).toFixed(2))).toBe(totals.taxAmount);
    });

    it("applies promotional discount percentage", () => {
      const totals = calculateOrderTotals({
        orderItems: baseItems, // 500
        appliedPromotion: {
          id: "p1",
          code: "SAVE20",
          name: "20% Off",
          discount_percentage: 20,
        },
        manualDiscountPercent: 0,
      });

      expect(totals.subtotal).toBe(500);
      expect(totals.promotionDiscountAmount).toBe(100);
      expect(totals.netTaxableAmount).toBe(400);
      expect(totals.total).toBe(400);
    });

    it("applies manual flat cash discount capped at subtotal", () => {
      const totals = calculateOrderTotals({
        orderItems: baseItems, // 500
        appliedPromotion: null,
        manualDiscountPercent: 0,
        manualDiscountCash: 150,
      });

      expect(totals.manualDiscountAmount).toBe(150);
      expect(totals.netTaxableAmount).toBe(350);
      expect(totals.total).toBe(350);
    });

    it("combines promo, manual percent, and loyalty points without exceeding subtotal", () => {
      const totals = calculateOrderTotals({
        orderItems: baseItems, // 500
        appliedPromotion: {
          id: "p1",
          code: "PROMO",
          name: "Promo",
          discount_amount: 100,
        },
        manualDiscountPercent: 10, // 10% of remaining 400 = 40
        loyaltyDiscount: 50, // 50 of remaining 360
      });

      expect(totals.promotionDiscountAmount).toBe(100);
      expect(totals.manualDiscountAmount).toBe(40);
      expect(totals.loyaltyDiscountAmount).toBe(50);
      expect(totals.totalDiscountAmount).toBe(190);
      expect(totals.netTaxableAmount).toBe(310);
      expect(totals.total).toBe(310);
    });

    it("caps total discounts at subtotal (cannot be negative)", () => {
      const totals = calculateOrderTotals({
        orderItems: baseItems, // 500
        appliedPromotion: {
          id: "p1",
          code: "HUGE",
          name: "Huge Discount",
          discount_amount: 9999,
        },
        manualDiscountPercent: 50,
        loyaltyDiscount: 500,
      });

      expect(totals.totalDiscountAmount).toBe(500);
      expect(totals.netTaxableAmount).toBe(0);
      expect(totals.taxAmount).toBe(0);
      expect(totals.total).toBe(0);
    });

    it("correctly handles Non-Chargeable (NC) orders", () => {
      const totals = calculateOrderTotals({
        orderItems: baseItems,
        appliedPromotion: null,
        manualDiscountPercent: 0,
        isNonChargeable: true,
      });

      expect(totals.subtotal).toBe(500);
      expect(totals.totalDiscountAmount).toBe(500);
      expect(totals.netTaxableAmount).toBe(0);
      expect(totals.taxAmount).toBe(0);
      expect(totals.cgstAmount).toBe(0);
      expect(totals.sgstAmount).toBe(0);
      expect(totals.total).toBe(0);
    });

    it("handles tax-exclusive order with tip", () => {
      const totals = calculateOrderTotals({
        orderItems: [{ id: "1", name: "Dish", price: 1000, quantity: 1 }],
        appliedPromotion: null,
        manualDiscountPercent: 0,
        gstPercent: 5,
        isTaxInclusive: false,
        tipAmount: 50,
        isAutoRoundOff: true,
      });

      // 1000 base + 50 tax (5%) + 50 tip = 1100
      expect(totals.subtotal).toBe(1000);
      expect(totals.taxAmount).toBe(50);
      expect(totals.tipAmount).toBe(50);
      expect(totals.total).toBe(1100);
    });

    it("supports custom total override and sets customAdjustmentAmount", () => {
      const totals = calculateOrderTotals({
        orderItems: [{ id: "1", name: "Dish", price: 478, quantity: 1 }],
        appliedPromotion: null,
        manualDiscountPercent: 0,
        customTotalOverride: 450,
      });

      expect(totals.total).toBe(450);
      expect(totals.customAdjustmentAmount).toBe(-28);
      expect(totals.roundOffAmount).toBe(0);
    });
  });
});
