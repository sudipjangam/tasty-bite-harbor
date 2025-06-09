
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Utensils,
  BarChart3,
  CreditCard,
  Settings,
  Bot,
  Coffee,
  Bed,
  Calendar,
  UserCheck,
  Package,
  TrendingUp,
  MessageCircle
} from "lucide-react";

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
    icon: Utensils,
    href: "/menu",
  },
  {
    title: "Tables",
    icon: Coffee,
    href: "/tables",
  },
  {
    title: "Reservations",
    icon: Calendar,
    href: "/reservations",
  },
  {
    title: "Rooms",
    icon: Bed,
    href: "/rooms",
  },
  {
    title: "Customers",
    icon: Users,
    href: "/customers",
  },
  {
    title: "Marketing",
    icon: MessageCircle,
    href: "/marketing",
  },
  {
    title: "Staff",
    icon: UserCheck,
    href: "/staff",
  },
  {
    title: "Inventory",
    icon: Package,
    href: "/inventory",
  },
  {
    title: "Expenses",
    icon: CreditCard,
    href: "/expenses",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/analytics",
  },
  {
    title: "AI Assistant",
    icon: Bot,
    href: "/ai",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function SimpleSidebarNavigation() {
  const location = useLocation();

  return (
    <nav className="space-y-2">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
