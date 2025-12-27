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
    <div className="min-h-screen bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-indigo-100 via-slate-100 to-purple-100 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 transition-colors duration-500">
      {/* Background Blobs for Depth */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/10 shadow-lg shadow-slate-200/20 dark:shadow-slate-900/50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-5">
            <Button
              onClick={() => navigate("/")}
              className="gap-2 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 rounded-full px-5 py-2 h-auto font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Platform Admin
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage restaurants & subscriptions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 backdrop-blur-md px-4 py-2 rounded-full border border-violet-200/50 dark:border-violet-500/20 shadow-inner">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30">
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                Logged in as
              </span>
              <span className="font-semibold text-sm text-slate-800 dark:text-white">
                {user?.first_name || user?.email?.split("@")[0] || "Admin"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative z-10 p-4 gap-4 h-[calc(100vh-73px)]">
        {/* Floating Glass Sidebar */}
        <aside className="w-64 h-full bg-gradient-to-b from-white/70 to-white/50 dark:from-slate-900/70 dark:to-slate-900/50 backdrop-blur-xl border border-violet-200/30 dark:border-violet-500/10 rounded-2xl shadow-xl shadow-violet-500/5 flex flex-col overflow-hidden transition-all duration-300">
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-2">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                // Color schemes for each nav item
                const colors = [
                  {
                    bg: "from-violet-500 to-purple-600",
                    light: "violet",
                    shadow: "violet",
                  },
                  {
                    bg: "from-emerald-500 to-teal-600",
                    light: "emerald",
                    shadow: "emerald",
                  },
                  {
                    bg: "from-amber-500 to-orange-600",
                    light: "amber",
                    shadow: "amber",
                  },
                  {
                    bg: "from-blue-500 to-indigo-600",
                    light: "blue",
                    shadow: "blue",
                  },
                  {
                    bg: "from-pink-500 to-rose-600",
                    light: "pink",
                    shadow: "pink",
                  },
                ];
                const color = colors[index % colors.length];

                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group relative overflow-hidden",
                      active
                        ? `bg-gradient-to-r ${color.bg} text-white shadow-lg shadow-${color.shadow}-500/30 transform scale-[1.02]`
                        : "text-slate-600 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white hover:shadow-md hover:-translate-y-0.5"
                    )}
                  >
                    {active && (
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                    )}
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-all duration-300 relative z-10",
                        active
                          ? "bg-white/20 text-white"
                          : `bg-${color.light}-100 dark:bg-${color.light}-500/20 text-${color.light}-600 dark:text-${color.light}-400 group-hover:scale-110`
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 transition-transform duration-300 group-hover:translate-x-1 relative z-10">
                      <span className="font-semibold block text-sm">
                        {item.title}
                      </span>
                      {item.description && (
                        <span
                          className={cn(
                            "text-xs block mt-0.5",
                            active ? "text-white/70" : "text-slate-400"
                          )}
                        >
                          {item.description}
                        </span>
                      )}
                    </div>
                    {active && (
                      <ChevronRight className="h-4 w-4 text-white/80 relative z-10" />
                    )}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="p-4 border-t border-white/20 dark:border-white/10 bg-white/30 dark:bg-slate-800/30 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group cursor-pointer hover:shadow-indigo-500/40 transition-all duration-300">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <LayoutDashboard className="h-12 w-12" />
              </div>
              <h3 className="font-semibold text-sm relative z-10">
                Premium Admin
              </h3>
              <p className="text-xs text-indigo-100 mt-1 relative z-10 opacity-80">
                v2.0 dashboard active
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/30 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="h-full overflow-y-auto p-6 scrollbar-hide">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PlatformLayout;
