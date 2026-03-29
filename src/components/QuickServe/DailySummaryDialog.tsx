import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  CreditCard,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  Download,
  Ban,
  Wallet,
  PiggyBank,
  MessageCircle,
  Phone,
  Plus,
  Package,
  Trash2,
  Receipt,
} from "lucide-react";

export interface PaymentBreakdown {
  cash: number;
  upi: number;
  card: number;
  other: number;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface OrderTypeBreakdown {
  counter: number;
  takeaway: number;
  delivery: number;
  dine_in: number;
}

export interface ExpenseBreakdown {
  [category: string]: number;
}

export interface InventoryCostDetail {
  itemName: string;
  quantity: number;
  recipeCost: number;
  totalCost: number;
}

export interface DailySummaryData {
  totalOrders: number;
  totalRevenue: number;
  totalItemsSold: number;
  paymentBreakdown: PaymentBreakdown;
  topItems: TopItem[];
  orderTypeBreakdown: OrderTypeBreakdown;
  ncOrders: number;
  ncAmount: number;
  discountAmount: number;
  averageOrderValue: number;
  peakHour: string;
  totalExpenses: number;
  expenseBreakdown: ExpenseBreakdown;
  netProfit: number;
  inventoryCostFromOrders: number;
  inventoryCostDetails: InventoryCostDetail[];
}

interface DailySummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: DailySummaryData;
  reportDate?: Date;
}

