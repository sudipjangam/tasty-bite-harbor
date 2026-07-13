import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "./useRestaurantId";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { type BusinessCategory, isReportCategoryVisible } from "./usePlanType";

export type ReportCategory =
  | "orders"
  | "menu"
  | "inventory"
  | "customers"
  | "staff"
  | "suppliers"
  | "expenses"
  | "rooms"
  | "recipes"
  | "promotions"
  | "repeat_customers";

export interface CategoryReportConfig {
  id: ReportCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const REPORT_CATEGORIES: CategoryReportConfig[] = [
  {
    id: "orders",
    name: "Orders & Sales",
    description: "Revenue, order count, payment breakdown",
    icon: "ShoppingCart",
    color: "bg-blue-500",
  },
  {
    id: "menu",
    name: "Menu Items",
    description: "Item-wise sales, quantity & revenue",
    icon: "UtensilsCrossed",
    color: "bg-orange-500",
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Stock levels, low stock alerts",
    icon: "Package",
    color: "bg-green-500",
  },
  {
    id: "customers",
    name: "Customers",
    description: "Visit frequency, loyalty points",
    icon: "Users",
    color: "bg-purple-500",
  },
  {
    id: "staff",
    name: "Staff",
    description: "Attendance, hours worked",
    icon: "UserCheck",
    color: "bg-indigo-500",
  },
  {
    id: "suppliers",
    name: "Suppliers",
    description: "Purchase history, pending orders",
    icon: "Truck",
    color: "bg-yellow-500",
  },
  {
    id: "expenses",
    name: "Expenses",
    description: "Expense breakdown, category totals",
    icon: "Receipt",
    color: "bg-red-500",
  },
  {
    id: "rooms",
    name: "Rooms/Hotel",
    description: "Occupancy, revenue per room",
    icon: "Bed",
    color: "bg-teal-500",
  },
  {
    id: "recipes",
    name: "Recipes",
    description: "Food cost, margin analysis",
    icon: "ChefHat",
    color: "bg-pink-500",
  },
  {
    id: "promotions",
    name: "Promotions",
    description: "Campaign performance, discounts",
    icon: "Tag",
    color: "bg-cyan-500",
  },
  {
    id: "repeat_customers",
    name: "Repeat Customers",
    description: "Day-wise repeat customer analysis",
    icon: "UserCheck",
    color: "bg-emerald-500",
  },
];

/**
 * Returns report categories filtered by business category.
 * Hides "Rooms/Hotel" for food truck and restaurant-only plans.
 */
export const getFilteredReportCategories = (
  businessCategory: BusinessCategory,
): CategoryReportConfig[] => {
  return REPORT_CATEGORIES.filter((cat) =>
    isReportCategoryVisible(cat.id, businessCategory),
  );
};

export interface PayLaterOrderSummary {
  date: string;
  customer: string;
  phone: string;
  total: number;
  orderId: string;
}

export interface ReportData {
  category: ReportCategory;
  title: string;
  summary: Record<string, number | string>;
  tableData: Record<string, unknown>[];
  chartData?: Record<string, unknown>[];
  paymentBreakdown?: { cash: number; upi: number; card: number; payLater: number; roomCharge: number; otherCredit: number };
  payLaterOrders?: PayLaterOrderSummary[];
}

export const useReportsData = (dateRange?: DateRange) => {
  const { restaurantId } = useRestaurantId();

  const startDate = dateRange?.from
    ? format(startOfDay(dateRange.from), "yyyy-MM-dd'T'HH:mm:ss")
    : format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ss");
  const endDate = dateRange?.to
    ? format(endOfDay(dateRange.to), "yyyy-MM-dd'T'HH:mm:ss")
    : format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

  // Orders Report
  const ordersReport = useQuery({
    queryKey: ["report-orders", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      // Fetch ALL orders for table display, order count, and type breakdown
      const { data: allOrders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // ── STANDARD REVENUE RULE (matches Orders Management & Financial/P&L) ──
      // Revenue = completed + chargeable orders only
      const revenueOrders = (allOrders || []).filter(
        (o) => o.status === "completed" && o.order_type !== "non-chargeable"
      );
      const totalRevenue = revenueOrders.reduce(
        (sum, o) => sum + (o.total || 0),
        0,
      );

      // ── PAYMENT METHOD BREAKDOWN (reliable — always set at payment time) ──
      // This is what users tally against their manual book
      const paymentBreakdown = { cash: 0, upi: 0, card: 0, payLater: 0, roomCharge: 0, otherCredit: 0 };
      const payLaterOrders: PayLaterOrderSummary[] = [];

      const classifyCreditMethod = (method: string, amt: number, order?: any) => {
        if (method.includes("pay_later") || method.includes("paylater")) {
          paymentBreakdown.payLater += amt;
          if (order) {
            payLaterOrders.push({
              date: format(new Date(order.created_at), "MMM dd, yyyy HH:mm"),
              customer: order.customer_name || order.Customer_Name || "Walk-in",
              phone: order.customer_phone || order.Customer_MobileNumber || "-",
              total: order.total || 0,
              orderId: order.id,
            });
          }
        } else if (method.includes("room") || method.includes("folio")) {
          paymentBreakdown.roomCharge += amt;
        } else {
          paymentBreakdown.otherCredit += amt;
        }
      };

      revenueOrders.forEach((o) => {
        const method = (o.payment_method || "").toLowerCase();
        const amt = o.total || 0;
        if (method === "split" && (o as any).split_payments) {
          const splits: Array<{method: string; amount: number}> = Array.isArray((o as any).split_payments)
            ? (o as any).split_payments
            : [];
          splits.forEach((s) => {
            const m = (s.method || "").toLowerCase();
            const a = s.amount || 0;
            if (m.includes("cash")) paymentBreakdown.cash += a;
            else if (m.includes("upi")) paymentBreakdown.upi += a;
            else if (m.includes("card")) paymentBreakdown.card += a;
            else classifyCreditMethod(m, a);
          });
        } else if (method.includes("cash")) paymentBreakdown.cash += amt;
        else if (method.includes("upi")) paymentBreakdown.upi += amt;
        else if (method.includes("card")) paymentBreakdown.card += amt;
        else classifyCreditMethod(method, amt, o);
      });

      // Order count = all orders placed in the period (including pending/cancelled etc.)
      const orderCount = allOrders?.length || 0;
      const completedChargeableCount = revenueOrders.length;
      const avgOrderValue =
        completedChargeableCount > 0
          ? totalRevenue / completedChargeableCount
          : 0;
      const totalDiscount = revenueOrders.reduce(
        (sum, o) => sum + (o.discount_amount || 0),
        0,
      );

      // Group by order type (all orders)
      const byType =
        allOrders?.reduce(
          (acc, o) => {
            const type = o.order_type || "dine-in";
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      // Format ALL orders for table display
      const formattedOrders =
        allOrders?.map((o) => ({
          "Order Date": format(new Date(o.created_at), "MMM dd, yyyy HH:mm"),
          Customer: o.customer_name || o.Customer_Name || "Walk-in",
          Phone: o.customer_phone || o.Customer_MobileNumber || "-",
          Type: o.order_type || "dine-in",
          Source: o.source || "POS",
          Items: o.items,
          Discount: o.discount_amount || 0,
          Total: o.total || 0,
          Status: o.status || "completed",
          "Payment": o.payment_method ? o.payment_method.toUpperCase() : "-",
        })) || [];

      return {
        category: "orders" as ReportCategory,
        title: "Orders & Sales Report",
        summary: {
          "Total Revenue": `₹${totalRevenue.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`,
          "Total Orders": orderCount,
          "Avg Order": `₹${avgOrderValue.toFixed(0)}`,
          "Total Discounts": `₹${totalDiscount.toFixed(0)}`,
        },
        tableData: formattedOrders,
        chartData: Object.entries(byType).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        })),
        // Extra data for reconciliation UI (consumed by ReportViewer)
        paymentBreakdown,
        payLaterOrders,
      } as ReportData;
    },
    enabled: !!restaurantId,
  });


  // Menu Report
  const menuReport = useQuery({
    queryKey: ["report-menu", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const [menuResult, ordersResult] = await Promise.all([
        supabase
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabase
          .from("orders")
          .select("items, total, order_type")
          .eq("restaurant_id", restaurantId)
          .eq("status", "completed")
          .neq("order_type", "non-chargeable")
          .gte("created_at", startDate)
          .lte("created_at", endDate),
      ]);

      if (menuResult.error) throw menuResult.error;

      const menuItems = menuResult.data || [];
      const orders = ordersResult.data || [];

      // Build a price lookup from menu items (normalized lowercase trimmed name -> price)
      const menuPriceLookup: Record<string, number> = {};
      const menuNameMap: Record<string, string> = {}; // normalized -> original name
      menuItems.forEach((item) => {
        const normalized = item.name.trim().replace(/\s+/g, " ").toLowerCase();
        menuPriceLookup[normalized] = Number(item.price) || 0;
        menuNameMap[normalized] = item.name;
      });

      // Helper to clean order item text: strip "([size]) @price" suffixes
      const cleanItemName = (raw: string): string => {
        return raw
          .replace(/\s*\(?\[.*?\]\)?\s*/g, " ") // Remove ([...]) or [...] size info
          .replace(/\s*@\d+(\.\d+)?\s*$/g, "")   // Remove @price suffix
          .replace(/\s+/g, " ")                    // Normalize whitespace
          .trim();
      };

      // Extract @price from the raw item string (e.g. "Cold coffee ([]) @150" -> 150)
      const extractAtPrice = (raw: string): number | null => {
        const match = raw.match(/@(\d+(?:\.\d+)?)\s*$/);
        return match ? parseFloat(match[1]) : null;
      };

      // Find the best matching menu item name for an order item name
      const findMenuMatch = (orderItemName: string): { price: number; canonicalName: string } => {
        const normalized = orderItemName.toLowerCase();
        
        // Direct match
        if (menuPriceLookup[normalized] !== undefined) {
          return { price: menuPriceLookup[normalized], canonicalName: menuNameMap[normalized] };
        }

        // Fuzzy match: find menu items whose normalized name contains or is contained in the order item name
        for (const [menuNormalized, menuOriginal] of Object.entries(menuNameMap)) {
          if (menuNormalized.includes(normalized) || normalized.includes(menuNormalized)) {
            return { price: menuPriceLookup[menuNormalized], canonicalName: menuOriginal };
          }
        }

        return { price: 0, canonicalName: orderItemName };
      };

      // Count item sales and revenue from orders
      const itemSales: Record<string, number> = {};
      const itemRevenue: Record<string, number> = {};
      orders
        .filter((o) => o.order_type !== "non-chargeable")
        .forEach((order) => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: string) => {
              let rawName = "";
              let qty = 1;
              let inlinePrice: number | null = null;

              try {
                const parsed =
                  typeof item === "string" ? JSON.parse(item) : item;
                rawName = (parsed.name || "").trim();
                qty = parsed.quantity || 1;
                // Use price from parsed JSON if available
                if (parsed.price) inlinePrice = Number(parsed.price);
              } catch {
                // Parse "2x Cold coffee ([]) @150" format
                const match = String(item).match(/^(\d+)x\s+(.+)$/i);
                if (match) {
                  qty = parseInt(match[1], 10);
                  rawName = match[2].trim();
                } else {
                  rawName = String(item).trim();
                  qty = 1;
                }
                // Extract @price from the raw string
                if (inlinePrice === null) {
                  inlinePrice = extractAtPrice(rawName);
                }
              }

              if (!rawName) return;

              // Clean name: strip ([size]) and @price suffixes
              const cleanedName = cleanItemName(rawName);
              if (!cleanedName) return;

              // Find matching menu item
              const { price: menuPrice, canonicalName } = findMenuMatch(cleanedName);

              // Use inline @price first (actual price at time of order), fall back to menu lookup
              const unitPrice = inlinePrice !== null ? inlinePrice : menuPrice;

              // Aggregate under the canonical menu item name
              const key = canonicalName.trim();
              itemSales[key] = (itemSales[key] || 0) + qty;
              itemRevenue[key] = (itemRevenue[key] || 0) + unitPrice * qty;
            });
          }
        });

