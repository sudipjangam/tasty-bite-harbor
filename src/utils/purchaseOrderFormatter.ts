/**
 * Purchase Order Formatter Utility
 * Formats purchase order data into shareable text for WhatsApp.
 * Uses plain-text with emoji formatting for readability.
 * Leverages existing generateWhatsAppUrl from billFormatter for wa.me links.
 */

import { generateWhatsAppUrl } from "./billFormatter";

export interface PurchaseOrderFormatParams {
  restaurantName: string;
  orderNumber: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
  }>;
  totalAmount: number;
  notes?: string;
  currencySymbol?: string;
  status?: string;
}

/**
 * Formats purchase order data into a readable text string for WhatsApp sharing.
 */
export function formatPurchaseOrderText(
  params: PurchaseOrderFormatParams
): string {
  const {
    restaurantName,
    orderNumber,
    supplierName,
    orderDate,
    expectedDeliveryDate,
    items,
    totalAmount,
    notes,
    currencySymbol = "₹",
    status,
  } = params;

  const lines: string[] = [];

  // Header
  lines.push(`📋 *Purchase Order: ${orderNumber}*`);
  lines.push(`🏪 ${restaurantName}`);
  lines.push("━━━━━━━━━━━━━━━━━━━");

  // Supplier & Order Info
  lines.push(`🏢 *Supplier:* ${supplierName}`);
  lines.push(
    `📅 *Order Date:* ${new Date(orderDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`
  );
  if (expectedDeliveryDate) {
    lines.push(
      `📦 *Expected Delivery:* ${new Date(
        expectedDeliveryDate
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`
    );
  }
  if (status) {
    lines.push(`📌 *Status:* ${status}`);
  }
  lines.push("━━━━━━━━━━━━━━━━━━━");

  // Items
  lines.push("*Order Items:*");
  items.forEach((item, index) => {
    const itemTotal = item.quantity * item.unitCost;
    lines.push(
      `  ${index + 1}. ${item.name} — ${item.quantity} ${item.unit} × ${currencySymbol}${item.unitCost.toFixed(2)} = ${currencySymbol}${itemTotal.toFixed(2)}`
    );
  });
  lines.push("━━━━━━━━━━━━━━━━━━━");

  // Total
  lines.push(`💰 *Total: ${currencySymbol}${totalAmount.toFixed(2)}*`);

  // Notes
  if (notes && notes.trim()) {
    lines.push("");
    lines.push(`📝 *Notes:* ${notes}`);
  }

  lines.push("");
  lines.push(`— ${restaurantName}`);

  return lines.join("\n");
}

/**
 * Generate a WhatsApp wa.me URL with PO text pre-filled for a supplier.
 * Reuses the existing generateWhatsAppUrl from billFormatter.
 */
export function generateSupplierWhatsAppUrl(
  phone: string,
  poText: string
): string {
  return generateWhatsAppUrl(phone, poText);
}
