import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportData } from "./types";

export function useMenuReport(
  restaurantId: string | null,
  startDate: string,
  endDate: string
): ReportData {
  const query = useQuery({
    queryKey: ["report-menu", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: menuItems, error: menuError } = await supabase
        .from("menu_items")
        .select("*, categories(name)")
        .eq("restaurant_id", restaurantId);

      if (menuError) throw menuError;

      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*, orders!inner(restaurant_id, created_at, status)")
        .eq("orders.restaurant_id", restaurantId)
        .eq("orders.status", "completed")
        .gte("orders.created_at", startDate)
        .lte("orders.created_at", endDate);

      if (itemsError) throw itemsError;

      const itemSales: Record<string, { qty: number; revenue: number }> = {};
      orderItems?.forEach((oi) => {
        const id = oi.menu_item_id || oi.item_id;
        if (id) {
          if (!itemSales[id]) itemSales[id] = { qty: 0, revenue: 0 };
          itemSales[id].qty += oi.quantity || 0;
          itemSales[id].revenue += (oi.price || 0) * (oi.quantity || 0);
        }
      });

      const formattedMenu =
        menuItems?.map((m) => {
          const sales = itemSales[m.id] || { qty: 0, revenue: 0 };
          return {
            Item: m.name,
            Category: (m.categories as any)?.name || "Uncategorized",
            Price: m.price,
            "Qty Sold": sales.qty,
            "Total Revenue": sales.revenue,
            Available: m.is_available ? "Yes" : "No",
          };
        }) || [];

      const topSelling = [...formattedMenu]
        .sort((a, b) => b["Qty Sold"] - a["Qty Sold"])
        .slice(0, 5);

      const totalItemsSold = Object.values(itemSales).reduce(
        (sum, s) => sum + s.qty,
        0
      );
      const totalMenuRevenue = Object.values(itemSales).reduce(
        (sum, s) => sum + s.revenue,
        0
      );

      return {
        summary: {
          "Total Menu Items": menuItems?.length || 0,
          "Active Items": menuItems?.filter((m) => m.is_available).length || 0,
          "Total Units Sold": totalItemsSold,
          "Menu Sales Revenue": `₹${totalMenuRevenue.toLocaleString()}`,
          "Top Selling Item": topSelling[0]?.Item || "N/A",
        },
        chartData: topSelling.map((item) => ({
          name: item.Item,
          value: item["Qty Sold"],
        })),
        tableData: formattedMenu,
      };
    },
    enabled: !!restaurantId,
  });

  return {
    category: "menu",
    title: "Menu Performance Report",
    summary: query.data?.summary || {},
    chartData: query.data?.chartData,
    tableData: query.data?.tableData,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
