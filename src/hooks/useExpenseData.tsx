import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { useRestaurantId } from "./useRestaurantId";

export const useExpenseData = () => {
  const { restaurantId, isLoading: isRestaurantLoading } = useRestaurantId();

  return useQuery({
    queryKey: ["expense-data", restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error("No restaurant found");

      // Fetch expenses for the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", format(thirtyDaysAgo, "yyyy-MM-dd"))
        .order("expense_date", { ascending: true });

      // Fetch current month expenses by category
      const startMonth = startOfMonth(new Date());
      const endMonth = endOfMonth(new Date());

      const { data: monthlyExpenses } = await supabase
        .from("expenses")
        .select("category, amount")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", format(startMonth, "yyyy-MM-dd"))
        .lte("expense_date", format(endMonth, "yyyy-MM-dd"));

      // Calculate expense breakdown by category
      const categoryTotals: Record<string, number> = {};
      if (monthlyExpenses) {
        monthlyExpenses.forEach((expense) => {
          categoryTotals[expense.category] =
            (categoryTotals[expense.category] || 0) + expense.amount;
        });
      }

      const expenseBreakdown = Object.entries(categoryTotals).map(
        ([category, amount]) => {
          const categoryLabels: Record<string, string> = {
            groceries: "Groceries & Ingredients",
            ingredients: "Raw Ingredients",
            staff_salary: "Staff Salaries",
            utilities: "Utilities",
            rent: "Rent & Property",
            equipment: "Equipment & Supplies",
            marketing: "Marketing & Advertising",
            maintenance: "Maintenance & Repairs",
            other: "Other Expenses",
          };

          return {
            name: categoryLabels[category] || category,
            value: Math.round(amount),
            percentage: 0, // Will be calculated below
          };
        }
      );

      // Calculate percentages
      const totalExpenses = expenseBreakdown.reduce(
        (sum, item) => sum + item.value,
        0
      );
      if (totalExpenses > 0) {
        expenseBreakdown.forEach((item) => {
          item.percentage = Math.round((item.value / totalExpenses) * 100);
        });
      }

      // Calculate daily trend data
      const dailyExpenses: Record<string, number> = {};
      if (expenses) {
        expenses.forEach((expense) => {
          const date = expense.expense_date;
          dailyExpenses[date] = (dailyExpenses[date] || 0) + expense.amount;
        });
      }

      const expenseTrendData = Object.entries(dailyExpenses).map(
        ([date, amount]) => ({
          date,
          amount: Math.round(amount),
        })
      );

      // Calculate staff expenses specifically
      const staffExpenses = (expenses || [])
        .filter((expense) => expense.category === "staff_salary")
        .reduce((sum, expense) => sum + expense.amount, 0);

      return {
        expenseBreakdown:
          expenseBreakdown.length > 0
            ? expenseBreakdown
            : [{ name: "No Data", value: 0, percentage: 0 }],
        expenseTrendData,
        totalMonthlyExpenses: totalExpenses,
        staffExpenses: Math.round(staffExpenses),
        totalExpenses: (expenses || []).reduce(
          (sum, expense) => sum + expense.amount,
          0
        ),
      };
    },
    enabled: !!restaurantId && !isRestaurantLoading,
    refetchInterval: 60000,
  });
};
