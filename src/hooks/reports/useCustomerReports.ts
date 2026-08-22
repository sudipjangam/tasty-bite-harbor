import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ReportData } from "./types";

export function useCustomerReport(
  restaurantId: string | null
): ReportData {
  const query = useQuery({
    queryKey: ["report-customers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: customers, error } = await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("total_spent", { ascending: false });

      if (error) throw error;

      const totalPoints =
        customers?.reduce(
          (sum, c) => sum + (c.loyalty_points || 0),
          0
        ) || 0;
      const totalCustomerSpent =
        customers?.reduce((sum, c) => sum + (c.total_spent || 0), 0) ||
        0;

      const formatted =
        customers?.map((c) => ({
          Name: c.name,
          Phone: c.phone || "-",
          Email: c.email || "-",
          "Total Visits": c.total_visits || 0,
          "Total Spent": c.total_spent || 0,
          "Loyalty Points": c.loyalty_points || 0,
          "Last Visit": c.last_visit
            ? format(new Date(c.last_visit), "MMM dd, yyyy")
            : "Never",
        })) || [];

      const topSpenders = (customers || []).slice(0, 5);

      return {
        summary: {
          "Total Customers": customers?.length || 0,
          "Total Points Outstanding": totalPoints.toLocaleString(),
          "Customer Lifetime Spend": `₹${totalCustomerSpent.toLocaleString()}`,
          "Avg Spend/Customer":
            customers && customers.length > 0
              ? `₹${Math.round(totalCustomerSpent / customers.length)}`
              : "₹0",
        },
        chartData: topSpenders.map((c) => ({
          name: c.name,
          value: c.total_spent || 0,
        })),
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "customers",
    title: "Customer & Loyalty Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useRepeatCustomersReport(
  restaurantId: string | null,
  startDate: string,
  endDate: string
): ReportData {
  const query = useQuery({
    queryKey: ["report-repeat-customers", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: orders, error } = await supabase
        .from("orders")
        .select("customer_id, customer_name, customer_phone, total, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (error) throw error;

      const customerMap: Record<
        string,
        {
          name: string;
          phone: string;
          orderCount: number;
          totalSpent: number;
        }
      > = {};

      (orders || []).forEach((o) => {
        const key =
          o.customer_id || o.customer_phone || o.customer_name || "Unknown";
        if (key === "Unknown" || key === "Walk-in") return;

        if (!customerMap[key]) {
          customerMap[key] = {
            name: o.customer_name || "Guest",
            phone: o.customer_phone || "-",
            orderCount: 0,
            totalSpent: 0,
          };
        }
        customerMap[key].orderCount += 1;
        customerMap[key].totalSpent += o.total || 0;
      });

      const uniqueCustomers = Object.values(customerMap);
      const newCustomers = uniqueCustomers.filter((c) => c.orderCount === 1);
      const repeatCustomers = uniqueCustomers.filter((c) => c.orderCount > 1);

      const formatted = uniqueCustomers
        .sort((a, b) => b.orderCount - a.orderCount)
        .map((c) => ({
          Customer: c.name,
          Phone: c.phone,
          "Orders in Period": c.orderCount,
          "Total Spent": c.totalSpent,
          "Customer Type": c.orderCount > 1 ? "Repeat" : "First Time",
        }));

      return {
        summary: {
          "Active Customers": uniqueCustomers.length,
          "Repeat Customers": repeatCustomers.length,
          "First-Time Customers": newCustomers.length,
          "Repeat Rate":
            uniqueCustomers.length > 0
              ? `${Math.round(
                  (repeatCustomers.length / uniqueCustomers.length) * 100
                )}%`
              : "0%",
        },
        chartData: [
          { name: "Repeat Customers", value: repeatCustomers.length },
          { name: "First-Time", value: newCustomers.length },
        ],
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "repeat_customers",
    title: "Customer Frequency Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
