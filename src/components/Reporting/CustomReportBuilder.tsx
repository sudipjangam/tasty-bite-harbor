import React, { useState } from "react";
import {
  useReportsData,
  REPORT_CATEGORIES,
  getFilteredReportCategories,
  ReportCategory,
  ReportData,
} from "@/hooks/useReportsData";
import { usePlanType } from "@/hooks/usePlanType";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { supabase } from "@/integrations/supabase/client";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  UtensilsCrossed,
  Package,
  Users,
  UserCheck,
  Truck,
  Receipt,
  Bed,
  ChefHat,
  Tag,
  FileText,
  Loader2,
  Check,
  Settings2,
  Calendar,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, format, startOfDay, endOfDay } from "date-fns";
import ReportViewer from "./ReportViewer";

const iconMap: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart className="h-5 w-5" />,
  UtensilsCrossed: <UtensilsCrossed className="h-5 w-5" />,
  Package: <Package className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  Truck: <Truck className="h-5 w-5" />,
  Receipt: <Receipt className="h-5 w-5" />,
  Bed: <Bed className="h-5 w-5" />,
  ChefHat: <ChefHat className="h-5 w-5" />,
  Tag: <Tag className="h-5 w-5" />,
};

interface ColumnConfig {
  id: string;
  label: string;
  category: string;
  mandatory?: boolean;
}

const MANDATORY_COLUMNS: ColumnConfig[] = [
  { id: "order_date", label: "Order Date", category: "Orders", mandatory: true },
  { id: "order_time", label: "Order Time", category: "Orders", mandatory: true },
  { id: "customer_name", label: "Customer Name", category: "Customers", mandatory: true },
  { id: "customer_contact", label: "Customer Contact", category: "Customers", mandatory: true },
  { id: "items", label: "Items", category: "Orders", mandatory: true },
  { id: "discount", label: "Discount", category: "Orders", mandatory: true },
  { id: "final_amount", label: "Final Amount", category: "Orders", mandatory: true },
  { id: "payment_mode", label: "Payment Mode", category: "Orders", mandatory: true },
  { id: "loyalty_points", label: "Loyalty Points", category: "Loyalty Points", mandatory: true },
];

const ADDITIONAL_COLUMNS: ColumnConfig[] = [
  { id: "order_type", label: "Order Type", category: "Orders" },
  { id: "order_status", label: "Order Status", category: "Orders" },
  { id: "order_number", label: "Order Number", category: "Orders" },
  { id: "source", label: "Source", category: "Orders" },
  
  { id: "kitchen_status", label: "Kitchen Status", category: "Kitchen Orders" },
  { id: "kitchen_station", label: "Kitchen Station", category: "Kitchen Orders" },
  { id: "kitchen_priority", label: "Kitchen Priority", category: "Kitchen Orders" },

  { id: "customer_email", label: "Customer Email", category: "Customers" },
  { id: "customer_visit_count", label: "Total Visits", category: "Customers" },
  { id: "customer_total_spent", label: "All-Time Spent", category: "Customers" },

  { id: "loyalty_member", label: "Loyalty Member Status", category: "Loyalty Points" },

  { id: "menu_category", label: "Menu Category", category: "Menu" },
  { id: "menu_price", label: "Menu Item Rate", category: "Menu" },
  { id: "menu_available", label: "Item Available", category: "Menu" },

  { id: "payment_status", label: "Payment Status", category: "Orders & Sales" },

  { id: "inv_stock", label: "Ingredient Stock Levels", category: "Inventory" },
  { id: "inv_reorder", label: "Ingredient Reorder Level", category: "Inventory" },

  { id: "staff_name", label: "Served By", category: "Staff" },
  { id: "staff_role", label: "Staff Role", category: "Staff" },

  { id: "supplier_name", label: "Supplier Name", category: "Suppliers" },
  { id: "supplier_contact", label: "Supplier Contact Info", category: "Suppliers" },

  { id: "daily_expenses", label: "Related Daily Expenses", category: "Expenses" },

  { id: "room_number", label: "Room Number", category: "Rooms/Hotel" },
  { id: "room_type", label: "Room Type", category: "Rooms/Hotel" },
  { id: "room_status", label: "Room Status", category: "Rooms/Hotel" },

  { id: "recipe_cost_pct", label: "Recipe Food Cost %", category: "Recipes" },
  { id: "recipe_margin_pct", label: "Recipe Margin %", category: "Recipes" },

  { id: "campaign_name", label: "Campaign Name", category: "Promotions" },
  { id: "campaign_discount", label: "Campaign Discount %", category: "Promotions" },

  { id: "is_repeat", label: "Is Repeat Customer", category: "Repeat Customers" },
];

