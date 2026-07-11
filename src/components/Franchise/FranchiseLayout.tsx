import React, { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FranchiseBranchSwitcher } from "./FranchiseBranchSwitcher";
import { useFranchise } from "@/contexts/FranchiseContext";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Store,
  Users,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  UserCheck,
  TrendingUp,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  ArrowLeft,
  Building2,
  AlertTriangle,
  Award,
  Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

// ─── Nav items for franchise sidebar ────────────────────────
const franchiseNavItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/franchise",
    description: "Cross-branch overview",
  },
  {
    title: "Branches",
    icon: Store,
    href: "/franchise/branches",
    description: "Manage all locations",
  },
  {
    title: "Team",
    icon: Users,
    href: "/franchise/team",
    description: "Org roles & access",
  },
  {
    title: "Menu Sync",
    icon: UtensilsCrossed,
    href: "/franchise/menu-sync",
    description: "Master menu editor",
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: "/franchise/orders",
    description: "All branch orders",
  },
  {
    title: "Inventory",
    icon: Package,
    href: "/franchise/inventory",
    description: "Stock across branches",
  },
  {
    title: "Staff",
    icon: UserCheck,
    href: "/franchise/staff",
    description: "Staff overview",
  },
  {
    title: "P&L Report",
    icon: TrendingUp,
    href: "/franchise/pnl",
    description: "Revenue & profit",
  },
  {
    title: "Customers & Loyalty",
    icon: Award,
    href: "/franchise/customers",
    description: "Shared profiles & loyalty",
  },
  {
    title: "Approvals",
    icon: Bell,
    href: "/franchise/approvals",
    description: "BM requests & limits",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/franchise/settings",
    description: "Org configuration",
  },
];

// ─── Layout ──────────────────────────────────────────────────
export const FranchiseLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { org, demoMode, setDemoMode, isLoading } = useFranchise();
  const { user } = useAuth();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);

  // Display name for the logged-in user (not the org owner)
  const currentUserName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email?.split("@")[0] || "User"
    : "User";
  const currentUserRole = user?.role_name_text || user?.role || "Franchise Member";

  const isActive = (href: string) => {
    if (href === "/franchise") return location.pathname === "/franchise";
    return location.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({ title: "Signed out" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ─── Desktop Sidebar ─── */}
      <aside
        className={cn(
          "hidden md:flex flex-col transition-all duration-300 ease-in-out",
          "bg-gradient-to-b from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          {!collapsed && (
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => navigate("/franchise")}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm truncate max-w-[140px]">
                  {org.name}
                </p>
                <p className="text-white/50 text-xs">Franchise Portal</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-white hover:bg-white/10 w-8 h-8 shrink-0"
          >
            {collapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Branch Switcher */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-white/10 shrink-0">
            <FranchiseBranchSwitcher />
          </div>
        )}

        {/* Demo Mode Switch (Desktop Sidebar) */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-white/10 bg-slate-950/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className={cn(
                  "text-xs font-bold",
                  demoMode ? "text-amber-400" : "text-slate-400"
                )}>
                  {demoMode ? "🎭 Demo Mode" : "🔴 Live Mode"}
                </span>
                <span className="text-[9px] text-white/40 truncate">
                  {demoMode ? "Sample data loaded" : "Real DB queries"}
                </span>
              </div>
              <Switch
                checked={demoMode}
                onCheckedChange={setDemoMode}
                className={demoMode ? "data-[state=checked]:bg-amber-500" : ""}
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <ScrollArea className="flex-1 px-2 py-2">
          <nav className="space-y-1">
            {franchiseNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  title={collapsed ? item.title : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg transition-all duration-200 group",
                    collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2",
                    active
                      ? "bg-white text-slate-900 font-medium shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="relative">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-violet-600" : "text-white/70 group-hover:text-white"
                      )}
                    />
                    {item.title === "Approvals" && collapsed && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
                    )}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium block truncate">{item.title}</span>
                        {item.title === "Approvals" && (
                          <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                            2
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <span
                          className={cn(
                            "text-xs truncate block",
                            active ? "text-violet-500" : "text-white/40"
                          )}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/10 space-y-2 shrink-0">
          {!collapsed && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-white/60 hover:text-white hover:bg-white/10 text-xs px-2 h-8"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-3 w-3" />
              Switch to Branch View
            </Button>
          )}
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {currentUserName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate max-w-[100px]">
                    {currentUserName}
                  </p>
                  <p className="text-white/40 text-[10px] capitalize">{currentUserRole}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1">
              <ThemeToggle variant="mini" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-white/60 hover:text-white hover:bg-white/10 w-7 h-7"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">{org.name}</span>
          </div>
          <FranchiseBranchSwitcher compact />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
          {/* Demo Mode Alert Banner */}
          {demoMode && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/30 px-4 py-2.5 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <span className="font-bold">Demo Mode Active</span> — Showing rich mockup metrics for presentation. Toggle off to connect live tables.
              </p>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Loading live organization data...</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>

        {/* Mobile bottom nav for franchise */}
        <FranchiseMobileNav />
      </div>
    </div>
  );
};

// ─── Mobile Bottom Nav (Franchise) ──────────────────────────
const mobilePrimaryItems = [
  { href: "/franchise", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/franchise/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/franchise/pnl", icon: TrendingUp, label: "P&L" },
  { href: "/franchise/branches", icon: Store, label: "Branches" },
];

const FranchiseMobileNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = (href: string) => {
    if (href === "/franchise") return location.pathname === "/franchise";
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-slate-700 px-2 py-2 pb-[env(safe-area-inset-bottom,8px)] z-50">
        <div className="flex items-center justify-around">
          {mobilePrimaryItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <button
                key={href}
                onClick={() => navigate(href)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all",
                  active ? "scale-105" : "hover:scale-105"
                )}
              >
                <div
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    active
                      ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30"
                      : "bg-gray-100 dark:bg-slate-700"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      active ? "text-white" : "text-gray-500 dark:text-gray-400"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    active ? "text-violet-600 dark:text-violet-400" : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl hover:scale-105 transition-all"
          >
            <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-700">
              <Menu className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">More</span>
          </button>
        </div>
      </div>

      {/* Mobile more overlay */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl pb-[env(safe-area-inset-bottom,16px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-t-3xl">
              <p className="text-white font-bold text-lg">Franchise Menu</p>
              <p className="text-white/60 text-sm">All sections</p>
            </div>
            <div className="grid grid-cols-4 gap-3 p-4">
              {franchiseNavItems.map(({ href, icon: Icon, title }) => {
                const active = isActive(href);
                return (
                  <button
                    key={href}
                    onClick={() => { navigate(href); setShowMore(false); }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm transition-all",
                      active ? "ring-2 ring-violet-500 shadow-lg scale-105" : "hover:scale-105"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-2xl bg-gradient-to-br",
                      active
                        ? "from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30"
                        : "from-slate-700 to-slate-800"
                    )}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 text-center leading-tight">
                      {title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Back to branch view */}
            <div className="px-4 pb-4">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { navigate("/"); setShowMore(false); }}
              >
                <ArrowLeft className="h-4 w-4" />
                Switch to Branch View
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
