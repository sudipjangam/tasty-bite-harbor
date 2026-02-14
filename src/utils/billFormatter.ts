/**
 * Bill Formatter Utility
 * Formats order data + restaurant profile into shareable bill text.
 * Uses plain-text with emoji formatting for WhatsApp readability.
 * 100% free — no API keys, no per-message costs.
 */

export interface BillFormatParams {
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  gstin?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  total: number;
  discount?: number;
  promotionName?: string;
  manualDiscountPercent?: number;
  paymentMethod?: string;
  tableNumber?: string;
  customerName?: string;
  orderDate?: string;
  currencySymbol?: string;
  isNonChargeable?: boolean;
}

/**
 * Formats order data into a readable bill text string.
 */
export function formatBillText(params: BillFormatParams): string {
  const {
    restaurantName,
    restaurantAddress,
    restaurantPhone,
    gstin,
    items,
    subtotal,
    total,
    discount,
    promotionName,
    manualDiscountPercent,
    paymentMethod,
    tableNumber,
    customerName,
    orderDate,
    currencySymbol = "₹",
    isNonChargeable = false,
  } = params;

  const lines: string[] = [];

  // Header
  lines.push(`🧾 *Bill from ${restaurantName}*`);
  if (restaurantAddress) {
    lines.push(`📍 ${restaurantAddress}`);
  }
  if (restaurantPhone) {
    lines.push(`📞 ${restaurantPhone}`);
  }
  if (gstin) {
    lines.push(`🏷 GSTIN: ${gstin}`);
  }
  lines.push("━━━━━━━━━━━━━━━━━━━");

  // Order details
  if (orderDate) {
    lines.push(`📅 ${orderDate}`);
  }
  if (tableNumber) {
    lines.push(`🪑 Table: ${tableNumber}`);
  }
  if (customerName) {
    lines.push(`👤 ${customerName}`);
  }
  lines.push("━━━━━━━━━━━━━━━━━━━");

  // Items
  lines.push("*Order Details:*");
  items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    lines.push(
      `  ${item.quantity}x ${item.name}  — ${currencySymbol}${itemTotal.toFixed(2)}`
    );
  });
  lines.push("━━━━━━━━━━━━━━━━━━━");

  // Subtotal
  lines.push(`Subtotal: ${currencySymbol}${subtotal.toFixed(2)}`);

  // Discounts
  if (discount && discount > 0) {
    if (promotionName) {
      lines.push(
        `🏷 Promo (${promotionName}): -${currencySymbol}${discount.toFixed(2)}`
      );
    } else if (manualDiscountPercent && manualDiscountPercent > 0) {
      lines.push(
        `🏷 Discount (${manualDiscountPercent}%): -${currencySymbol}${discount.toFixed(2)}`
      );
    } else {
      lines.push(`🏷 Discount: -${currencySymbol}${discount.toFixed(2)}`);
    }
  }

  lines.push("━━━━━━━━━━━━━━━━━━━");

  // Total
  if (isNonChargeable) {
    lines.push(`💰 *Total: ${currencySymbol}0.00* (Non-Chargeable)`);
  } else {
    lines.push(`💰 *Total: ${currencySymbol}${total.toFixed(2)}*`);
  }

  // Payment method
  if (paymentMethod) {
    const methodLabel = getPaymentMethodLabel(paymentMethod);
    lines.push(`💳 Paid via: ${methodLabel}`);
  }

  lines.push("");
  lines.push("Thank you for dining with us! 🙏");
  lines.push(`— ${restaurantName}`);

  return lines.join("\n");
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    net_banking: "Net Banking",
    wallet: "Wallet",
    room_charge: "Room Charge",
    nc: "Non-Chargeable",
  };
  return labels[method.toLowerCase()] || method;
}

/**
 * Generate a WhatsApp wa.me URL with the bill text pre-filled.
 * Works for any restaurant - no API keys needed.
 */
export function generateWhatsAppUrl(
  phone: string,
  billText: string
): string {
  // Clean phone number: remove spaces, dashes, and ensure country code
  let cleaned = phone.replace(/[\s\-()]/g, "");

  // Add India country code if not present
  if (cleaned.startsWith("0")) {
    cleaned = "91" + cleaned.substring(1);
  } else if (!cleaned.startsWith("+") && !cleaned.startsWith("91")) {
    cleaned = "91" + cleaned;
  }

  // Remove leading + if present
  cleaned = cleaned.replace(/^\+/, "");

  const encodedText = encodeURIComponent(billText);
  return `https://wa.me/${cleaned}?text=${encodedText}`;
}

/**
 * Generate an SMS URI with the bill text pre-filled.
 */
export function generateSmsUrl(phone: string, billText: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = "+91" + cleaned.substring(1);
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+91" + cleaned;
  }

  const encodedText = encodeURIComponent(billText);
  return `sms:${cleaned}?body=${encodedText}`;
}
