import { supabase } from "@/integrations/supabase/client";
import { CustomWidget, DateRangePreset } from "@/types/customWidgets";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  format,
} from "date-fns";

const getDateRangeFilter = (preset?: DateRangePreset) => {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return {
        from: startOfDay(yesterday).toISOString(),
        to: endOfDay(yesterday).toISOString(),
      };
    }
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: endOfDay(now).toISOString() };
    case "this_month":
      return { from: startOfMonth(now).toISOString(), to: endOfDay(now).toISOString() };
    case "last_30_days":
      return { from: subDays(now, 30).toISOString(), to: endOfDay(now).toISOString() };
    case "all":
    default:
      return null;
  }
};

export interface WidgetResultData {
  kpiValue?: string | number;
  kpiTrend?: number;
  chartCategories?: string[];
  chartSeries?: { name: string; data: number[] }[];
  tableRows?: Record<string, any>[];
  alertActive?: boolean;
  alertMessage?: string;
  gaugePercent?: number;
}

export async function fetchWidgetData(
  widget: CustomWidget,
  restaurantId: string
): Promise<WidgetResultData> {
  const { source_domain, widget_type, query_config, visual_config } = widget;
  const dateFilter = getDateRangeFilter(query_config.dateRangePreset);

  switch (source_domain) {
    case "orders": {
      let query = supabase
        .from("orders")
        .select("id, total, status, order_type, payment_method, created_at, customer_name")
        .eq("restaurant_id", restaurantId);

      if (dateFilter) {
        query = query.gte("created_at", dateFilter.from).lte("created_at", dateFilter.to);
      }

      if (query_config.filterField && query_config.filterValue) {
        const field = query_config.filterField === "order_status" ? "status" : query_config.filterField === "total_amount" ? "total" : query_config.filterField;
        query = query.eq(field, query_config.filterValue);
      }

      const { data: rows = [], error } = await query;
      if (error) throw error;
      const orderList = rows || [];

      if (widget_type === "kpi") {
        if (query_config.aggregation === "count") {
          return { kpiValue: orderList.length };
        }
        if (query_config.aggregation === "avg") {
          const total = orderList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const avg = orderList.length > 0 ? (total / orderList.length).toFixed(1) : 0;
          return { kpiValue: avg };
        }
        // default sum
        const total = orderList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        return { kpiValue: Math.round(total) };
      }

      if (widget_type === "chart") {
        const grouped: Record<string, number> = {};
        orderList.forEach((o) => {
          const key = query_config.groupBy === "order_type"
            ? (o.order_type || "dine-in")
            : query_config.groupBy === "payment_method"
            ? (o.payment_method || "cash")
            : format(new Date(o.created_at), "yyyy-MM-dd");

          const val = query_config.aggregation === "count" ? 1 : Number(o.total) || 0;
          grouped[key] = (grouped[key] || 0) + val;
        });

        const categories = Object.keys(grouped);
        const seriesData = Object.values(grouped);
        return {
          chartCategories: categories,
          chartSeries: [{ name: widget.title, data: seriesData }],
        };
      }

      if (widget_type === "table") {
        const limit = query_config.limit || 10;
        return { tableRows: orderList.slice(0, limit) };
      }

      if (widget_type === "alert") {
        const total = orderList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const threshold = visual_config.thresholdDanger || 1000;
        return {
          alertActive: total < threshold,
          alertMessage: `Revenue currently below alert target threshold.`,
        };
      }

      return { kpiValue: orderList.length };
    }

    case "inventory": {
      let query = supabase
        .from("inventory_items")
        .select("id, name, quantity, reorder_level, unit, cost_per_unit, category")
        .eq("restaurant_id", restaurantId);

      const { data: items = [], error } = await query;
      if (error) throw error;
      const itemList = items || [];

      if (widget_type === "kpi") {
        if (query_config.aggregation === "count") {
          if (query_config.filterField === "low_stock") {
            const lowCount = itemList.filter((i) => Number(i.quantity) <= Number(i.reorder_level || 0)).length;
            return { kpiValue: lowCount };
          }
          return { kpiValue: itemList.length };
        }
        const totalVal = itemList.reduce(
          (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.cost_per_unit) || 0),
          0
        );
        return { kpiValue: Math.round(totalVal) };
      }

      if (widget_type === "alert") {
        const lowItems = itemList.filter((i) => Number(i.quantity) <= Number(i.reorder_level || 0));
        return {
          alertActive: lowItems.length > 0,
          alertMessage: `${lowItems.length} items below minimum stock level.`,
        };
      }

      if (widget_type === "table") {
        const lowOnly = query_config.filterField === "low_stock";
        const rowsToShow = lowOnly
          ? itemList.filter((i) => Number(i.quantity) <= Number(i.reorder_level || 0))
          : itemList;
        return { tableRows: rowsToShow.slice(0, query_config.limit || 8) };
      }

      return { kpiValue: itemList.length };
    }

    case "customers": {
      let query = supabase
        .from("customers")
        .select("id, name, phone, visit_count, total_spent, loyalty_points, created_at")
        .eq("restaurant_id", restaurantId);

      if (dateFilter) {
        query = query.gte("created_at", dateFilter.from).lte("created_at", dateFilter.to);
      }

      const { data: customers = [], error } = await query;
      if (error) throw error;
      const custList = customers || [];

      if (widget_type === "kpi") {
        if (query_config.aggregation === "avg") {
          const totalSpent = custList.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0);
          return { kpiValue: custList.length ? Math.round(totalSpent / custList.length) : 0 };
        }
        return { kpiValue: custList.length };
      }

      if (widget_type === "table") {
        const sorted = [...custList].sort((a, b) => (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0));
        return { tableRows: sorted.slice(0, query_config.limit || 8) };
      }

      return { kpiValue: custList.length };
    }

    case "staff": {
      const { data: staffList = [], error } = await supabase
        .from("staff")
        .select("id, first_name, last_name, position, status, phone, salary")
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      const list = (staffList || []).map((s) => ({
        id: s.id,
        name: `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Staff Member",
        role: s.position || "Staff",
        is_active: s.status === "active" || s.status === "working",
        phone: s.phone,
        salary: s.salary,
      }));

      if (widget_type === "kpi") {
        const activeCount = list.filter((s) => s.is_active).length;
        return { kpiValue: activeCount };
      }

      if (widget_type === "table") {
        return { tableRows: list.slice(0, query_config.limit || 8) };
      }

      return { kpiValue: list.length };
    }

    case "finance": {
      let query = supabase
        .from("expenses")
        .select("id, amount, category, expense_date, description")
        .eq("restaurant_id", restaurantId);

      if (dateFilter) {
        query = query.gte("expense_date", dateFilter.from).lte("expense_date", dateFilter.to);
      }

      const { data: expenses = [], error } = await query;
      if (error) throw error;
      const expList = expenses || [];

      if (widget_type === "kpi") {
        const total = expList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        return { kpiValue: Math.round(total) };
      }

      if (widget_type === "chart") {
        const byCat: Record<string, number> = {};
        expList.forEach((e) => {
          const cat = e.category || "General";
          byCat[cat] = (byCat[cat] || 0) + (Number(e.amount) || 0);
        });
        return {
          chartCategories: Object.keys(byCat),
          chartSeries: [{ name: "Expenses", data: Object.values(byCat) }],
        };
      }

      return { kpiValue: expList.length };
    }

    default:
      return { kpiValue: 0 };
  }
}
