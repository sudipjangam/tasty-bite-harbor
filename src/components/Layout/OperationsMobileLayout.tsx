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
import { MobileNavigation } from "@/components/ui/mobile-navigation";

// ─── Lazy-loaded operations pages ────────────────────────────────────────────
const QSRPos          = lazy(() => import("@/pages/QSRPos"));
const QuickServePOS   = lazy(() => import("@/pages/QuickServePOS"));
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

// ─── Main Operations Mobile Layout ──────────────────────────────────────────
export const OperationsMobileLayout = () => {
  const [locked, setLocked] = useState(() => getBiometricEnabled());
  const location = useLocation();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();



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

          {/* Redirect old POS to QuickServe */}
          <Route
            path="/pos"
            element={<Navigate to="/quickserve-pos" replace />}
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

      {/* Unified Mobile Bottom Navigation — matches Web mobile styling with active squircle gradients & z-50 */}
      <MobileNavigation />

      {/* One-time Biometric Setup Prompt */}
      <BiometricPromptDialog />
    </div>
  );
};
