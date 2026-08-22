import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ReportData, PayLaterOrderSummary } from "./types";

export function useOrderReport(
  restaurantId: string | null,
  startDate: string,
  endDate: string
): ReportData {
  const query = useQuery({
    queryKey: ["report-orders", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: allOrders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const revenueOrders = (allOrders || []).filter(
        (o) => o.status === "completed" && o.order_type !== "non-chargeable"
      );
      const totalRevenue = revenueOrders.reduce(
        (sum, o) => sum + (o.total || 0),
        0
      );

      const paymentBreakdown = {
        cash: 0,
        upi: 0,
        card: 0,
        payLater: 0,
        roomCharge: 0,
        otherCredit: 0,
      };
      const payLaterOrders: PayLaterOrderSummary[] = [];

      const classifyCreditMethod = (method: string, amt: number, order?: any) => {
        if (method.includes("pay_later") || method.includes("paylater")) {
          paymentBreakdown.payLater += amt;
          if (order) {
            payLaterOrders.push({
              date: format(new Date(order.created_at), "MMM dd, yyyy HH:mm"),
              customer: order.customer_name || order.Customer_Name || "Walk-in",
              phone: order.customer_phone || order.Customer_MobileNumber || "-",
              total: order.total || 0,
              orderId: order.id,
            });
          }
        } else if (method.includes("room") || method.includes("folio")) {
          paymentBreakdown.roomCharge += amt;
        } else {
          paymentBreakdown.otherCredit += amt;
        }
      };

      revenueOrders.forEach((o) => {
        const method = (o.payment_method || "").toLowerCase();
        const amt = o.total || 0;
        if (method === "split" && (o as any).split_payments) {
          const splits: Array<{ method: string; amount: number }> = Array.isArray(
            (o as any).split_payments
          )
            ? (o as any).split_payments
            : [];
          splits.forEach((s) => {
            const m = (s.method || "").toLowerCase();
            const a = s.amount || 0;
            if (m.includes("cash")) paymentBreakdown.cash += a;
            else if (m.includes("upi")) paymentBreakdown.upi += a;
            else if (m.includes("card")) paymentBreakdown.card += a;
            else classifyCreditMethod(m, a);
          });
        } else if (method.includes("cash")) paymentBreakdown.cash += amt;
        else if (method.includes("upi")) paymentBreakdown.upi += amt;
        else if (method.includes("card")) paymentBreakdown.card += amt;
        else classifyCreditMethod(method, amt, o);
      });

      const orderCount = allOrders?.length || 0;
      const completedChargeableCount = revenueOrders.length;
      const avgOrderValue =
        completedChargeableCount > 0
          ? totalRevenue / completedChargeableCount
          : 0;
      const totalDiscount = revenueOrders.reduce(
        (sum, o) => sum + (o.discount_amount || 0),
        0
      );

      const byType =
        allOrders?.reduce(
          (acc, o) => {
            const type = o.order_type || "dine-in";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ) || {};

      const formattedOrders =
        allOrders?.map((o) => ({
          "Order Date": format(new Date(o.created_at), "MMM dd, yyyy HH:mm"),
          Customer: o.customer_name || o.Customer_Name || "Walk-in",
          Phone: o.customer_phone || o.Customer_MobileNumber || "-",
          Type: o.order_type || "dine-in",
          Status: o.status,
          "Payment Method": o.payment_method || "N/A",
          Total: o.total || 0,
        })) || [];

      return {
        summary: {
          "Total Revenue": `₹${totalRevenue.toLocaleString()}`,
          "Cash Sales": `₹${paymentBreakdown.cash.toLocaleString()}`,
          "UPI Sales": `₹${paymentBreakdown.upi.toLocaleString()}`,
          "Card Sales": `₹${paymentBreakdown.card.toLocaleString()}`,
          "Pay Later / Credit": `₹${paymentBreakdown.payLater.toLocaleString()}`,
          "Room Charges": `₹${paymentBreakdown.roomCharge.toLocaleString()}`,
          "Total Orders": orderCount,
          "Completed Orders": completedChargeableCount,
          "Avg Order Value": `₹${Math.round(avgOrderValue)}`,
          "Total Discounts": `₹${totalDiscount.toLocaleString()}`,
        },
        chartData: Object.entries(byType).map(([name, value]) => ({
          name,
          value,
        })),
        tableData: formattedOrders,
        payLaterOrders,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "orders",
    title: "Orders & Sales Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    payLaterOrders: query.data?.payLaterOrders,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
