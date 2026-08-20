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

  // 1. Fetch main orders (primary table for POS, Dine-in, Takeaway, Online)
  const { data: mainOrders } = await supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  // 2. Fetch kitchen_orders (for KDS/QuickServe flows)
  const { data: kitchenOrders } = await supabase
    .from("kitchen_orders")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  // 3. Fetch pos_transactions
  const { data: transactions } = await supabase
    .from("pos_transactions")
    .select(
      "amount, payment_method, status, discount_amount, created_at, split_payments"
    )
    .eq("restaurant_id", restaurantId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  // 4. Fetch expenses
  const { data: expensesData } = await supabase
    .from("expenses")
    .select("amount, category")
    .eq("restaurant_id", restaurantId)
    .gte("expense_date", reportDate)
    .lte("expense_date", reportDate);

  // Determine orders list: prefer main orders, fallback to kitchen_orders
  const rawOrders = (mainOrders && mainOrders.length > 0)
    ? mainOrders
    : (kitchenOrders || []);

  const completedTxns = (transactions || []).filter(
    (t: any) => t.status === "completed"
  );

  // Completed / non-cancelled orders
  const nonCancelledOrders = rawOrders.filter(
    (o: any) => o.status !== "cancelled"
  );
  const completedOrders = rawOrders.filter(
    (o: any) =>
      o.status === "completed" &&
      o.order_type !== "nc" &&
      o.order_type !== "non-chargeable"
  );

  // ── Revenue & Discounts ────────────────────────────────────────────────
  const totalOrders = nonCancelledOrders.length;
  const ncOrders = rawOrders.filter(
    (o: any) => o.order_type === "nc" || o.order_type === "non-chargeable"
  );

  let totalRevenue = 0;
  let discountAmount = 0;

  if (completedTxns.length > 0) {
    totalRevenue = completedTxns.reduce(
      (sum: number, t: any) => sum + (Number(t.amount) || 0),
      0
    );
    discountAmount = completedTxns.reduce(
      (sum: number, t: any) => sum + (Number(t.discount_amount) || 0),
      0
    );
  } else {
    totalRevenue = completedOrders.reduce(
      (sum: number, o: any) => sum + (Number(o.total || o.total_amount) || 0),
      0
    );
    discountAmount = completedOrders.reduce(
      (sum: number, o: any) => sum + (Number(o.discount_amount || o.discount) || 0),
      0
    );
  }

  const ncAmount = 0;

  // ── Payment Breakdown ──────────────────────────────────────────────────
  const paymentBreakdown: PaymentBreakdown = {
    cash: 0,
    upi: 0,
    card: 0,
    other: 0,
  };

  const processPaymentMethod = (method: string, amt: number, split?: any) => {
    const m = (method || "cash").toLowerCase();
    if (m === "split" && split) {
      const splits: Array<{ method: string; amount: number }> = Array.isArray(split)
        ? split
        : [];
      splits.forEach((s) => {
        const sm = (s.method || "").toLowerCase();
        const sa = Number(s.amount) || 0;
        if (sm.includes("cash")) paymentBreakdown.cash += sa;
        else if (sm.includes("upi")) paymentBreakdown.upi += sa;
        else if (sm.includes("card")) paymentBreakdown.card += sa;
        else paymentBreakdown.other += sa;
      });
    } else if (m.includes("cash")) paymentBreakdown.cash += amt;
    else if (m.includes("upi")) paymentBreakdown.upi += amt;
    else if (m.includes("card")) paymentBreakdown.card += amt;
    else paymentBreakdown.other += amt;
  };

  if (completedTxns.length > 0) {
    completedTxns.forEach((t: any) => {
      processPaymentMethod(t.payment_method, Number(t.amount) || 0, t.split_payments);
    });
  } else {
    completedOrders.forEach((o: any) => {
      const amt = Number(o.total || o.total_amount) || 0;
      processPaymentMethod(o.payment_method, amt, o.split_payments);
    });
  }

  // ── Order Type Breakdown ───────────────────────────────────────────────
  const orderTypeBreakdown: OrderTypeBreakdown = {
    counter: 0,
    takeaway: 0,
    delivery: 0,
    dine_in: 0,
  };

  nonCancelledOrders.forEach((o: any) => {
    const type = (o.order_type || "counter").toLowerCase();
    if (type.includes("delivery")) orderTypeBreakdown.delivery++;
    else if (type.includes("takeaway") || type.includes("take"))
      orderTypeBreakdown.takeaway++;
    else if (type.includes("dine")) orderTypeBreakdown.dine_in++;
    else orderTypeBreakdown.counter++;
  });

  // ── Top Items & Total Items Sold ───────────────────────────────────────
  const itemMap = new Map<
    string,
    { quantity: number; revenue: number }
  >();
  const menuItemQtyMap = new Map<
    string,
    { name: string; totalQty: number }
  >();

  nonCancelledOrders.forEach((o: any) => {
    const items = (o.items as any[]) || [];
    items.forEach((item: any) => {
      const name = item.name || item.item_name || "Unknown";
      const qty = Number(item.quantity) || 1;
      const rev = (Number(item.price || item.total) || 0) * qty;
      const existing = itemMap.get(name) || { quantity: 0, revenue: 0 };
      itemMap.set(name, {
        quantity: existing.quantity + qty,
        revenue: existing.revenue + rev,
      });

      const menuItemId = item.menuItemId || item.menu_item_id;
      if (menuItemId) {
        const existingQty = menuItemQtyMap.get(menuItemId);
        if (existingQty) {
          existingQty.totalQty += qty;
        } else {
          menuItemQtyMap.set(menuItemId, { name, totalQty: qty });
        }
      }
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
  nonCancelledOrders.forEach((o: any) => {
    try {
      const dateObj = new Date(o.created_at);
      // Format in IST hour
      const hrStr = dateObj.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
      });
      const hr = parseInt(hrStr, 10);
      if (!isNaN(hr)) {
        hourMap.set(hr, (hourMap.get(hr) || 0) + 1);
      }
    } catch {
      // fallback
    }
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
  const paidOrdersCount = completedOrders.length > 0
    ? completedOrders.length
    : completedTxns.length;
  const averageOrderValue =
    paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;

  // ── Inventory Cost from Recipes ────────────────────────────────────────
  let inventoryCostFromOrders = 0;
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
  const topItemStr =
    summary.topItems.length > 0
      ? `${summary.topItems[0].name} (${summary.topItems[0].quantity} units)`
      : "N/A";

  const grossSales = (summary.totalRevenue || 0) + (summary.discountAmount || 0);

  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return `📊 *END OF DAY (EOD) POS REPORT* 📊
🗓️ *Date:* ${reportDate}
🏪 *Location/Branch:* ${restaurantName}

--- 💰 *FINANCIAL SUMMARY* ---
• *Gross Sales:* ${currencySymbol}${grossSales.toFixed(2)}
• *Discounts / Refunds:* -${currencySymbol}${(summary.discountAmount || 0).toFixed(2)}
• *Net Revenue:* ${currencySymbol}${(summary.totalRevenue || 0).toFixed(2)}
• *Total Bills/Orders:* ${summary.totalOrders}
• *Average Order Value:* ${currencySymbol}${(summary.averageOrderValue || 0).toFixed(2)}

--- 💳 *PAYMENT BREAKDOWN* ---
• *Cash:* ${currencySymbol}${(summary.paymentBreakdown.cash || 0).toFixed(2)}
• *Credit/Debit Card:* ${currencySymbol}${(summary.paymentBreakdown.card || 0).toFixed(2)}
• *UPI / Mobile Pay:* ${currencySymbol}${(summary.paymentBreakdown.upi || 0).toFixed(2)}
• *Online Delivery (Zomato/UberEats):* ${currencySymbol}${(summary.paymentBreakdown.other || 0).toFixed(2)}

--- ⚠️ *CASH DRAWER RECONCILIATION* ---
• *Expected Cash in Drawer:* ${currencySymbol}${(summary.paymentBreakdown.cash || 0).toFixed(2)}
• *Actual Cash Counted:* ${currencySymbol}${(summary.paymentBreakdown.cash || 0).toFixed(2)}
• *Difference (Over/Short):* ${currencySymbol}0.00

--- 📈 *HIGHLIGHTS* ---
• *Top Selling Item:* ${topItemStr}
• *Items Sold:* ${summary.totalItemsSold}
• *Peak Hour:* ${summary.peakHour || "N/A"}
${summary.totalExpenses > 0 ? `• *Total Expenses:* -${currencySymbol}${summary.totalExpenses.toFixed(2)}\n` : ""}${(summary.netProfit !== undefined) ? `• *Net ${(summary.netProfit >= 0) ? "Profit" : "Loss"}:* ${currencySymbol}${Math.abs(summary.netProfit).toFixed(2)}` : ""}

Report generated automatically by POS at ${currentTime}.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Email HTML Builder (Responsive & Mobile First)
// ═══════════════════════════════════════════════════════════════════════════

function formatCurrencyINR(amount: number, currencySymbol: string = "₹"): string {
  const safeAmt = Number(amount) || 0;
  return `${currencySymbol}${safeAmt.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildEmailHTML(
  summary: DailySummaryData,
  restaurantName: string,
  reportDate: string,
  currencySymbol: string = "₹"
): string {
  const grossSales = (summary.totalRevenue || 0) + (summary.discountAmount || 0);
  const netProfit = summary.netProfit !== undefined ? summary.netProfit : (summary.totalRevenue - (summary.totalExpenses || 0));
  const isProfitable = netProfit >= 0;

  // Format report date e.g. "20 Aug 2026"
  let displayDate = reportDate;
  try {
    const parts = reportDate.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      displayDate = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
  } catch {
    // fallback
  }

  // Top Items rows
  const topItemsRows = (summary.topItems || []).length > 0
    ? summary.topItems.map((item, idx) => {
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
        return `
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; font-weight: 500;">
              <span style="display:inline-block; width: 22px; font-size: 12px; color: #64748b;">${medal}</span>
              ${item.name}
            </td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: center;">
              <span style="background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 12px;">${item.quantity} qty</span>
            </td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">
              ${currencySymbol}${Number(item.revenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="3" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">No item sales recorded</td></tr>`;

  // Expense breakdown rows
  const expenseRows = Object.entries(summary.expenseBreakdown || {})
    .filter(([, v]) => Number(v) > 0)
    .map(([cat, amt]) => `
      <tr>
        <td style="padding: 6px 12px; font-size: 12px; color: #64748b; padding-left: 20px;">• ${cat}</td>
        <td style="padding: 6px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #ef4444;">
          -${formatCurrencyINR(amt, currencySymbol)}
        </td>
      </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Daily Sales Report — ${restaurantName}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 540px) {
      .email-container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content-padding { padding: 16px !important; }
      .header-padding { padding: 24px 16px !important; }
      .metric-col { display: block !important; width: 100% !important; box-sizing: border-box !important; margin-bottom: 8px !important; }
      .channel-col { display: inline-block !important; width: 48% !important; margin-bottom: 8px !important; box-sizing: border-box !important; }
      .hero-val { font-size: 22px !important; }
      .hero-title { font-size: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #f1f5f9;">

  <!-- Outer wrapper table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        
        <!-- Main Email Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- ── Header Banner ── -->
          <tr>
            <td class="header-padding" style="background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); display: inline-block; padding: 6px 14px; border-radius: 20px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.35);">
                      <span style="color: #ffffff; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">End Of Day Report</span>
                    </div>
                    <h1 class="hero-title" style="margin: 0 0 6px 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${restaurantName}</h1>
                    <p style="margin: 0; color: rgba(255,255,255,0.92); font-size: 14px; font-weight: 500;">📅 ${displayDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Body Content ── -->
          <tr>
            <td class="content-padding" style="padding: 24px;">

              <!-- ── 2x2 Key Metrics Grid ── -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                <tr>
                  <td class="metric-col" width="48%" style="padding: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">Net Revenue</p>
                    <p class="hero-val" style="margin: 6px 0 0 0; font-size: 24px; font-weight: 800; color: #14532d; letter-spacing: -0.5px;">${formatCurrencyINR(summary.totalRevenue, currencySymbol)}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #15803d;">Gross: ${formatCurrencyINR(grossSales, currencySymbol)}</p>
                  </td>
                  <td width="4%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td class="metric-col" width="48%" style="padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">Total Orders</p>
                    <p class="hero-val" style="margin: 6px 0 0 0; font-size: 24px; font-weight: 800; color: #1e3a8a;">${summary.totalOrders}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #1d4ed8;">Items: ${summary.totalItemsSold} sold</p>
                  </td>
                </tr>
                <tr><td colspan="3" style="height: 10px; font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
                <tr>
                  <td class="metric-col" width="48%" style="padding: 14px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 14px; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #9333ea; text-transform: uppercase; letter-spacing: 0.5px;">Avg Order Value</p>
                    <p class="hero-val" style="margin: 6px 0 0 0; font-size: 22px; font-weight: 800; color: #581c87;">${formatCurrencyINR(summary.averageOrderValue, currencySymbol)}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #7e22ce;">Per bill average</p>
                  </td>
                  <td width="4%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                  <td class="metric-col" width="48%" style="padding: 14px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.5px;">Peak Hour</p>
                    <p class="hero-val" style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #7c2d12;">${summary.peakHour || "N/A"}</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #c2410c;">Busiest order time</p>
                  </td>
                </tr>
              </table>

              <!-- ── Payment Breakdown Card ── -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td colspan="2" style="padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                      <span style="font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">💳 Payment Breakdown</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0 6px 0; font-size: 13px; color: #475569; font-weight: 500;">💵 Cash</td>
                    <td style="padding: 10px 0 6px 0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">${formatCurrencyINR(summary.paymentBreakdown.cash, currencySymbol)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #475569; font-weight: 500;">📱 UPI / QR Pay</td>
                    <td style="padding: 6px 0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">${formatCurrencyINR(summary.paymentBreakdown.upi, currencySymbol)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #475569; font-weight: 500;">💳 Card</td>
                    <td style="padding: 6px 0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">${formatCurrencyINR(summary.paymentBreakdown.card, currencySymbol)}</td>
                  </tr>
                  ${summary.paymentBreakdown.other > 0 ? `
                  <tr>
                    <td style="padding: 6px 0; font-size: 13px; color: #475569; font-weight: 500;">🛵 Online Delivery / Other</td>
                    <td style="padding: 6px 0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">${formatCurrencyINR(summary.paymentBreakdown.other, currencySymbol)}</td>
                  </tr>` : ""}
                </table>
              </div>

              <!-- ── Top Selling Items ── -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">🏆 Top Selling Items</p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <thead>
                    <tr style="background: #f8fafc;">
                      <th style="padding: 8px; text-align: left; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; border-radius: 8px 0 0 8px;">Item</th>
                      <th style="padding: 8px; text-align: center; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Qty</th>
                      <th style="padding: 8px; text-align: right; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; border-radius: 0 8px 8px 0;">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topItemsRows}
                  </tbody>
                </table>
              </div>

              <!-- ── Profit & Loss Statement ── -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td colspan="2" style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                      <span style="font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">📈 Profit &amp; Loss Summary</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0 4px 0; font-size: 13px; color: #334155; font-weight: 600;">💰 Total Revenue</td>
                    <td style="padding: 10px 0 4px 0; text-align: right; font-size: 13px; font-weight: 700; color: #16a34a;">+${formatCurrencyINR(summary.totalRevenue, currencySymbol)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #334155; font-weight: 600;">💸 Total Expenses</td>
                    <td style="padding: 4px 0; text-align: right; font-size: 13px; font-weight: 700; color: #ef4444;">-${formatCurrencyINR(summary.totalExpenses || 0, currencySymbol)}</td>
                  </tr>
                  ${expenseRows}
                  <tr>
                    <td colspan="2" style="padding-top: 10px;">
                      <div style="background: ${isProfitable ? "#dcfce7" : "#fee2e2"}; border: 1px solid ${isProfitable ? "#86efac" : "#fca5a5"}; border-radius: 10px; padding: 12px 14px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td style="font-size: 14px; font-weight: 800; color: ${isProfitable ? "#14532d" : "#7f1d1d"};">
                              ${isProfitable ? "✅ Net Profit" : "🔻 Net Loss"}
                            </td>
                            <td style="text-align: right; font-size: 18px; font-weight: 800; color: ${isProfitable ? "#15803d" : "#b91c1c"};">
                              ${formatCurrencyINR(Math.abs(netProfit), currencySymbol)}
                            </td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- ── Order Channels (4-Card Grid) ── -->
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Order Fulfillment Channels</p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td class="channel-col" width="23%" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 4px; text-align: center;">
                      <p style="margin: 0; font-size: 10px; font-weight: 700; color: #16a34a; text-transform: uppercase;">Dine-In</p>
                      <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #14532d;">${summary.orderTypeBreakdown.dine_in}</p>
                    </td>
                    <td width="2%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                    <td class="channel-col" width="23%" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 10px 4px; text-align: center;">
                      <p style="margin: 0; font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase;">Counter</p>
                      <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #0369a1;">${summary.orderTypeBreakdown.counter}</p>
                    </td>
                    <td width="2%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                    <td class="channel-col" width="23%" style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 10px 4px; text-align: center;">
                      <p style="margin: 0; font-size: 10px; font-weight: 700; color: #ea580c; text-transform: uppercase;">Takeaway</p>
                      <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #c2410c;">${summary.orderTypeBreakdown.takeaway}</p>
                    </td>
                    <td width="2%" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                    <td class="channel-col" width="23%" style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 10px 4px; text-align: center;">
                      <p style="margin: 0; font-size: 10px; font-weight: 700; color: #9333ea; text-transform: uppercase;">Delivery</p>
                      <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 800; color: #6b21a8;">${summary.orderTypeBreakdown.delivery}</p>
                    </td>
                  </tr>
                </table>
              </div>

              ${(summary.ncOrders > 0 || summary.discountAmount > 0) ? `
              <!-- ── Discounts / NC Banner ── -->
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px 14px; margin-bottom: 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  ${summary.discountAmount > 0 ? `
                  <tr>
                    <td style="font-size: 12px; color: #92400e; font-weight: 600;">🏷️ Total Discounts Given:</td>
                    <td style="text-align: right; font-size: 13px; font-weight: 700; color: #b45309;">${formatCurrencyINR(summary.discountAmount, currencySymbol)}</td>
                  </tr>` : ""}
                  ${summary.ncOrders > 0 ? `
                  <tr>
                    <td style="font-size: 12px; color: #92400e; font-weight: 600; padding-top: 4px;">🚫 Non-Chargeable (NC) Bills:</td>
                    <td style="text-align: right; font-size: 13px; font-weight: 700; color: #b45309; padding-top: 4px;">${summary.ncOrders} bills</td>
                  </tr>` : ""}
                </table>
              </div>` : ""}

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #64748b;">
                ⚡ Powered by <strong style="color: #0f172a;">Swadeshi Solutions POS</strong>
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                Real-time Restaurant Management &amp; Analytics • <a href="https://www.swadeshisolutions.co.in" style="color: #f97316; text-decoration: none;">swadeshisolutions.co.in</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Email Sender — Resend API (primary) + Titan SMTP (fallback)
// ═══════════════════════════════════════════════════════════════════════════

async function sendEmailViaTitan(
  to: string,
  subject: string,
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  // --- Primary: Resend API (works perfectly from cloud/edge functions) ---
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Swadeshi Solutions <noreply@swadeshisolutions.co.in>",
          to: [to],
          subject,
          html: htmlContent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`📧 Email sent to ${to} via Resend`);
        return { success: true };
      }
      console.warn("Resend failed:", JSON.stringify(data));
    } catch (err) {
      console.warn("Resend error:", err instanceof Error ? err.message : String(err));
    }
  }

  // --- Fallback: Titan SMTP ---
  const smtpPass = Deno.env.get("TITAN_SMTP_PASS");
  const smtpUser = "inquiry@swadeshisolutions.co.in";
  const smtpHost = "smtp.titan.email";

  if (!smtpPass) {
    // Try existing SMTP config
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
    if (!resendKey) return { success: false, error: "No email provider configured (set RESEND_API_KEY or TITAN_SMTP_PASS)" };
    return { success: false, error: "All email providers failed" };
  }

  // Try port 587 (STARTTLS) first, then 465 (SSL)
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

  console.error("All email methods failed");
  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp Sender — via Meta Cloud API
// ═══════════════════════════════════════════════════════════════════════════

function formatReportDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  return dateStr;
}

async function sendWhatsAppReport(
  supabase: any,
  phoneNumber: string,
  message: string,
  restaurantId: string,
  restaurantName: string,
  summary?: DailySummaryData,
  reportDate?: string,
  currencySymbol: string = "₹"
): Promise<{ success: boolean; error?: string }> {
  try {
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

    // Build the 17 parameters expected by Meta's approved daily_sales_report template
    const grossSales = (summary?.totalRevenue || 0) + (summary?.discountAmount || 0);
    const netRevenue = summary?.totalRevenue || 0;
    const discountAmt = summary?.discountAmount || 0;
    const avgOrderVal = summary?.averageOrderValue || 0;
    const cashAmt = summary?.paymentBreakdown?.cash || 0;
    const cardAmt = summary?.paymentBreakdown?.card || 0;
    const upiAmt = summary?.paymentBreakdown?.upi || 0;
    const otherAmt = summary?.paymentBreakdown?.other || 0;

    const topItemStr = (summary?.topItems || []).length > 0
      ? `${summary!.topItems[0].name} (${summary!.topItems[0].quantity} units)`
      : "N/A";

    const formattedDate = formatReportDateDDMMYYYY(reportDate);

    // Exact 17 body parameters in order:
    // {{1}} Date, {{2}} Location/Branch, {{3}} Gross Sales, {{4}} Discounts/Refunds,
    // {{5}} Net Revenue, {{6}} Total Bills/Orders, {{7}} Average Order Value,
    // {{8}} Cash, {{9}} Credit/Debit Card, {{10}} UPI/Mobile Pay, {{11}} Online Delivery,
    // {{12}} Expected Cash in Drawer, {{13}} Actual Cash Counted, {{14}} Difference (Over/Short),
    // {{15}} Top Selling Item, {{16}} Items Sold, {{17}} Peak Hour
    const dailyReport17Params = [
      { type: "text", text: formattedDate },
      { type: "text", text: restaurantName },
      { type: "text", text: `${currencySymbol}${grossSales.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}${discountAmt.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}${netRevenue.toFixed(2)}` },
      { type: "text", text: String(summary?.totalOrders || 0) },
      { type: "text", text: `${currencySymbol}${avgOrderVal.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}${cashAmt.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}${cardAmt.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}${upiAmt.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}${otherAmt.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}${cashAmt.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}${cashAmt.toFixed(2)}` },
      { type: "text", text: `${currencySymbol}0.00` },
      { type: "text", text: topItemStr },
      { type: "text", text: String(summary?.totalItemsSold || 0) },
      { type: "text", text: summary?.peakHour || "N/A" },
    ];

    console.log(`Sending WhatsApp daily_sales_report template to ${cleanPhone} (17 params)...`);

    // Helper to send template with specific name and language
    const sendTemplate = async (templateName: string, langCode: string) => {
      const payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: langCode },
          components: [
            {
              type: "body",
              parameters: dailyReport17Params,
            },
          ],
        },
      };

      const resp = await fetch(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await resp.json();
      return { ok: resp.ok, status: resp.status, data };
    };

    // 1. Primary Attempt: daily_sales_report with 'en'
    let templateRes = await sendTemplate("daily_sales_report", "en");

    // 2. Retry if language code mismatch (error 132001)
    if (!templateRes.ok && templateRes.data?.error?.code === 132001) {
      console.log("Template not found with 'en', retrying with 'en_US'...");
      templateRes = await sendTemplate("daily_sales_report", "en_US");
    }

    // 3. Fallback: try eod_pos_report template name if daily_sales_report not recognized
    if (!templateRes.ok) {
      console.warn(`daily_sales_report failed (${templateRes.status}):`, JSON.stringify(templateRes.data?.error));
      console.log("Trying eod_pos_report template fallback...");
      templateRes = await sendTemplate("eod_pos_report", "en");
      if (!templateRes.ok && templateRes.data?.error?.code === 132001) {
        templateRes = await sendTemplate("eod_pos_report", "en_US");
      }
    }

    // 4. If template succeeded
    if (templateRes.ok) {
      console.log(`📱 WhatsApp template sent successfully to ${cleanPhone}`);
      return { success: true };
    }

    // 5. If template failed, attempt plain text fallback (works inside 24h user session)
    console.warn("Template sends failed, attempting plain text fallback...");
    const textPayload = {
      messaging_product: "whatsapp",
      to: cleanPhone,
      type: "text",
      text: { body: message },
    };

    const textRes = await fetch(
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
    const textData = await textRes.json();

    if (textRes.ok) {
      console.log(`📱 WhatsApp plain text sent to ${cleanPhone}`);
      return { success: true };
    }

    console.error("All WhatsApp methods failed:", JSON.stringify(templateRes.data?.error || textData?.error));
    return {
      success: false,
      error: `WhatsApp API error (${templateRes.data?.error?.code || textData?.error?.code}): ${templateRes.data?.error?.message || textData?.error?.message || "Unknown error"}`,
    };
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
    let targetReportDate: string | null = null;
    try {
      const body = await req.json();
      targetRestaurantId = body.restaurantId || null;
      targetReportDate = body.reportDate || null;
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

        // Determine effective report date
        const tz = report.timezone || "Asia/Kolkata";
        const localDateStr = now.toLocaleDateString("en-CA", { timeZone: tz }); // "YYYY-MM-DD"
        const reportDateToUse = targetReportDate || localDateStr;

        // Generate report
        const summary = await generateDailyReport(
          supabase,
          restaurantId,
          reportDateToUse
        );

        console.log(
          `Report generated for ${reportDateToUse}: ${summary.totalOrders} orders, ${currencySymbol}${summary.totalRevenue} revenue`
        );

        // Save to daily_summary_reports
        const reportData = {
          restaurant_id: restaurantId,
          report_date: reportDateToUse,
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
        const waResults: any[] = [];
        const emailResults: any[] = [];

        if (
          report.send_whatsapp &&
          report.whatsapp_numbers &&
          report.whatsapp_numbers.length > 0
        ) {
          const waMessage = buildWhatsAppMessage(
            summary,
            restaurantName,
            reportDateToUse,
            currencySymbol
          );

          for (const phone of report.whatsapp_numbers) {
            if (!phone.trim()) continue;
            try {
              const waResult = await sendWhatsAppReport(
                supabase,
                phone.trim(),
                waMessage,
                restaurantId,
                restaurantName,
                summary,
                reportDateToUse,
                currencySymbol
              );
              waResults.push({ phone, ...waResult });
              console.log(
                `WhatsApp to ${phone}: ${waResult.success ? "✅" : "❌ " + waResult.error}`
              );
            } catch (waErr) {
              console.error(`WhatsApp to ${phone} crashed:`, waErr);
              waResults.push({ phone, success: false, error: String(waErr) });
            }
          }
          deliveryStatus.whatsapp = waResults.some(r => r.success) ? "sent" : "failed";
          deliveryStatus.whatsapp_details = waResults;
        }

        // ── Send Email (independent — does NOT block WhatsApp) ───────────
        if (
          report.send_email &&
          report.email_addresses &&
          report.email_addresses.length > 0
        ) {
          const emailHTML = buildEmailHTML(
            summary,
            restaurantName,
            reportDateToUse,
            currencySymbol
          );
          const emailSubject = `📊 Daily Report — ${restaurantName} — ${reportDateToUse}`;

          for (const email of report.email_addresses) {
            if (!email.trim()) continue;
            try {
              const emailResult = await sendEmailViaTitan(
                email.trim(),
                emailSubject,
                emailHTML
              );
              emailResults.push({ email, ...emailResult });
              console.log(
                `Email to ${email}: ${emailResult.success ? "✅" : "❌ " + emailResult.error}`
              );
            } catch (emErr) {
              console.error(`Email to ${email} crashed:`, emErr);
              emailResults.push({ email, success: false, error: String(emErr) });
            }
          }
          deliveryStatus.email = emailResults.some(r => r.success) ? "sent" : "failed";
          deliveryStatus.email_details = emailResults;
        }

        // ── Update tracking ──────────────────────────────────────────────
        await supabase
          .from("scheduled_report_settings")
          .update({
            last_sent_date: reportDateToUse,
            last_delivery_status: deliveryStatus,
          })
          .eq("id", report.id);

        // Update daily_summary_reports delivery_status
        await supabase
          .from("daily_summary_reports")
          .update({ delivery_status: deliveryStatus })
          .eq("restaurant_id", restaurantId)
          .eq("report_date", reportDateToUse);

        results.push({
          restaurantId,
          restaurantName,
          reportDate: reportDateToUse,
          success: true,
          orders: summary.totalOrders,
          revenue: summary.totalRevenue,
          whatsappSent: deliveryStatus.whatsapp === "sent",
          emailSent: deliveryStatus.email === "sent",
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
