import type { OrderItem } from "@/types/orders";
import type { AppliedPromotion, RestaurantInfo, PaymentSettings } from "../types";

export interface BuildReceiptOptions {
  restaurantInfo: RestaurantInfo | null;
  restaurantName?: string;
  orderItems: (OrderItem & { customPrice?: number })[];
  subtotal: number;
  total: number;
  currencySymbol: string;
  tableNumber?: string;
  customerName?: string;
  customerMobile?: string;
  appliedPromotion?: AppliedPromotion | null;
  promotionDiscountAmount?: number;
  manualDiscountPercent?: number;
  manualDiscountAmount?: number;
  loyaltyDiscountAmount?: number;
  totalDiscountAmount?: number;
  tipAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  roundOffAmount?: number;
  customAdjustmentAmount?: number;
  paymentSettings?: PaymentSettings | null;
  qrCodeUrl?: string;
  serverName?: string;
}

export function buildReceiptHtml({
  restaurantInfo,
  restaurantName,
  orderItems,
  subtotal,
  total,
  currencySymbol,
  tableNumber,
  customerName,
  customerMobile,
  appliedPromotion,
  promotionDiscountAmount = 0,
  manualDiscountPercent = 0,
  manualDiscountAmount = 0,
  loyaltyDiscountAmount = 0,
  totalDiscountAmount = 0,
  tipAmount = 0,
  cgstAmount = 0,
  sgstAmount = 0,
  roundOffAmount = 0,
  customAdjustmentAmount = 0,
  paymentSettings,
  qrCodeUrl,
  serverName,
}: BuildReceiptOptions): string {
  const billNumber = `#${Date.now().toString().slice(-6)}`;
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const printSymbol = currencySymbol === "₹" ? "Rs." : currencySymbol;
  const rName =
    restaurantName ||
    restaurantInfo?.name ||
    localStorage.getItem("restaurant_name") ||
    localStorage.getItem("cached_restaurant_name") ||
    "Tasty Bite Harbor";
  const savedLogo = localStorage.getItem("restaurant_logo_url");

  // Build items rows HTML
  const itemRowsHtml = orderItems
    .map((item) => {
      const price = item.customPrice !== undefined ? item.customPrice : item.price;
      const amt = price * item.quantity;
      return `
      <tr>
        <td style="padding:1px 0;font-size:11px;">${item.name}</td>
        <td style="padding:1px 0;font-size:11px;text-align:right;">${item.quantity}</td>
        <td style="padding:1px 0;font-size:11px;text-align:right;">${price.toFixed(0)}</td>
        <td style="padding:1px 0;font-size:11px;text-align:right;">${amt.toFixed(0)}</td>
      </tr>
    `;
    })
    .join("");

  // Build discount, taxes, tips & adjustments rows HTML
  let breakdownRowsHtml = "";
  if (appliedPromotion && promotionDiscountAmount > 0) {
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:10px;">Promo (${appliedPromotion.name || appliedPromotion.promotion_code}):</td><td style="font-size:10px;text-align:right;">-${promotionDiscountAmount.toFixed(2)}</td></tr>`;
  }
  if (manualDiscountAmount > 0) {
    const label = manualDiscountPercent > 0 ? `Discount (${manualDiscountPercent}%):` : "Cash Discount:";
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:10px;">${label}</td><td style="font-size:10px;text-align:right;">-${manualDiscountAmount.toFixed(2)}</td></tr>`;
  }
  if (loyaltyDiscountAmount > 0) {
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:10px;">Loyalty Redemption:</td><td style="font-size:10px;text-align:right;">-${loyaltyDiscountAmount.toFixed(2)}</td></tr>`;
  }
  if (totalDiscountAmount > 0 && !appliedPromotion && !manualDiscountAmount && !loyaltyDiscountAmount) {
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:11px;font-weight:bold;">Total Discount:</td><td style="font-size:11px;font-weight:bold;text-align:right;">-${totalDiscountAmount.toFixed(2)}</td></tr>`;
  }
  if (cgstAmount > 0) {
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:10px;">CGST (2.5%):</td><td style="font-size:10px;text-align:right;">+${cgstAmount.toFixed(2)}</td></tr>`;
  }
  if (sgstAmount > 0) {
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:10px;">SGST (2.5%):</td><td style="font-size:10px;text-align:right;">+${sgstAmount.toFixed(2)}</td></tr>`;
  }
  if (tipAmount > 0) {
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:10px;font-weight:bold;">Tip / Gratuity:</td><td style="font-size:10px;font-weight:bold;text-align:right;">+${tipAmount.toFixed(2)}</td></tr>`;
  }
  if (roundOffAmount !== 0) {
    const sign = roundOffAmount > 0 ? "+" : "";
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:10px;">Round Off:</td><td style="font-size:10px;text-align:right;">${sign}${roundOffAmount.toFixed(2)}</td></tr>`;
  }
  if (customAdjustmentAmount !== 0) {
    const sign = customAdjustmentAmount > 0 ? "+" : "";
    const label = customAdjustmentAmount > 0 ? "Custom Adjustment / Charge:" : "Manual Adjustment:";
    breakdownRowsHtml += `<tr><td colspan="3" style="font-size:10px;font-weight:bold;">${label}</td><td style="font-size:10px;text-align:right;">${sign}${customAdjustmentAmount.toFixed(2)}</td></tr>`;
  }

  // Build UPI QR section HTML
  let upiHtml = "";
  if (qrCodeUrl) {
    upiHtml = `
      <tr><td colspan="4" style="padding-top:6px;text-align:center;">
        <img src="${qrCodeUrl}" width="90" height="90" style="display:block;margin:0 auto;" />
        <div style="font-size:9px;margin-top:2px;">Scan QR to pay</div>
      </td></tr>`;
  }

  const toLine = tableNumber
    ? `To: ${tableNumber}`
    : customerName
    ? `To: ${customerName}`
    : "To: POS";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Bill ${billNumber}</title>
<style>
  @page { size: 58mm auto; margin: 0 !important; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: Arial, sans-serif; width: 54mm; margin: 0 !important; padding: 0 !important; color: #000; line-height: 1.18; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .dash { border-top: 1px dashed #000; margin: 2px 0; }
  .row { display: flex; justify-content: space-between; margin-bottom: 1px; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; }
</style>
</head>
<body>
  ${savedLogo ? `<div class="center"><img src="${savedLogo}" crossorigin="anonymous" style="max-width:32px;max-height:32px;margin-bottom:1px;" /></div>` : ""}
  <div class="center bold" style="font-size:14px; margin:0; padding:0;">${rName}</div>
  ${restaurantInfo?.address ? `<div class="center" style="font-size:9px;">${restaurantInfo.address}</div>` : ""}
  ${restaurantInfo?.phone ? `<div class="center" style="font-size:9px;">Ph: ${restaurantInfo.phone}</div>` : ""}
  ${restaurantInfo?.gstin && restaurantInfo.gstin.trim() !== "" && restaurantInfo.gstin.toLowerCase() !== "not set" ? `<div class="center" style="font-size:9px;">GSTIN: ${restaurantInfo.gstin}</div>` : ""}
  <div class="dash"></div>
  <div class="row" style="font-size:10px;">
    <span>Bill#: ${billNumber}</span>
    <span>${toLine}</span>
  </div>
  <div class="row" style="font-size:10px;">
    <span>Date: ${currentDate}</span>
    <span>Time: ${currentTime}</span>
  </div>
  ${(serverName || customerMobile) ? `
  <div class="row" style="font-size:10px;">
    ${serverName ? `<span>Server: ${serverName}</span>` : `<span></span>`}
    ${customerMobile ? `<span>Ph: ${customerMobile}</span>` : `<span></span>`}
  </div>` : ""}
  ${customerName && tableNumber && customerName !== tableNumber ? `<div style="font-size:10px;">Guest: ${customerName}</div>` : ""}
  <div class="dash"></div>
  <table>
    <tr>
      <th style="font-size:10px;text-align:left;padding:1px 0;">Item</th>
      <th style="font-size:10px;text-align:right;padding:1px 0;">Qty</th>
      <th style="font-size:10px;text-align:right;padding:1px 0;">Rate</th>
      <th style="font-size:10px;text-align:right;padding:1px 0;">Amt</th>
    </tr>
    <tr><td colspan="4"><div style="border-top:1px solid #000;margin:1px 0;"></div></td></tr>
    ${itemRowsHtml}
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr>
      <td colspan="3" style="font-size:11px;padding:1px 0;">Sub Total:</td>
      <td style="font-size:11px;text-align:right;padding:1px 0;">${subtotal.toFixed(2)}</td>
    </tr>
    ${breakdownRowsHtml}
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr>
      <td colspan="2" style="font-size:13px;font-weight:bold;padding:1px 0;">Net Amount:</td>
      <td colspan="2" style="font-size:13px;font-weight:bold;text-align:right;padding:1px 0;">${printSymbol}${total.toFixed(2)}</td>
    </tr>
    ${upiHtml}
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr><td colspan="4" style="text-align:center;font-size:11px;font-weight:bold;padding-top:2px;">Thank You! Please visit again</td></tr>
  </table>
  <div style="height: 2mm;"></div>
</body>
</html>`;
}
