import {
  BarChart3,
  TrendingUp,
  PieChart,
  ShoppingBag,
  Ban,
  AlertTriangle,
  Clock,
  CreditCard,
  Calendar as CalendarIcon,
  MapPin,
  LineChart,
  Activity,
} from "lucide-react";

export const MAX_WIDGETS = 8;

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  gradient: string;
  category: "charts" | "stats" | "info";
}

export const WIDGET_CATALOG: WidgetDefinition[] = [
  {
    id: "weekly-sales",
    name: "Weekly Sales",
    description: "Column chart showing this week's daily revenue",
    icon: BarChart3,
    gradient: "from-blue-500 to-indigo-600",
    category: "charts",
  },
  {
    id: "trending-items",
    name: "Trending Items",
    description: "Top selling dishes with ranked progress bars",
    icon: TrendingUp,
    gradient: "from-orange-500 to-red-600",
    category: "stats",
  },
  {
    id: "revenue-pie",
    name: "Revenue by Category",
    description: "3D pie chart showing revenue split by order type",
    icon: PieChart,
    gradient: "from-pink-500 to-rose-600",
    category: "charts",
  },
  {
    id: "recent-orders",
    name: "Top Orders Today",
    description: "Paginated table of today's recent orders",
    icon: ShoppingBag,
    gradient: "from-emerald-500 to-teal-600",
    category: "stats",
  },
  {
    id: "nc-stats",
    name: "Non-Chargeable Orders",
    description: "Track NC orders count and percentage of revenue",
    icon: Ban,
    gradient: "from-purple-500 to-pink-600",
    category: "stats",
  },
  {
    id: "low-inventory",
    name: "Low Inventory Alert",
    description: "Items running low on stock that need restocking",
    icon: AlertTriangle,
    gradient: "from-amber-500 to-orange-600",
    category: "info",
  },
  {
    id: "hourly-sales",
    name: "Hourly Sales Today",
    description: "Area chart showing today's sales by hour",
    icon: Clock,
    gradient: "from-cyan-500 to-blue-600",
    category: "charts",
  },
  {
    id: "payment-split",
    name: "Payment Methods",
    description: "Donut chart showing Cash vs UPI vs Card split",
    icon: CreditCard,
    gradient: "from-violet-500 to-purple-600",
    category: "charts",
  },
  {
    id: "daily-orders-count",
    name: "Daily Orders Count",
    description: "Bar chart showing order counts over last 7 days",
    icon: Activity,
    gradient: "from-green-500 to-emerald-600",
    category: "charts",
  },
  {
    id: "avg-order-trend",
    name: "Avg Order Value Trend",
    description: "Line chart showing avg order value over 7 days",
    icon: LineChart,
    gradient: "from-indigo-500 to-blue-600",
    category: "charts",
  },
  {
    id: "location-today",
    name: "Today's Location",
    description: "Current location and upcoming schedule info",
    icon: MapPin,
    gradient: "from-red-500 to-orange-600",
    category: "info",
  },
  {
    id: "this-week",
    name: "Weekly Schedule",
    description: "7-day schedule with locations and timings",
    icon: CalendarIcon,
    gradient: "from-fuchsia-500 to-pink-600",
    category: "info",
  },
];

export const DEFAULT_WIDGETS = [
  "weekly-sales",
  "trending-items",
  "revenue-pie",
  "recent-orders",
  "hourly-sales",
  "payment-split",
];

export const getWidgetById = (id: string) =>
  WIDGET_CATALOG.find((w) => w.id === id);
