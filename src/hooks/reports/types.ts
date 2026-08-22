import { DateRange } from "react-day-picker";

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
    name: "Customer Frequency",
    description: "New vs repeat customer analysis",
    icon: "UserCheck",
    color: "bg-emerald-500",
  },
];

export interface PayLaterOrderSummary {
  date: string;
  customer: string;
  phone: string;
  total: number;
  orderId?: string;
}

export interface ReportData {
  category: ReportCategory;
  title: string;
  summary: Record<string, string | number>;
  chartData?: Array<{ name: string; value: number; fill?: string }>;
  tableData?: Array<Record<string, unknown>>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  payLaterOrders?: PayLaterOrderSummary[];
}
