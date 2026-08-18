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
  totalDiscountAmount?: number;
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
  totalDiscountAmount = 0,
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
        <td style="padding:2px 0;font-size:11px;">${item.name}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${item.quantity}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${price.toFixed(0)}</td>
        <td style="padding:2px 0;font-size:11px;text-align:right;">${amt.toFixed(0)}</td>
      </tr>
    `;
    })
    .join("");

  // Build discount & adjustments rows HTML
  let discountRowsHtml = "";
  if (appliedPromotion && promotionDiscountAmount > 0) {
    discountRowsHtml += `<tr><td colspan="3" style="font-size:10px;">Promo (${appliedPromotion.name || appliedPromotion.promotion_code}):</td><td style="font-size:10px;text-align:right;">-${promotionDiscountAmount.toFixed(2)}</td></tr>`;
  }
  if (manualDiscountPercent > 0) {
    discountRowsHtml += `<tr><td colspan="3" style="font-size:10px;">Discount (${manualDiscountPercent}%):</td><td style="font-size:10px;text-align:right;">-${manualDiscountAmount.toFixed(2)}</td></tr>`;
  }
  if (totalDiscountAmount > 0) {
    discountRowsHtml += `<tr><td colspan="3" style="font-size:11px;font-weight:bold;">Total Discount:</td><td style="font-size:11px;font-weight:bold;text-align:right;">-${totalDiscountAmount.toFixed(2)}</td></tr>`;
  }
  if (customAdjustmentAmount !== 0) {
    const sign = customAdjustmentAmount > 0 ? "+" : "";
    const label = customAdjustmentAmount > 0 ? "Custom Adjustment / Charge:" : "Manual Adjustment:";
    discountRowsHtml += `<tr><td colspan="3" style="font-size:10px;font-weight:bold;">${label}</td><td style="font-size:10px;text-align:right;">${sign}${customAdjustmentAmount.toFixed(2)}</td></tr>`;
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
  @page { size: 58mm auto; margin: 4mm 2mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; width: 54mm; margin: 0; padding: 0; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .dash { border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; }
</style>
</head>
<body>
  ${savedLogo ? `<div class="center"><img src="${savedLogo}" crossorigin="anonymous" style="max-width:36px;max-height:36px;margin-bottom:2px;" /></div>` : ""}
  <div class="center bold" style="font-size:15px;">${rName}</div>
  ${restaurantInfo?.address ? `<div class="center" style="font-size:9px;">${restaurantInfo.address}</div>` : ""}
  ${restaurantInfo?.phone ? `<div class="center" style="font-size:9px;">Ph: ${restaurantInfo.phone}</div>` : ""}
  ${restaurantInfo?.gstin ? `<div class="center" style="font-size:9px;">GSTIN: ${restaurantInfo.gstin}</div>` : ""}
  <div class="dash"></div>
  <div style="font-size:10px;">Bill#: ${billNumber}</div>
  <div style="font-size:10px;">${toLine}</div>
  <div style="font-size:10px;">Date: ${currentDate}&nbsp;&nbsp;Time: ${currentTime}</div>
  ${customerName && tableNumber && customerName !== tableNumber ? `<div style="font-size:10px;">Guest: ${customerName}</div>` : ""}
  ${customerMobile ? `<div style="font-size:10px;">Phone: ${customerMobile}</div>` : ""}
  ${serverName ? `<div style="font-size:10px;">Server: ${serverName}</div>` : ""}
  <div class="dash"></div>
  <div class="center bold" style="font-size:11px;">Particulars</div>
  <table>
    <tr>
      <th style="font-size:10px;text-align:left;">Item</th>
      <th style="font-size:10px;text-align:right;">Qty</th>
      <th style="font-size:10px;text-align:right;">Rate</th>
      <th style="font-size:10px;text-align:right;">Amt</th>
    </tr>
    <tr><td colspan="4"><div style="border-top:1px solid #000;margin:2px 0;"></div></td></tr>
    ${itemRowsHtml}
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr>
      <td colspan="3" style="font-size:11px;">Sub Total:</td>
      <td style="font-size:11px;text-align:right;">${subtotal.toFixed(2)}</td>
    </tr>
    ${discountRowsHtml}
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr>
      <td colspan="2" style="font-size:14px;font-weight:bold;">Net Amount:</td>
      <td colspan="2" style="font-size:14px;font-weight:bold;text-align:right;">${printSymbol}${total.toFixed(2)}</td>
    </tr>
    ${upiHtml}
    <tr><td colspan="4"><div class="dash"></div></td></tr>
    <tr><td colspan="4" style="text-align:center;font-size:13px;font-weight:bold;padding-top:4px;">Thank You!</td></tr>
    <tr><td colspan="4" style="text-align:center;font-size:10px;color:#c00;">Please visit again</td></tr>
  </table>
</body>
</html>`;
}
