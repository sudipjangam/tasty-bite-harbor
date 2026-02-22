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
  ShoppingCart,
  CreditCard,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  Download,
  Ban,
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
${extrasSection}${notesSection}
══════════════════════════════
✨ Powered by *Swadeshi Solutions*
══════════════════════════════`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
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
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            No data available
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleShareWhatsApp}
            disabled={!summary}
            className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
          >
            <Send className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
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