const CustomReportBuilder: React.FC = () => {
  const [builderMode, setBuilderMode] = useState<"customized_orders" | "category_wise">("customized_orders");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Category Mode States
  const [selectedCategories, setSelectedCategories] = useState<ReportCategory[]>([]);
  const [isGeneratingCategories, setIsGeneratingCategories] = useState(false);
  const [generatedCategoryReports, setGeneratedCategoryReports] = useState<ReportData[] | null>(null);

  // Custom Orders Mode States
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    ADDITIONAL_COLUMNS.map((col) => col.id)
  );
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [generatedCustomReports, setGeneratedCustomReports] = useState<ReportData[] | null>(null);

  const { getReportByCategory, isLoadingCategory } = useReportsData(dateRange);
  const { businessCategory } = usePlanType();
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const filteredCategories = getFilteredReportCategories(businessCategory);

  const toggleCategory = (categoryId: ReportCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
    setGeneratedCategoryReports(null);
  };

  const selectAllCategories = () => {
    setSelectedCategories(filteredCategories.map((c) => c.id));
    setGeneratedCategoryReports(null);
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
    setGeneratedCategoryReports(null);
  };

  const toggleColumn = (colId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
    setGeneratedCustomReports(null);
  };

  const selectAllColumns = () => {
    setSelectedColumns(ADDITIONAL_COLUMNS.map((col) => col.id));
    setGeneratedCustomReports(null);
  };

  const clearAllColumns = () => {
    setSelectedColumns([]);
    setGeneratedCustomReports(null);
  };

  const handleGenerateCategoryReport = async () => {
    if (selectedCategories.length === 0) return;

    setIsGeneratingCategories(true);
    const maxWait = 15000;
    const start = Date.now();
    while (selectedCategories.some((cat) => isLoadingCategory(cat)) && Date.now() - start < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    const reports: ReportData[] = [];
    for (const catId of selectedCategories) {
      const report = getReportByCategory(catId);
      if (report) {
        reports.push(report);
      }
    }

    setGeneratedCategoryReports(reports);
    setIsGeneratingCategories(false);
  };

  const handleGenerateCustomOrdersReport = async () => {
    if (!restaurantId) {
      toast({ title: "Error", description: "No restaurant profile loaded", variant: "destructive" });
      return;
    }

    setIsGeneratingCustom(true);

    const startDate = dateRange?.from
      ? format(startOfDay(dateRange.from), "yyyy-MM-dd'T'HH:mm:ss")
      : format(startOfMonth(new Date()), "yyyy-MM-dd'T'HH:mm:ss");
    const endDate = dateRange?.to
      ? format(endOfDay(dateRange.to), "yyyy-MM-dd'T'HH:mm:ss")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

    try {
      // 1. Fetch orders
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;

      if (!orders || orders.length === 0) {
        setGeneratedCustomReports([]);
        setIsGeneratingCustom(false);
        return;
      }

      // Parallel fetch supporting metadata
      const [
        customersRes,
        kitchenRes,
        roomsRes,
        menuRes,
        recipesRes,
        recipeIngredientsRes,
        staffRes,
        suppliersRes,
        inventoryRes,
        expensesRes,
        promotionsRes,
      ] = await Promise.all([
        supabase.from("customers").select("*").eq("restaurant_id", restaurantId),
        supabase.from("kitchen_orders").select("*").eq("restaurant_id", restaurantId),
        supabase.from("rooms").select("*").eq("restaurant_id", restaurantId),
        supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId),
        supabase.from("recipes").select("*").eq("restaurant_id", restaurantId),
        supabase.from("recipe_ingredients").select("*"),
        supabase.from("staff").select("*").eq("restaurant_id", restaurantId),
        supabase.from("suppliers").select("*").eq("restaurant_id", restaurantId),
        supabase.from("inventory_items").select("*").eq("restaurant_id", restaurantId),
        supabase.from("expenses").select("*").eq("restaurant_id", restaurantId).gte("expense_date", startDate.split("T")[0]).lte("expense_date", endDate.split("T")[0]),
        supabase.from("promotion_campaigns").select("id, name, discount_percentage, discount_amount, promotion_code").eq("restaurant_id", restaurantId),
      ]);

      const normalizePhone = (num: string | null | undefined) => num ? num.replace(/\D/g, "") : "";
      const customerMap = new Map();
      (customersRes.data || []).forEach((c) => {
        if (c.phone) customerMap.set(normalizePhone(c.phone), c);
      });

      const koMap = new Map();
      (kitchenRes.data || []).forEach((ko) => {
        if (ko.order_id) koMap.set(ko.order_id, ko);
      });

      const roomMap = new Map();
      (roomsRes.data || []).forEach((rm) => roomMap.set(rm.id, rm));

      const menuMap = new Map();
      (menuRes.data || []).forEach((m) => menuMap.set(m.name.toLowerCase().trim(), m));

      const recipeByMenuItemId = new Map();
      const recipeByName = new Map();
      (recipesRes.data || []).forEach((rec) => {
        // Key by menu_item_id (UUID) for direct FK lookup
        if (rec.menu_item_id) recipeByMenuItemId.set(rec.menu_item_id, rec);
        // Key by lowercased name for name-based lookup
        recipeByName.set(rec.name.toLowerCase().trim(), rec);
      });

      // Helper: find recipe for a given order item name
      const findRecipeForItem = (itemName: string) => {
        const norm = itemName.toLowerCase().trim();
        // 1. Match menu item by name, then recipe by menu_item_id FK
        const mi = menuMap.get(norm);
        if (mi) {
          const r = recipeByMenuItemId.get(mi.id);
          if (r) return r;
        }
        // 2. Direct recipe name match
        const byName = recipeByName.get(norm);
        if (byName) return byName;
        // 3. Fuzzy: recipe name starts with or contains order item name
        for (const [rname, rec] of recipeByName.entries()) {
          if (rname.includes(norm) || norm.includes(rname)) return rec;
        }
        // 4. Fuzzy: menu item name contains order item name
        for (const [mname, m] of menuMap.entries()) {
          if (mname.includes(norm) || norm.includes(mname)) {
            const r = recipeByMenuItemId.get(m.id);
            if (r) return r;
            const rByName = recipeByName.get(mname);
            if (rByName) return rByName;
          }
        }
        return null;
      };

      const recipeIngMap = new Map();
      (recipeIngredientsRes.data || []).forEach((ri) => {
        const list = recipeIngMap.get(ri.recipe_id) || [];
        list.push(ri);
        recipeIngMap.set(ri.recipe_id, list);
      });

      const invMap = new Map();
      (inventoryRes.data || []).forEach((ii) => invMap.set(ii.id, ii));

      const staffMap = new Map();
      (staffRes.data || []).forEach((s) => staffMap.set(s.id, s));

      const expenseDayMap = new Map();
      (expensesRes.data || []).forEach((e) => {
        if (e.expense_date) {
          const current = expenseDayMap.get(e.expense_date) || 0;
          expenseDayMap.set(e.expense_date, current + (e.amount || 0));
        }
      });

      // Build phone -> count of orders map for is_repeat detection
      const phoneOrderCountMap = new Map<string, number>();
      orders.forEach((o) => {
        const ph = normalizePhone(o.customer_phone);
        if (ph) phoneOrderCountMap.set(ph, (phoneOrderCountMap.get(ph) || 0) + 1);
      });

      // Promotion campaigns lookup helpers
      const allPromos = promotionsRes.data || [];

      // Build rows
      const compiledRows = orders.map((o) => {
        const orderDate = new Date(o.created_at);
        const formattedDate = format(orderDate, "dd/MM/yy");
        const formattedTime = format(orderDate, "HH:mm");

        const phoneNorm = normalizePhone(o.customer_phone);
        const c = phoneNorm ? customerMap.get(phoneNorm) : null;
        const ko = koMap.get(o.id);
        const rm = o.room_id ? roomMap.get(o.room_id) : null;

        let orderItemsText = "";
        let firstItemName = "";
        if (o.items && Array.isArray(o.items)) {
          orderItemsText = o.items
            .map((item) => {
              if (typeof item === "string") {
                try {
                  const parsed = JSON.parse(item);
                  if (parsed.name) {
                    if (!firstItemName) firstItemName = parsed.name;
                    return `${parsed.quantity || 1}x ${parsed.name}`;
                  }
                } catch {
                  if (!firstItemName) firstItemName = item;
                  return item;
                }
              }
              if (item?.name) {
                if (!firstItemName) firstItemName = item.name;
                return `${item.quantity || 1}x ${item.name}`;
              }
              return String(item);
            })
            .join(", ");
        }

        // ---- Recipe cost/margin: average across ALL items in the order ----
        const allItemNames: string[] = [];
        if (o.items && Array.isArray(o.items)) {
          o.items.forEach((item: any) => {
            let name = "";
            if (typeof item === "string") {
              try { name = JSON.parse(item)?.name || ""; } catch { name = item; }
            } else {
              name = item?.name || "";
            }
            if (name) allItemNames.push(name);
          });
        }

        const normFirstItemName = firstItemName.toLowerCase().trim();
        const mItem = menuMap.get(normFirstItemName);

        // Collect all recipes found for items in this order using improved lookup
        const foundRecipes = allItemNames
          .map((n) => findRecipeForItem(n))
          .filter(Boolean);

        // Use first recipe found for ingredient/supplier lookup
        const recipe = foundRecipes.length > 0 ? foundRecipes[0] : null;

        // Compute average cost% and margin% across all found recipes
        let recipeCostPct = "-";
        let recipeMarginPct = "-";
        if (foundRecipes.length > 0) {
          const avgCost = foundRecipes.reduce((s: number, r: any) => s + Number(r.food_cost_percentage || 0), 0) / foundRecipes.length;
          const avgMargin = foundRecipes.reduce((s: number, r: any) => s + Number(r.margin_percentage || 0), 0) / foundRecipes.length;
          recipeCostPct = `${avgCost.toFixed(1)}%`;
          recipeMarginPct = `${avgMargin.toFixed(1)}%`;
        }

        const dayStr = format(orderDate, "yyyy-MM-dd");
        const dailyExp = expenseDayMap.get(dayStr) || 0;

        // ---- is_repeat: phone seen more than once in this dataset OR customer visit_count > 1 ----
        const phoneNormForRepeat = normalizePhone(o.customer_phone);
        const seenCount = phoneNormForRepeat ? (phoneOrderCountMap.get(phoneNormForRepeat) || 0) : 0;
        const isRepeat = (seenCount > 1 || (c?.visit_count && c.visit_count > 1)) ? "Yes" : "No";

        const orderStaff = o.staff_id ? staffMap.get(o.staff_id) : null;
        const staffName = orderStaff ? `${orderStaff.first_name || ''} ${orderStaff.last_name || ''}`.trim() : "POS Operator";
        const staffRole = orderStaff?.role || "Cashier";

        let ingredientStock = "-";
        let ingredientReorder = "-";
        let supplierName = "-";
        let supplierContact = "-";

        if (recipe) {
          const ings = recipeIngMap.get(recipe.id) || [];
          if (ings.length > 0) {
            const firstIng = invMap.get(ings[0].inventory_item_id);
            if (firstIng) {
              ingredientStock = `${firstIng.quantity} ${firstIng.unit}`;
              ingredientReorder = `${firstIng.reorder_level || 10} ${firstIng.unit}`;
              const relatedSupplier = suppliersRes.data && suppliersRes.data.length > 0 ? suppliersRes.data[0] : null;
              if (relatedSupplier) {
                supplierName = relatedSupplier.name;
                supplierContact = relatedSupplier.phone || relatedSupplier.email || "-";
              }
            }
          }
        }

        // ---- Campaign: match by promotion_code in discount_notes, then by discount % ----
        let matchingPromo: any = null;
        const discountNotes = (o.discount_notes || "").toLowerCase();
        if (discountNotes && allPromos.length > 0) {
          // Primary: match promo code stored in discount_notes
          matchingPromo = allPromos.find((p: any) =>
            p.promotion_code && discountNotes.includes(p.promotion_code.toLowerCase())
          ) || null;
        }
        if (!matchingPromo && o.discount_amount && o.discount_amount > 0 && o.total) {
          // Fallback: match by discount % ratio (within ±5%)
          const orderDiscountPct = (o.discount_amount / (o.total + o.discount_amount)) * 100;
          matchingPromo = allPromos.find((p: any) => {
            const campaignPct = Number(p.discount_percentage || 0);
            return campaignPct > 0 && Math.abs(campaignPct - orderDiscountPct) <= 5;
          }) || null;
        }

        const fullRowData: Record<string, any> = {
          order_date: formattedDate,
          order_time: formattedTime,
          customer_name: o.customer_name || c?.name || "Walk-in",
          customer_contact: o.customer_phone || c?.phone || "-",
          items: orderItemsText,
          discount: o.discount_amount || 0,
          final_amount: o.total || 0,
          payment_mode: o.payment_method ? o.payment_method.toUpperCase() : "-",
          loyalty_points: c?.loyalty_points || 0,

          order_type: o.order_type || "dine-in",
          order_status: o.status || "completed",
          order_number: o.order_number || "-",
          source: o.source || "POS",
          
          kitchen_status: ko?.status || "delivered",
          kitchen_station: ko?.station || "main_kitchen",
          kitchen_priority: ko?.priority || "medium",

          customer_email: c?.email || "-",
          customer_visit_count: c?.visit_count || 1,
          customer_total_spent: c?.total_spent || o.total || 0,
          loyalty_member: c?.loyalty_enrolled ? "Yes" : "No",

          menu_category: mItem?.category || "-",
          menu_price: mItem ? Number(mItem.price) : 0,
          menu_available: mItem?.is_available ? "Yes" : "No",

          payment_status: o.payment_status || "paid",

          inv_stock: ingredientStock,
          inv_reorder: ingredientReorder,

          staff_name: staffName,
          staff_role: staffRole,

          supplier_name: supplierName,
          supplier_contact: supplierContact,

          daily_expenses: dailyExp,

          room_number: rm?.room_number || "-",
          room_type: rm?.room_type || "-",
          room_status: rm?.status || "-",

          recipe_cost_pct: recipeCostPct,
          recipe_margin_pct: recipeMarginPct,

          campaign_name: matchingPromo?.name || "-",
          campaign_discount: matchingPromo ? `${matchingPromo.discount_percentage || 0}%` : "-",

          is_repeat: isRepeat,
        };

        // Filter keys to selected columns only
        const orderedSelectedCols = [
          ...MANDATORY_COLUMNS.map(c => c.id),
          ...ADDITIONAL_COLUMNS.filter(c => selectedColumns.includes(c.id)).map(c => c.id)
        ];

        const rowObj: Record<string, any> = {};
        orderedSelectedCols.forEach((colId) => {
          rowObj[colId] = fullRowData[colId];
        });

        return rowObj;
      });

      const totalRevenue = orders
        .filter((o) => o.status === "completed" && o.order_type !== "non-chargeable")
        .reduce((sum, o) => sum + (o.total || 0), 0);
      const totalDiscount = orders.reduce((sum, o) => sum + (o.discount_amount || 0), 0);
      const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

      const customReport: ReportData = {
        category: "orders" as ReportCategory,
        title: "Customized Orders Report",
        summary: {
          "Total Revenue": `₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
          "Total Orders": orders.length,
          "Avg Order": `₹${avgOrderValue.toFixed(0)}`,
          "Total Discounts": `₹${totalDiscount.toFixed(0)}`,
        },
        tableData: compiledRows,
      };

      setGeneratedCustomReports([customReport]);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Query failed", description: err.message, variant: "destructive" });
    } finally {
      setIsCustomLoading(false);
      setIsGeneratingCustom(false);
    }
  };

  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const isAnyLoading = selectedCategories.some((cat) => isLoadingCategory(cat));

  const additionalColsGrouped = ADDITIONAL_COLUMNS.reduce((acc, col) => {
    acc[col.category] = acc[col.category] || [];
    acc[col.category].push(col);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  // Return viewer layout
  if (generatedCategoryReports) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Custom Report ({generatedCategoryReports.length} sections)
          </h3>
          <StandardizedButton
            variant="secondary"
            onClick={() => setGeneratedCategoryReports(null)}
          >
            Build New Report
          </StandardizedButton>
        </div>
        <ReportViewer reports={generatedCategoryReports} dateRange={dateRange} />
      </div>
    );
  }

  if (generatedCustomReports) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Customized Orders Report</h3>
          <StandardizedButton
            variant="secondary"
            onClick={() => setGeneratedCustomReports(null)}
          >
            Build New Report
          </StandardizedButton>
        </div>

        {generatedCustomReports.length > 0 ? (
          <>
            <ReportViewer reports={generatedCustomReports} dateRange={dateRange} />
            <StandardizedCard className="p-4 bg-muted/30 border border-muted-foreground/10 mt-4">
              <h4 className="text-sm font-bold text-foreground mb-2">💡 How to further customize or filter your report:</h4>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                <li><strong>Date Range:</strong> Adjust the date picker on the build settings page to query different periods.</li>
                <li><strong>Column Selection:</strong> Return to the builder options to toggle check boxes to include or exclude tables/columns.</li>
                <li><strong>Dynamic Search:</strong> Use the search box on the table preview to search for specific items, customers, or transactions.</li>
                <li><strong>Sorting:</strong> Click on any column header in the preview table to sort ascending or descending.</li>
                <li><strong>High-Fidelity Export:</strong> Export your customized views into Excel spreadsheets, PowerPoint presentations, or PDF files.</li>
              </ul>
            </StandardizedCard>
          </>
        ) : (
          <StandardizedCard className="p-8 text-center">
            <p className="text-muted-foreground">No data available for the selected range</p>
          </StandardizedCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Custom Report Builder
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build tailored order reports or select category summaries.
          </p>
        </div>

        {/* Mode Toggle Button */}
        <div className="flex bg-muted p-1 rounded-xl border border-border">
          <button
            onClick={() => setBuilderMode("customized_orders")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              builderMode === "customized_orders"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Customized Orders Report
          </button>
          <button
            onClick={() => setBuilderMode("category_wise")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              builderMode === "category_wise"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Category-Wise Summary
          </button>
        </div>
      </div>

      {/* Step 1: Date Range */}
      <StandardizedCard className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              1
            </span>
            <span className="font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              Select Date Range
            </span>
          </div>
          <DatePickerWithRange
            initialDateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      </StandardizedCard>

      {/* CUSTOMIZED ORDERS BUILDER */}
      {builderMode === "customized_orders" && (
        <StandardizedCard className="p-5 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                2
              </span>
              <span className="font-medium">Configure Report Columns</span>
            </div>
            <div className="flex gap-2">
              <StandardizedButton variant="secondary" size="sm" onClick={selectAllColumns}>
                Select All Optional
              </StandardizedButton>
              <StandardizedButton variant="secondary" size="sm" onClick={clearAllColumns}>
                Clear Optional
              </StandardizedButton>
            </div>
          </div>

          {/* Mandatory Columns Section */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Mandatory Columns (Always Included)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-muted/30 p-3.5 rounded-xl border border-muted-foreground/10">
              {MANDATORY_COLUMNS.map((col) => (
                <div key={col.id} className="flex items-center gap-2 opacity-80 cursor-not-allowed">
                  <Checkbox checked={true} disabled={true} />
                  <span className="text-xs font-medium text-foreground">{col.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Columns Sections Grouped by Table/Category */}
          <div className="space-y-5">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Additional Table Columns</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.entries(additionalColsGrouped).map(([categoryName, cols]) => (
                <div key={categoryName} className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                  <h5 className="text-xs font-bold text-foreground border-b border-border pb-1.5 flex items-center justify-between">
                    <span>{categoryName}</span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-normal">
                      {cols.filter((c) => selectedColumns.includes(c.id)).length} / {cols.length}
                    </span>
                  </h5>
                  <div className="space-y-2.5">
                    {cols.map((col) => {
                      const isSelected = selectedColumns.includes(col.id);
                      return (
                        <div
                          key={col.id}
                          onClick={() => toggleColumn(col.id)}
                          className="flex items-center gap-2.5 cursor-pointer select-none group"
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleColumn(col.id)} />
                          <span className={`text-xs transition-colors group-hover:text-primary ${
                            isSelected ? "text-foreground font-medium" : "text-muted-foreground"
                          }`}>
                            {col.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Generate Custom */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                3
              </span>
              <span className="font-medium">Generate Report Preview</span>
            </div>
            <StandardizedButton
              onClick={handleGenerateCustomOrdersReport}
              disabled={isGeneratingCustom || isCustomLoading}
              className="min-w-[150px]"
            >
              {isGeneratingCustom || isCustomLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </StandardizedButton>
          </div>
        </StandardizedCard>
      )}

      {/* CATEGORY-WISE BUILDER (ORIGINAL BEHAVIOR) */}
      {builderMode === "category_wise" && (
        <>
          <StandardizedCard className="p-4">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    2
                  </span>
                  <span className="font-medium">Select Categories</span>
                  <span className="text-sm text-muted-foreground">
                    ({selectedCategories.length} selected)
                  </span>
                </div>

                <div className="flex gap-2">
                  <StandardizedButton variant="secondary" size="sm" onClick={selectAllCategories}>
                    Select All
                  </StandardizedButton>
                  <StandardizedButton variant="secondary" size="sm" onClick={clearAllCategories}>
                    Clear All
                  </StandardizedButton>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {filteredCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <div
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                        ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }
                      `}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <div className={`p-2 rounded-full ${category.color} text-white`}>
                        {iconMap[category.icon]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{category.name}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </StandardizedCard>

          <StandardizedCard className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  3
                </span>
                <span className="font-medium">Generate Report</span>
              </div>
              <StandardizedButton
                onClick={handleGenerateCategoryReport}
                disabled={selectedCategories.length === 0 || isGeneratingCategories || isAnyLoading}
                className="min-w-[150px]"
              >
                {isGeneratingCategories || isAnyLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </StandardizedButton>
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2 ml-8">
                Please select at least one category to generate a report
              </p>
            )}
          </StandardizedCard>
        </>
      )}
    </div>
  );
};

export default CustomReportBuilder;
