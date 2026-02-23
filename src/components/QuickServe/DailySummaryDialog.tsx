import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  CreditCard,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  Download,
  Ban,
  Wallet,
  PiggyBank,
  MessageCircle,
  Phone,
} from "lucide-react";

export interface PaymentBreakdown {
  cash: number;
  upi: number;
  card: number;
  other: number;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface OrderTypeBreakdown {
  counter: number;
  takeaway: number;
  delivery: number;
  dine_in: number;
}

export interface ExpenseBreakdown {
  [category: string]: number;
}

export interface DailySummaryData {
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
}

interface DailySummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: DailySummaryData;
  reportDate?: Date;
}

export const DailySummaryDialog: React.FC<DailySummaryDialogProps> = ({
  isOpen,
  onClose,
  initialData,
  reportDate,
}) => {
  const { restaurantId, restaurantName } = useRestaurantId();
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialData); // If viewing historical, assume saved
  const [notes, setNotes] = useState("");
  const [ownerPhone, setOwnerPhone] = useState(() => {
    try {
      return localStorage.getItem("qs_owner_whatsapp") || "";
    } catch {
      return "";
    }
  });
  const [showOwnerInput, setShowOwnerInput] = useState(false);
  const displayDate = reportDate || new Date();
  const dateStr = format(displayDate, "yyyy-MM-dd");

  // Fetch today's order data to generate the summary
  const { data: summary, isLoading } = useQuery({
    queryKey: ["daily-summary-data", restaurantId, dateStr],
    enabled: !!restaurantId && isOpen && !initialData,
    initialData: initialData,
    queryFn: async () => {
      const dayStart = startOfDay(displayDate).toISOString();
      const dayEnd = endOfDay(displayDate).toISOString();

      // Fetch kitchen_orders for items, order types, peak hour
      const { data: orders, error } = await supabase
        .from("kitchen_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      if (error) throw error;

      // Fetch pos_transactions for revenue & payment breakdown
      const { data: transactions, error: txnError } = await supabase
        .from("pos_transactions")
        .select("amount, payment_method, status, discount_amount, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      if (txnError) throw txnError;

      // Fetch today's expenses
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("amount, category")
        .eq("restaurant_id", restaurantId)
        .gte("date", dayStart.split("T")[0])
        .lte("date", dayEnd.split("T")[0]);

      const allOrders = orders || [];
      const allTxns = (transactions || []).filter(
        (t) => t.status === "completed",
      );

      // Calculate summary
      const totalOrders = allOrders.length;
      const ncOrders = allOrders.filter(
        (o) => o.order_type === "nc" || o.order_type === "non-chargeable",
      );

      // Revenue from pos_transactions (accurate source)
      const totalRevenue = allTxns.reduce(
        (sum, t) => sum + (Number(t.amount) || 0),
        0,
      );
      const ncAmount = 0; // NC orders have ₹0 in pos_transactions
      const discountAmount = allTxns.reduce(
        (sum, t) => sum + (Number(t.discount_amount) || 0),
        0,
      );

      // Expenses breakdown by category
      const expenseBreakdown: ExpenseBreakdown = {};
      let totalExpenses = 0;
      (expensesData || []).forEach((e) => {
        const cat = e.category || "Other";
        const amt = Number(e.amount) || 0;
        expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amt;
        totalExpenses += amt;
      });
      const netProfit = totalRevenue - totalExpenses;

      // Payment breakdown from pos_transactions
      const paymentBreakdown: PaymentBreakdown = {
        cash: 0,
        upi: 0,
        card: 0,
        other: 0,
      };
      allTxns.forEach((t) => {
        const method = (t.payment_method || "cash").toLowerCase();
        const amt = Number(t.amount) || 0;
        if (method.includes("cash")) paymentBreakdown.cash += amt;
        else if (method.includes("upi")) paymentBreakdown.upi += amt;
        else if (method.includes("card")) paymentBreakdown.card += amt;
        else paymentBreakdown.other += amt;
      });

      // Order type breakdown (from kitchen_orders)
      const orderTypeBreakdown: OrderTypeBreakdown = {
        counter: 0,
        takeaway: 0,
        delivery: 0,
        dine_in: 0,
      };
      allOrders.forEach((o) => {
        const type = (o.order_type || "counter").toLowerCase();
        if (type.includes("delivery")) orderTypeBreakdown.delivery++;
        else if (type.includes("takeaway") || type.includes("take"))
          orderTypeBreakdown.takeaway++;
        else if (type.includes("dine")) orderTypeBreakdown.dine_in++;
        else orderTypeBreakdown.counter++;
      });

      // Top items (from kitchen_orders items array)
      const itemMap = new Map<string, { quantity: number; revenue: number }>();
      allOrders.forEach((o) => {
        const items = (o.items as any[]) || [];
        items.forEach((item) => {
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

      // Total items sold
      const totalItemsSold = Array.from(itemMap.values()).reduce(
        (sum, d) => sum + d.quantity,
        0,
      );

      // Peak hour
      const hourMap = new Map<number, number>();
      allOrders.forEach((o) => {
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

      const paidTxnCount = allTxns.filter(
        (t) => (t.payment_method || "").toLowerCase() !== "nc",
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
      };
    },
  });

  // Check if already saved today
  const { data: existingReport } = useQuery({
    queryKey: ["daily-report-existing", restaurantId, dateStr],
    enabled: !!restaurantId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_summary_reports")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("report_date", dateStr)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (existingReport) setSaved(true);
  }, [existingReport]);

  const handleSaveReport = async () => {
    if (!summary || !restaurantId) return;
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const reportData = {
        restaurant_id: restaurantId,
        report_date: dateStr,
        total_orders: summary.totalOrders,
        total_revenue: summary.totalRevenue,
        total_items_sold: summary.totalItemsSold,
        payment_breakdown: summary.paymentBreakdown as unknown as Record<
          string,
          unknown
        >,
        top_items: summary.topItems as unknown as Record<string, unknown>[],
        order_type_breakdown: summary.orderTypeBreakdown as unknown as Record<
          string,
          unknown
        >,
        nc_orders: summary.ncOrders,
        nc_amount: summary.ncAmount,
        discount_amount: summary.discountAmount,
        average_order_value: summary.averageOrderValue,
        peak_hour: summary.peakHour,
        notes,
        generated_by: user.user?.id,
      };

      const { error } = await supabase
        .from("daily_summary_reports")
        .upsert(reportData, { onConflict: "restaurant_id,report_date" });

      if (error) throw error;

      setSaved(true);
      setSaved(true);
      toast({
        title: "Report Saved! ✅",
        description: `Daily summary for ${format(displayDate, "dd MMM yyyy")} has been saved.`,
      });
    } catch (err: any) {
      toast({
        title: "Error saving report",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!summary) return;

    const truckName = restaurantName || "Our Food Truck";
    const reportDateFormatted = format(displayDate, "dd MMM yyyy");

    // Build top items section
    const topItemsText =
      summary.topItems.length > 0
        ? summary.topItems
            .map(
              (i, idx) =>
                `   ${idx + 1}. ${i.name} x${i.quantity} = ${currencySymbol}${i.revenue.toFixed(0)}`,
            )
            .join("\n")
        : "   No items today";

    // Build NC + Discount section
    const extras: string[] = [];
    if (summary.ncOrders > 0) {
      extras.push(
        `NC Orders: ${summary.ncOrders} (${currencySymbol}${summary.ncAmount.toFixed(2)})`,
      );
    }
    if (summary.discountAmount > 0) {
      extras.push(
        `Discounts Given: ${currencySymbol}${summary.discountAmount.toFixed(2)}`,
      );
    }
    const extrasSection =
      extras.length > 0
        ? `\n------------------------------\n${extras.join("\n")}`
        : "";

    // Build P&L section
    const expenseLines = Object.entries(summary.expenseBreakdown || {})
      .filter(([, v]) => v > 0)
      .map(([cat, amt]) => `   • ${cat}: ${currencySymbol}${amt.toFixed(0)}`)
      .join("\n");
    const plSection =
      summary.totalExpenses > 0 || summary.netProfit !== summary.totalRevenue
        ? `\n💸 *PROFIT & LOSS*\n──────────────────────────────\n💰 Revenue: ${currencySymbol}${summary.totalRevenue.toFixed(2)}\n💸 Expenses: ${currencySymbol}${(summary.totalExpenses || 0).toFixed(2)}${expenseLines ? "\n" + expenseLines : ""}\n${(summary.netProfit || 0) >= 0 ? "✅" : "🔻"} *Net ${(summary.netProfit || 0) >= 0 ? "Profit" : "Loss"}: ${currencySymbol}${Math.abs(summary.netProfit || 0).toFixed(2)}*`
        : "";

    // Build notes section
    const notesSection = notes.trim()
      ? `\n------------------------------\n*Notes:* ${notes.trim()}`
      : "";

    const msg = `⭐ *${truckName}* ⭐
📊 Daily Sales Report
📅 ${reportDateFormatted}
══════════════════════════════

🛒 Total Orders: *${summary.totalOrders}*
💰 Total Revenue: *${currencySymbol}${summary.totalRevenue.toFixed(2)}*
📦 Items Sold: *${summary.totalItemsSold}*
🧾 Avg Order: *${currencySymbol}${summary.averageOrderValue.toFixed(2)}*
⏰ Peak Hour: *${summary.peakHour || "N/A"}*

💳 *PAYMENTS*
──────────────────────────────
💵 Cash: ${currencySymbol}${summary.paymentBreakdown.cash.toFixed(2)}
📱 UPI: ${currencySymbol}${summary.paymentBreakdown.upi.toFixed(2)}
💳 Card: ${currencySymbol}${summary.paymentBreakdown.card.toFixed(2)}
${summary.paymentBreakdown.other > 0 ? `💴 Other: ${currencySymbol}${summary.paymentBreakdown.other.toFixed(2)}\n` : ""}
🏆 *TOP ITEMS*
──────────────────────────────
${topItemsText}
${extrasSection}${plSection}${notesSection}
══════════════════════════════
✨ Powered by *Swadeshi Solutions*
══════════════════════════════`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const buildWhatsAppMessage = () => {
    if (!summary) return "";
    const truckName = restaurantName || "Our Food Truck";
    const reportDateFormatted = format(displayDate, "dd MMM yyyy");
    const topItemsText =
      summary.topItems.length > 0
        ? summary.topItems
            .map(
              (i, idx) =>
                `   ${idx + 1}. ${i.name} x${i.quantity} = ${currencySymbol}${i.revenue.toFixed(0)}`,
            )
            .join("\n")
        : "   No items today";
    const extras: string[] = [];
    if (summary.ncOrders > 0)
      extras.push(
        `NC Orders: ${summary.ncOrders} (${currencySymbol}${summary.ncAmount.toFixed(2)})`,
      );
    if (summary.discountAmount > 0)
      extras.push(
        `Discounts Given: ${currencySymbol}${summary.discountAmount.toFixed(2)}`,
      );
    const extrasSection =
      extras.length > 0
        ? `\n------------------------------\n${extras.join("\n")}`
        : "";
    const expenseLines = Object.entries(summary.expenseBreakdown || {})
      .filter(([, v]) => v > 0)
      .map(([cat, amt]) => `   • ${cat}: ${currencySymbol}${amt.toFixed(0)}`)
      .join("\n");
    const plSection =
      summary.totalExpenses > 0 || summary.netProfit !== summary.totalRevenue
        ? `\n💸 *PROFIT & LOSS*\n──────────────────────────────\n💰 Revenue: ${currencySymbol}${summary.totalRevenue.toFixed(2)}\n💸 Expenses: ${currencySymbol}${(summary.totalExpenses || 0).toFixed(2)}${expenseLines ? "\n" + expenseLines : ""}\n${(summary.netProfit || 0) >= 0 ? "✅" : "🔻"} *Net ${(summary.netProfit || 0) >= 0 ? "Profit" : "Loss"}: ${currencySymbol}${Math.abs(summary.netProfit || 0).toFixed(2)}*`
        : "";
    const notesSection = notes.trim()
      ? `\n------------------------------\n*Notes:* ${notes.trim()}`
      : "";

    return `⭐ *${truckName}* ⭐\n📊 Daily Sales Report\n📅 ${reportDateFormatted}\n══════════════════════════════\n\n🛒 Total Orders: *${summary.totalOrders}*\n💰 Total Revenue: *${currencySymbol}${summary.totalRevenue.toFixed(2)}*\n📦 Items Sold: *${summary.totalItemsSold}*\n🧾 Avg Order: *${currencySymbol}${summary.averageOrderValue.toFixed(2)}*\n⏰ Peak Hour: *${summary.peakHour || "N/A"}*\n\n💳 *PAYMENTS*\n──────────────────────────────\n💵 Cash: ${currencySymbol}${summary.paymentBreakdown.cash.toFixed(2)}\n📱 UPI: ${currencySymbol}${summary.paymentBreakdown.upi.toFixed(2)}\n💳 Card: ${currencySymbol}${summary.paymentBreakdown.card.toFixed(2)}\n${summary.paymentBreakdown.other > 0 ? `💴 Other: ${currencySymbol}${summary.paymentBreakdown.other.toFixed(2)}\n` : ""}\n🏆 *TOP ITEMS*\n──────────────────────────────\n${topItemsText}\n${extrasSection}${plSection}${notesSection}\n══════════════════════════════\n✨ Powered by *Swadeshi Solutions*\n══════════════════════════════`;
  };

  const handleSendToOwner = () => {
    if (!ownerPhone.trim()) {
      setShowOwnerInput(true);
      toast({
        title: "Enter owner's WhatsApp number",
        description: "Please enter the owner's phone number first.",
      });
      return;
    }
    // Save for future use
    try {
      localStorage.setItem("qs_owner_whatsapp", ownerPhone.trim());
    } catch {}

    let cleanPhone = ownerPhone.trim().replace(/[\+\-\s]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const msg = buildWhatsAppMessage();
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    toast({
      title: "Report sent! ✅",
      description: `Daily report sent to ${ownerPhone}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>Daily Summary</span>
              <p className="text-xs font-normal text-gray-500 mt-0.5">
                {format(displayDate, "dd MMM yyyy")}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : summary ? (
          <div className="space-y-4 py-2">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                icon={<ShoppingCart className="h-4 w-4" />}
                label="Total Orders"
                value={String(summary.totalOrders)}
                gradient="from-blue-500 to-indigo-500"
              />
              <MetricCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Revenue"
                value={`${currencySymbol}${summary.totalRevenue.toFixed(2)}`}
                gradient="from-emerald-500 to-teal-500"
              />
              <MetricCard
                icon={<BarChart3 className="h-4 w-4" />}
                label="Avg Order"
                value={`${currencySymbol}${summary.averageOrderValue.toFixed(0)}`}
                gradient="from-purple-500 to-pink-500"
              />
              <MetricCard
                icon={<Clock className="h-4 w-4" />}
                label="Peak Hour"
                value={summary.peakHour || "N/A"}
                gradient="from-orange-500 to-red-500"
              />
            </div>

            {/* P&L Summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-indigo-200/50 dark:border-indigo-700/30">
              <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                <PiggyBank className="h-4 w-4" /> Profit & Loss
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />{" "}
                    Revenue
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +{currencySymbol}
                    {summary.totalRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-red-500" /> Expenses
                  </span>
                  <span className="text-sm font-bold text-red-500 dark:text-red-400">
                    -{currencySymbol}
                    {(summary.totalExpenses || 0).toFixed(2)}
                  </span>
                </div>
                {/* Expense category breakdown */}
                {Object.entries(summary.expenseBreakdown || {})
                  .filter(([, v]) => v > 0)
                  .map(([cat, amt]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between pl-6"
                    >
                      <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                        {cat}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currencySymbol}
                        {amt.toFixed(0)}
                      </span>
                    </div>
                  ))}
                <div className="border-t border-indigo-200 dark:border-indigo-700/30 pt-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold flex items-center gap-1.5 ${(summary.netProfit || 0) >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                    >
                      {(summary.netProfit || 0) >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      Net {(summary.netProfit || 0) >= 0 ? "Profit" : "Loss"}
                    </span>
                    <span
                      className={`text-lg font-black ${(summary.netProfit || 0) >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                    >
                      {currencySymbol}
                      {Math.abs(summary.netProfit || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment Breakdown
              </h3>
              <div className="space-y-2">
                {Object.entries(summary.paymentBreakdown)
                  .filter(([, v]) => v > 0)
                  .map(([method, amount]) => (
                    <div
                      key={method}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {method}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {currencySymbol}
                        {amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Items */}
            {summary.topItems.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  🏆 Top Items
                </h3>
                <div className="space-y-2">
                  {summary.topItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {idx + 1}. {item.name}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          ×{item.quantity}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {currencySymbol}
                          {item.revenue.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NC & Discounts */}
            {(summary.ncOrders > 0 || summary.discountAmount > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {summary.ncOrders > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-3 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-1 mb-1">
                      <Ban className="h-3 w-3 text-yellow-600" />
                      <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                        Non-Chargeable
                      </span>
                    </div>
                    <p className="text-lg font-bold text-yellow-800 dark:text-yellow-300">
                      {summary.ncOrders}
                    </p>
                    <p className="text-xs text-yellow-600">
                      {currencySymbol}
                      {summary.ncAmount.toFixed(2)}
                    </p>
                  </div>
                )}
                {summary.discountAmount > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 border border-green-200 dark:border-green-800">
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                      🏷️ Discounts
                    </span>
                    <p className="text-lg font-bold text-green-800 dark:text-green-300">
                      {currencySymbol}
                      {summary.discountAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for today..."
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none h-20"
              />
            </div>

            {/* Owner WhatsApp Number */}
            {(showOwnerInput || !ownerPhone) && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 border border-green-200 dark:border-green-800">
                <label className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5 block flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Owner's WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                />
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Saved for future reports
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            No data available
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleShareWhatsApp}
              disabled={!summary}
              className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
            >
              <Send className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={handleSendToOwner}
              disabled={!summary}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {ownerPhone ? "Send to Owner" : "Set Owner"}
            </Button>
          </div>
          <Button
            onClick={handleSaveReport}
            disabled={!summary || saving || saved || !!initialData}
            className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saved || initialData ? (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {initialData ? "Archived" : saved ? "Saved" : "Save Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Small metric card reusable component
const MetricCard = ({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm">
    <div className="flex items-center gap-2 mb-1">
      <div
        className={`p-1.5 bg-gradient-to-br ${gradient} rounded-lg text-white`}
      >
        {icon}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);

export default DailySummaryDialog;
