import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  ArrowLeft,
  ChevronRight,
  Settings,
  BarChart3,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/platform",
    icon: LayoutDashboard,
    description: "Overview & metrics",
  },
  {
    title: "Restaurants",
    href: "/platform/restaurants",
    icon: Building2,
    description: "Manage all restaurants",
  },
  {
    title: "Subscriptions",
    href: "/platform/subscriptions",
    icon: CreditCard,
    description: "Plans & billing",
  },
  {
    title: "All Users",
    href: "/platform/users",
    icon: Users,
    description: "Platform users",
  },
  {
    title: "Analytics",
    href: "/platform/analytics",
    icon: BarChart3,
    description: "Platform analytics",
  },
];

const PlatformLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === "/platform") {
      return location.pathname === "/platform";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Platform Admin
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage restaurants & subscriptions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span>Logged in as</span>
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {user?.first_name || user?.email}
            </span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-73px)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
          <ScrollArea className="h-full py-4">
            <nav className="px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left",
                      active
                        ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        active ? "text-purple-600 dark:text-purple-400" : ""
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block">{item.title}</span>
                      {item.description && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 block truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                    {active && (
                      <ChevronRight className="h-4 w-4 text-purple-400" />
                    )}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
