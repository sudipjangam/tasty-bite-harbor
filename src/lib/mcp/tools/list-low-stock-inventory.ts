import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveRestaurant, errorResult, textResult } from "../supabase";

export default defineTool({
  name: "list_low_stock_inventory",
  title: "List low stock inventory",
  description:
    "List inventory items for the signed-in user's restaurant that are at or below their reorder level.",
  inputSchema: {
    limit: z.number().int().optional().describe("How many items to return (1-100, default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    try {
      const { supabase, restaurantId } = await resolveRestaurant(ctx);
      const take = Math.min(Math.max(Math.trunc(limit ?? 50), 1), 100);
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, category, quantity, unit, reorder_level, cost_per_unit")
        .eq("restaurant_id", restaurantId)
        .order("quantity", { ascending: true })
        .limit(500);
      if (error) return errorResult(error.message);

      const low = (data ?? [])
        .filter((item) => Number(item.quantity ?? 0) <= Number(item.reorder_level ?? 0))
        .slice(0, take);
      return textResult(low, { items: low });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});
