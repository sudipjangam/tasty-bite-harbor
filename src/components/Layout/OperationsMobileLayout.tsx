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

// ─── Lazy-loaded operations pages ────────────────────────────────────────────
const QSRPos          = lazy(() => import("@/pages/QSRPos"));
const QuickServePOS   = lazy(() => import("@/pages/QuickServePOS"));
const POS             = lazy(() => import("@/pages/POS"));
const Orders          = lazy(() => import("@/pages/Orders"));
const Kitchen         = lazy(() => import("@/pages/Kitchen"));
const MenuPage        = lazy(() => import("@/pages/Menu"));
const Inventory       = lazy(() => import("@/pages/Inventory"));
const Settings_       = lazy(() => import("@/pages/Settings"));
const RoleBasedDashboard = lazy(() => import("@/components/Dashboard/RoleBasedDashboard"));
const PrinterSettings = lazy(() =>
  import("@/components/Settings/PrinterSettings").then((m) => ({
    default: m.PrinterSettings,
  }))
);

const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

// ─── Smart POS Redirect ───────────────────────────────────────────────────────
// Redirects to QuickServe POS if the restaurant has that feature,
// otherwise falls back to QSR POS.
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
  action?: "logout";
};

const MORE_ITEMS: MoreItem[] = [
  { label: "Menu",          icon: UtensilsCrossed, path: "/menu" },
  { label: "Inventory",     icon: Package,  path: "/inventory" },
  { label: "Printer Setup", icon: Printer,  path: "/printer-settings" },
  { label: "Settings",      icon: Settings, path: "/settings" },
  { label: "Logout",        icon: LogOut,   action: "logout" },
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
    <div className="flex items-center gap-1 text-xs">
      {connected ? (
        <Wifi className="h-3 w-3 text-green-400" />
      ) : (
        <WifiOff className="h-3 w-3 text-red-400" />
      )}
      <span className={connected ? "text-green-400" : "text-red-400"}>
        {connected ? "Printer" : "No Printer"}
      </span>
    </div>
  );
};

// ─── Top Header ──────────────────────────────────────────────────────────────
const MobileHeader = ({ title }: { title: string }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border shrink-0">
    <h1 className="text-base font-semibold text-foreground">{title}</h1>
    <PrinterStatusDot />
  </div>
);

// ─── More Drawer ─────────────────────────────────────────────────────────────
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
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Sheet */}
      <div className="relative bg-background rounded-t-2xl pb-safe z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-foreground text-base">More</span>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="divide-y divide-border">
          {MORE_ITEMS.map((item) => (
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
              className="flex items-center w-full px-5 py-4 gap-4 hover:bg-muted/50 active:bg-muted transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <item.icon className={cn("h-5 w-5 text-primary", item.action === "logout" && "text-red-500")} />
              </div>
              <span className={cn("flex-1 text-left text-sm font-medium text-foreground", item.action === "logout" && "text-red-500")}>
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        {/* Safe area spacer */}
        <div className="h-6" />
      </div>
    </div>
  );
};

// ─── Bottom Tab Bar ──────────────────────────────────────────────────────────
const BottomTabBar = ({ onMoreOpen }: { onMoreOpen: () => void }) => {
  const location = useLocation();
  const navigate  = useNavigate();

  return (
    <div className="shrink-0 border-t border-border bg-background safe-area-pb">
      <div className="flex items-stretch h-14">
        {NAV_ITEMS.map((item) => {
          const isMore   = item.path === "__more__";
          // POS tab is active on any POS route
          const isActive = !isMore && (
            item.path === "/pos-entry"
              ? POS_PATHS.has(location.pathname)
              : location.pathname === item.path
          );

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
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:bg-muted/50 relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Route title lookup ───────────────────────────────────────────────────────
const ROUTE_TITLES: Record<string, string> = {
  "/":               "Dashboard",
  "/pos-entry":      "POS",
  "/qsr-pos":        "QSR POS",
  "/quickserve-pos": "Quick Serve POS",
  "/pos":            "Table POS",
  "/orders":         "Orders",
  "/kitchen":        "Kitchen",
  "/menu":           "Menu",
  "/inventory":      "Inventory",
  "/settings":       "Settings",
  "/printer-settings": "Printer Setup",
};

// ─── Main Operations Mobile Layout ──────────────────────────────────────────
export const OperationsMobileLayout = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [locked, setLocked] = useState(() => getBiometricEnabled());
  const location = useLocation();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();

  const title = ROUTE_TITLES[location.pathname] ?? "Operations";

  // Re-lock when app returns from background after 30s
  useEffect(() => {
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        // App went to background — record timestamp
        markBackgrounded();
      } else {
        // App became active — check if we should lock
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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <MobileHeader title={title} />

      {/* Page content — scrollable */}
      <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries(); }}>
        <Routes>
          {/* Dashboard — role-based */}
          <Route
            path="/"
            element={<LazyRoute><RoleBasedDashboard /></LazyRoute>}
          />

          {/* Smart POS entry — redirects based on subscription */}
          <Route
            path="/pos-entry"
            element={
              <PermissionGuard permission="orders.view">
                <SmartPOSRedirect />
              </PermissionGuard>
            }
          />

          {/* QSR POS */}
          <Route
            path="/qsr-pos"
            element={
              <PermissionGuard permission="orders.view">
                <LazyRoute><QSRPos /></LazyRoute>
              </PermissionGuard>
            }
          />

          {/* QuickServe POS */}
          <Route
            path="/quickserve-pos"
            element={
              <PermissionGuard permission="orders.view">
                <LazyRoute><QuickServePOS /></LazyRoute>
              </PermissionGuard>
            }
          />

          {/* Table POS */}
          <Route
            path="/pos"
            element={
              <PermissionGuard permission="orders.view">
                <LazyRoute><POS /></LazyRoute>
              </PermissionGuard>
            }
          />

          {/* Orders */}
          <Route
            path="/orders"
            element={
              <PermissionGuard permission="orders.view">
                <LazyRoute><Orders /></LazyRoute>
              </PermissionGuard>
            }
          />

          {/* Kitchen */}
          <Route
            path="/kitchen"
            element={
              <PermissionGuard permission="kitchen.view">
                <LazyRoute><Kitchen /></LazyRoute>
              </PermissionGuard>
            }
          />

          {/* Menu */}
          <Route
            path="/menu"
            element={
              <PermissionGuard permission="menu.view">
                <LazyRoute><MenuPage /></LazyRoute>
              </PermissionGuard>
            }
          />

          {/* Inventory */}
          <Route
            path="/inventory"
            element={
              <PermissionGuard permission="inventory.view">
                <LazyRoute><Inventory /></LazyRoute>
              </PermissionGuard>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={<LazyRoute><Settings_ /></LazyRoute>}
          />

          {/* Printer Setup */}
          <Route
            path="/printer-settings"
            element={<LazyRoute><PrinterSettings /></LazyRoute>}
          />

          {/* Catch-all → Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PullToRefresh>

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
