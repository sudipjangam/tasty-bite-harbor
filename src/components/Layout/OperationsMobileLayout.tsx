import React, { useState, Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  ClipboardList,
  ChefHat,
  Package,
  Settings,
  Printer,
  Grid3x3,
  X,
  ChevronRight,
  Wifi,
  WifiOff,
  LayoutDashboard,
  UtensilsCrossed,
  LogOut,
  Users,
  Bed,
  CalendarDays,
  Sparkles,
  BarChart3,
  Receipt,
  UserCheck,
  Clock,
  DollarSign,
  Bot,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/page-loader";
import { PermissionGuard } from "@/components/Auth/PermissionGuard";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { BiometricLock } from "@/components/Auth/BiometricLock";
import {
  getBiometricEnabled,
  markBackgrounded,
  shouldLockOnResume,
} from "@/hooks/useBiometricAuth";
import { App } from "@capacitor/app";
import { BiometricPromptDialog } from "@/components/Auth/BiometricPromptDialog";
import { useAuth } from "@/hooks/useAuth";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

// ─── Lazy-loaded operations & management pages ──────────────────────────────
const QSRPos             = lazy(() => import("@/pages/QSRPos"));
const QuickServePOS      = lazy(() => import("@/pages/QuickServePOS"));
const POS                = lazy(() => import("@/pages/POS"));
const Orders             = lazy(() => import("@/pages/Orders"));
const Kitchen            = lazy(() => import("@/pages/Kitchen"));
const MenuPage           = lazy(() => import("@/pages/Menu"));
const Inventory          = lazy(() => import("@/pages/Inventory"));
const Settings_          = lazy(() => import("@/pages/Settings"));
const RoleBasedDashboard = lazy(() => import("@/components/Dashboard/RoleBasedDashboard"));
const Tables             = lazy(() => import("@/pages/Tables"));
const Rooms              = lazy(() => import("@/pages/Rooms"));
const Housekeeping       = lazy(() => import("@/pages/Housekeeping"));
const Reservations       = lazy(() => import("@/pages/Reservations"));
const Staff              = lazy(() => import("@/pages/Staff"));
const ShiftManagement    = lazy(() => import("@/pages/ShiftManagement"));
const Expenses           = lazy(() => import("@/pages/Expenses"));
const Reports            = lazy(() => import("@/pages/Reports"));
const Analytics          = lazy(() => import("@/pages/Analytics"));
const Customers          = lazy(() => import("@/pages/Customers"));
const CRM                = lazy(() => import("@/pages/CRM"));
const Marketing          = lazy(() => import("@/pages/Marketing"));
const NCOrders           = lazy(() => import("@/pages/NCOrders"));
const AI                 = lazy(() => import("@/pages/AI"));
const DigitalTwin        = lazy(() => import("@/pages/DigitalTwin"));

const PrinterSettings = lazy(() =>
  import("@/components/Settings/PrinterSettings").then((m) => ({
    default: m.PrinterSettings,
  }))
);

const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

// ─── Smart POS Redirect ───────────────────────────────────────────────────────
const SmartPOSRedirect: React.FC = () => {
  const { hasSubscriptionAccess } = useSubscriptionAccess();
  const hasQuickServe = hasSubscriptionAccess("quickserve");
  return <Navigate to={hasQuickServe ? "/quickserve-pos" : "/qsr-pos"} replace />;
};

// ─── POS tab active paths ─────────────────────────────────────────────────────
const POS_PATHS = new Set(["/pos-entry", "/qsr-pos", "/quickserve-pos", "/pos"]);

// ─── Bottom Nav config ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "POS",       icon: ShoppingCart,   path: "/pos-entry" },
  { label: "Orders",    icon: ClipboardList,  path: "/orders" },
  { label: "Kitchen",   icon: ChefHat,        path: "/kitchen" },
  { label: "More",      icon: Grid3x3,        path: "__more__" },
] as const;

// ─── More drawer items ───────────────────────────────────────────────────────
type MoreItem = {
  label: string;
  icon: any;
  path?: string;
  category?: string;
  action?: "logout";
};

