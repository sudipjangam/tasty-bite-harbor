import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";

export const useFinancialData = () => {
  const { restaurantId, isLoading: isRestaurantLoading } = useRestaurantId();

  return useQuery({
    queryKey: ["financial-data", restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error("No restaurant found");

      // Fetch chart of accounts
      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("account_code");

      // Fetch recent invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select(
          `
          *,
          invoice_line_items(*)
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch recent payments
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("payment_date", { ascending: false })
        .limit(10);

      // Fetch tax configurations
      const { data: taxConfigs } = await supabase
        .from("tax_configurations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);

      // Fetch budgets
      const { data: budgets } = await supabase
        .from("budgets")
        .select(
          `
          *,
          budget_line_items(
            *,
            account:chart_of_accounts(*)
          )
        `
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      return {
        accounts: accounts || [],
        invoices: invoices || [],
        payments: payments || [],
        taxConfigs: taxConfigs || [],
        budgets: budgets || [],
        restaurantId,
      };
    },
    enabled: !!restaurantId && !isRestaurantLoading,
    refetchInterval: 60000,
  });
};
