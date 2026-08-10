import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { resolveRestaurant, errorResult, textResult } from "../supabase";

export default defineTool({
  name: "list_menu_items",
  title: "List menu items",
  description:
    "List menu items for the signed-in user's restaurant, optionally filtered by category or a name search.",
  inputSchema: {
    category: z.string().optional().describe("Exact category name to filter by."),
    search: z.string().optional().describe("Case-insensitive substring match on the item name."),
    limit: z.number().int().optional().describe("How many items to return (1-100, default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    try {
      const { supabase, restaurantId } = await resolveRestaurant(ctx);
      const take = Math.min(Math.max(Math.trunc(limit ?? 50), 1), 100);
      let query = supabase
        .from("menu_items")
        .select("id, name, category, price, is_available, is_veg, is_special, description")
        .eq("restaurant_id", restaurantId)
        .order("category", { ascending: true })
        .limit(take);
      if (category) query = query.eq("category", category);
      if (search) query = query.ilike("name", `%${search}%`);

      const { data, error } = await query;
      if (error) return errorResult(error.message);
      return textResult(data ?? [], { items: data ?? [] });
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});