const MORE_ITEMS: MoreItem[] = [
  // Operations & Menu
  { label: "Tables & Floor", icon: Layers,          path: "/tables",          category: "Operations" },
  { label: "Menu Catalog",   icon: UtensilsCrossed, path: "/menu",            category: "Operations" },
  { label: "Inventory",      icon: Package,         path: "/inventory",       category: "Operations" },
  { label: "Reservations",   icon: CalendarDays,    path: "/reservations",    category: "Operations" },
  { label: "Rooms & Hotel",  icon: Bed,             path: "/rooms",           category: "Operations" },
  { label: "Housekeeping",   icon: Sparkles,        path: "/housekeeping",    category: "Operations" },

  // Management & Finance
  { label: "Staff Directory",icon: Users,           path: "/staff",           category: "Management" },
  { label: "Shifts & Clock", icon: Clock,           path: "/shift-management",category: "Management" },
  { label: "Expenses",       icon: DollarSign,      path: "/expenses",        category: "Management" },
  { label: "Reports",        icon: Receipt,         path: "/reports",         category: "Management" },
  { label: "Analytics",      icon: BarChart3,       path: "/analytics",       category: "Management" },
  { label: "Customers / CRM",icon: UserCheck,       path: "/customers",       category: "Management" },

  // System & Tools
  { label: "AI Assistant",   icon: Bot,             path: "/ai",              category: "System" },
  { label: "Printer Setup",  icon: Printer,         path: "/printer-settings",category: "System" },
  { label: "Settings",       icon: Settings,        path: "/settings",        category: "System" },
  { label: "Logout",         icon: LogOut,          action: "logout",         category: "System" },
];

// ─── Printer status indicator ────────────────────────────────────────────────
const PrinterStatusDot = () => {
  const [connected] = React.useState(() => {
    return (
      !!localStorage.getItem("thermal_printer_device_id") ||
      !!localStorage.getItem("native_printer_connected")
    );
  });

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full skeuo-inset text-xs font-semibold">
      {connected ? (
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
      ) : (
        <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
      )}
      <span className={connected ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-rose-700 dark:text-rose-400 font-bold"}>
        {connected ? "Printer Ready" : "No Printer"}
      </span>
    </div>
  );
};

// ─── Top Header (Skeuomorphic) ────────────────────────────────────────────────
const MobileHeader = ({ title }: { title: string }) => (
  <div className="flex items-center justify-between px-5 py-3.5 bg-[#ebf0f7] dark:bg-[#151824] border-b border-white/50 dark:border-white/5 shadow-sm shrink-0 select-none">
    <div className="flex items-center gap-2.5">
      <img src="/swadeshi-logo2.png" alt="Swadeshi" className="h-7 w-7 object-contain drop-shadow-sm" />
      <h1 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{title}</h1>
    </div>
    <PrinterStatusDot />
  </div>
);

