import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportData } from "./types";

export function useInventoryReport(
  restaurantId: string | null
): ReportData {
  const query = useQuery({
    queryKey: ["report-inventory", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: inventory, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      const lowStock =
        inventory?.filter(
          (i) => (i.quantity || 0) <= (i.reorder_point || 0)
        ) || [];

      const totalValuation =
        inventory?.reduce(
          (sum, i) => sum + (i.quantity || 0) * (i.cost_per_unit || 0),
          0
        ) || 0;

      const formatted =
        inventory?.map((i) => ({
          Item: i.name,
          Category: i.category || "General",
          Quantity: i.quantity,
          Unit: i.unit,
          "Cost/Unit": i.cost_per_unit,
          "Total Value": (i.quantity || 0) * (i.cost_per_unit || 0),
          "Reorder Point": i.reorder_point,
          "Low Stock":
            (i.quantity || 0) <= (i.reorder_point || 0) ? "YES" : "No",
        })) || [];

      const byCategory =
        inventory?.reduce(
          (acc, i) => {
            const cat = i.category || "General";
            acc[cat] =
              (acc[cat] || 0) +
              (i.quantity || 0) * (i.cost_per_unit || 0);
            return acc;
          },
          {} as Record<string, number>
        ) || {};

      return {
        summary: {
          "Total Items": inventory?.length || 0,
          "Low Stock Alerts": lowStock.length,
          "Total Inventory Value": `₹${totalValuation.toLocaleString()}`,
          "Healthy Stock Items":
            (inventory?.length || 0) - lowStock.length,
        },
        chartData: Object.entries(byCategory).map(([name, value]) => ({
          name,
          value: Math.round(value),
        })),
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "inventory",
    title: "Inventory & Stock Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useSuppliersReport(
  restaurantId: string | null
): ReportData {
  const query = useQuery({
    queryKey: ["report-suppliers", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: suppliers, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      const formatted =
        suppliers?.map((s) => ({
          Supplier: s.name,
          Contact: s.contact_person || "-",
          Phone: s.phone || "-",
          Email: s.email || "-",
          Category: s.category || "General",
          Rating: s.rating || "N/A",
          Status: s.is_active ? "Active" : "Inactive",
        })) || [];

      return {
        summary: {
          "Total Suppliers": suppliers?.length || 0,
          "Active Suppliers":
            suppliers?.filter((s) => s.is_active).length || 0,
        },
        chartData: suppliers?.map((s) => ({
          name: s.name,
          value: 1,
        })),
        tableData: formatted,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "suppliers",
    title: "Suppliers Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
