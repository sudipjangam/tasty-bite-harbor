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
  customerPhone?: string;
  orderNumber?: string;
  orderType?: string;
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

/**
 * Compact key mapping — long key → short key (saves ~60% URL length).
 * These short keys are only used inside the URL; decoded back to full keys.
 */
const COMPACT_KEYS: Record<string, string> = {
  restaurantName: "rn",
  restaurantAddress: "ra",
  restaurantPhone: "rp",
  gstin: "g",
  items: "i",
  subtotal: "st",
  total: "t",
  discount: "d",
  promotionName: "pn",
  manualDiscountPercent: "md",
  tableNumber: "tn",
  customerName: "cn",
  customerPhone: "cp",
  orderNumber: "on",
  orderType: "ot",
  orderDate: "od",
  currencySymbol: "cs",
  paymentMethod: "pm",
  isNonChargeable: "nc",
  // Item sub-keys
  name: "n",
  quantity: "q",
  price: "p",
};

// Reverse mapping: short key → long key
const EXPAND_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(COMPACT_KEYS).map(([long, short]) => [short, long])
);

/** Compact an object by replacing long keys with short ones and stripping empty values. */
function compactObj(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    const shortKey = COMPACT_KEYS[key] || key;
    if (Array.isArray(value)) {
      result[shortKey] = value.map((item) =>
        typeof item === "object" && item !== null
          ? compactObj(item as Record<string, unknown>)
          : item
      );
    } else {
      result[shortKey] = value;
    }
  }
  return result;
}

/** Expand an object by replacing short keys back to long ones. */
function expandObj(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const longKey = EXPAND_KEYS[key] || key;
    if (Array.isArray(value)) {
      result[longKey] = value.map((item) =>
        typeof item === "object" && item !== null
          ? expandObj(item as Record<string, unknown>)
          : item
      );
    } else {
      result[longKey] = value;
    }
  }
  return result;
}

/**
 * Encode bill data into a URL-safe base64 string.
 * Uses compact keys & strips empty values to minimize URL length.
 */
export function encodeBillData(params: BillFormatParams): string {
  const compact = compactObj(params as unknown as Record<string, unknown>);
  const json = JSON.stringify(compact);
  // btoa for base64, then make URL-safe: + → -, / → _, remove =
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Decode a URL-safe base64 string back into BillFormatParams.
 * Expands compact keys back to full names.
 */
export function decodeBillData(encoded: string): BillFormatParams {
  // Restore standard base64: - → +, _ → /
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  // Add back padding
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const json = decodeURIComponent(escape(atob(base64)));
  const compact = JSON.parse(json);

  // Support both compact and full-key formats (backwards compatible)
  const hasFullKeys = "restaurantName" in compact;
  if (hasFullKeys) {
    return compact as BillFormatParams;
  }
  return expandObj(compact) as unknown as BillFormatParams;
}

/**
 * Generate a full shareable bill URL.
 * Returns just the path — the caller should prepend the domain.
 */
export function generateBillPath(params: BillFormatParams): string {
  const encoded = encodeBillData(params);
  return `/bill/${encoded}`;
}

/**
 * Generate a full shareable bill URL including current domain.
 */
export function generateBillUrl(params: BillFormatParams): string {
  const path = generateBillPath(params);
  return `${window.location.origin}${path}`;
}


