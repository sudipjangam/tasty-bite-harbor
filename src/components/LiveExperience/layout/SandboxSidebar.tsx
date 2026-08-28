import React, { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Zap,
  Store,
  Globe,
  Network,
  ChefHat,
  Tv,
  BookOpen,
  Menu as MenuIcon,
  MapPin,
  Package,
  TrendingUp,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSandbox, SandboxTab } from "../context/SandboxContext";
import { Badge } from "@/components/ui/badge";

interface NavigationItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: SandboxTab;
  description?: string;
  badge?: string;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

export const SandboxSidebar: React.FC = () => {
  const { activeTab, setActiveTab, orders } = useSandbox();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      Dashboard: true,
      Operations: true,
      Management: true,
    },
  );
  const [isDarkMode, setIsDarkMode] = useState(false);

  const activeOrdersCount = orders.filter((o) => o.status !== "SERVED").length;
  const kitchenCount = orders.filter(
    (o) => o.status === "NEW" || o.status === "COOKING",
  ).length;

  const navigationGroups: NavigationGroup[] = [
    {
      title: "Dashboard",
      items: [
        {
          title: "Overview",
          icon: LayoutDashboard,
          tab: "overview",
          description: "Main dashboard and analytics",
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          title: "Orders",
          icon: ShoppingCart,
          tab: "orders",
          description: "View & manage orders",
          badge: activeOrdersCount > 0 ? `${activeOrdersCount}` : undefined,
        },
        {
          title: "QSR POS",
          icon: Zap,
          tab: "qsr-pos",
          description: "Restaurant & Table POS",
        },
        {
          title: "QuickServe POS",
          icon: Store,
          tab: "quickserve-pos",
          description: "Counter & takeaway POS",
        },
        {
          title: "Online Delivery",
          icon: Globe,
          tab: "aggregators",
          description: "Swiggy, Zomato & magicpin",
          badge: "Live",
        },
        {
          title: "Digital Twin",
          icon: Network,
          tab: "digital-twin",
          description: "Interactive outlet blueprint",
        },
        {
          title: "Kitchen",
          icon: ChefHat,
          tab: "kitchen",
          description: "Kitchen display system",
          badge: kitchenCount > 0 ? `${kitchenCount}` : undefined,
        },
        {
          title: "Kitchen TV",
          icon: Tv,
          tab: "kitchen-tv",
          description: "HDMI TV Display Screen",
        },
        {
          title: "Recipes",
          icon: BookOpen,
          tab: "recipes",
          description: "Recipe & costing management",
        },
        {
          title: "Menu",
          icon: MenuIcon,
          tab: "menu",
          description: "Menu management",
        },
        {
          title: "Tables",
          icon: MapPin,
          tab: "tables",
          description: "Table management",
        },
        {
          title: "Inventory",
          icon: Package,
          tab: "inventory",
          description: "Stock management",
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          title: "Analytics",
          icon: TrendingUp,
          tab: "analytics",
          description: "Business insights",
        },
        {
          title: "Staff",
          icon: Users,
          tab: "staff",
          description: "Staff & shift controls",
        },
        {
          title: "Settings",
          icon: Settings,
          tab: "settings",
          description: "Integrations & preferences",
        },
      ],
    },
  ];

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const handleTabClick = (tab: SandboxTab) => {
    setActiveTab(tab);
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-[#0f172a] text-slate-100 border-r border-slate-800 transition-all duration-300 z-30 shrink-0 select-none",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/20 font-bold text-white text-base">
              K
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-none">
                Kiwi
              </span>
              <span className="text-[10px] font-medium text-amber-400 tracking-wide uppercase">
                RMS Operations
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-white text-base mx-auto">
            K
          </div>
        )}

        {!isCollapsed && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {isCollapsed && (
        <div className="p-2 border-b border-slate-800 flex justify-center">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-3 py-4 space-y-4">
        {navigationGroups.map((group) => {
          const isExpanded = expandedGroups[group.title] ?? true;

          return (
            <div key={group.title} className="mb-4">
              {!isCollapsed && (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2 py-1.5 mb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                >
                  <span>{group.title}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              )}

              {(isCollapsed || isExpanded) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.tab;

                    return (
                      <button
                        key={item.title}
                        onClick={() => handleTabClick(item.tab)}
                        title={isCollapsed ? item.title : undefined}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left group relative",
                          isActive
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                            isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-slate-200",
                          )}
                        />

                        {!isCollapsed && (
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div className="truncate">
                              <p className="truncate font-semibold leading-tight">
                                {item.title}
                              </p>
                              {item.description && !isActive && (
                                <p className="text-[11px] text-slate-400 truncate mt-0.5 opacity-90">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            {item.badge && (
                              <Badge
                                className={cn(
                                  "ml-2 text-[10px] px-1.5 py-0 h-4 border-0 font-bold",
                                  item.badge === "Live"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-orange-500 text-white",
                                )}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </ScrollArea>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 bg-[#0f172a]/95">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors",
            isCollapsed ? "justify-center" : "",
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md">
            S
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                Test User
              </p>
              <p className="text-[10px] text-slate-400 truncate">Manager</p>
            </div>
          )}

          {!isCollapsed && (
            <LogOut className="h-4 w-4 text-slate-400 hover:text-red-400 transition-colors cursor-pointer" />
          )}
        </div>

        {!isCollapsed && (
          <div className="mt-2.5 px-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>© 2026 Swadeshi Solutions</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-indigo-300 font-bold border border-slate-700">
              v1.0.97
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
