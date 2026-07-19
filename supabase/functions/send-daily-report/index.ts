import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface PaymentBreakdown {
  cash: number;
  upi: number;
  card: number;
  other: number;
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface OrderTypeBreakdown {
  counter: number;
  takeaway: number;
  delivery: number;
  dine_in: number;
}

interface ExpenseBreakdown {
  [category: string]: number;
}

interface DailySummaryData {
  totalOrders: number;
  totalRevenue: number;
  totalItemsSold: number;
  paymentBreakdown: PaymentBreakdown;
  topItems: TopItem[];
  orderTypeBreakdown: OrderTypeBreakdown;
  ncOrders: number;
  ncAmount: number;
  discountAmount: number;
  averageOrderValue: number;
  peakHour: string;
  totalExpenses: number;
  expenseBreakdown: ExpenseBreakdown;
  netProfit: number;
  inventoryCostFromOrders: number;
}

interface ScheduledReport {
  id: string;
  restaurant_id: string;
  report_time: string;
  timezone: string;
  send_whatsapp: boolean;
  send_email: boolean;
  whatsapp_numbers: string[];
  email_addresses: string[];
  last_sent_date: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Report Generation — same logic as DailySummaryDialog.tsx
// ═══════════════════════════════════════════════════════════════════════════

async function generateDailyReport(
  supabase: any,
  restaurantId: string,
  reportDate: string
): Promise<DailySummaryData> {
  // Use IST date range (UTC+5:30) to correctly capture today's orders
  const dayStart = `${reportDate}T00:00:00.000+05:30`;
  const dayEnd = `${reportDate}T23:59:59.999+05:30`;

  // 1. Fetch kitchen_orders
  const { data: orders } = await supabase
    .from("kitchen_orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  // 2. Fetch pos_transactions
  const { data: transactions } = await supabase
    .from("pos_transactions")
    .select(
      "amount, payment_method, status, discount_amount, created_at, split_payments"
    )
    .eq("restaurant_id", restaurantId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  // 3. Fetch expenses
  const { data: expensesData } = await supabase
    .from("expenses")
    .select("amount, category")
    .eq("restaurant_id", restaurantId)
    .gte("expense_date", reportDate)
    .lte("expense_date", reportDate);

  const allOrders = orders || [];
  const allTxns = (transactions || []).filter(
    (t: any) => t.status === "completed"
  );

  // ── Revenue ────────────────────────────────────────────────────────────
  const totalOrders = allOrders.length;
  const ncOrders = allOrders.filter(
    (o: any) => o.order_type === "nc" || o.order_type === "non-chargeable"
  );
  const totalRevenue = allTxns.reduce(
    (sum: number, t: any) => sum + (Number(t.amount) || 0),
    0
  );
  const ncAmount = 0;
  const discountAmount = allTxns.reduce(
    (sum: number, t: any) => sum + (Number(t.discount_amount) || 0),
    0
  );

  // ── Inventory Cost from Recipes ────────────────────────────────────────
  let inventoryCostFromOrders = 0;
  const menuItemQtyMap = new Map<
    string,
    { name: string; totalQty: number }
  >();

  allOrders.forEach((o: any) => {
    const items = (o.items as any[]) || [];
    items.forEach((item: any) => {
      const menuItemId = item.menuItemId;
      if (!menuItemId) return;
      const existing = menuItemQtyMap.get(menuItemId);
      if (existing) {
        existing.totalQty += item.quantity || 1;
      } else {
        menuItemQtyMap.set(menuItemId, {
          name: item.name || "Unknown",
          totalQty: item.quantity || 1,
        });
      }
    });
  });

  const menuItemIds = Array.from(menuItemQtyMap.keys());
  if (menuItemIds.length > 0) {
    const { data: recipes } = await supabase
      .from("recipes")
      .select("id, menu_item_id, total_cost")
      .eq("restaurant_id", restaurantId)
      .in("menu_item_id", menuItemIds);

    if (recipes && recipes.length > 0) {
      const recipesWithCost = recipes.filter(
        (r: any) => r.total_cost && r.total_cost > 0
      );
      const recipesWithoutCost = recipes.filter(
        (r: any) => !r.total_cost || r.total_cost <= 0
      );

      const menuItemCostMap = new Map<string, number>();
      recipesWithCost.forEach((r: any) => {
        if (r.menu_item_id) menuItemCostMap.set(r.menu_item_id, r.total_cost);
      });

      if (recipesWithoutCost.length > 0) {
        const recipeIds = recipesWithoutCost.map((r: any) => r.id);
        const { data: ingredients } = await supabase
          .from("recipe_ingredients")
          .select("recipe_id, quantity, cost_per_unit, total_cost")
          .in("recipe_id", recipeIds);

        if (ingredients) {
          const recipeCostMap = new Map<string, number>();
          ingredients.forEach((ing: any) => {
            const cost =
              ing.total_cost ||
              (ing.quantity || 0) * (ing.cost_per_unit || 0);
            recipeCostMap.set(
              ing.recipe_id,
              (recipeCostMap.get(ing.recipe_id) || 0) + cost
            );
          });
          recipesWithoutCost.forEach((r: any) => {
            if (r.menu_item_id) {
              const cost = recipeCostMap.get(r.id) || 0;
              if (cost > 0) menuItemCostMap.set(r.menu_item_id, cost);
            }
          });
        }
      }

      menuItemQtyMap.forEach(({ totalQty }, menuItemId) => {
        const recipeCost = menuItemCostMap.get(menuItemId) || 0;
        if (recipeCost > 0) {
          inventoryCostFromOrders += recipeCost * totalQty;
        }
      });
    }
  }

  // ── Expenses ───────────────────────────────────────────────────────────
  const expenseBreakdown: ExpenseBreakdown = {};
  let totalExpenses = 0;
  let hasManualInventoryExpense = false;

  (expensesData || []).forEach((e: any) => {
    const cat = e.category || "Other";
    const amt = Number(e.amount) || 0;
    if (cat.toLowerCase() === "inventory") hasManualInventoryExpense = true;
    expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amt;
    totalExpenses += amt;
  });

  if (inventoryCostFromOrders > 0 && !hasManualInventoryExpense) {
    expenseBreakdown["Inventory (from orders)"] =
      Math.round(inventoryCostFromOrders * 100) / 100;
    totalExpenses += Math.round(inventoryCostFromOrders * 100) / 100;
  }

  const netProfit = totalRevenue - totalExpenses;

  // ── Payment Breakdown ──────────────────────────────────────────────────
  const paymentBreakdown: PaymentBreakdown = {
    cash: 0,
    upi: 0,
    card: 0,
    other: 0,
  };

  allTxns.forEach((t: any) => {
    const method = (t.payment_method || "cash").toLowerCase();
    const amt = Number(t.amount) || 0;

    if (method === "split" && t.split_payments) {
      const splits: Array<{ method: string; amount: number }> = Array.isArray(
        t.split_payments
      )
        ? t.split_payments
        : [];
      splits.forEach((s) => {
        const m = (s.method || "").toLowerCase();
        const a = s.amount || 0;
        if (m.includes("cash")) paymentBreakdown.cash += a;
        else if (m.includes("upi")) paymentBreakdown.upi += a;
        else if (m.includes("card")) paymentBreakdown.card += a;
        else paymentBreakdown.other += a;
      });
    } else if (method.includes("cash")) paymentBreakdown.cash += amt;
    else if (method.includes("upi")) paymentBreakdown.upi += amt;
    else if (method.includes("card")) paymentBreakdown.card += amt;
    else paymentBreakdown.other += amt;
  });

  // ── Order Type Breakdown ───────────────────────────────────────────────
  const orderTypeBreakdown: OrderTypeBreakdown = {
    counter: 0,
    takeaway: 0,
    delivery: 0,
    dine_in: 0,
  };

  allOrders.forEach((o: any) => {
    const type = (o.order_type || "counter").toLowerCase();
    if (type.includes("delivery")) orderTypeBreakdown.delivery++;
    else if (type.includes("takeaway") || type.includes("take"))
      orderTypeBreakdown.takeaway++;
    else if (type.includes("dine")) orderTypeBreakdown.dine_in++;
    else orderTypeBreakdown.counter++;
  });

  // ── Top Items ──────────────────────────────────────────────────────────
  const itemMap = new Map<
    string,
    { quantity: number; revenue: number }
  >();

  allOrders.forEach((o: any) => {
    const items = (o.items as any[]) || [];
    items.forEach((item: any) => {
      const name = item.name || "Unknown";
      const qty = item.quantity || 1;
      const rev = (item.price || 0) * qty;
      const existing = itemMap.get(name) || { quantity: 0, revenue: 0 };
      itemMap.set(name, {
        quantity: existing.quantity + qty,
        revenue: existing.revenue + rev,
      });
    });
  });

  const topItems: TopItem[] = Array.from(itemMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const totalItemsSold = Array.from(itemMap.values()).reduce(
    (sum, d) => sum + d.quantity,
    0
  );

  // ── Peak Hour ──────────────────────────────────────────────────────────
  const hourMap = new Map<number, number>();
  allOrders.forEach((o: any) => {
    const hr = new Date(o.created_at).getHours();
    hourMap.set(hr, (hourMap.get(hr) || 0) + 1);
  });

  let peakHour = "";
  let maxCount = 0;
  hourMap.forEach((count, hr) => {
    if (count > maxCount) {
      maxCount = count;
      const ampm = hr >= 12 ? "PM" : "AM";
      const h12 = hr % 12 || 12;
      peakHour = `${h12}:00 ${ampm}`;
    }
  });

  // ── Average Order Value ────────────────────────────────────────────────
  const paidTxnCount = allTxns.filter(
    (t: any) => (t.payment_method || "").toLowerCase() !== "nc"
  ).length;
  const averageOrderValue =
    paidTxnCount > 0 ? totalRevenue / paidTxnCount : 0;

  return {
    totalOrders,
    totalRevenue,
    totalItemsSold,
    paymentBreakdown,
    topItems,
    orderTypeBreakdown,
    ncOrders: ncOrders.length,
    ncAmount,
    discountAmount,
    averageOrderValue,
    peakHour,
    totalExpenses,
    expenseBreakdown,
    netProfit,
    inventoryCostFromOrders:
      Math.round(inventoryCostFromOrders * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp Message Builder
// ═══════════════════════════════════════════════════════════════════════════

function buildWhatsAppMessage(
  summary: DailySummaryData,
  restaurantName: string,
  reportDate: string,
  currencySymbol: string = "₹"
): string {
  const topItemsText =
    summary.topItems.length > 0
      ? summary.topItems
          .map(
            (i, idx) =>
              `   ${idx + 1}. ${i.name} x${i.quantity} = ${currencySymbol}${i.revenue.toFixed(0)}`
          )
          .join("\n")
      : "   No items today";

  const extras: string[] = [];
  if (summary.ncOrders > 0)
    extras.push(
      `NC Orders: ${summary.ncOrders} (${currencySymbol}${summary.ncAmount.toFixed(2)})`
    );
  if (summary.discountAmount > 0)
    extras.push(
      `Discounts Given: ${currencySymbol}${summary.discountAmount.toFixed(2)}`
    );
  const extrasSection =
    extras.length > 0
      ? `\n------------------------------\n${extras.join("\n")}`
      : "";

  const expenseLines = Object.entries(summary.expenseBreakdown || {})
    .filter(([, v]) => v > 0)
    .map(
      ([cat, amt]) =>
        `   • ${cat}: ${currencySymbol}${amt.toFixed(0)}`
    )
    .join("\n");

  const plSection =
    summary.totalExpenses > 0 || summary.netProfit !== summary.totalRevenue
      ? `\n💸 *PROFIT & LOSS*\n──────────────────────────────\n💰 Revenue: ${currencySymbol}${summary.totalRevenue.toFixed(2)}\n💸 Expenses: ${currencySymbol}${(summary.totalExpenses || 0).toFixed(2)}${expenseLines ? "\n" + expenseLines : ""}\n${(summary.netProfit || 0) >= 0 ? "✅" : "🔻"} *Net ${(summary.netProfit || 0) >= 0 ? "Profit" : "Loss"}: ${currencySymbol}${Math.abs(summary.netProfit || 0).toFixed(2)}*`
      : "";

  return `⭐ *${restaurantName}* ⭐\n📊 Daily Sales Report\n📅 ${reportDate}\n══════════════════════════════\n\n🛒 Total Orders: *${summary.totalOrders}*\n💰 Total Revenue: *${currencySymbol}${summary.totalRevenue.toFixed(2)}*\n📦 Items Sold: *${summary.totalItemsSold}*\n🧾 Avg Order: *${currencySymbol}${summary.averageOrderValue.toFixed(2)}*\n⏰ Peak Hour: *${summary.peakHour || "N/A"}*\n\n💳 *PAYMENTS*\n──────────────────────────────\n💵 Cash: ${currencySymbol}${summary.paymentBreakdown.cash.toFixed(2)}\n📱 UPI: ${currencySymbol}${summary.paymentBreakdown.upi.toFixed(2)}\n💳 Card: ${currencySymbol}${summary.paymentBreakdown.card.toFixed(2)}\n${summary.paymentBreakdown.other > 0 ? `💴 Other: ${currencySymbol}${summary.paymentBreakdown.other.toFixed(2)}\n` : ""}\n🏆 *TOP ITEMS*\n──────────────────────────────\n${topItemsText}\n${extrasSection}${plSection}\n══════════════════════════════\n✨ Powered by *Swadeshi Solutions*\n══════════════════════════════`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Email HTML Builder
// ═══════════════════════════════════════════════════════════════════════════

function buildEmailHTML(
  summary: DailySummaryData,
  restaurantName: string,
  reportDate: string,
  currencySymbol: string = "₹"
): string {
  const topItemsRows = summary.topItems
    .map(
      (i, idx) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #edf2f7;">${idx + 1}. ${i.name}</td><td style="padding:8px 12px;border-bottom:1px solid #edf2f7;text-align:center;">${i.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #edf2f7;text-align:right;">${currencySymbol}${i.revenue.toFixed(0)}</td></tr>`
    )
    .join("");

  const expenseRows = Object.entries(summary.expenseBreakdown || {})
    .filter(([, v]) => v > 0)
    .map(
      ([cat, amt]) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #edf2f7;color:#718096;padding-left:24px;">• ${cat}</td><td style="padding:6px 12px;border-bottom:1px solid #edf2f7;text-align:right;color:#e53e3e;">-${currencySymbol}${amt.toFixed(0)}</td></tr>`
    )
    .join("");

  const profitColor = summary.netProfit >= 0 ? "#38a169" : "#e53e3e";
  const profitLabel = summary.netProfit >= 0 ? "Net Profit" : "Net Loss";
  const profitIcon = summary.netProfit >= 0 ? "✅" : "🔻";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f7fafc;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#f97316 0%,#ec4899 100%);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">📊 Daily Sales Report</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0 0;font-size:16px;">${restaurantName}</p>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0 0;font-size:14px;">📅 ${reportDate}</p>
  </div>

  <div style="background:white;padding:30px;border-radius:0 0 16px 16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

    <!-- Key Metrics -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="width:50%;padding:12px;background:#f0f9ff;border-radius:12px 0 0 0;">
          <p style="margin:0;color:#4299e1;font-size:12px;text-transform:uppercase;font-weight:600;">Total Orders</p>
          <p style="margin:4px 0 0 0;font-size:28px;font-weight:700;color:#2d3748;">${summary.totalOrders}</p>
        </td>
        <td style="width:50%;padding:12px;background:#f0fff4;border-radius:0 12px 0 0;">
          <p style="margin:0;color:#38a169;font-size:12px;text-transform:uppercase;font-weight:600;">Revenue</p>
          <p style="margin:4px 0 0 0;font-size:28px;font-weight:700;color:#2d3748;">${currencySymbol}${summary.totalRevenue.toFixed(2)}</p>
        </td>
      </tr>
      <tr>
        <td style="width:50%;padding:12px;background:#faf5ff;border-radius:0 0 0 12px;">
          <p style="margin:0;color:#805ad5;font-size:12px;text-transform:uppercase;font-weight:600;">Avg Order</p>
          <p style="margin:4px 0 0 0;font-size:28px;font-weight:700;color:#2d3748;">${currencySymbol}${summary.averageOrderValue.toFixed(0)}</p>
        </td>
        <td style="width:50%;padding:12px;background:#fff5f5;border-radius:0 0 12px 0;">
          <p style="margin:0;color:#e53e3e;font-size:12px;text-transform:uppercase;font-weight:600;">Peak Hour</p>
          <p style="margin:4px 0 0 0;font-size:28px;font-weight:700;color:#2d3748;">${summary.peakHour || "N/A"}</p>
        </td>
      </tr>
    </table>

    <!-- Payment Breakdown -->
    <h3 style="color:#2d3748;margin:0 0 12px 0;font-size:16px;">💳 Payment Breakdown</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#f7fafc;border-radius:8px;">
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;">💵 Cash</td>
        <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:600;">${currencySymbol}${summary.paymentBreakdown.cash.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;">📱 UPI</td>
        <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:600;">${currencySymbol}${summary.paymentBreakdown.upi.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;">💳 Card</td>
        <td style="padding:10px 12px;border-bottom:1px solid #edf2f7;text-align:right;font-weight:600;">${currencySymbol}${summary.paymentBreakdown.card.toFixed(2)}</td>
      </tr>
      ${summary.paymentBreakdown.other > 0 ? `<tr>
        <td style="padding:10px 12px;">💴 Other</td>
        <td style="padding:10px 12px;text-align:right;font-weight:600;">${currencySymbol}${summary.paymentBreakdown.other.toFixed(2)}</td>
      </tr>` : ""}
    </table>

    <!-- Top Items -->
    ${summary.topItems.length > 0 ? `
    <h3 style="color:#2d3748;margin:0 0 12px 0;font-size:16px;">🏆 Top Selling Items</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#f7fafc;border-radius:8px;">
      <tr style="background:#edf2f7;">
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#4a5568;">Item</th>
        <th style="padding:10px 12px;text-align:center;font-size:13px;color:#4a5568;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:13px;color:#4a5568;">Revenue</th>
      </tr>
      ${topItemsRows}
    </table>
    ` : ""}

    <!-- P&L Section -->
    <div style="background:linear-gradient(135deg,#eef2ff,#faf5ff);padding:20px;border-radius:12px;margin-bottom:24px;">
      <h3 style="color:#4338ca;margin:0 0 16px 0;font-size:16px;">💸 Profit & Loss</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(99,102,241,0.2);">💰 Revenue</td>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(99,102,241,0.2);text-align:right;font-weight:600;color:#38a169;">+${currencySymbol}${summary.totalRevenue.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(99,102,241,0.2);">💸 Expenses</td>
          <td style="padding:8px 12px;border-bottom:1px solid rgba(99,102,241,0.2);text-align:right;font-weight:600;color:#e53e3e;">-${currencySymbol}${(summary.totalExpenses || 0).toFixed(2)}</td>
        </tr>
        ${expenseRows}
        <tr style="border-top:2px solid #4338ca;">
          <td style="padding:12px;font-weight:700;font-size:16px;color:${profitColor};">${profitIcon} ${profitLabel}</td>
          <td style="padding:12px;text-align:right;font-weight:700;font-size:20px;color:${profitColor};">${currencySymbol}${Math.abs(summary.netProfit || 0).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <!-- Items Sold + Order Types -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:10px;background:#f0f9ff;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#4299e1;font-size:11px;text-transform:uppercase;">Items Sold</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;">${summary.totalItemsSold}</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:10px;background:#f0fff4;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#38a169;font-size:11px;text-transform:uppercase;">Counter</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;">${summary.orderTypeBreakdown.counter}</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:10px;background:#fff5f5;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#e53e3e;font-size:11px;text-transform:uppercase;">Takeaway</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;">${summary.orderTypeBreakdown.takeaway}</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:10px;background:#faf5ff;border-radius:8px;text-align:center;">
          <p style="margin:0;color:#805ad5;font-size:11px;text-transform:uppercase;">Delivery</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:700;">${summary.orderTypeBreakdown.delivery}</p>
        </td>
      </tr>
    </table>

    ${summary.ncOrders > 0 || summary.discountAmount > 0 ? `
    <div style="background:#fffbeb;padding:12px;border-radius:8px;margin-bottom:24px;border:1px solid #fef3c7;">
      ${summary.ncOrders > 0 ? `<p style="margin:0;color:#92400e;font-size:13px;">🚫 NC Orders: <strong>${summary.ncOrders}</strong></p>` : ""}
      ${summary.discountAmount > 0 ? `<p style="margin:${summary.ncOrders > 0 ? "4px" : "0"} 0 0;color:#92400e;font-size:13px;">🏷️ Discounts: <strong>${currencySymbol}${summary.discountAmount.toFixed(2)}</strong></p>` : ""}
    </div>
    ` : ""}

  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px;">
    <p style="color:#a0aec0;font-size:12px;margin:0;">Powered by <strong>Swadeshi Solutions</strong></p>
    <p style="color:#cbd5e0;font-size:11px;margin:4px 0 0 0;">www.swadeshisolutions.co.in</p>
  </div>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Email Sender — Titan SMTP
// ═══════════════════════════════════════════════════════════════════════════

async function sendEmailViaTitan(
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  const smtpPass = Deno.env.get("TITAN_SMTP_PASS");
  const smtpUser = "inquiry@swadeshisolutions.co.in";
  const smtpHost = "smtp.titan.email";
  const smtpPort = 465;

  if (!smtpPass) {
    // Fallback: try existing SMTP config
    const fallbackUser = Deno.env.get("SMTP_USER");
    const fallbackPass = Deno.env.get("SMTP_PASS");
    if (fallbackUser && fallbackPass) {
      try {
        const client = new SMTPClient({
          connection: {
            hostname: Deno.env.get("SMTP_HOST") || "smtp.gmail.com",
            port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
            tls: true,
            auth: { username: fallbackUser, password: fallbackPass },
          },
        });
        await client.send({
          from: `Swadeshi Solutions <${fallbackUser}>`,
          to,
          subject,
          html: htmlContent.replace(/\r?\n/g, "\r\n"),
        });
        await client.close();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: `Fallback SMTP failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
    return { success: false, error: "TITAN_SMTP_PASS not configured" };
  }

  // Try port 587 (STARTTLS) first, then fallback to 465 (SSL)
  // Titan may block 465 from cloud/Supabase IPs
  const portConfigs = [
    { port: 587, tls: false },
    { port: 465, tls: true },
  ];

  let lastError: any;
  for (const cfg of portConfigs) {
    let client: any;
    try {
      client = new SMTPClient({
        connection: {
          hostname: smtpHost,
          port: cfg.port,
          tls: cfg.tls,
          auth: { username: smtpUser, password: smtpPass },
        },
      });

      await client.send({
        from: `Swadeshi Solutions <${smtpUser}>`,
        to,
        subject,
        html: htmlContent.replace(/\r?\n/g, "\r\n"),
      });

      await client.close();
      console.log(`📧 Email sent to ${to} via Titan SMTP port ${cfg.port}`);
      return { success: true };
    } catch (err) {
      lastError = err;
      console.warn(`SMTP port ${cfg.port} failed: ${err instanceof Error ? err.message : String(err)}`);
      try { await client?.close(); } catch { /* ignore */ }
    }
  }

  console.error("All Titan SMTP ports failed:", lastError);
  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp Sender — via send-whatsapp-unified (Meta Cloud API)
// ═══════════════════════════════════════════════════════════════════════════

async function sendWhatsAppReport(
  supabase: any,
  phoneNumber: string,
  message: string,
  restaurantId: string,
  restaurantName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use the existing send-whatsapp-unified edge function
    // But since templates need pre-approval, we'll use the WhatsApp Cloud API
    // to send a text message directly (if business account allows it)
    // OR use a pre-approved template

    // For now: invoke send-whatsapp-unified with a template
    // If template not ready, fallback to direct text message via Cloud API

    // Try template first
    const { data: platformConfig } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "whatsapp")
      .maybeSingle();

    const cfg = platformConfig?.value as any;
    const phoneNumberId =
      cfg?.meta_config?.phone_number_id ||
      Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const accessToken =
      cfg?.meta_config?.access_token ||
      Deno.env.get("WHATSAPP_ACCESS_TOKEN");

    if (!phoneNumberId || !accessToken) {
      console.warn("WhatsApp Cloud API credentials not configured");
      return {
        success: false,
        error: "WhatsApp Cloud API credentials not configured",
      };
    }

    // Clean phone number
    let cleanPhone = phoneNumber.replace(/[\+\-\s]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    // --- Try approved template first (required for business-initiated outside 24h) ---
    const templatePayload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "template",
      template: {
        name: "daily_sales_report",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: restaurantName },
              { type: "text", text: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) },
              { type: "text", text: String(message.match(/Total Orders: \*(\d+)\*/)?.[1] || "0") },
              { type: "text", text: (message.match(/Total Revenue: \*[^0-9]*([\d,.]+)\*/)?.[1] || "0") },
              { type: "text", text: (message.match(/Items Sold: \*(\d+)\*/)?.[1] || "0") },
              { type: "text", text: (message.match(/Avg Order: \*[^0-9]*([\d,.]+)\*/)?.[1] || "0") },
              { type: "text", text: (message.match(/Peak Hour: \*([^*]+)\*/)?.[1] || "N/A") },
              { type: "text", text: (message.match(/💵 Cash:[^\n]+\n📱 UPI:[^\n]+\n💳 Card:[^\n]+/)?.[0]?.replace(/[*]/g, "") || "N/A") },
              { type: "text", text: (message.match(/🏆 \*TOP ITEMS\*[^═]*/s)?.[0]?.split("\n").slice(2, 7).join("\n") || "N/A") },
              { type: "text", text: (message.match(/💸 \*PROFIT[^═]*/s)?.[0] || "") },
            ],
          },
        ],
      },
    };

    let res = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      }
    );

    let data = await res.json();

    // Fallback to plain text if template fails
    if (!res.ok) {
      console.warn("Template send failed, trying plain text:", data?.error?.message);
      const textPayload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: message },
      };
      res = await fetch(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(textPayload),
        }
      );
      data = await res.json();
    }

    if (!res.ok) {
      console.error("WhatsApp API error:", data);
      return {
        success: false,
        error: `WhatsApp API error: ${JSON.stringify(data?.error?.message || data)}`,
      };
    }

    console.log(`📱 WhatsApp sent to ${cleanPhone}`);
    return { success: true };
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional body for test/manual trigger
    let targetRestaurantId: string | null = null;
    try {
      const body = await req.json();
      targetRestaurantId = body.restaurantId || null;
    } catch {
      // No body — cron trigger
    }

    // ── Find due restaurants ─────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("scheduled_report_settings")
      .select("*")
      .eq("is_enabled", true);

    if (targetRestaurantId) {
      // Manual/test trigger for specific restaurant
      query = query.eq("restaurant_id", targetRestaurantId);
    } else {
      // Cron trigger — skip already sent today
      query = query.or(`last_sent_date.is.null,last_sent_date.neq.${today}`);
    }

    const { data: dueReports, error: queryError } = await query;

    if (queryError) {
      console.error("Query error:", queryError);
      return new Response(
        JSON.stringify({ success: false, error: queryError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!dueReports || dueReports.length === 0) {
      console.log("No reports due at this time");
      return new Response(
        JSON.stringify({ success: true, message: "No reports due", count: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter by time — only send if current time >= report_time in restaurant's timezone
    const now = new Date();
    const dueNow = targetRestaurantId
      ? dueReports // Manual trigger: skip time check
      : dueReports.filter((r: ScheduledReport) => {
          try {
            const tz = r.timezone || "Asia/Kolkata";
            const localTimeStr = now.toLocaleTimeString("en-GB", {
              timeZone: tz,
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            });
            // Compare HH:MM
            const reportTime = r.report_time.substring(0, 5); // "23:00"
            return localTimeStr >= reportTime;
          } catch {
            return false;
          }
        });

    if (dueNow.length === 0) {
      console.log("No reports due at current time");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No reports due at current time",
          count: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing ${dueNow.length} due reports`);

    const results: any[] = [];

    for (const report of dueNow) {
      const restaurantId = report.restaurant_id;
      console.log(`\n━━━ Processing restaurant: ${restaurantId} ━━━`);

      try {
        // Get restaurant details
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name, currency")
          .eq("id", restaurantId)
          .single();

        const restaurantName = restaurant?.name || "Restaurant";
        const currencySymbol = restaurant?.currency || "₹";

        // Generate report
        const summary = await generateDailyReport(
          supabase,
          restaurantId,
          today
        );

        console.log(
          `Report generated: ${summary.totalOrders} orders, ${currencySymbol}${summary.totalRevenue} revenue`
        );

        // Save to daily_summary_reports
        const reportData = {
          restaurant_id: restaurantId,
          report_date: today,
          total_orders: summary.totalOrders,
          total_revenue: summary.totalRevenue,
          total_items_sold: summary.totalItemsSold,
          payment_breakdown: summary.paymentBreakdown,
          top_items: summary.topItems,
          order_type_breakdown: summary.orderTypeBreakdown,
          nc_orders: summary.ncOrders,
          nc_amount: summary.ncAmount,
          discount_amount: summary.discountAmount,
          average_order_value: summary.averageOrderValue,
          peak_hour: summary.peakHour,
          total_expenses: summary.totalExpenses,
          expense_breakdown: summary.expenseBreakdown,
          net_profit: summary.netProfit,
          inventory_cost: summary.inventoryCostFromOrders,
        };

        await supabase
          .from("daily_summary_reports")
          .upsert(reportData, {
            onConflict: "restaurant_id,report_date",
          });

        // ── Send WhatsApp ─────────────────────────────────────────────────
        const deliveryStatus: any = { sent_at: new Date().toISOString() };

        if (
          report.send_whatsapp &&
          report.whatsapp_numbers &&
          report.whatsapp_numbers.length > 0
        ) {
          const waMessage = buildWhatsAppMessage(
            summary,
            restaurantName,
            today,
            currencySymbol
          );

          for (const phone of report.whatsapp_numbers) {
            if (!phone.trim()) continue;
            const waResult = await sendWhatsAppReport(
              supabase,
              phone.trim(),
              waMessage,
              restaurantId,
              restaurantName
            );
            console.log(
              `WhatsApp to ${phone}: ${waResult.success ? "✅" : "❌ " + waResult.error}`
            );
          }
          deliveryStatus.whatsapp = "sent";
        }

        // ── Send Email ────────────────────────────────────────────────────
        if (
          report.send_email &&
          report.email_addresses &&
          report.email_addresses.length > 0
        ) {
          const emailHTML = buildEmailHTML(
            summary,
            restaurantName,
            today,
            currencySymbol
          );
          const emailSubject = `📊 Daily Report — ${restaurantName} — ${today}`;

          for (const email of report.email_addresses) {
            if (!email.trim()) continue;
            const emailResult = await sendEmailViaTitan(
              email.trim(),
              emailSubject,
              emailHTML
            );
            console.log(
              `Email to ${email}: ${emailResult.success ? "✅" : "❌ " + emailResult.error}`
            );
          }
          deliveryStatus.email = "sent";
        }

        // ── Update tracking ──────────────────────────────────────────────
        await supabase
          .from("scheduled_report_settings")
          .update({
            last_sent_date: today,
            last_delivery_status: deliveryStatus,
          })
          .eq("id", report.id);

        // Update daily_summary_reports delivery_status
        await supabase
          .from("daily_summary_reports")
          .update({ delivery_status: deliveryStatus })
          .eq("restaurant_id", restaurantId)
          .eq("report_date", today);

        results.push({
          restaurantId,
          restaurantName,
          success: true,
          orders: summary.totalOrders,
          revenue: summary.totalRevenue,
        });
      } catch (err) {
        console.error(`Error processing ${restaurantId}:`, err);
        results.push({
          restaurantId,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    console.log(`\n━━━ Done. Processed ${results.length} restaurants ━━━`);

    return new Response(
      JSON.stringify({
        success: true,
        count: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Fatal error in send-daily-report:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
