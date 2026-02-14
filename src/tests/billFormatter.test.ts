import { describe, it, expect } from "vitest";
import {
  formatBillText,
  generateWhatsAppUrl,
  generateSmsUrl,
} from "../utils/billFormatter";

describe("Bill Formatter", () => {
  const baseParams = {
    restaurantName: "Tasty Bite Harbor",
    restaurantAddress: "123 Main Street, Mumbai",
    restaurantPhone: "+91 9876543210",
    gstin: "27ABCDE1234F1Z5",
    items: [
      { name: "Butter Chicken", quantity: 2, price: 300 },
      { name: "Naan", quantity: 3, price: 40 },
    ],
    subtotal: 720,
    total: 720,
    currencySymbol: "₹",
  };

  describe("formatBillText", () => {
    it("formats bill with all fields correctly", () => {
      const result = formatBillText({
        ...baseParams,
        tableNumber: "5",
        customerName: "John Doe",
        orderDate: "14/02/2026, 10:00:00 PM",
        paymentMethod: "upi",
      });

      expect(result).toContain("*Bill from Tasty Bite Harbor*");
      expect(result).toContain("123 Main Street, Mumbai");
      expect(result).toContain("+91 9876543210");
      expect(result).toContain("GSTIN: 27ABCDE1234F1Z5");
      expect(result).toContain("Table: 5");
      expect(result).toContain("John Doe");
      expect(result).toContain("2x Butter Chicken");
      expect(result).toContain("₹600.00");
      expect(result).toContain("3x Naan");
      expect(result).toContain("₹120.00");
      expect(result).toContain("*Total: ₹720.00*");
      expect(result).toContain("UPI");
      expect(result).toContain("Thank you for dining with us!");
    });

    it("handles missing optional fields gracefully", () => {
      const result = formatBillText({
        restaurantName: "Test Restaurant",
        items: [{ name: "Item A", quantity: 1, price: 100 }],
        subtotal: 100,
        total: 100,
      });

      expect(result).toContain("*Bill from Test Restaurant*");
      expect(result).not.toContain("📍");
      expect(result).not.toContain("📞");
      expect(result).not.toContain("GSTIN");
      expect(result).not.toContain("Table:");
      expect(result).toContain("*Total: ₹100.00*");
    });

    it("shows discount when provided", () => {
      const result = formatBillText({
        ...baseParams,
        total: 648,
        discount: 72,
        promotionName: "WELCOME10",
      });

      expect(result).toContain("Promo (WELCOME10)");
      expect(result).toContain("-₹72.00");
      expect(result).toContain("*Total: ₹648.00*");
    });

    it("shows manual discount percent", () => {
      const result = formatBillText({
        ...baseParams,
        total: 648,
        discount: 72,
        manualDiscountPercent: 10,
      });

      expect(result).toContain("Discount (10%)");
      expect(result).toContain("-₹72.00");
    });

    it("formats non-chargeable orders correctly", () => {
      const result = formatBillText({
        ...baseParams,
        total: 0,
        isNonChargeable: true,
      });

      expect(result).toContain("*Total: ₹0.00* (Non-Chargeable)");
    });

    it("handles special characters in names", () => {
      const result = formatBillText({
        restaurantName: "Café & Bistro (Mumbai)",
        items: [{ name: "Crème Brûlée", quantity: 1, price: 350 }],
        subtotal: 350,
        total: 350,
      });

      expect(result).toContain("Café & Bistro (Mumbai)");
      expect(result).toContain("Crème Brûlée");
    });
  });

  describe("generateWhatsAppUrl", () => {
    it("generates correct URL with Indian number", () => {
      const url = generateWhatsAppUrl("9876543210", "Hello");
      expect(url).toBe("https://wa.me/919876543210?text=Hello");
    });

    it("handles number with leading 0", () => {
      const url = generateWhatsAppUrl("09876543210", "Hi");
      expect(url).toBe("https://wa.me/919876543210?text=Hi");
    });

    it("handles number with +91 prefix", () => {
      const url = generateWhatsAppUrl("+919876543210", "Test");
      expect(url).toBe("https://wa.me/919876543210?text=Test");
    });

    it("handles number with 91 prefix", () => {
      const url = generateWhatsAppUrl("919876543210", "Test");
      expect(url).toBe("https://wa.me/919876543210?text=Test");
    });

    it("strips spaces and dashes from phone", () => {
      const url = generateWhatsAppUrl("98765 43210", "Hi");
      expect(url).toBe("https://wa.me/919876543210?text=Hi");
    });

    it("encodes special characters in text", () => {
      const url = generateWhatsAppUrl("9876543210", "Total: ₹500");
      expect(url).toContain("text=Total%3A%20%E2%82%B9500");
    });
  });

  describe("generateSmsUrl", () => {
    it("generates correct SMS URI", () => {
      const url = generateSmsUrl("9876543210", "Bill");
      expect(url).toBe("sms:+919876543210?body=Bill");
    });

    it("handles number with leading 0", () => {
      const url = generateSmsUrl("09876543210", "Hi");
      expect(url).toBe("sms:+919876543210?body=Hi");
    });

    it("handles number already with +91", () => {
      const url = generateSmsUrl("+919876543210", "Test");
      expect(url).toBe("sms:+919876543210?body=Test");
    });
  });
});
