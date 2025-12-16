import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Menu as MenuIcon,
  Settings,
  Package,
  ChefHat,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Home",
      href: "/"
    },
    {
      icon: ShoppingCart,
      label: "Orders",
      href: "/orders"
    },
    {
      icon: ChefHat,
      label: "Kitchen",
      href: "/kitchen"
    },
    {
      icon: MenuIcon,
      label: "Menu",
      href: "/menu"
    },
    {
      icon: Package,
      label: "More",
      href: "/settings"
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50 md:hidden safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 rounded-lg active:scale-95 no-tap-highlight touch-target",
                isActive 
                  ? "text-primary font-semibold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6 mb-1", isActive && "animate-scale-in")} />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
