import { defineTool } from "@lovable.dev/mcp-js";
import { resolveRestaurant, errorResult, textResult } from "../supabase";

export default defineTool({
  name: "get_restaurant_overview",
  title: "Get restaurant overview",
  description:
    "Return the restaurant linked to the signed-in account, with today's order count and revenue.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    try {
      const { supabase, restaurantId } = await resolveRestaurant(ctx);
      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .select("id, name, address, phone, email")
        .eq("id", restaurantId)
        .maybeSingle();
      if (error) return errorResult(error.message);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startOfDay.toISOString());
      if (ordersError) return errorResult(ordersError.message);

      const todayRevenue = (orders ?? []).reduce(
        (sum: number, o: { total: number | null }) => sum + Number(o.total ?? 0),
        0,
      );
      const payload = {
        restaurant,
        today: { orders: orders?.length ?? 0, revenue: Math.round(todayRevenue * 100) / 100 },
      };
      return textResult(payload, payload);
    } catch (e) {
      return errorResult(e instanceof Error ? e.message : String(e));
    }
  },
});
