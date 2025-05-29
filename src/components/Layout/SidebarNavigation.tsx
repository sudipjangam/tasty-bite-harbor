
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Utensils,
  ShoppingCart,
  Coffee,
  Users,
  PackageOpen,
  Bed,
  Truck,
  BarChart3,
  Settings,
  LayoutDashboard,
  Bot,
  ChefHat,
  Contact,
  Receipt,
} from "lucide-react";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/types/auth";

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  component: string;
  permission?: Permission;
  permissions?: Permission[];
}

const navigationItems: NavigationItem[] = [
  { 
    name: "Dashboard", 
    href: "/", 
    icon: Home, 
    component: "dashboard",
    permission: "dashboard.view"
  },
  { 
    name: "Menu", 
    href: "/menu", 
    icon: Utensils, 
    component: "menu",
    permission: "menu.view"
  },
  { 
    name: "Orders", 
    href: "/orders", 
    icon: ShoppingCart, 
    component: "orders",
    permission: "orders.view"
  },
  { 
    name: "Tables", 
    href: "/tables", 
    icon: Coffee, 
    component: "tables",
    permission: "orders.view"
  },
  { 
    name: "Staff", 
    href: "/staff", 
    icon: Users, 
    component: "staff",
    permission: "staff.view"
  },
  { 
    name: "Customers", 
    href: "/customers", 
    icon: Users, 
    component: "customers",
    permission: "customers.view"
  },
  { 
    name: "CRM", 
    href: "/crm", 
    icon: Contact, 
    component: "crm",
    permission: "customers.view"
  },
  { 
    name: "Inventory", 
    href: "/inventory", 
    icon: PackageOpen, 
    component: "inventory",
    permission: "inventory.view"
  },
  { 
    name: "Rooms", 
    href: "/rooms", 
    icon: Bed, 
    component: "rooms",
    permission: "rooms.view"
  },
  { 
    name: "Suppliers", 
    href: "/suppliers", 
    icon: Truck, 
    component: "suppliers",
    permission: "inventory.view"
  },
  { 
    name: "Expenses", 
    href: "/expenses", 
    icon: Receipt, 
    component: "analytics",
    permission: "analytics.view"
  },
  { 
    name: "Analytics", 
    href: "/analytics", 
    icon: BarChart3, 
    component: "analytics",
    permission: "analytics.view"
  },
  {
    name: "Business Dashboard",
    href: "/business-dashboard",
    icon: LayoutDashboard,
    component: "business_dashboard",
    permission: "dashboard.analytics"
  },
  { 
    name: "AI Assistant", 
    href: "/ai", 
    icon: Bot, 
    component: "dashboard",
    permission: "ai.access"
  },
  { 
    name: "Kitchen Display", 
    href: "/kitchen", 
    icon: ChefHat, 
    component: "dashboard",
    permission: "orders.view"
  },
  { 
    name: "Settings", 
    href: "/settings", 
    icon: Settings, 
    component: "settings",
    permission: "settings.view"
  },
];

interface Props {
  allowedComponents: string[];
}

export const SidebarNavigation = ({ allowedComponents }: Props) => {
  const location = useLocation();
  const { hasPermission, hasAnyPermission } = useAuth();
  
  const filteredNavigation = navigationItems.filter((item) => {
    // First check if component is allowed
    const componentAllowed = allowedComponents.length === 0 || allowedComponents.includes(item.component);
    
    if (!componentAllowed) return false;
    
    // Then check permissions
    if (item.permission) {
      return hasPermission(item.permission);
    }
    
    if (item.permissions) {
      return hasAnyPermission(item.permissions);
    }
    
    // If no specific permission required, show the item
    return true;
  });

  return (
    <SidebarContent className="py-4">
      <SidebarMenu>
        {filteredNavigation.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === item.href}
              tooltip={item.name}
              className={
                location.pathname === item.href
                  ? "bg-white text-sidebar-purple hover:bg-white hover:text-sidebar-purple"
                  : "text-white hover:bg-sidebar-purple-dark"
              }
            >
              <NavLink to={item.href} className="flex items-center space-x-2">
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarContent>
  );
};
