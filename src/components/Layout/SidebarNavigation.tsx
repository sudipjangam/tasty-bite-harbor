
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  UtensilsCrossed,
  BookOpen,
  Users,
  Shield,
  Package,
  Calendar,
  TrendingUp,
  Settings,
  DollarSign,
  Truck,
  MessageSquare,
  Sparkles,
  Bed,
  Globe,
  ChefHat,
  Utensils,
  Target,
  FileText,
} from "lucide-react";

interface SidebarNavigationProps {
  className?: string;
  allowedComponents?: string[];
}

const SidebarNavigation = ({ allowedComponents = [] }: SidebarNavigationProps) => {
  const location = useLocation();
  const { hasAccess, loading } = useAccessControl();
  const { user } = useAuth();
  
  // Map routes to component names
  const routeToComponentMap: Record<string, string> = {
    '/': 'dashboard',
    '/pos': 'pos',
    '/orders': 'orders',
    // '/qsr-pos': 'qsr-pos',
    '/kitchen': 'kitchen',
    '/menu': 'menu',
    '/recipes': 'recipes',
    '/staff': 'staff',
    '/inventory': 'inventory',
    '/tables': 'tables',
    '/rooms': 'rooms',
    '/reservations': 'reservations',
    '/customers': 'customers',
    '/channel-management': 'channel-management',
    '/analytics': 'analytics',
    '/expenses': 'expenses',
    '/suppliers': 'suppliers',
    '/crm': 'crm',
    '/marketing': 'marketing',
    '/ai': 'ai',
    '/housekeeping': 'housekeeping',
    '/settings': 'settings',
    '/reports': 'reports',
    '/admin': 'admin-panel',
  };
  
  const navigationItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: UtensilsCrossed, label: "POS", path: "/pos" },
    { icon: UtensilsCrossed, label: "Orders", path: "/orders" },
    { icon: ChefHat, label: "Kitchen", path: "/kitchen" },
    { icon: BookOpen, label: "Menu", path: "/menu" },
    { icon: Utensils, label: "Recipes & Costing", path: "/recipes" },
    { icon: Users, label: "Staff", path: "/staff" },
    { icon: Package, label: "Inventory", path: "/inventory" },
    { icon: Calendar, label: "Tables", path: "/tables" },
    { icon: Bed, label: "Rooms", path: "/rooms" },
    { icon: Calendar, label: "Reservations", path: "/reservations" },
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: Globe, label: "Channel Management", path: "/channel-management" },
    { icon: TrendingUp, label: "Analytics", path: "/analytics" },
    { icon: DollarSign, label: "Expenses", path: "/expenses" },
    { icon: Truck, label: "Suppliers", path: "/suppliers" },
    { icon: MessageSquare, label: "CRM", path: "/crm" },
    { icon: Target, label: "Marketing", path: "/marketing" },
    { icon: Sparkles, label: "AI Assistant", path: "/ai" },
    { icon: Sparkles, label: "Housekeeping", path: "/housekeeping" },
    { icon: FileText, label: "Reports", path: "/reports" },
    { icon: Shield, label: "Admin Panel", path: "/admin", adminOnly: true },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading navigation...</div>;
  }

  return (
    <div className="flex flex-col space-y-1">
      {navigationItems.filter(item => {
        // Filter by adminOnly first
        if (item.adminOnly && user?.role !== 'admin') {
          return false;
        }
        
        const componentName = routeToComponentMap[item.path];
        return componentName ? hasAccess(componentName) : true;
      }).map((item) => (
        <Link
          key={item.label}
          to={item.path}
          className={cn(
            "group flex items-center space-x-2 rounded-md p-2 text-sm font-medium hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-50",
            location.pathname === item.path
              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
};

export default SidebarNavigation;
