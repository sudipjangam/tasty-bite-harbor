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
      const { data: accounts, error: accountsError } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("account_code");

      if (accountsError) throw accountsError;

      // Fetch recent invoices
      const { data: invoices, error: invoicesError } = await supabase
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

      if (invoicesError) throw invoicesError;

      // Fetch recent payments
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("payment_date", { ascending: false })
        .limit(10);

      if (paymentsError) throw paymentsError;

      // Fetch tax configurations
      const { data: taxConfigs, error: taxConfigsError } = await supabase
        .from("tax_configurations")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);

      if (taxConfigsError) throw taxConfigsError;

      // Fetch budgets
      const { data: budgets, error: budgetsError } = await supabase
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

      if (budgetsError) throw budgetsError;

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
    staleTime: 120000,
    refetchInterval: 300000, // 5 minutes
    refetchOnReconnect: true,
  });
};
