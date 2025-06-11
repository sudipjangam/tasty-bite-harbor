
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart,
  Menu as MenuIcon,
  UserCheck,
  Bed,
  MapPin,
  Calendar,
  Package,
  TrendingUp,
  MessageSquare,
  Settings,
  DollarSign,
  Calculator,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/orders",
  },
  {
    title: "Menu",
    icon: MenuIcon,
    href: "/menu",
  },
  {
    title: "Staff",
    icon: UserCheck,
    href: "/staff",
  },
  {
    title: "Customers",
    icon: Users,
    href: "/customers",
  },
  {
    title: "Rooms",
    icon: Bed,
    href: "/rooms",
  },
  {
    title: "Guest Management",
    icon: Sparkles,
    href: "/housekeeping",
  },
  {
    title: "Tables",
    icon: MapPin,
    href: "/tables",
  },
  {
    title: "Reservations",
    icon: Calendar,
    href: "/reservations",
  },
  {
    title: "Inventory",
    icon: Package,
    href: "/inventory",
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    href: "/analytics",
  },
  {
    title: "Financial",
    icon: Calculator,
    href: "/financial",
  },
  {
    title: "AI Assistant",
    icon: MessageSquare,
    href: "/ai",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export const SimpleSidebarNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="space-y-2">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        
        return (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors",
              isActive
                ? "bg-white text-sidebar-purple font-medium"
                : "text-white hover:bg-sidebar-purple-dark"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.title}</span>
          </button>
        );
      })}
    </nav>
  );
};
