import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportCategory } from "@/hooks/useReportsData";

interface ReportHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  category: ReportCategory;
}

interface FormulaBlock {
  field: string;
  formula: string;
  example: string;
  note?: string;
}

interface HelpDoc {
  title: string;
  description: string;
  dataSource: string;
  filters: string;
  formulas: FormulaBlock[];
  tips?: string[];
}

const HELP_DOCS: Record<string, HelpDoc> = {
  orders: {
    title: "Orders & Sales Report",
    description: "Tracks all orders placed in the selected period. Revenue is calculated only from completed, chargeable orders.",
    dataSource: "orders table",
    filters: "status = 'completed' AND order_type ≠ 'non-chargeable' (for revenue metrics)",
    formulas: [
      {
        field: "Total Revenue",
        formula: "SUM(total) WHERE status='completed' AND order_type ≠ 'non-chargeable'",
        example: "Orders: ₹200, ₹150, ₹300 (completed) + ₹100 (cancelled) → Revenue = ₹200 + ₹150 + ₹300 = ₹650",
        note: "Cancelled, pending, and NC orders are excluded from revenue",
      },
      {
        field: "Total Orders",
        formula: "COUNT(*) — all orders in period (all statuses)",
        example: "3 completed + 1 cancelled + 1 pending = 5 total orders",
      },
      {
        field: "Avg Order",
        formula: "Total Revenue ÷ count(completed chargeable orders)",
        example: "₹650 ÷ 3 = ₹217",
        note: "NC and cancelled orders excluded from both numerator and denominator",
      },
      {
        field: "Total Discounts",
        formula: "SUM(discount_amount) from completed chargeable orders",
        example: "₹20 + ₹0 + ₹30 = ₹50",
      },
      {
        field: "Payment Breakdown (Cash/UPI/Card/Credit)",
        formula: "Group completed chargeable orders by payment_method → SUM(total) per method",
        example: "Cash: ₹200, UPI: ₹150, Card: ₹300 → Collected = ₹650. Credit/Pending orders = gap vs manual book.",
        note: "Orders without payment_method fall into 'Credit/Pending'. Your manual register should match Cash + UPI + Card.",
      },
    ],
    tips: [
      "Manual book = Cash + UPI + Card amounts (Collected total)",
      "Credit/Pending = room charges, outstanding payments not yet collected",
      "NC orders (Non-Chargeable / complimentary) are excluded from all revenue",
    ],
  },

  menu: {
    title: "Menu Item Sales Summary",
    description: "Shows item-wise sales performance: how many units of each menu item were sold and the revenue generated.",
    dataSource: "orders table (items JSON array) + menu_items table",
    filters: "status = 'completed' AND order_type ≠ 'non-chargeable'",
    formulas: [
      {
        field: "Total Menu Items",
        formula: "COUNT(*) from menu_items table",
        example: "15 items in your menu → Total Menu Items = 15",
      },
      {
        field: "Items Sold (Qty Sold)",
        formula: "SUM(quantity) across all order items, grouped by item name",
        example: "Butter Chicken ordered 5x in Order A + 3x in Order B → Qty Sold = 8",
      },
      {
        field: "Revenue per Item",
        formula: "SUM(unit_price × quantity) for each menu item across all orders",
        example: "Butter Chicken: 8 × ₹350 = ₹2,800",
        note: "Uses inline @price from order if available, else falls back to menu_items.price",
      },
      {
        field: "Variance",
        formula: "(Menu Price × Qty Sold) − Actual Revenue",
        example: "Menu price ₹350, sold 8 @ ₹300 each → Theoretical: ₹2,800, Actual: ₹2,400, Variance: ₹400",
        note: "Positive variance = items sold below menu price (discounts/promotions applied)",
      },
      {
        field: "Categories",
        formula: "COUNT(DISTINCT category) from menu_items",
        example: "Starters, Mains, Beverages, Desserts → 4 categories",
      },
    ],
  },

  inventory: {
    title: "Inventory Report",
    description: "Current stock levels and valuation. Not date-filtered — shows live inventory state.",
    dataSource: "inventory_items table",
    filters: "None (shows current stock)",
    formulas: [
      {
        field: "Total Items",
        formula: "COUNT(*) from inventory_items",
        example: "25 different stock items → Total Items = 25",
      },
      {
        field: "Stock Value",
        formula: "SUM(quantity × cost_per_unit) for all items",
        example: "Rice: 50kg × ₹40 = ₹2,000 + Oil: 10L × ₹150 = ₹1,500 → Stock Value = ₹3,500",
      },
      {
        field: "Low Stock",
        formula: "COUNT where quantity ≤ reorder_level (default: 10)",
        example: "Salt: 2kg (reorder at 5kg) → flagged as Low Stock",
      },
    ],
    tips: [
      "Stock Value = what your current inventory is worth at cost price",
      "Low Stock items need reordering — check reorder levels in inventory settings",
    ],
  },

  customers: {
    title: "Customer Insights Report",
    description: "Shows customers who placed orders in the selected period, their spending, and loyalty status.",
    dataSource: "customers table + orders table",
    filters: "Orders: order_type ≠ 'non-chargeable'. Excludes generic names (Walk-in, Table 1, etc.)",
    formulas: [
      {
        field: "Active Customers",
        formula: "COUNT(DISTINCT customer_name) from orders in period — excludes table/generic names",
        example: "Orders from Rahul, Priya, Amit, 'Table 1', 'Walk-in' → Active = 3 (Rahul, Priya, Amit)",
      },
      {
        field: "Period Revenue",
        formula: "SUM(total) from completed chargeable orders by identified customers",
        example: "Rahul: ₹500, Priya: ₹800, Amit: ₹300 → Period Revenue = ₹1,600",
      },
      {
        field: "Avg Spend",
        formula: "Period Revenue ÷ Active Customers",
        example: "₹1,600 ÷ 3 = ₹533",
      },
      {
        field: "Loyalty Members",
        formula: "COUNT where loyalty_enrolled = true from matched customer records",
        example: "Rahul and Priya enrolled → Loyalty Members = 2",
      },
    ],
  },

  staff: {
    title: "Staff Report",
    description: "Staff attendance and hours worked in the selected period.",
    dataSource: "staff + staff_clock_entries + staff_leaves tables",
    filters: "Clock entries where clock_in is within selected date range",
    formulas: [
      {
        field: "Total Staff",
        formula: "COUNT(*) from staff table",
        example: "5 staff members registered → Total Staff = 5",
      },
      {
        field: "Hours Worked",
        formula: "(clock_out − clock_in) in hours, per staff member, summed across period",
        example: "Clock in 9:00 AM, out 6:00 PM → 9 hours. Done 5 days → 45 hours",
      },
      {
        field: "Leave Requests",
        formula: "COUNT from staff_leaves where dates overlap with selected period",
        example: "2 leaves in June → Leave Requests = 2",
      },
    ],
  },

  suppliers: {
    title: "Supplier Analysis Report",
    description: "Purchase orders and spending by supplier in the selected period.",
    dataSource: "suppliers + purchase_orders tables",
    filters: "Purchase orders created within selected date range",
    formulas: [
      {
        field: "Total Suppliers",
        formula: "COUNT(*) from suppliers table",
        example: "4 suppliers registered → Total Suppliers = 4",
      },
      {
        field: "Total Spent",
        formula: "SUM(total_amount) from purchase_orders in period",
        example: "PO #1: ₹5,000, PO #2: ₹3,000 → Total Spent = ₹8,000",
      },
      {
        field: "Pending Orders",
        formula: "COUNT where status = 'pending'",
        example: "2 orders still pending → Pending Orders = 2",
      },
    ],
  },

  expenses: {
    title: "Expense Report",
    description: "All recorded expenses in the selected period, grouped by category.",
    dataSource: "expenses table",
    filters: "expense_date within selected date range",
    formulas: [
      {
        field: "Total Expenses",
        formula: "SUM(amount) from all expenses in period",
        example: "Rent: ₹15,000 + Staff: ₹30,000 + Groceries: ₹20,000 = ₹65,000",
      },
      {
        field: "Expense Count",
        formula: "COUNT(*) of expense entries",
        example: "12 expense records in June → Expense Count = 12",
      },
      {
        field: "Categories",
        formula: "COUNT(DISTINCT category)",
        example: "rent, staff_salary, groceries, utilities → 4 categories",
      },
    ],
    tips: [
      "Expenses are tracked by expense_date, not created_at",
      "Use the Daily Summary to auto-generate inventory expenses from recipe costs",
    ],
  },

  rooms: {
    title: "Rooms/Hotel Report",
    description: "Room occupancy, reservations, and billing revenue in the selected period.",
    dataSource: "rooms + reservations + room_billings tables",
    filters: "Reservations and billings within selected date range",
    formulas: [
      {
        field: "Total Rooms",
        formula: "COUNT(*) from rooms table",
        example: "8 rooms → Total Rooms = 8",
      },
      {
        field: "Occupied",
        formula: "COUNT where status = 'occupied' (current live count)",
        example: "3 rooms currently occupied → Occupied = 3",
      },
      {
        field: "Revenue",
        formula: "SUM(total_amount) from room_billings in period",
        example: "Room A: ₹2,500 + Room B: ₹3,000 → Revenue = ₹5,500",
      },
    ],
  },

  recipes: {
    title: "Recipe Cost Analysis",
    description: "Food cost and margin analysis for all recipes linked to menu items.",
    dataSource: "recipes table",
    filters: "None (shows all recipes)",
    formulas: [
      {
        field: "Avg Food Cost %",
        formula: "AVG(food_cost_percentage) across all recipes",
        example: "Recipe A: 30%, B: 25%, C: 35% → Avg = (30+25+35) ÷ 3 = 30%",
        note: "Food cost % = (ingredient cost ÷ selling price) × 100. Lower = better margin.",
      },
      {
        field: "Avg Margin %",
        formula: "AVG(margin_percentage) across all recipes",
        example: "Recipe A: 70%, B: 75%, C: 65% → Avg = 70%",
        note: "Margin % = 100% − Food Cost %. Industry target: 65-75%.",
      },
    ],
    tips: [
      "Food Cost % below 30% = excellent profitability",
      "Food Cost % above 40% = review ingredient costs or selling price",
    ],
  },

  promotions: {
    title: "Promotions Report",
    description: "Campaign performance and promotional messages sent in the selected period.",
    dataSource: "promotion_campaigns + sent_promotions tables",
    filters: "Sent promotions within selected date range",
    formulas: [
      {
        field: "Total Campaigns",
        formula: "COUNT(*) from promotion_campaigns",
        example: "3 campaigns created → Total Campaigns = 3",
      },
      {
        field: "Active",
        formula: "COUNT where is_active = true",
        example: "2 active, 1 inactive → Active = 2",
      },
      {
        field: "Messages Sent",
        formula: "COUNT(*) from sent_promotions in period",
        example: "45 WhatsApp messages sent → Messages Sent = 45",
      },
    ],
  },

  repeat_customers: {
    title: "Repeat Customers — Day Wise",
    description: "Day-by-day analysis of new vs returning customers. Excludes generic names (Walk-in, Table 1, etc.) from repeat analysis.",
    dataSource: "orders + customers tables",
    filters: "order_type ≠ 'non-chargeable'. Generic names excluded.",
    formulas: [
      {
        field: "Named Customers",
        formula: "COUNT(DISTINCT customer_name) per day — excludes Walk-in/Table names",
        example: "Day: Rahul, Priya, Table 1, Walk-in → Named = 2 (Rahul, Priya)",
      },
      {
        field: "Repeat Customers",
        formula: "Named customers who: (a) have visit_count > 1 in CRM OR (b) appeared on an earlier day in the period",
        example: "Rahul visited June 1 and June 5 → Repeat on June 5",
      },
      {
        field: "New Customers",
        formula: "Named Customers − Repeat Customers",
        example: "2 named − 1 repeat = 1 new",
      },
      {
        field: "Repeat %",
        formula: "(Repeat Customers ÷ Named Customers) × 100",
        example: "1 repeat ÷ 2 named = 50%",
        note: "Anonymous/table orders are excluded from percentage calculation",
      },
      {
        field: "Anonymous (Table/Other)",
        formula: "COUNT of orders from Walk-in, Table X, Takeaway, etc.",
        example: "10 orders from 'Table 1', 'Walk-in' → Anonymous = 10",
      },
    ],
    tips: [
      "Repeat rate is calculated only on named customers — anonymous orders don't inflate it",
      "Names like 'Table 1', 'Walk-in', 'Takeaway', 'Counter' are automatically excluded",
      "To improve repeat tracking, save customer name and phone at POS checkout",
    ],
  },
};

