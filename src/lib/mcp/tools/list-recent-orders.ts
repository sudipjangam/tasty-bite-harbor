import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveRestaurant, errorResult, textResult } from "../supabase";

export default defineTool({
  name: "list_recent_orders",
  title: "List recent orders",
  description:
    "List the most recent orders for the signed-in user's restaurant, newest first. Optionally filter by status.",
  inputSchema: {
    limit: z.number().int().optional().describe("How many orders to return (1-50, default 10)."),
    status: z
      .string()
      .optional()
      .describe("Optional order status filter, e.g. 'pending', 'completed'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    try {
      const { supabase, restaurantId } = await resolveRestaurant(ctx);
      const take = Math.min(Math.max(Math.trunc(limit ?? 10), 1), 50);
      let query = supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, items, total, status, payment_status, payment_method, order_type, source, created_at",
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(take);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return errorResult(error.message);
      return textResult(data ?? [], { orders: data ?? [] });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});
