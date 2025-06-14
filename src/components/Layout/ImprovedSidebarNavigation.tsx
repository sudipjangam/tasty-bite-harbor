
import React, { useState } from "react";
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
  ChevronDown,
  ChevronRight,
  Sparkles,
  DollarSign,
  ChefHat
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavigationGroup {
  title: string;
  items: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    description?: string;
  }[];
}

const navigationGroups: NavigationGroup[] = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Overview",
        icon: LayoutDashboard,
        href: "/",
        description: "Main dashboard and analytics"
      }
    ]
  },
  {
    title: "Operations",
    items: [
      {
        title: "Orders",
        icon: ShoppingCart,
        href: "/orders",
        description: "Manage customer orders"
      },
      {
        title: "Kitchen",
        icon: ChefHat,
        href: "/kitchen",
        description: "Kitchen display system"
      },
      {
        title: "Menu",
        icon: MenuIcon,
        href: "/menu",
        description: "Menu management"
      },
      {
        title: "Tables",
        icon: MapPin,
        href: "/tables",
        description: "Table management"
      },
      {
        title: "Inventory",
        icon: Package,
        href: "/inventory",
        description: "Stock management"
      }
    ]
  },
  {
    title: "Guest Services",
    items: [
      {
        title: "Rooms",
        icon: Bed,
        href: "/rooms",
        description: "Room management"
      },
      {
        title: "Reservations",
        icon: Calendar,
        href: "/reservations",
        description: "Booking management"
      },
      {
        title: "Housekeeping",
        icon: Sparkles,
        href: "/housekeeping",
        description: "Cleaning & maintenance"
      }
    ]
  },
  {
    title: "Management",
    items: [
      {
        title: "Staff",
        icon: UserCheck,
        href: "/staff",
        description: "Employee management"
      },
      {
        title: "Customers",
        icon: Users,
        href: "/customers",
        description: "Customer database"
      },
      {
        title: "Analytics",
        icon: TrendingUp,
        href: "/analytics",
        description: "Business insights"
      },
      {
        title: "Financial",
        icon: DollarSign,
        href: "/financial",
        description: "Financial reports"
      }
    ]
  },
  {
    title: "Tools",
    items: [
      {
        title: "AI Assistant",
        icon: MessageSquare,
        href: "/ai",
        description: "AI-powered help"
      },
      {
        title: "Settings",
        icon: Settings,
        href: "/settings",
        description: "System configuration"
      }
    ]
  }
];

export const ImprovedSidebarNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Dashboard', 'Operations']));

  const toggleGroup = (groupTitle: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="space-y-2 px-3">
      {navigationGroups.map((group) => {
        const isExpanded = expandedGroups.has(group.title);
        
        return (
          <div key={group.title} className="space-y-1">
            {group.title !== "Dashboard" && (
              <Button
                variant="ghost"
                className="w-full justify-between px-2 py-1 h-8 text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => toggleGroup(group.title)}
              >
                <span className="text-xs font-medium uppercase tracking-wide">
                  {group.title}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            
            {(isExpanded || group.title === "Dashboard") && (
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-all duration-200 group",
                        active
                          ? "bg-white text-sidebar-purple font-medium shadow-sm"
                          : "text-white hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 transition-colors",
                        active ? "text-sidebar-purple" : "text-white/80 group-hover:text-white"
                      )} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {item.title}
                        </span>
                        {item.description && (
                          <span className={cn(
                            "text-xs truncate block",
                            active ? "text-sidebar-purple/70" : "text-white/60"
                          )}>
                            {item.description}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};