const ReportHelpDialog: React.FC<ReportHelpDialogProps> = ({
  isOpen,
  onClose,
  category,
}) => {
  const doc = HELP_DOCS[category];
  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 pr-12 shrink-0 bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-blue-500/10 border-b border-orange-500/20">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl shadow-lg">
              <span className="text-white text-lg">📖</span>
            </div>
            <div>
              <span className="font-bold">{doc.title}</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Calculation Reference & Formulas
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Description */}
          <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-4">
            <p className="text-sm text-foreground leading-relaxed">{doc.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-[10px] font-mono bg-gray-100 dark:bg-white/10 text-muted-foreground px-2 py-0.5 rounded">
                Source: {doc.dataSource}
              </span>
              <span className="text-[10px] font-mono bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded">
                Filter: {doc.filters}
              </span>
            </div>
          </div>

          {/* Formulas */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>🧮</span> Field Calculations
            </h3>
            {doc.formulas.map((f, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] overflow-hidden"
              >
                {/* Field name header */}
                <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white dark:from-white/5 dark:to-transparent border-b border-gray-100 dark:border-white/5">
                  <span className="text-sm font-bold text-foreground">{f.field}</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {/* Formula */}
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Formula</span>
                    <p className="text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 mt-1 text-foreground leading-relaxed">
                      {f.formula}
                    </p>
                  </div>
                  {/* Example */}
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Example</span>
                    <p className="text-xs bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2 mt-1 text-foreground leading-relaxed">
                      {f.example}
                    </p>
                  </div>
                  {/* Note */}
                  {f.note && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                      ⚠️ {f.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          {doc.tips && doc.tips.length > 0 && (
            <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <span>💡</span> Tips
              </h3>
              <ul className="space-y-1.5">
                {doc.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-violet-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportHelpDialog;