// ─── More Drawer (Skeuomorphic 3D Tiles) ──────────────────────────────────────
const MoreDrawer = ({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) => {
  const { signOut } = useAuth();
  if (!open) return null;

  const categories = ["Operations", "Management", "System"];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      
      {/* Sheet */}
      <div className="relative bg-[#ebf0f7] dark:bg-[#141722] rounded-t-[2.5rem] pb-safe z-10 max-h-[85vh] flex flex-col overflow-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.2)] border-t border-white/80 dark:border-white/10">
        
        {/* Header with pill handle */}
        <div className="flex flex-col items-center pt-3 pb-2 px-6 border-b border-gray-200/50 dark:border-gray-800">
          <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mb-3" />
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl skeuo-circle">
                <Grid3x3 className="h-4 w-4 text-[#2E3192]" />
              </div>
              <span className="font-black text-gray-900 dark:text-white text-lg tracking-tight">Modules & Management</span>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full skeuo-btn flex items-center justify-center text-gray-500 hover:text-gray-900 active:scale-95 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {categories.map((cat) => {
            const items = MORE_ITEMS.filter((i) => i.category === cat);
            return (
              <div key={cat} className="space-y-2.5">
                <div className="text-[11px] font-black text-[#2E3192] dark:text-indigo-400 tracking-wider uppercase px-1">
                  {cat}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {items.map((item) => (
                    <button
                      key={item.label}
                      onClick={async () => {
                        if (item.action === "logout") {
                          await signOut();
                        } else if (item.path) {
                          onNavigate(item.path);
                        }
                        onClose();
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-3.5 rounded-2xl skeuo-btn gap-2 text-center touch-manipulation select-none transition-all",
                        item.action === "logout" && "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      <div className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl skeuo-inset",
                        item.action === "logout" && "text-rose-600 dark:text-rose-400"
                      )}>
                        <item.icon className={cn(
                          "h-5 w-5 text-[#2E3192] dark:text-indigo-400",
                          item.action === "logout" && "text-rose-600 dark:text-rose-400"
                        )} />
                      </div>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight line-clamp-1">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Safe area spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
};

// ─── Bottom Tab Bar (Skeuomorphic Dock) ──────────────────────────────────────
const BottomTabBar = ({ onMoreOpen }: { onMoreOpen: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="shrink-0 px-3 py-2 bg-[#ebf0f7] dark:bg-[#141722] safe-area-pb select-none border-t border-white/60 dark:border-white/5">
      <div className="flex items-center justify-around h-16 px-2 rounded-2xl skeuo-inset">
        {NAV_ITEMS.map((item) => {
          const isMore = item.path === "__more__";
          const isActive =
            !isMore &&
            (item.path === "/pos-entry"
              ? POS_PATHS.has(location.pathname)
              : location.pathname === item.path);

          return (
            <button
              key={item.label}
              onClick={() => {
                if (isMore) {
                  onMoreOpen();
                } else {
                  navigate(item.path);
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all touch-manipulation relative px-3 py-1.5 rounded-xl",
                isActive
                  ? "skeuo-btn text-[#2E3192] dark:text-white font-bold scale-105"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <div className={cn(
                "flex items-center justify-center transition-transform",
                isActive && "text-[#2E3192] dark:text-indigo-400"
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Route title lookup ───────────────────────────────────────────────────────
const ROUTE_TITLES: Record<string, string> = {
  "/":                 "Dashboard",
  "/dashboard":        "Dashboard",
  "/pos-entry":        "POS",
  "/qsr-pos":          "QSR POS",
  "/quickserve-pos":   "Quick Serve POS",
  "/pos":              "Table POS",
  "/orders":           "Orders",
  "/kitchen":          "Kitchen KDS",
  "/menu":             "Menu Catalog",
  "/inventory":        "Inventory",
  "/tables":           "Tables & Floor Plan",
  "/rooms":            "Rooms & Stays",
  "/housekeeping":     "Housekeeping",
  "/reservations":     "Reservations",
  "/staff":            "Staff Directory",
  "/shift-management": "Shifts & Time Clock",
  "/expenses":         "Expenses",
  "/reports":          "Reports",
  "/analytics":        "Analytics",
  "/customers":        "Customers",
  "/crm":              "CRM",
  "/marketing":        "Marketing",
  "/nc-orders":        "NC Orders",
  "/ai":               "AI Assistant",
  "/digital-twin":     "Digital Twin",
  "/settings":         "Settings",
  "/printer-settings": "Printer Setup",
};

// ─── Main Operations Mobile Layout ──────────────────────────────────────────
export const OperationsMobileLayout = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [locked, setLocked] = useState(() => getBiometricEnabled());
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const title = ROUTE_TITLES[location.pathname] ?? "Operations";

  // Check if current route is an interactive operational view (disable pull-to-refresh)
  const isInteractiveScreen =
    location.pathname === "/pos" ||
    location.pathname === "/qsr-pos" ||
    location.pathname === "/quickserve-pos" ||
    location.pathname === "/pos-entry" ||
    location.pathname === "/kitchen";

  // Re-lock when app returns from background after threshold
  useEffect(() => {
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        markBackgrounded();
      } else {
        if (getBiometricEnabled() && shouldLockOnResume()) {
          setLocked(true);
        }
      }
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  if (locked) {
    return <BiometricLock onUnlocked={() => setLocked(false)} />;
  }

  const routesElement = (
    <Routes>
      {/* Dashboard */}
      <Route path="/" element={<LazyRoute><RoleBasedDashboard /></LazyRoute>} />
      <Route path="/dashboard" element={<LazyRoute><RoleBasedDashboard /></LazyRoute>} />

      {/* POS Routes */}
      <Route
        path="/pos-entry"
        element={
          <PermissionGuard permission="orders.view">
            <SmartPOSRedirect />
          </PermissionGuard>
        }
      />
      <Route
        path="/qsr-pos"
        element={
          <PermissionGuard permission="orders.view">
            <LazyRoute><QSRPos /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/quickserve-pos"
        element={
          <PermissionGuard permission="orders.view">
            <LazyRoute><QuickServePOS /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/pos"
        element={
          <PermissionGuard permission="orders.view">
            <LazyRoute><POS /></LazyRoute>
          </PermissionGuard>
        }
      />

      {/* Orders & Kitchen */}
      <Route
        path="/orders"
        element={
          <PermissionGuard permission="orders.view">
            <LazyRoute><Orders /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/kitchen"
        element={
          <PermissionGuard permission="kitchen.view">
            <LazyRoute><Kitchen /></LazyRoute>
          </PermissionGuard>
        }
      />

      {/* Menu & Inventory */}
      <Route
        path="/menu"
        element={
          <PermissionGuard permission="menu.view">
            <LazyRoute><MenuPage /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/inventory"
        element={
          <PermissionGuard permission="inventory.view">
            <LazyRoute><Inventory /></LazyRoute>
          </PermissionGuard>
        }
      />

      {/* Tables & Hospitality */}
      <Route
        path="/tables"
        element={
          <PermissionGuard permission="tables.view">
            <LazyRoute><Tables /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/rooms"
        element={
          <PermissionGuard permission="rooms.view">
            <LazyRoute><Rooms /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/housekeeping"
        element={
          <PermissionGuard permission="housekeeping.view">
            <LazyRoute><Housekeeping /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/reservations"
        element={
          <PermissionGuard permission="reservations.view">
            <LazyRoute><Reservations /></LazyRoute>
          </PermissionGuard>
        }
      />

      {/* Staff & HR */}
      <Route
        path="/staff"
        element={
          <PermissionGuard permission="staff.view">
            <LazyRoute><Staff /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/shift-management"
        element={
          <PermissionGuard permission="staff.update">
            <LazyRoute><ShiftManagement /></LazyRoute>
          </PermissionGuard>
        }
      />

      {/* Financials & Reports */}
      <Route
        path="/expenses"
        element={
          <PermissionGuard permission="financial.view">
            <LazyRoute><Expenses /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/reports"
        element={
          <PermissionGuard permission="analytics.view">
            <LazyRoute><Reports /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/analytics"
        element={
          <PermissionGuard permission="analytics.view">
            <LazyRoute><Analytics /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/nc-orders"
        element={<LazyRoute><NCOrders /></LazyRoute>}
      />

      {/* Customers & Marketing */}
      <Route
        path="/customers"
        element={
          <PermissionGuard permission="customers.view">
            <LazyRoute><Customers /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/crm"
        element={
          <PermissionGuard permission="customers.view">
            <LazyRoute><CRM /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/marketing"
        element={
          <PermissionGuard permission="customers.view">
            <LazyRoute><Marketing /></LazyRoute>
          </PermissionGuard>
        }
      />

      {/* AI & Innovation */}
      <Route
        path="/ai"
        element={
          <PermissionGuard permission="dashboard.view">
            <LazyRoute><AI /></LazyRoute>
          </PermissionGuard>
        }
      />
      <Route
        path="/digital-twin"
        element={
          <PermissionGuard permission="orders.view">
            <LazyRoute><DigitalTwin /></LazyRoute>
          </PermissionGuard>
        }
      />

      {/* Settings & Hardware */}
      <Route
        path="/settings"
        element={<LazyRoute><Settings_ /></LazyRoute>}
      />
      <Route
        path="/printer-settings"
        element={<LazyRoute><PrinterSettings /></LazyRoute>}
      />

      {/* Catch-all → Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Top Header */}
      <MobileHeader title={title} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {isInteractiveScreen ? (
          <div className="h-full w-full overflow-y-auto">
            {routesElement}
          </div>
        ) : (
          <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries(); }}>
            {routesElement}
          </PullToRefresh>
        )}
      </div>

      {/* Bottom Nav */}
      <BottomTabBar onMoreOpen={() => setMoreOpen(true)} />

      {/* More Drawer */}
      <MoreDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onNavigate={(path) => navigate(path)}
      />

      {/* One-time Biometric Setup Prompt */}
      <BiometricPromptDialog />
    </div>
  );
};
