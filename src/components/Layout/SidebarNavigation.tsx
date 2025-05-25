
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
} from "lucide-react";
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home, component: "dashboard" },
  { name: "Menu", href: "/menu", icon: Utensils, component: "menu" },
  { name: "Orders", href: "/orders", icon: ShoppingCart, component: "orders" },
  { name: "Tables", href: "/tables", icon: Coffee, component: "tables" },
  { name: "Staff", href: "/staff", icon: Users, component: "staff" },
  { name: "Customers", href: "/customers", icon: Users, component: "customers" },
  { name: "CRM", href: "/crm", icon: Contact, component: "crm" },
  { name: "Inventory", href: "/inventory", icon: PackageOpen, component: "inventory" },
  { name: "Rooms", href: "/rooms", icon: Bed, component: "rooms" },
  { name: "Suppliers", href: "/suppliers", icon: Truck, component: "suppliers" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, component: "analytics" },
  {
    name: "Business Dashboard",
    href: "/business-dashboard",
    icon: LayoutDashboard,
    component: "business_dashboard",
  },
  { name: "AI Assistant", href: "/ai", icon: Bot, component: "dashboard" },
  { name: "Kitchen Display", href: "/kitchen", icon: ChefHat, component: "dashboard" },
  { name: "Settings", href: "/settings", icon: Settings, component: "settings" },
];

interface Props {
  allowedComponents: string[];
}

export const SidebarNavigation = ({ allowedComponents }: Props) => {
  const location = useLocation();
  const filteredNavigation = allowedComponents.length > 0
    ? navigationItems.filter((item) => allowedComponents.includes(item.component))
    : navigationItems;

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
