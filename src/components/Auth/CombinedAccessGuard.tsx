import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Permission } from "@/types/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

interface CombinedAccessGuardProps {
  children: React.ReactNode;
  requiredComponent: string;
  permission?: Permission;
  permissions?: Permission[];
  requireAllPermissions?: boolean;
  fallbackPath?: string;
  showError?: boolean;
}

/**
 * Guard that checks both role-based permissions AND subscription-based component access
 */
export const CombinedAccessGuard: React.FC<CombinedAccessGuardProps> = ({
  children,
  requiredComponent,
  permission,
  permissions,
  requireAllPermissions = false,
  fallbackPath = "/",
  showError = true,
}) => {
  const { user, hasPermission, hasAnyPermission } = useAuth();
  const { hasAccess, loading } = useAccessControl();

  // Wait for loading to complete
  if (loading) {
    return null;
  }

  // Check if user is logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check subscription-based component access first
  if (!hasAccess(requiredComponent)) {
    if (showError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This feature is not available in your current subscription plan.
              Please upgrade to access this feature.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // Check role-based permissions
  let hasPermissionAccess = true;
  
  if (permission) {
    hasPermissionAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    if (requireAllPermissions) {
      hasPermissionAccess = permissions.every(p => hasPermission(p));
    } else {
      hasPermissionAccess = hasAnyPermission(permissions);
    }
  }

  if (!hasPermissionAccess) {
    if (showError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center">
          <Alert variant="destructive" className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You don't have the required permissions to access this feature.
              Contact your administrator for access.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