      // Category breakdown
      const byCategory = menuItems.reduce(
        (acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Calculate totals
      const totalUnitsSold = Object.values(itemSales).reduce(
        (a, b) => a + b,
        0,
      );
      const totalItemRevenue = Object.values(itemRevenue).reduce(
        (a, b) => a + b,
        0,
      );

      // Format menu items for display — focus on sales performance
      let totalTheoreticalRevenue = 0;
      const formattedItems = menuItems
        .map((item) => {
          // Try exact name, then trimmed name for lookup
          const unitsSold = itemSales[item.name] ?? itemSales[item.name.trim()] ?? 0;
          const revenue = itemRevenue[item.name] ?? itemRevenue[item.name.trim()] ?? 0;
          const theoretical = Number(item.price) * unitsSold;
          const variance = theoretical - revenue;
          totalTheoreticalRevenue += theoretical;
          return {
            "Item Name": item.name.trim(),
            Category: item.category,
            "Rate (₹)": `₹${item.price}`,
            "Qty Sold": unitsSold,
            "Revenue (₹)": `₹${revenue.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}`,
            "Variance (₹)": unitsSold > 0 ? `₹${variance.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}` : "—",
            Available: item.is_available ? "Yes" : "No",
            Veg: item.is_veg ? "Veg" : "Non-Veg",
          };
        })
        .sort(
          (a, b) => b["Qty Sold"] - a["Qty Sold"],
        );

      const totalVariance = totalTheoreticalRevenue - totalItemRevenue;
      // Add grand total row at the bottom
      formattedItems.push({
        "Item Name": "━━ GRAND TOTAL ━━",
        Category: "",
        "Rate (₹)": "",
        "Qty Sold": totalUnitsSold,
        "Revenue (₹)": `₹${totalItemRevenue.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })}`,
        "Variance (₹)": `₹${totalVariance.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
        })}`,
        Available: "",
        Veg: "",
      });

      // Chart: revenue by top selling items (top 10)
      const topSellerChartData = formattedItems
        .filter((item) => item["Qty Sold"] > 0)
        .slice(0, 10)
        .map((item) => ({
          name:
            item["Item Name"].length > 18
              ? item["Item Name"].substring(0, 18) + "…"
              : item["Item Name"],
          value: item["Qty Sold"],
          revenue: itemRevenue[item["Item Name"]] || 0,
        }));

      return {
        category: "menu" as ReportCategory,
        title: "Menu Item Sales Summary",
        summary: {
          "Total Menu Items": menuItems.length,
          "Items Sold": totalUnitsSold,
          "Total Revenue": `₹${totalItemRevenue.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`,
          Categories: Object.keys(byCategory).length,
        },
        tableData: formattedItems,
        chartData: topSellerChartData,
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Inventory Report
  const inventoryReport = useQuery({
    queryKey: ["report-inventory", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: items, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("quantity", { ascending: true });

      if (error) throw error;

      const totalValue =
        items?.reduce(
          (sum, i) => sum + i.quantity * (i.cost_per_unit || 0),
          0,
        ) || 0;
      const lowStock =
        items?.filter((i) => i.quantity <= (i.reorder_level || 10)) || [];

      const byCategory =
        items?.reduce(
          (acc, item) => {
            acc[item.category] =
              (acc[item.category] || 0) +
              item.quantity * (item.cost_per_unit || 0);
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      // Format inventory for display
      const formattedInventory =
        items?.map((item) => ({
          "Item Name": item.name,
          Category: item.category,
          Quantity: item.quantity,
          Unit: item.unit || "pcs",
          "Cost/Unit": `₹${(item.cost_per_unit || 0).toFixed(2)}`,
          "Total Value": `₹${(
            item.quantity * (item.cost_per_unit || 0)
          ).toFixed(2)}`,
          Status:
            item.quantity <= (item.reorder_level || 10)
              ? "⚠️ Low Stock"
              : "✓ OK",
        })) || [];

      return {
        category: "inventory" as ReportCategory,
        title: "Inventory Report",
        summary: {
          "Total Items": items?.length || 0,
          "Stock Value": `₹${totalValue.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`,
          "Low Stock": lowStock.length,
          Categories: Object.keys(byCategory).length,
        },
        tableData: formattedInventory,
        chartData: Object.entries(byCategory).map(([name, value]) => ({
          name,
          value: Number((value as number).toFixed(0)),
        })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Customers Report (date-aware: shows customers who ordered in date range)
  const customersReport = useQuery({
    queryKey: ["report-customers", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      // Fetch orders in date range to identify active customers
      const [customersResult, ordersResult] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabase
          .from("orders")
          .select("customer_name, Customer_Name, customer_phone, Customer_MobileNumber, total, order_type, created_at")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", startDate)
          .lte("created_at", endDate),
      ]);

      if (customersResult.error) throw customersResult.error;

      const allCustomers = customersResult.data || [];
      const orders = ordersResult.data || [];

      // Build a map of customer name → aggregated stats from orders in range
      const customerOrderStats: Record<string, { spent: number; orderCount: number }> = {};
      orders
        .filter((o) => o.order_type !== "non-chargeable")
        .forEach((o) => {
          const name = (o.customer_name || o.Customer_Name || "Walk-in").trim();
          if (isTableOrGenericName(name)) return;
          if (!customerOrderStats[name]) {
            customerOrderStats[name] = { spent: 0, orderCount: 0 };
          }
          customerOrderStats[name].spent += o.total || 0;
          customerOrderStats[name].orderCount += 1;
        });

      // Match with customer records
      const activeCustomerNames = new Set(Object.keys(customerOrderStats));
      const matchedCustomers = allCustomers.filter((c) =>
        activeCustomerNames.has(c.name?.trim()),
      );

      // If customer has no record but placed order, create a virtual entry
      const matchedNames = new Set(matchedCustomers.map((c) => c.name?.trim()));
      const unmatchedNames = [...activeCustomerNames].filter((n) => !matchedNames.has(n));

      const totalRevenue = Object.values(customerOrderStats).reduce(
        (sum, s) => sum + s.spent, 0,
      );
      const totalActiveCustomers = activeCustomerNames.size;
      const avgSpent = totalActiveCustomers > 0 ? totalRevenue / totalActiveCustomers : 0;
      const loyaltyEnrolled = matchedCustomers.filter((c) => c.loyalty_enrolled).length;

      // Format for display
      const formattedCustomers = [
        ...matchedCustomers.map((c) => {
          const stats = customerOrderStats[c.name?.trim()] || { spent: 0, orderCount: 0 };
          return {
            Name: c.name,
            Phone: c.phone || "-",
            Email: c.email || "-",
            "Period Spent": `₹${stats.spent.toLocaleString("en-IN")}`,
            "Period Orders": stats.orderCount,
            "Total Spent (All Time)": `₹${(c.total_spent || 0).toLocaleString("en-IN")}`,
            "Visit Count": c.visit_count || 0,
            "Loyalty Points": c.loyalty_points || 0,
            "Loyalty Member": c.loyalty_enrolled ? "Yes" : "No",
          };
        }),
        ...unmatchedNames.map((name) => {
          const stats = customerOrderStats[name];
          return {
            Name: name,
            Phone: "-",
            Email: "-",
            "Period Spent": `₹${stats.spent.toLocaleString("en-IN")}`,
            "Period Orders": stats.orderCount,
            "Total Spent (All Time)": "-",
            "Visit Count": "-",
            "Loyalty Points": "-",
            "Loyalty Member": "No",
          };
        }),
      ].sort((a, b) => {
        const aVal = parseFloat(String(a["Period Spent"]).replace(/[₹,]/g, "")) || 0;
        const bVal = parseFloat(String(b["Period Spent"]).replace(/[₹,]/g, "")) || 0;
        return bVal - aVal;
      });

      // Chart: top 10 by period spending
      const chartData = formattedCustomers
        .slice(0, 10)
        .map((c) => ({
          name: String(c.Name).length > 15 ? String(c.Name).substring(0, 15) + "…" : c.Name,
          value: parseFloat(String(c["Period Spent"]).replace(/[₹,]/g, "")) || 0,
        }));

      return {
        category: "customers" as ReportCategory,
        title: "Customer Insights Report",
        summary: {
          "Active Customers": totalActiveCustomers,
          "Period Revenue": `₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`,
          "Avg Spend": `₹${avgSpent.toFixed(0)}`,
          "Loyalty Members": loyaltyEnrolled,
        },
        tableData: formattedCustomers,
        chartData,
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Staff Report
  const staffReport = useQuery({
    queryKey: ["report-staff", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const [staffResult, clockResult, leavesResult] = await Promise.all([
        supabase.from("staff").select("*").eq("restaurant_id", restaurantId),
        supabase
          .from("staff_clock_entries")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .gte("clock_in", startDate)
          .lte("clock_in", endDate),
        supabase
          .from("staff_leaves")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .gte("start_date", startDate.split("T")[0])
          .lte("end_date", endDate.split("T")[0]),
      ]);

      const staff = staffResult.data || [];
      const clockEntries = clockResult.data || [];
      const leaves = leavesResult.data || [];

      // Calculate hours per staff
      const hoursByStaff: Record<string, number> = {};
      clockEntries.forEach((entry) => {
        if (entry.clock_in && entry.clock_out) {
          const hours =
            (new Date(entry.clock_out).getTime() -
              new Date(entry.clock_in).getTime()) /
            (1000 * 60 * 60);
          hoursByStaff[entry.staff_id] =
            (hoursByStaff[entry.staff_id] || 0) + hours;
        }
      });

      return {
        category: "staff" as ReportCategory,
        title: "Staff Report",
        summary: {
          "Total Staff": staff.length,
          "Clock Entries": clockEntries.length,
          "Leave Requests": leaves.length,
        },
        tableData: staff.map((s) => ({
          "Name": `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          "Role": s.role || '-',
          "Phone": s.phone || '-',
          "Email": s.email || '-',
          "Hours Worked": Number((hoursByStaff[s.id] || 0).toFixed(1)),
        })),
        chartData: staff.map((s) => ({
          name: `${s.first_name} ${s.last_name}`,
          value: hoursByStaff[s.id] || 0,
        })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Suppliers Report
  const suppliersReport = useQuery({
    queryKey: ["report-suppliers", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const [suppliersResult, ordersResult] = await Promise.all([
        supabase
          .from("suppliers")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabase
          .from("purchase_orders")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", startDate)
          .lte("created_at", endDate),
      ]);

      const suppliers = suppliersResult.data || [];
      const purchaseOrders = ordersResult.data || [];

      const totalSpent = purchaseOrders.reduce(
        (sum, po) => sum + (po.total_amount || 0),
        0,
      );
      const pendingOrders = purchaseOrders.filter(
        (po) => po.status === "pending",
      ).length;

      // Spending by supplier
      const bySupplier: Record<string, number> = {};
      purchaseOrders.forEach((po) => {
        bySupplier[po.supplier_id] =
          (bySupplier[po.supplier_id] || 0) + (po.total_amount || 0);
      });

      return {
        category: "suppliers" as ReportCategory,
        title: "Supplier Analysis Report",
        summary: {
          "Total Suppliers": suppliers.length,
          "Purchase Orders": purchaseOrders.length,
          "Total Spent": `₹${totalSpent.toFixed(2)}`,
          "Pending Orders": pendingOrders,
        },
        tableData: suppliers
          .map((s) => ({
            "Name": s.name || '-',
            "Contact": s.contact_person || '-',
            "Phone": s.phone || '-',
            "Email": s.email || '-',
            "Total Spent": `₹${(bySupplier[s.id] || 0).toFixed(2)}`,
          }))
          .sort((a, b) => parseFloat(b["Total Spent"].replace('₹', '')) - parseFloat(a["Total Spent"].replace('₹', ''))),
        chartData: suppliers
          .map((s) => ({ name: s.name, value: bySupplier[s.id] || 0 }))
          .filter((d) => d.value > 0),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Expenses Report
  const expensesReport = useQuery({
    queryKey: ["report-expenses", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: expenses, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", startDate.split("T")[0])
        .lte("expense_date", endDate.split("T")[0])
        .order("expense_date", { ascending: false });

      if (error) throw error;

      const totalExpenses =
        expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const byCategory =
        expenses?.reduce(
          (acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      return {
        category: "expenses" as ReportCategory,
        title: "Expense Report",
        summary: {
          "Total Expenses": `₹${totalExpenses.toFixed(2)}`,
          "Expense Count": expenses?.length || 0,
          Categories: Object.keys(byCategory).length,
        },
        tableData: (expenses || []).map((e) => ({
          "Description": e.description || '-',
          "Category": e.category || '-',
          "Amount": `₹${(e.amount || 0).toFixed(2)}`,
          "Date": e.expense_date || '-',
          "Payment Method": e.payment_method || '-',
        })),
        chartData: Object.entries(byCategory).map(([name, value]) => ({
          name,
          value,
        })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Rooms Report
  const roomsReport = useQuery({
    queryKey: ["report-rooms", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const [roomsResult, reservationsResult, billingsResult] =
        await Promise.all([
          supabase.from("rooms").select("*").eq("restaurant_id", restaurantId),
          supabase
            .from("reservations")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .gte("start_time", startDate)
            .lte("end_time", endDate),
          supabase
            .from("room_billings")
            .select("*")
            .eq("restaurant_id", restaurantId)
            .gte("created_at", startDate)
            .lte("created_at", endDate),
        ]);

      const rooms = roomsResult.data || [];
      const reservations = reservationsResult.data || [];
      const billings = billingsResult.data || [];

      const totalRevenue = billings.reduce(
        (sum, b) => sum + (b.total_amount || 0),
        0,
      );
      const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;

      return {
        category: "rooms" as ReportCategory,
        title: "Rooms/Hotel Report",
        summary: {
          "Total Rooms": rooms.length,
          Occupied: occupiedRooms,
          Reservations: reservations.length,
          Revenue: `₹${totalRevenue.toFixed(2)}`,
        },
        tableData: rooms.map((r) => ({
          "Room Name": r.name || '-',
          "Type": r.room_type || '-',
          "Status": r.status || '-',
          "Floor": r.floor || '-',
          "Base Price": `₹${(r.base_price || 0).toFixed(2)}`,
        })),
        chartData: rooms.map((r) => ({
          name: r.name,
          value: r.base_price || 0,
        })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Recipes Report
  const recipesReport = useQuery({
    queryKey: ["report-recipes", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: recipes, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("food_cost_percentage", { ascending: false });

      if (error) throw error;

      const avgFoodCost = recipes?.length
        ? recipes.reduce((sum, r) => sum + (r.food_cost_percentage || 0), 0) /
          recipes.length
        : 0;
      const avgMargin = recipes?.length
        ? recipes.reduce((sum, r) => sum + (r.margin_percentage || 0), 0) /
          recipes.length
        : 0;

      return {
        category: "recipes" as ReportCategory,
        title: "Recipe Cost Analysis",
        summary: {
          "Total Recipes": recipes?.length || 0,
          "Avg Food Cost %": `${avgFoodCost.toFixed(1)}%`,
          "Avg Margin %": `${avgMargin.toFixed(1)}%`,
        },
        tableData: (recipes || []).map((r) => ({
          "Name": r.name || '-',
          "Category": r.category || '-',
          "Selling Price": `₹${(r.selling_price || 0).toFixed(2)}`,
          "Food Cost %": `${(r.food_cost_percentage || 0).toFixed(1)}%`,
          "Margin %": `${(r.margin_percentage || 0).toFixed(1)}%`,
        })),
        chartData:
          recipes?.slice(0, 10).map((r) => ({
            name: r.name,
            value: r.food_cost_percentage || 0,
            margin: r.margin_percentage || 0,
          })) || [],
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Promotions Report
  const promotionsReport = useQuery({
    queryKey: ["report-promotions", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      const [campaignsResult, sentResult] = await Promise.all([
        supabase
          .from("promotion_campaigns")
          .select("*")
          .eq("restaurant_id", restaurantId),
        supabase
          .from("sent_promotions")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .gte("sent_at", startDate)
          .lte("sent_at", endDate),
      ]);

      const campaigns = campaignsResult.data || [];
      const sent = sentResult.data || [];

      const activeCampaigns = campaigns.filter((c) => c.is_active).length;

      return {
        category: "promotions" as ReportCategory,
        title: "Promotions Report",
        summary: {
          "Total Campaigns": campaigns.length,
          Active: activeCampaigns,
          "Messages Sent": sent.length,
        },
        tableData: campaigns.map((c) => ({
          "Campaign Name": c.name || '-',
          "Discount": c.discount_percentage ? `${c.discount_percentage}%` : c.discount_amount ? `₹${c.discount_amount}` : '-',
          "Status": c.is_active ? 'Active' : 'Inactive',
          "Start Date": c.start_date || '-',
          "End Date": c.end_date || '-',
        })),
        chartData: campaigns.map((c) => ({
          name: c.name,
          value: c.discount_percentage || c.discount_amount || 0,
        })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // ── Helper: detect table-name / generic POS source names ──
  // These are NOT real customer identities and should be excluded from
  // repeat-customer analysis (they inflate repeat % because every order
  // from "Table 1" looks like the same returning customer).
  const isTableOrGenericName = (name: string): boolean => {
    const normalized = name.trim().toLowerCase();
    // "table 1", "table a", "table 01", "table abc", etc.
    if (/^table\s+\w+$/i.test(normalized)) return true;
    // Generic POS source names
    if ([
      "takeaway", "take away", "take-away",
      "delivery",
      "dine in", "dine-in", "dine_in",
      "walk-in", "walkin", "walk in", "walk-in customer",
      "non-chargeable", "nc",
      "counter", "parcel",
    ].includes(normalized)) return true;
    // Null / empty
    if (!normalized || normalized === "walk-in") return true;
    return false;
  };

  // Repeat Customers Day-Wise Report
  const repeatCustomersReport = useQuery({
    queryKey: ["report-repeat-customers", restaurantId, startDate, endDate],
    queryFn: async () => {
      if (!restaurantId) return null;

      // Fetch orders in date range
      const { data: orders, error } = await supabase
        .from("orders")
        .select("customer_name, Customer_Name, customer_phone, Customer_MobileNumber, total, order_type, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch all customers to know their total visit count
      const { data: allCustomers } = await supabase
        .from("customers")
        .select("name, phone, visit_count")
        .eq("restaurant_id", restaurantId);

      const customerVisitMap: Record<string, number> = {};
      (allCustomers || []).forEach((c) => {
        const key = (c.name || "").trim().toLowerCase();
        if (!isTableOrGenericName(key)) {
          customerVisitMap[key] = c.visit_count || 0;
        }
      });

      // Group orders by date → separate named customers vs anonymous/table orders
      const dayMapNamed: Record<string, Set<string>> = {};
      const dayAnonymousCount: Record<string, number> = {};
      const chargeableOrders = (orders || []).filter((o) => o.order_type !== "non-chargeable");

      let totalAnonymousOrders = 0;

      chargeableOrders.forEach((o) => {
        const day = format(new Date(o.created_at), "yyyy-MM-dd");
        const customerName = (o.customer_name || o.Customer_Name || "Walk-in").trim();

        if (isTableOrGenericName(customerName)) {
          // Anonymous / table-name order — count but don't include in repeat analysis
          dayAnonymousCount[day] = (dayAnonymousCount[day] || 0) + 1;
          totalAnonymousOrders++;
        } else {
          // Real named customer
          if (!dayMapNamed[day]) dayMapNamed[day] = new Set();
          dayMapNamed[day].add(customerName);
        }
      });

      // Track first-seen date per NAMED customer across the date range
      const customerFirstSeen: Record<string, string> = {};
      chargeableOrders.forEach((o) => {
        const day = format(new Date(o.created_at), "yyyy-MM-dd");
        const customerName = (o.customer_name || o.Customer_Name || "Walk-in").trim();
        if (!isTableOrGenericName(customerName)) {
          if (!customerFirstSeen[customerName] || day < customerFirstSeen[customerName]) {
            customerFirstSeen[customerName] = day;
          }
        }
      });

      // Collect all days that had any orders (named or anonymous)
      const allDaysSet = new Set<string>();
      Object.keys(dayMapNamed).forEach((d) => allDaysSet.add(d));
      Object.keys(dayAnonymousCount).forEach((d) => allDaysSet.add(d));
      const sortedDays = Array.from(allDaysSet).sort();

      let totalNamedCustomers = 0;
      let totalRepeatAll = 0;
      let totalNewAll = 0;

      const tableData = sortedDays.map((day) => {
        const namedCustomers = dayMapNamed[day] ? Array.from(dayMapNamed[day]) : [];
        const namedCount = namedCustomers.length;
        const anonCount = dayAnonymousCount[day] || 0;
        const totalForDay = namedCount + anonCount;

        // Repeat analysis only on named customers
        const repeatCustomers = namedCustomers.filter((name) => {
          const key = name.toLowerCase();
          const hasMultipleVisits = (customerVisitMap[key] || 0) > 1;
          const firstSeenBefore = customerFirstSeen[name] && customerFirstSeen[name] < day;
          return hasMultipleVisits || firstSeenBefore;
        });

        const repeatCount = repeatCustomers.length;
        const newCount = namedCount - repeatCount;
        // Repeat % is based on named customers only (excludes anonymous)
        const repeatPct = namedCount > 0 ? ((repeatCount / namedCount) * 100).toFixed(1) : "0.0";

        totalNamedCustomers += namedCount;
        totalRepeatAll += repeatCount;
        totalNewAll += newCount;

        return {
          Date: format(new Date(day), "MMM dd, yyyy (EEE)"),
          "Total Orders": totalForDay,
          "Named Customers": namedCount,
          "Repeat Customers": repeatCount,
          "New Customers": newCount,
          "Anonymous (Table/Other)": anonCount,
          "Repeat %": `${repeatPct}%`,
        };
      });

      const overallRepeatPct = totalNamedCustomers > 0
        ? ((totalRepeatAll / totalNamedCustomers) * 100).toFixed(1)
        : "0.0";
      const anonymousPct = chargeableOrders.length > 0
        ? ((totalAnonymousOrders / chargeableOrders.length) * 100).toFixed(1)
        : "0.0";

      return {
        category: "repeat_customers" as ReportCategory,
        title: "Repeat Customers - Day Wise",
        summary: {
          "Total Days": sortedDays.length,
          "Named Customers": totalNamedCustomers,
          "Repeat Customers": totalRepeatAll,
          "Repeat Rate": `${overallRepeatPct}%`,
          "Anonymous (Table/Other)": `${totalAnonymousOrders} (${anonymousPct}%)`,
        },
        tableData,
        chartData: tableData.map((d) => ({
          name: String(d.Date).replace(/ \(.*\)/, ""),
          value: d["Named Customers"],
          repeat: d["Repeat Customers"],
          new: d["New Customers"],
          anonymous: d["Anonymous (Table/Other)"],
        })),
      } as ReportData;
    },
    enabled: !!restaurantId,
  });

  // Get report by category
  const getReportByCategory = (
    category: ReportCategory,
  ): ReportData | null | undefined => {
    switch (category) {
      case "orders":
        return ordersReport.data;
      case "menu":
        return menuReport.data;
      case "inventory":
        return inventoryReport.data;
      case "customers":
        return customersReport.data;
      case "staff":
        return staffReport.data;
      case "suppliers":
        return suppliersReport.data;
      case "expenses":
        return expensesReport.data;
      case "rooms":
        return roomsReport.data;
      case "recipes":
        return recipesReport.data;
      case "promotions":
        return promotionsReport.data;
      case "repeat_customers":
        return repeatCustomersReport.data;
      default:
        return null;
    }
  };

  const isLoadingCategory = (category: ReportCategory): boolean => {
    switch (category) {
      case "orders":
        return ordersReport.isLoading;
      case "menu":
        return menuReport.isLoading;
      case "inventory":
        return inventoryReport.isLoading;
      case "customers":
        return customersReport.isLoading;
      case "staff":
        return staffReport.isLoading;
      case "suppliers":
        return suppliersReport.isLoading;
      case "expenses":
        return expensesReport.isLoading;
      case "rooms":
        return roomsReport.isLoading;
      case "recipes":
        return recipesReport.isLoading;
      case "promotions":
        return promotionsReport.isLoading;
      case "repeat_customers":
        return repeatCustomersReport.isLoading;
      default:
        return false;
    }
  };

  const isFetchingCategory = (category: ReportCategory): boolean => {
    switch (category) {
      case "orders":
        return ordersReport.isFetching;
      case "menu":
        return menuReport.isFetching;
      case "inventory":
        return inventoryReport.isFetching;
      case "customers":
        return customersReport.isFetching;
      case "staff":
        return staffReport.isFetching;
      case "suppliers":
        return suppliersReport.isFetching;
      case "expenses":
        return expensesReport.isFetching;
      case "rooms":
        return roomsReport.isFetching;
      case "recipes":
        return recipesReport.isFetching;
      case "promotions":
        return promotionsReport.isFetching;
      case "repeat_customers":
        return repeatCustomersReport.isFetching;
      default:
        return false;
    }
  };

  const getReportError = (category: ReportCategory): Error | null => {
    switch (category) {
      case "orders":
        return ordersReport.error;
      case "menu":
        return menuReport.error;
      case "inventory":
        return inventoryReport.error;
      case "customers":
        return customersReport.error;
      case "staff":
        return staffReport.error;
      case "suppliers":
        return suppliersReport.error;
      case "expenses":
        return expensesReport.error;
      case "rooms":
        return roomsReport.error;
      case "recipes":
        return recipesReport.error;
      case "promotions":
        return promotionsReport.error;
      case "repeat_customers":
        return repeatCustomersReport.error;
      default:
        return null;
    }
  };

  // Generate combined report for multiple categories
  const getCombinedReport = (categories: ReportCategory[]): ReportData[] => {
    return categories
      .map((cat) => getReportByCategory(cat))
      .filter(
        (report): report is ReportData =>
          report !== null && report !== undefined,
      );
  };

  return {
    // Individual reports
    ordersReport,
    menuReport,
    inventoryReport,
    customersReport,
    staffReport,
    suppliersReport,
    expensesReport,
    roomsReport,
    recipesReport,
    promotionsReport,
    repeatCustomersReport,
    // Utility functions
    getReportByCategory,
    isLoadingCategory,
    isFetchingCategory,
    getReportError,
    getCombinedReport,
    // Categories config
    categories: REPORT_CATEGORIES,
  };
};

export default useReportsData;