export const DailySummaryDialog: React.FC<DailySummaryDialogProps> = ({
  isOpen,
  onClose,
  initialData,
  reportDate,
}) => {
  const { restaurantId, restaurantName } = useRestaurantId();
  const { toast } = useToast();
  const { symbol: currencySymbol } = useCurrencyContext();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initialData); // If viewing historical, assume saved
  const [notes, setNotes] = useState("");
  const [ownerPhone, setOwnerPhone] = useState(() => {
    try {
      return localStorage.getItem("qs_owner_whatsapp") || "";
    } catch {
      return "";
    }
  });
  const [showOwnerInput, setShowOwnerInput] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [newExpenseDesc, setNewExpenseDesc] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const displayDate = reportDate || new Date();
  const dateStr = format(displayDate, "yyyy-MM-dd");

  // Fetch today's order data to generate the summary
  const { data: summary, isLoading } = useQuery({
    queryKey: ["daily-summary-data", restaurantId, dateStr],
    enabled: !!restaurantId && isOpen && !initialData,
    initialData: initialData,
    queryFn: async () => {
      const dayStart = startOfDay(displayDate).toISOString();
      const dayEnd = endOfDay(displayDate).toISOString();

      // Fetch kitchen_orders for items, order types, peak hour
      const { data: orders, error } = await supabase
        .from("kitchen_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      if (error) throw error;

      // Fetch pos_transactions for revenue & payment breakdown
      const { data: transactions, error: txnError } = await supabase
        .from("pos_transactions")
        .select("amount, payment_method, status, discount_amount, created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      if (txnError) throw txnError;

      // Fetch today's expenses (use expense_date column)
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("amount, category")
        .eq("restaurant_id", restaurantId)
        .gte("expense_date", dayStart.split("T")[0])
        .lte("expense_date", dayEnd.split("T")[0]);

      const allOrders = orders || [];
      const allTxns = (transactions || []).filter(
        (t) => t.status === "completed",
      );

      // Calculate summary
      const totalOrders = allOrders.length;
      const ncOrders = allOrders.filter(
        (o) => o.order_type === "nc" || o.order_type === "non-chargeable",
      );

      // Revenue from pos_transactions (accurate source)
      const totalRevenue = allTxns.reduce(
        (sum, t) => sum + (Number(t.amount) || 0),
        0,
      );
      const ncAmount = 0; // NC orders have ₹0 in pos_transactions
      const discountAmount = allTxns.reduce(
        (sum, t) => sum + (Number(t.discount_amount) || 0),
        0,
      );

      // ─── Calculate inventory cost from today's orders ───
      // For each order item, look up the recipe → ingredients → costs
      let inventoryCostFromOrders = 0;
      const inventoryCostDetails: InventoryCostDetail[] = [];

      // Collect all order items with menuItemId and aggregate by menuItemId
      const menuItemQtyMap = new Map<string, { name: string; totalQty: number }>();
      allOrders.forEach((o) => {
        const items = (o.items as any[]) || [];
        items.forEach((item) => {
          const menuItemId = item.menuItemId;
          if (!menuItemId) return;
          const existing = menuItemQtyMap.get(menuItemId);
          if (existing) {
            existing.totalQty += (item.quantity || 1);
          } else {
            menuItemQtyMap.set(menuItemId, {
              name: item.name || "Unknown",
              totalQty: item.quantity || 1,
            });
          }
        });
      });

      const menuItemIds = Array.from(menuItemQtyMap.keys());

      if (menuItemIds.length > 0) {
        // Fetch recipes linked to these menu items
        const { data: recipes } = await supabase
          .from("recipes")
          .select("id, menu_item_id, total_cost")
          .eq("restaurant_id", restaurantId)
          .in("menu_item_id", menuItemIds);

        if (recipes && recipes.length > 0) {
          // Map menu_item_id → recipe total_cost
          // If recipe has total_cost pre-calculated, use it directly
          // Otherwise fall back to summing recipe_ingredients
          const recipesWithoutCost = recipes.filter(
            (r) => !r.total_cost || r.total_cost <= 0,
          );
          const recipesWithCost = recipes.filter(
            (r) => r.total_cost && r.total_cost > 0,
          );

          // Build menu_item_id → cost map from recipes that have total_cost
          const menuItemCostMap = new Map<string, number>();
          recipesWithCost.forEach((r) => {
            if (r.menu_item_id) {
              menuItemCostMap.set(r.menu_item_id, r.total_cost!);
            }
          });

          // For recipes without total_cost, fetch ingredients and calculate
          if (recipesWithoutCost.length > 0) {
            const recipeIds = recipesWithoutCost.map((r) => r.id);
            const { data: ingredients } = await supabase
              .from("recipe_ingredients")
              .select("recipe_id, quantity, cost_per_unit, total_cost")
              .in("recipe_id", recipeIds);

            if (ingredients) {
              // Group ingredients by recipe_id and sum costs
              const recipeCostMap = new Map<string, number>();
              ingredients.forEach((ing) => {
                const cost =
                  ing.total_cost ||
                  (ing.quantity || 0) * (ing.cost_per_unit || 0);
                recipeCostMap.set(
                  ing.recipe_id,
                  (recipeCostMap.get(ing.recipe_id) || 0) + cost,
                );
              });
              // Map back to menu_item_id
              recipesWithoutCost.forEach((r) => {
                if (r.menu_item_id) {
                  const cost = recipeCostMap.get(r.id) || 0;
                  if (cost > 0) {
                    menuItemCostMap.set(r.menu_item_id, cost);
                  }
                }
              });
            }
          }

          // Now calculate total inventory cost from orders
          menuItemQtyMap.forEach(({ name, totalQty }, menuItemId) => {
            const recipeCost = menuItemCostMap.get(menuItemId) || 0;
            if (recipeCost > 0) {
              const totalCost = recipeCost * totalQty;
              inventoryCostFromOrders += totalCost;
              inventoryCostDetails.push({
                itemName: name,
                quantity: totalQty,
                recipeCost,
                totalCost,
              });
            }
          });

          // Sort by total cost descending
          inventoryCostDetails.sort((a, b) => b.totalCost - a.totalCost);
        }
      }

      // Expenses breakdown by category
      const expenseBreakdown: ExpenseBreakdown = {};
      let totalExpenses = 0;
      let hasManualInventoryExpense = false;
      (expensesData || []).forEach((e) => {
        const cat = e.category || "Other";
        const amt = Number(e.amount) || 0;
        if (cat.toLowerCase() === "inventory") hasManualInventoryExpense = true;
        expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + amt;
        totalExpenses += amt;
      });

      // Add auto-calculated inventory cost if no manual inventory expense was added
      if (inventoryCostFromOrders > 0 && !hasManualInventoryExpense) {
        expenseBreakdown["Inventory (from orders)"] = Math.round(inventoryCostFromOrders * 100) / 100;
        totalExpenses += Math.round(inventoryCostFromOrders * 100) / 100;
      }

      const netProfit = totalRevenue - totalExpenses;

      // Payment breakdown from pos_transactions
      const paymentBreakdown: PaymentBreakdown = {
        cash: 0,
        upi: 0,
        card: 0,
        other: 0,
      };
      allTxns.forEach((t) => {
        const method = (t.payment_method || "cash").toLowerCase();
        const amt = Number(t.amount) || 0;
        if (method.includes("cash")) paymentBreakdown.cash += amt;
        else if (method.includes("upi")) paymentBreakdown.upi += amt;
        else if (method.includes("card")) paymentBreakdown.card += amt;
        else paymentBreakdown.other += amt;
      });

      // Order type breakdown (from kitchen_orders)
      const orderTypeBreakdown: OrderTypeBreakdown = {
        counter: 0,
        takeaway: 0,
        delivery: 0,
        dine_in: 0,
      };
      allOrders.forEach((o) => {
        const type = (o.order_type || "counter").toLowerCase();
        if (type.includes("delivery")) orderTypeBreakdown.delivery++;
        else if (type.includes("takeaway") || type.includes("take"))
          orderTypeBreakdown.takeaway++;
        else if (type.includes("dine")) orderTypeBreakdown.dine_in++;
        else orderTypeBreakdown.counter++;
      });

      // Top items (from kitchen_orders items array)
      const itemMap = new Map<string, { quantity: number; revenue: number }>();
      allOrders.forEach((o) => {
        const items = (o.items as any[]) || [];
        items.forEach((item) => {
          const name = item.name || "Unknown";
          const qty = item.quantity || 1;
          const rev = (item.price || 0) * qty;
          const existing = itemMap.get(name) || { quantity: 0, revenue: 0 };
          itemMap.set(name, {
            quantity: existing.quantity + qty,
            revenue: existing.revenue + rev,
          });
        });
      });

      const topItems: TopItem[] = Array.from(itemMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Total items sold
      const totalItemsSold = Array.from(itemMap.values()).reduce(
        (sum, d) => sum + d.quantity,
        0,
      );

      // Peak hour
      const hourMap = new Map<number, number>();
      allOrders.forEach((o) => {
        const hr = new Date(o.created_at).getHours();
        hourMap.set(hr, (hourMap.get(hr) || 0) + 1);
      });
      let peakHour = "";
      let maxCount = 0;
      hourMap.forEach((count, hr) => {
        if (count > maxCount) {
          maxCount = count;
          const ampm = hr >= 12 ? "PM" : "AM";
          const h12 = hr % 12 || 12;
          peakHour = `${h12}:00 ${ampm}`;
        }
      });

      const paidTxnCount = allTxns.filter(
        (t) => (t.payment_method || "").toLowerCase() !== "nc",
      ).length;
      const averageOrderValue =
        paidTxnCount > 0 ? totalRevenue / paidTxnCount : 0;

      return {
        totalOrders,
        totalRevenue,
        totalItemsSold,
        paymentBreakdown,
        topItems,
        orderTypeBreakdown,
        ncOrders: ncOrders.length,
        ncAmount,
        discountAmount,
        averageOrderValue,
        peakHour,
        totalExpenses,
        expenseBreakdown,
        netProfit,
        inventoryCostFromOrders: Math.round(inventoryCostFromOrders * 100) / 100,
        inventoryCostDetails,
      };
    },
  });

  // Check if already saved today
  const { data: existingReport } = useQuery({
    queryKey: ["daily-report-existing", restaurantId, dateStr],
    enabled: !!restaurantId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_summary_reports")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("report_date", dateStr)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (existingReport) setSaved(true);
  }, [existingReport]);

  const handleSaveReport = async () => {
    if (!summary || !restaurantId) return;
    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const reportData = {
        restaurant_id: restaurantId,
        report_date: dateStr,
        total_orders: summary.totalOrders,
        total_revenue: summary.totalRevenue,
        total_items_sold: summary.totalItemsSold,
        payment_breakdown: summary.paymentBreakdown as unknown as Record<
          string,
          unknown
        >,
        top_items: summary.topItems as unknown as Record<string, unknown>[],
        order_type_breakdown: summary.orderTypeBreakdown as unknown as Record<
          string,
          unknown
        >,
        nc_orders: summary.ncOrders,
        nc_amount: summary.ncAmount,
        discount_amount: summary.discountAmount,
        average_order_value: summary.averageOrderValue,
        peak_hour: summary.peakHour,
        notes,
        generated_by: user.user?.id,
      };

      const { error } = await supabase
        .from("daily_summary_reports")
        .upsert(reportData, { onConflict: "restaurant_id,report_date" });

      if (error) throw error;

      setSaved(true);
      setSaved(true);
      toast({
        title: "Report Saved! ✅",
        description: `Daily summary for ${format(displayDate, "dd MMM yyyy")} has been saved.`,
      });
    } catch (err: any) {
      toast({
        title: "Error saving report",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!summary) return;

    const truckName = restaurantName || "Our Food Truck";
    const reportDateFormatted = format(displayDate, "dd MMM yyyy");

    // Build top items section
    const topItemsText =
      summary.topItems.length > 0
        ? summary.topItems
            .map(
              (i, idx) =>
                `   ${idx + 1}. ${i.name} x${i.quantity} = ${currencySymbol}${i.revenue.toFixed(0)}`,
            )
            .join("\n")
        : "   No items today";

    // Build NC + Discount section
    const extras: string[] = [];
    if (summary.ncOrders > 0) {
      extras.push(
        `NC Orders: ${summary.ncOrders} (${currencySymbol}${summary.ncAmount.toFixed(2)})`,
      );
    }
    if (summary.discountAmount > 0) {
      extras.push(
        `Discounts Given: ${currencySymbol}${summary.discountAmount.toFixed(2)}`,
      );
    }
    const extrasSection =
      extras.length > 0
        ? `\n------------------------------\n${extras.join("\n")}`
        : "";

    // Build P&L section
    const expenseLines = Object.entries(summary.expenseBreakdown || {})
      .filter(([, v]) => v > 0)
      .map(([cat, amt]) => `   • ${cat}: ${currencySymbol}${amt.toFixed(0)}`)
      .join("\n");
    const plSection =
      summary.totalExpenses > 0 || summary.netProfit !== summary.totalRevenue
        ? `\n💸 *PROFIT & LOSS*\n──────────────────────────────\n💰 Revenue: ${currencySymbol}${summary.totalRevenue.toFixed(2)}\n💸 Expenses: ${currencySymbol}${(summary.totalExpenses || 0).toFixed(2)}${expenseLines ? "\n" + expenseLines : ""}\n${(summary.netProfit || 0) >= 0 ? "✅" : "🔻"} *Net ${(summary.netProfit || 0) >= 0 ? "Profit" : "Loss"}: ${currencySymbol}${Math.abs(summary.netProfit || 0).toFixed(2)}*`
        : "";

    // Build notes section
    const notesSection = notes.trim()
      ? `\n------------------------------\n*Notes:* ${notes.trim()}`
      : "";

    const msg = `⭐ *${truckName}* ⭐
📊 Daily Sales Report
📅 ${reportDateFormatted}
══════════════════════════════

🛒 Total Orders: *${summary.totalOrders}*
💰 Total Revenue: *${currencySymbol}${summary.totalRevenue.toFixed(2)}*
📦 Items Sold: *${summary.totalItemsSold}*
🧾 Avg Order: *${currencySymbol}${summary.averageOrderValue.toFixed(2)}*
⏰ Peak Hour: *${summary.peakHour || "N/A"}*

💳 *PAYMENTS*
──────────────────────────────
💵 Cash: ${currencySymbol}${summary.paymentBreakdown.cash.toFixed(2)}
📱 UPI: ${currencySymbol}${summary.paymentBreakdown.upi.toFixed(2)}
💳 Card: ${currencySymbol}${summary.paymentBreakdown.card.toFixed(2)}
${summary.paymentBreakdown.other > 0 ? `💴 Other: ${currencySymbol}${summary.paymentBreakdown.other.toFixed(2)}\n` : ""}
🏆 *TOP ITEMS*
──────────────────────────────
${topItemsText}
${extrasSection}${plSection}${notesSection}
══════════════════════════════
✨ Powered by *Swadeshi Solutions*
══════════════════════════════`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const buildWhatsAppMessage = () => {
    if (!summary) return "";
    const truckName = restaurantName || "Our Food Truck";
    const reportDateFormatted = format(displayDate, "dd MMM yyyy");
    const topItemsText =
      summary.topItems.length > 0
        ? summary.topItems
            .map(
              (i, idx) =>
                `   ${idx + 1}. ${i.name} x${i.quantity} = ${currencySymbol}${i.revenue.toFixed(0)}`,
            )
            .join("\n")
        : "   No items today";
    const extras: string[] = [];
    if (summary.ncOrders > 0)
      extras.push(
        `NC Orders: ${summary.ncOrders} (${currencySymbol}${summary.ncAmount.toFixed(2)})`,
      );
    if (summary.discountAmount > 0)
      extras.push(
        `Discounts Given: ${currencySymbol}${summary.discountAmount.toFixed(2)}`,
      );
    const extrasSection =
      extras.length > 0
        ? `\n------------------------------\n${extras.join("\n")}`
        : "";
    const expenseLines = Object.entries(summary.expenseBreakdown || {})
      .filter(([, v]) => v > 0)
      .map(([cat, amt]) => `   • ${cat}: ${currencySymbol}${amt.toFixed(0)}`)
      .join("\n");
    const plSection =
      summary.totalExpenses > 0 || summary.netProfit !== summary.totalRevenue
        ? `\n💸 *PROFIT & LOSS*\n──────────────────────────────\n💰 Revenue: ${currencySymbol}${summary.totalRevenue.toFixed(2)}\n💸 Expenses: ${currencySymbol}${(summary.totalExpenses || 0).toFixed(2)}${expenseLines ? "\n" + expenseLines : ""}\n${(summary.netProfit || 0) >= 0 ? "✅" : "🔻"} *Net ${(summary.netProfit || 0) >= 0 ? "Profit" : "Loss"}: ${currencySymbol}${Math.abs(summary.netProfit || 0).toFixed(2)}*`
        : "";
    const notesSection = notes.trim()
      ? `\n------------------------------\n*Notes:* ${notes.trim()}`
      : "";

    return `⭐ *${truckName}* ⭐\n📊 Daily Sales Report\n📅 ${reportDateFormatted}\n══════════════════════════════\n\n🛒 Total Orders: *${summary.totalOrders}*\n💰 Total Revenue: *${currencySymbol}${summary.totalRevenue.toFixed(2)}*\n📦 Items Sold: *${summary.totalItemsSold}*\n🧾 Avg Order: *${currencySymbol}${summary.averageOrderValue.toFixed(2)}*\n⏰ Peak Hour: *${summary.peakHour || "N/A"}*\n\n💳 *PAYMENTS*\n──────────────────────────────\n💵 Cash: ${currencySymbol}${summary.paymentBreakdown.cash.toFixed(2)}\n📱 UPI: ${currencySymbol}${summary.paymentBreakdown.upi.toFixed(2)}\n💳 Card: ${currencySymbol}${summary.paymentBreakdown.card.toFixed(2)}\n${summary.paymentBreakdown.other > 0 ? `💴 Other: ${currencySymbol}${summary.paymentBreakdown.other.toFixed(2)}\n` : ""}\n🏆 *TOP ITEMS*\n──────────────────────────────\n${topItemsText}\n${extrasSection}${plSection}${notesSection}\n══════════════════════════════\n✨ Powered by *Swadeshi Solutions*\n══════════════════════════════`;
  };

  const handleSendToOwner = () => {
    if (!ownerPhone.trim()) {
      setShowOwnerInput(true);
      toast({
        title: "Enter owner's WhatsApp number",
        description: "Please enter the owner's phone number first.",
      });
      return;
    }
    // Save for future use
    try {
      localStorage.setItem("qs_owner_whatsapp", ownerPhone.trim());
    } catch {}

    let cleanPhone = ownerPhone.trim().replace(/[\+\-\s]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const msg = buildWhatsAppMessage();
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    toast({
      title: "Report sent! ✅",
      description: `Daily report sent to ${ownerPhone}`,
    });
  };

  // Handle adding a quick expense
  const handleAddQuickExpense = async () => {
    if (!newExpenseCategory.trim() || !newExpenseAmount.trim() || !restaurantId) {
      toast({
        title: "Missing fields",
        description: "Please enter both category and amount.",
        variant: "destructive",
      });
      return;
    }
    const amount = parseFloat(newExpenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid positive amount.",
        variant: "destructive",
      });
      return;
    }
    setAddingExpense(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({
        restaurant_id: restaurantId,
        category: newExpenseCategory.trim().toLowerCase(),
        amount: amount,
        description: newExpenseDesc.trim() || `Daily expense: ${newExpenseCategory.trim()}`,
        expense_date: dateStr,
        payment_method: "cash",
        is_recurring: false,
        created_by: user.user?.id || null,
      });
      if (error) throw error;

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["daily-summary-data", restaurantId, dateStr] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] });

      toast({
        title: "Expense Added ✅",
        description: `${currencySymbol}${amount.toFixed(2)} added as ${newExpenseCategory}`,
      });
      setNewExpenseCategory("");
      setNewExpenseAmount("");
      setNewExpenseDesc("");
      setShowAddExpense(false);
    } catch (err: any) {
      toast({
        title: "Failed to add expense",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAddingExpense(false);
    }
  };

  // Handle saving order-based inventory cost as a permanent expense record
  const handleSaveInventoryExpense = async () => {
    if (!restaurantId || !summary) return;
    setAddingExpense(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      const totalValue = summary.inventoryCostFromOrders;
      const details = summary.inventoryCostDetails;

      if (!totalValue || totalValue <= 0) {
        toast({
          title: "No Inventory Cost",
          description: "No recipes linked to today's orders. Set up recipes with ingredient costs for menu items.",
          variant: "destructive",
        });
        setAddingExpense(false);
        return;
      }

      // Check if already saved today
      const { data: existing } = await supabase
        .from("expenses")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("category", "inventory")
        .eq("subcategory", "Daily Inventory Usage")
        .eq("expense_date", dateStr)
        .limit(1);

      if (existing && existing.length > 0) {
        toast({
          title: "Already Saved",
          description: `Inventory expense already saved for ${format(displayDate, "dd MMM yyyy")}. Delete the old one first if you want to re-save.`,
          variant: "destructive",
        });
        setAddingExpense(false);
        return;
      }

      // Build description from order details
      const lines = details
        .filter((d) => d.totalCost > 0)
        .map(
          (d) =>
            `${d.itemName}: ${d.quantity}× @ ${currencySymbol}${d.recipeCost.toFixed(2)}/unit = ${currencySymbol}${d.totalCost.toFixed(2)}`,
        );

      const { error } = await supabase.from("expenses").insert({
        restaurant_id: restaurantId,
        category: "inventory",
        subcategory: "Daily Inventory Usage",
        amount: Math.round(totalValue * 100) / 100,
        description: `Inventory used for ${format(displayDate, "dd MMM yyyy")} (${summary.totalOrders} orders)\n${lines.join("\n")}\nTotal: ${currencySymbol}${totalValue.toFixed(2)}`,
        expense_date: dateStr,
        payment_method: "cash",
        is_recurring: false,
        created_by: user.user?.id || null,
      });

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: ["daily-summary-data", restaurantId, dateStr],
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] });

      toast({
        title: "Inventory Expense Saved ✅",
        description: `${currencySymbol}${totalValue.toFixed(2)} from ${details.length} items across ${summary.totalOrders} orders.`,
      });
    } catch (err: any) {
      toast({
        title: "Failed to save inventory expense",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAddingExpense(false);
    }
  };

  // Expense quick-add categories
  const expenseCategories = [
    { label: "Fuel / Gas", value: "fuel" },
    { label: "Staff / Labor", value: "staff" },
    { label: "Packaging", value: "packaging" },
    { label: "Transport", value: "transport" },
    { label: "Maintenance", value: "maintenance" },
    { label: "Rent / Parking", value: "rent" },
    { label: "Utilities", value: "utilities" },
    { label: "Groceries", value: "groceries" },
    { label: "Other", value: "other" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 pr-12 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <span>Daily Summary</span>
              <p className="text-xs font-normal text-gray-500 mt-0.5">
                {format(displayDate, "dd MMM yyyy")}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : summary ? (
            <div className="space-y-4 py-2">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  icon={<ShoppingCart className="h-4 w-4" />}
                  label="Total Orders"
                  value={String(summary.totalOrders)}
                  gradient="from-blue-500 to-indigo-500"
                />
                <MetricCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Revenue"
                  value={`${currencySymbol}${summary.totalRevenue.toFixed(2)}`}
                  gradient="from-emerald-500 to-teal-500"
                />
                <MetricCard
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Avg Order"
                  value={`${currencySymbol}${summary.averageOrderValue.toFixed(0)}`}
                  gradient="from-purple-500 to-pink-500"
                />
                <MetricCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Peak Hour"
                  value={summary.peakHour || "N/A"}
                  gradient="from-orange-500 to-red-500"
                />
              </div>

              {/* P&L Summary */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-indigo-200/50 dark:border-indigo-700/30">
                <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" /> Profit & Loss
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />{" "}
                      Revenue
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      +{currencySymbol}
                      {summary.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-red-500" /> Expenses
                    </span>
                    <span className="text-sm font-bold text-red-500 dark:text-red-400">
                      -{currencySymbol}
                      {(summary.totalExpenses || 0).toFixed(2)}
                    </span>
                  </div>
                  {/* Expense category breakdown */}
                  {Object.entries(summary.expenseBreakdown || {})
                    .filter(([, v]) => v > 0)
                    .map(([cat, amt]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between pl-6"
                      >
                        <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                          {cat}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {currencySymbol}
                          {amt.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  <div className="border-t border-indigo-200 dark:border-indigo-700/30 pt-2 mt-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-bold flex items-center gap-1.5 ${(summary.netProfit || 0) >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                      >
                        {(summary.netProfit || 0) >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        Net {(summary.netProfit || 0) >= 0 ? "Profit" : "Loss"}
                      </span>
                      <span
                        className={`text-lg font-black ${(summary.netProfit || 0) >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
                      >
                        {currencySymbol}
                        {Math.abs(summary.netProfit || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inventory Cost from Orders — auto-calculated */}
                {summary.inventoryCostFromOrders > 0 && (
                  <div className="mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" />
                        Inventory Used (from {summary.totalOrders} orders)
                      </p>
                      <span className="text-xs font-bold text-red-500">-{currencySymbol}{summary.inventoryCostFromOrders.toFixed(2)}</span>
                    </div>
                    {summary.inventoryCostDetails.slice(0, 5).map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between pl-5 py-0.5">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[55%]">
                          {d.itemName} ×{d.quantity}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {currencySymbol}{d.totalCost.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {summary.inventoryCostDetails.length > 5 && (
                      <p className="text-[10px] text-gray-400 pl-5">+{summary.inventoryCostDetails.length - 5} more items</p>
                    )}
                  </div>
                )}

                {/* Add Expense Buttons — inside P&L section for context */}
                {!initialData && (
                  <div className="mt-3 pt-3 border-t border-indigo-200/50 dark:border-indigo-700/30">
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">Add Expenses</p>
                    <div className="flex gap-2">
                      {summary.inventoryCostFromOrders > 0 && !summary.expenseBreakdown["inventory"] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveInventoryExpense}
                          disabled={addingExpense}
                          className="flex-1 text-xs h-8 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        >
                          {addingExpense ? (
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3 mr-1.5" />
                          )}
                          Save as Expense
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddExpense(!showAddExpense)}
                        className="flex-1 text-xs h-8 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                      >
                        <Plus className="h-3 w-3 mr-1.5" />
                        Other Expense
                      </Button>
                    </div>

                    {/* Quick Add Expense Form */}
                    {showAddExpense && (
                      <div className="mt-3 bg-white dark:bg-gray-800 rounded-xl p-3 border border-indigo-200 dark:border-indigo-700/50 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {expenseCategories.map((cat) => (
                            <button
                              key={cat.value}
                              onClick={() => setNewExpenseCategory(cat.value)}
                              className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                                newExpenseCategory === cat.value
                                  ? "bg-indigo-500 text-white border-indigo-500"
                                  : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-300"
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={newExpenseAmount}
                            onChange={(e) => setNewExpenseAmount(e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                          <Input
                            type="text"
                            placeholder="Note (optional)"
                            value={newExpenseDesc}
                            onChange={(e) => setNewExpenseDesc(e.target.value)}
                            className="flex-1 h-8 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowAddExpense(false);
                              setNewExpenseCategory("");
                              setNewExpenseAmount("");
                              setNewExpenseDesc("");
                            }}
                            className="text-xs h-7"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddQuickExpense}
                            disabled={addingExpense || !newExpenseCategory || !newExpenseAmount}
                            className="text-xs h-7 bg-indigo-500 hover:bg-indigo-600 text-white"
                          >
                            {addingExpense ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3 mr-1" />
                            )}
                            Add Expense
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Breakdown */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Payment Breakdown
                </h3>
                <div className="space-y-2">
                  {Object.entries(summary.paymentBreakdown)
                    .filter(([, v]) => v > 0)
                    .map(([method, amount]) => (
                      <div
                        key={method}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {method}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {currencySymbol}
                          {amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Top Items */}
              {summary.topItems.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                    🏆 Top Items
                  </h3>
                  <div className="space-y-2">
                    {summary.topItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {idx + 1}. {item.name}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            ×{item.quantity}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            {currencySymbol}
                            {item.revenue.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NC & Discounts */}
              {(summary.ncOrders > 0 || summary.discountAmount > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {summary.ncOrders > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-3 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-1 mb-1">
                        <Ban className="h-3 w-3 text-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                          Non-Chargeable
                        </span>
                      </div>
                      <p className="text-lg font-bold text-yellow-800 dark:text-yellow-300">
                        {summary.ncOrders}
                      </p>
                      <p className="text-xs text-yellow-600">
                        {currencySymbol}
                        {summary.ncAmount.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {summary.discountAmount > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 border border-green-200 dark:border-green-800">
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                        🏷️ Discounts
                      </span>
                      <p className="text-lg font-bold text-green-800 dark:text-green-300">
                        {currencySymbol}
                        {summary.discountAmount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes for today..."
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none h-20"
                />
              </div>

              {/* Owner WhatsApp Number */}
              {(showOwnerInput || !ownerPhone) && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 border border-green-200 dark:border-green-800">
                  <label className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5 block flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Owner's WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full rounded-lg border border-green-200 dark:border-green-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Saved for future reports
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              No data available
            </div>
          )}
        </div>

        {/* Fixed Footer — always visible */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4 space-y-2 rounded-b-lg">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              disabled={!summary}
              className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20 text-xs sm:text-sm h-9"
            >
              <Send className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <span>Share</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendToOwner}
              disabled={!summary}
              className="bg-green-600 hover:bg-green-700 text-white border-green-600 text-xs sm:text-sm h-9"
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <span className="truncate">{ownerPhone ? "To Owner" : "Set Owner"}</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSaveReport}
              disabled={!summary || saving || saved || !!initialData}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 text-xs sm:text-sm h-9"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : saved || initialData ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              <span className="truncate">{initialData ? "Archived" : saved ? "Saved" : "Save"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Small metric card reusable component
const MetricCard = ({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm">
    <div className="flex items-center gap-2 mb-1">
      <div
        className={`p-1.5 bg-gradient-to-br ${gradient} rounded-lg text-white`}
      >
        {icon}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
    <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
  </div>
);

export default DailySummaryDialog;
