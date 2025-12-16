import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  UserPlus,
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
  ChefHat,
  Globe,
  Shield,
  LogOut,
  Zap,
  ChevronLeft,
  Menu,
  BookOpen,
  Target,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavigationItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  description?: string;
  requiredPermissions?: Permission[];
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Overview",
        icon: LayoutDashboard,
        href: "/",
        description: "Main dashboard and analytics",
        requiredPermissions: ["dashboard.view"]
      }
    ]
  },
  {
    title: "Operations",
    items: [
      {
        title: "POS",
        icon: ShoppingCart,
        href: "/pos",
        description: "Point of Sale system",
        requiredPermissions: ["orders.view"]
      },
      {
        title: "Orders",
        icon: ShoppingCart,
        href: "/orders",
        description: "View & manage orders",
        requiredPermissions: ["orders.view"]
      },
      // {
      //   title: "QSR POS",
      //   icon: Zap,
      //   href: "/qsr-pos",
      //   description: "Quick service restaurant POS",
      //   requiredPermissions: ["orders.view"]
      // },
      {
        title: "Kitchen",
        icon: ChefHat,
        href: "/kitchen",
        description: "Kitchen display system",
        requiredPermissions: ["kitchen.view"]
      },
      {
        title: "Recipes",
        icon: BookOpen,
        href: "/recipes",
        description: "Recipe & costing management",
        requiredPermissions: ["menu.view"]
      },
      {
        title: "Menu",
        icon: MenuIcon,
        href: "/menu",
        description: "Menu management",
        requiredPermissions: ["menu.view"]
      },
      {
        title: "Tables",
        icon: MapPin,
        href: "/tables",
        description: "Table management",
        requiredPermissions: ["tables.view"]
      },
      {
        title: "Inventory",
        icon: Package,
        href: "/inventory",
        description: "Stock management",
        requiredPermissions: ["inventory.view"]
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
        description: "Room management",
        requiredPermissions: ["rooms.view"]
      },
      {
        title: "Reservations",
        icon: Calendar,
        href: "/reservations",
        description: "Booking management",
        requiredPermissions: ["reservations.view"]
      },
      {
        title: "Housekeeping",
        icon: Sparkles,
        href: "/housekeeping",
        description: "Cleaning & maintenance",
        requiredPermissions: ["housekeeping.view"]
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
        description: "Employee management",
        requiredPermissions: ["staff.view"]
      },
      {
        title: "Customers",
        icon: Users,
        href: "/customers",
        description: "Customer database",
        requiredPermissions: ["customers.view"]
      },
      // {
      //   title: "CRM",
      //   icon: MessageSquare,
      //   href: "/crm",
      //   description: "Customer relationship",
      //   requiredPermissions: ["customers.view"]
      // },
      {
        title: "Marketing",
        icon: Target,
        href: "/marketing",
        description: "Campaigns & promotions",
        requiredPermissions: ["customers.view"]
      },
      {
        title: "User Management",
        icon: UserPlus,
        href: "/user-management",
        description: "Manage user accounts & roles",
        requiredPermissions: ["users.manage"]
      },
      {
        title: "Role Management",
        icon: Shield,
        href: "/role-management",
        description: "Configure roles & permissions",
        requiredPermissions: ["users.manage"]
      },
      {
        title: "Channel Management",
        icon: Globe,
        href: "/channel-management",
        description: "OTA & booking channels",
        requiredPermissions: ["analytics.view"] // Channel management requires analytics access
      },
      {
        title: "Analytics",
        icon: TrendingUp,
        href: "/analytics",
        description: "Business insights",
        requiredPermissions: ["analytics.view"]
      },
      {
        title: "Financial",
        icon: DollarSign,
        href: "/financial",
        description: "Financial reports",
        requiredPermissions: ["financial.view"]
      },
      {
        title: "Reports",
        icon: FileText,
        href: "/reports",
        description: "Business reports",
        requiredPermissions: ["analytics.view"]
      }
    ]
  }
];

// Standalone items outside of groups
const standaloneItems: NavigationItem[] = [
  {
    title: "AI Assistant",
    icon: MessageSquare,
    href: "/ai",
    description: "AI-powered help",
    requiredPermissions: ["dashboard.view"] // Requires dashboard access
  },
  {
    title: "Security",
    icon: Shield,
    href: "/security",
    description: "Security & compliance",
    requiredPermissions: ["audit.view"]
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    description: "System configuration",
    requiredPermissions: ["settings.view"] // Requires settings permission
  }
];

interface ImprovedSidebarNavigationProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

export const ImprovedSidebarNavigation = ({ 
  isSidebarCollapsed, 
  setIsSidebarCollapsed 
}: ImprovedSidebarNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasAnyPermission } = useAuth();
  const { toast } = useToast();
  const { restaurantName } = useRestaurantId();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Dashboard', 'Operations']));

  // Dynamic sidebar title - use restaurant name if available
  const sidebarTitle = restaurantName || "Swadeshi Solutions RMS";

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

  // Check if user has permission to access this navigation item
  const hasPermissionForItem = (item: NavigationItem): boolean => {
    if (!user) return false;
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
    return hasAnyPermission(item.requiredPermissions);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full transition-all duration-300",
      isSidebarCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible w-64"
    )}>
      {/* Header Section */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 truncate cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <span className="font-bold text-white text-lg truncate" title={sidebarTitle}>{sidebarTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="mini" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="text-white hover:bg-white/10 w-8 h-8 rounded-lg shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-2 py-2">
          {navigationGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.title);
            const visibleItems = group.items.filter(hasPermissionForItem);
            
            // Don't show groups with no visible items
            if (visibleItems.length === 0) return null;
            
            return (
              <div key={group.title} className="space-y-1">
                {group.title !== "Dashboard" && (
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-2 py-1 h-8 text-white/80 hover:text-white hover:bg-white/10 truncate"
                    onClick={() => toggleGroup(group.title)}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide truncate">
                      {group.title}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 shrink-0 ml-2" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 ml-2" />
                    )}
                  </Button>
                )}
                
                {(isExpanded || group.title === "Dashboard") && (
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
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
          
          {/* Standalone items outside of groups */}
          <div className="pt-4 border-t border-white/10 mt-4">
            <div className="space-y-1">
              {standaloneItems.filter(hasPermissionForItem).map((item) => {
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
          </div>
        </nav>
      </ScrollArea>
      
      {/* Footer with user info and logout */}
      <div className="px-3 py-2 border-t border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sidebar-purple font-medium">
            {user?.first_name ? user.first_name.charAt(0) : user?.email?.charAt(0) || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">
              {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-xs text-white/70 truncate">
              {user?.role_name_text || (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Staff Member")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Sign Out"
            className="text-white hover:bg-white/10 w-8 h-8"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center">
          <span className="text-xs text-white/60">© {new Date().getFullYear()} Restaurant Pro</span>
        </div>
      </div>
    </div>
  );
};
