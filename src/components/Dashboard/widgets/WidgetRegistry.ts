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
  Trophy,
  DollarSign,
  CloudSun,
  UserCheck,
  ShoppingCart,
  Bed,
  Users,
  AlertCircle,
} from "lucide-react";

export const MAX_WIDGETS = 10;

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
    id: "owner-attendance",
    name: "Attendance & Leaves",
    description: "Manage your attendance, live staff times, and upcoming leaves",
    icon: UserCheck,
    gradient: "from-rose-500 to-red-600",
    category: "info",
  },
  {
    id: "weekly-sales",
    name: "Weekly Sales",
    description: "Column chart showing this week's daily revenue",
    icon: BarChart3,
    gradient: "from-blue-500 to-indigo-600",
    category: "charts",
  },
  {
    id: "live-orders",
    name: "Live Orders",
    description: "Real-time kitchen and POS order tracking",
    icon: ShoppingCart,
    gradient: "from-blue-500 to-indigo-600",
    category: "stats",
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
    id: "low-inventory",
    name: "Low Inventory Alert",
    description: "Items running low on stock that need restocking",
    icon: AlertTriangle,
    gradient: "from-amber-500 to-orange-600",
    category: "info",
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
    id: "room-status",
    name: "Room Status",
    description: "Overview of hotel rooms, occupancy, and maintenance",
    icon: Bed,
    gradient: "from-cyan-500 to-blue-600",
    category: "info",
  },
  {
    id: "staff-attendance",
    name: "Staff Attendance (Detailed)",
    description: "Complete list of clocked-in, late, and absent staff",
    icon: Users,
    gradient: "from-violet-500 to-purple-600",
    category: "info",
  },
  {
    id: "owner-alerts",
    name: "Staff & Operations Alerts",
    description: "Notifications for overtime, late clock-ins, and leave requests",
    icon: AlertCircle,
    gradient: "from-amber-500 to-red-600",
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
    id: "menu-margins",
    name: "Menu Item Margins",
    description: "Profit margin per dish based on ingredient costs",
    icon: DollarSign,
    gradient: "from-emerald-500 to-green-600",
    category: "stats",
  },
  {
    id: "weather-forecast",
    name: "Weather Forecast",
    description: "Current weather + 3-day forecast with operational tips",
    icon: CloudSun,
    gradient: "from-sky-400 to-blue-600",
    category: "info",
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
  {
    id: "location-performance",
    name: "Location Performance",
    description: "Revenue by location — find your best spots",
    icon: Trophy,
    gradient: "from-amber-500 to-orange-600",
    category: "stats",
  },
];

export const DEFAULT_WIDGETS = [
  "owner-attendance",
  "weekly-sales",
  "trending-items",
  "revenue-pie",
  "recent-orders",
  "hourly-sales",
  "payment-split",
];

export const RESTAURANT_DEFAULT_WIDGETS = [
  "owner-attendance",
  "weekly-sales",
  "live-orders",
  "trending-items",
  "revenue-pie",
  "recent-orders",
  "low-inventory",
  "nc-stats",
];

export const getWidgetById = (id: string) =>
  WIDGET_CATALOG.find((w) => w.id === id);
