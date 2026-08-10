import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getRestaurantOverview from "./tools/get-restaurant-overview";
import listRecentOrders from "./tools/list-recent-orders";
import getSalesSummary from "./tools/get-sales-summary";
import listMenuItems from "./tools/list-menu-items";
import listLowStockInventory from "./tools/list-low-stock-inventory";

// Built from the project ref (inlined at build time) so the issuer always matches
// the direct Supabase host published by the discovery document.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "clmsoetktmvhazctlans";

export default defineMcp({
  name: "tasty-bite-harbor",
  title: "tasty-bite-harbor",
  version: "0.1.0",
  instructions:
    "Tools for the tasty-bite-harbor restaurant POS. Every tool acts as the signed-in user and is scoped to their restaurant. Use `get_restaurant_overview` for today's snapshot, `list_recent_orders` and `get_sales_summary` for order and revenue analysis, `list_menu_items` for the menu, and `list_low_stock_inventory` for restocking decisions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getRestaurantOverview,
    listRecentOrders,
    getSalesSummary,
    listMenuItems,
    listLowStockInventory,
  ],
});
