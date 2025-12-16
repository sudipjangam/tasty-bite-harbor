import { describe, it, expect } from 'vitest';

// Simulating the logic found in PaymentDialog.tsx
// We extract the pure logic to test it in isolation
const calculateTotal = (
  subtotal: number, 
  manualDiscountPercent: number, 
  promotionDiscountAmount: number
) => {
  const manualAmount = (subtotal * manualDiscountPercent) / 100;
  const totalDiscount = manualAmount + promotionDiscountAmount;
  const finalTotal = subtotal - totalDiscount;
  return Math.max(0, finalTotal); // Logic we want to enforce
};

describe('Payment Flow Calculations', () => {
  it('calculates manual percentage discount correctly', () => {
    const subtotal = 1000;
    const discountPercent = 10; // 10%
    const promo = 0;
    
    expect(calculateTotal(subtotal, discountPercent, promo)).toBe(900);
  });

  it('calculates mixed discounts correctly', () => {
    const subtotal = 1000;
    const discountPercent = 10; // 100rs off
    const promo = 50; // 50rs off
    
    // Total off = 150. Final = 850
    expect(calculateTotal(subtotal, discountPercent, promo)).toBe(850);
  });

  it('prevents negative totals when discount exceeds subtotal', () => {
    const subtotal = 100;
    const discountPercent = 0;
    const promo = 150; // Discount > Subtotal
    
    expect(calculateTotal(subtotal, discountPercent, promo)).toBe(0);
  });

  it('handles 100% discount correctly', () => {
    const subtotal = 500;
    const discountPercent = 100; 
    const promo = 0;
    
    expect(calculateTotal(subtotal, discountPercent, promo)).toBe(0);
  });
});
