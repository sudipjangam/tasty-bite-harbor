import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, format, startOfMonth, endOfMonth } from "date-fns";

export interface FinancialTrends {
  revenueGrowth: number;
  profitGrowth: number;
  expenseGrowth: number;
  marginGrowth: number;
  outstandingInvoicesTotal: number;
  outstandingInvoicesCount: number;
  averageOrderValue: number;
  averageOrderGrowth: number;
}

export const useFinancialTrends = () => {
  return useQuery({
    queryKey: ["financial-trends"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.restaurant_id) throw new Error("No restaurant found");

      const restaurantId = profile.restaurant_id;

      // Get current and previous month date ranges
      const currentMonthStart = startOfMonth(new Date());
      const currentMonthEnd = endOfMonth(new Date());
      const previousMonthStart = startOfMonth(subDays(currentMonthStart, 1));
      const previousMonthEnd = endOfMonth(subDays(currentMonthStart, 1));

      // Fetch current month orders
      const { data: currentOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", currentMonthStart.toISOString())
        .lte("created_at", currentMonthEnd.toISOString());

      // Fetch previous month orders
      const { data: previousOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", previousMonthStart.toISOString())
        .lte("created_at", previousMonthEnd.toISOString());

      // Fetch current month expenses
      const { data: currentExpenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", format(currentMonthStart, 'yyyy-MM-dd'))
        .lte("expense_date", format(currentMonthEnd, 'yyyy-MM-dd'));

      // Fetch previous month expenses
      const { data: previousExpenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", format(previousMonthStart, 'yyyy-MM-dd'))
        .lte("expense_date", format(previousMonthEnd, 'yyyy-MM-dd'));

      // Fetch outstanding invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .neq("status", "paid");

      // Calculate revenue metrics
      const currentRevenue = currentOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
      const previousRevenue = previousOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
      const revenueGrowth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue * 100)
        : 0;

      // Calculate expense metrics
      const currentExpenseTotal = currentExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const previousExpenseTotal = previousExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const expenseGrowth = previousExpenseTotal > 0 
        ? ((currentExpenseTotal - previousExpenseTotal) / previousExpenseTotal * 100)
        : 0;

      // Calculate profit metrics
      const currentProfit = currentRevenue - currentExpenseTotal;
      const previousProfit = previousRevenue - previousExpenseTotal;
      const profitGrowth = previousProfit !== 0 
        ? ((currentProfit - previousProfit) / Math.abs(previousProfit) * 100)
        : currentProfit > 0 ? 100 : -100;

      // Calculate margin metrics
      const currentMargin = currentRevenue > 0 ? (currentProfit / currentRevenue * 100) : 0;
      const previousMargin = previousRevenue > 0 ? (previousProfit / previousRevenue * 100) : 0;
      const marginGrowth = previousMargin !== 0 
        ? (currentMargin - previousMargin)
        : 0;

      // Calculate outstanding invoices
      const outstandingInvoicesTotal = invoices?.reduce((sum, invoice) => sum + (invoice.total_amount - invoice.paid_amount), 0) || 0;
      const outstandingInvoicesCount = invoices?.length || 0;

      // Calculate average order value
      const currentAOV = currentOrders && currentOrders.length > 0 
        ? currentRevenue / currentOrders.length 
        : 0;
      const previousAOV = previousOrders && previousOrders.length > 0 
        ? previousRevenue / previousOrders.length 
        : 0;
      const averageOrderGrowth = previousAOV > 0 
        ? ((currentAOV - previousAOV) / previousAOV * 100)
        : 0;

      const trends: FinancialTrends = {
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        profitGrowth: Math.round(profitGrowth * 10) / 10,
        expenseGrowth: Math.round(expenseGrowth * 10) / 10,
        marginGrowth: Math.round(marginGrowth * 10) / 10,
        outstandingInvoicesTotal: Math.round(outstandingInvoicesTotal),
        outstandingInvoicesCount,
        averageOrderValue: Math.round(currentAOV),
        averageOrderGrowth: Math.round(averageOrderGrowth * 10) / 10
      };

      return trends;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};