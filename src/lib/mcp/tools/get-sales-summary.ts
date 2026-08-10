import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveRestaurant, errorResult, textResult } from "../supabase";

export default defineTool({
  name: "get_sales_summary",
  title: "Get sales summary",
  description:
    "Summarise sales for the signed-in user's restaurant over the last N days: revenue, order count, average order value, and a per-day breakdown.",
  inputSchema: {
    days: z.number().int().optional().describe("Number of days to look back (1-90, default 7)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    try {
      const { supabase, restaurantId } = await resolveRestaurant(ctx);
      const window = Math.min(Math.max(Math.trunc(days ?? 7), 1), 90);
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (window - 1));

      const { data, error } = await supabase
        .from("orders")
        .select("total, created_at, payment_method")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", since.toISOString());
      if (error) return errorResult(error.message);

      const rows = data ?? [];
      const byDay: Record<string, { orders: number; revenue: number }> = {};
      let revenue = 0;
      for (const row of rows) {
        const amount = Number(row.total ?? 0);
        revenue += amount;
        const day = String(row.created_at).slice(0, 10);
        byDay[day] = byDay[day] ?? { orders: 0, revenue: 0 };
        byDay[day].orders += 1;
        byDay[day].revenue = Math.round((byDay[day].revenue + amount) * 100) / 100;
      }

      const payload = {
        period_days: window,
        from: since.toISOString().slice(0, 10),
        orders: rows.length,
        revenue: Math.round(revenue * 100) / 100,
        average_order_value: rows.length ? Math.round((revenue / rows.length) * 100) / 100 : 0,
        by_day: Object.entries(byDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, stats]) => ({ date, ...stats })),
      };
      return textResult(payload, payload);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});
