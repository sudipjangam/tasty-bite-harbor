import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Permission, UserRole } from "@/types/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, ShieldAlert } from "lucide-react";

// ============================================================================
// Route-to-Subscription Component Map
// Maps each route path to its corresponding subscription component key.
// This is used to check if the user's subscription includes the feature.
// ============================================================================
const routeToComponentMap: Record<string, string> = {
  "/": "dashboard",
  "/pos": "pos",
  "/qsr-pos": "qsr-pos",
  "/quickserve-pos": "quickserve-pos",
  "/orders": "orders",
  "/kitchen": "kitchen",
  "/recipes": "menu", // Recipes fall under menu management
  "/menu": "menu",
  "/tables": "tables",
  "/inventory": "inventory",
  "/staff": "staff",
  "/shift-management": "staff",
  "/customers": "customers",
  "/marketing": "marketing",
  "/analytics": "analytics",
  "/financial": "financial",
  "/reports": "reports",
  "/expenses": "financial", // Expenses fall under financial
  "/nc-orders": "orders", // NC Orders fall under orders
  "/rooms": "rooms",
  "/reservations": "reservations",
  "/housekeeping": "housekeeping",
  "/ai": "ai",
  "/security": "security",
  "/settings": "settings",
  "/channel-management": "analytics",
};

// System/admin components that bypass subscription check
// These are controlled purely by role permissions
const systemBypassRoutes = new Set([
  "/user-management",
  "/role-management",
  "/permission-management",
  "/platform",
  "/auth",
  "/qr-menu",
  "/bill",
]);

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  showError?: boolean;
  roles?: UserRole[];
  requireAnyRole?: boolean;
}

/**
 * Component that conditionally renders children based on:
 * 1. User's subscription plan (does the plan include this feature?)
 * 2. User's role permissions (does the role grant access?)
 *
 * Both checks must pass for access to be granted.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  showError = false,
  roles,
  requireAnyRole = false,
}) => {
  const { hasPermission, hasAnyPermission, isRole, user } = useAuth();
  const { hasSubscriptionAccess, isLoading: subscriptionLoading } =
    useSubscriptionAccess();
  const location = useLocation();

  // If no user is logged in, don't show anything
  if (!user) {
    return showError ? (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          You must be logged in to access this feature.
        </AlertDescription>
      </Alert>
    ) : null;
  }

  // ── Subscription Access Check ──────────────────────────────────────
  // Check if the current route's feature is included in the user's plan
  const currentPath = location.pathname;
  const isSystemRoute = systemBypassRoutes.has(currentPath);
  const componentKey = routeToComponentMap[currentPath];

  if (!isSystemRoute && componentKey && !subscriptionLoading) {
    if (!hasSubscriptionAccess(componentKey)) {
      // Feature is NOT in the user's subscription plan
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl inline-block mb-4">
              <ShieldAlert className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Feature Not Available
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This feature is not included in your current subscription plan.
              Please upgrade your plan to access this feature.
            </p>
            <a
              href="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
            >
              View Plans
            </a>
          </div>
        </div>
      );
    }
  }

  // ── Role/Permission Access Check ───────────────────────────────────
  let hasAccess = false;

  // Check role-based access first if roles are specified
  if (roles && roles.length > 0) {
    if (requireAnyRole) {
      hasAccess = roles.some((role) => isRole(role));
    } else {
      // Require all roles
      hasAccess = roles.every((role) => isRole(role));
    }

    // If role check fails, deny access
    if (!hasAccess && !permission && !permissions) {
      if (fallback) {
        return <>{fallback}</>;
      }

      if (showError) {
        return (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Your role doesn't have access to this feature.
            </AlertDescription>
          </Alert>
        );
      }

      return null;
    }
  }

  // Check permission-based access
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    if (requireAll) {
      hasAccess = permissions.every((p) => hasPermission(p));
    } else {
      hasAccess = hasAnyPermission(permissions);
    }
  } else if (!roles || roles.length === 0) {
    // If no permissions or roles specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showError) {
      return (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
};

/**
 * Role-specific guard component
 */
interface RoleGuardProps {
  children: React.ReactNode;
  roles: UserRole[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  showError?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  roles,
  requireAll = false,
  fallback,
  showError = false,
}) => {
  return (
    <PermissionGuard
      roles={roles}
      requireAnyRole={!requireAll}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  );
};
