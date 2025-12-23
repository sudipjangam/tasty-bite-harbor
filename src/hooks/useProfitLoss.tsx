import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useRestaurantId } from "./useRestaurantId";

interface ProfitLossData {
  revenue: {
    foodSales: number;
    roomRevenue: number;
    otherRevenue: number;
    totalRevenue: number;
  };
  costOfGoodsSold: {
    foodCosts: number;
    beverageCosts: number;
    roomSupplies: number;
    totalCOGS: number;
  };
  grossProfit: number;
  operatingExpenses: {
    staffSalaries: number;
    utilities: number;
    rent: number;
    marketing: number;
    maintenance: number;
    other: number;
    totalExpenses: number;
  };
  netProfit: number;
  profitMargin: number;
}

export const useProfitLoss = (startDate?: Date, endDate?: Date) => {
  const { restaurantId, isLoading: isRestaurantLoading } = useRestaurantId();
  const start = startDate || startOfMonth(new Date());
  const end = endDate || endOfMonth(new Date());

  return useQuery({
    queryKey: [
      "profit-loss",
      restaurantId,
      format(start, "yyyy-MM-dd"),
      format(end, "yyyy-MM-dd"),
    ],
    queryFn: async (): Promise<ProfitLossData> => {
      if (!restaurantId) throw new Error("No restaurant found");

      // Fetch revenue data
      const { data: orders } = await supabase
        .from("orders")
        .select("total, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", format(start, "yyyy-MM-dd"))
        .lte("created_at", format(end, "yyyy-MM-dd"));

      const { data: roomBillings } = await supabase
        .from("room_billings")
        .select("total_amount, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", format(start, "yyyy-MM-dd"))
        .lte("created_at", format(end, "yyyy-MM-dd"));

      // Fetch expense data
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, category")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", format(start, "yyyy-MM-dd"))
        .lte("expense_date", format(end, "yyyy-MM-dd"));

      // Calculate revenue
      const foodSales = (orders || []).reduce(
        (sum, order) => sum + order.total,
        0
      );
      const roomRevenue = (roomBillings || []).reduce(
        (sum, billing) => sum + billing.total_amount,
        0
      );
      const totalRevenue = foodSales + roomRevenue;

      // Calculate expenses by category
      const expensesByCategory = (expenses || []).reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const costOfGoodsSold = {
        foodCosts: expensesByCategory.ingredients || 0,
        beverageCosts: expensesByCategory.beverages || 0,
        roomSupplies: expensesByCategory.room_supplies || 0,
        totalCOGS:
          (expensesByCategory.ingredients || 0) +
          (expensesByCategory.beverages || 0) +
          (expensesByCategory.room_supplies || 0),
      };

      const grossProfit = totalRevenue - costOfGoodsSold.totalCOGS;

      const operatingExpenses = {
        staffSalaries: expensesByCategory.staff_salary || 0,
        utilities: expensesByCategory.utilities || 0,
        rent: expensesByCategory.rent || 0,
        marketing: expensesByCategory.marketing || 0,
        maintenance: expensesByCategory.maintenance || 0,
        other: expensesByCategory.other || 0,
        totalExpenses: Object.entries(expensesByCategory)
          .filter(
            ([category]) =>
              !["ingredients", "beverages", "room_supplies"].includes(category)
          )
          .reduce((sum, [_, amount]) => sum + amount, 0),
      };

      const netProfit = grossProfit - operatingExpenses.totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        revenue: {
          foodSales,
          roomRevenue,
          otherRevenue: 0,
          totalRevenue,
        },
        costOfGoodsSold,
        grossProfit,
        operatingExpenses,
        netProfit,
        profitMargin,
      };
    },
    enabled: !!restaurantId && !isRestaurantLoading,
    refetchInterval: 300000, // 5 minutes
  });
};
