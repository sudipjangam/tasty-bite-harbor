
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/types/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  showError?: boolean;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  showError = false
}) => {
  const { hasPermission, hasAnyPermission, user } = useAuth();

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

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    if (requireAll) {
      hasAccess = permissions.every(p => hasPermission(p));
    } else {
      hasAccess = hasAnyPermission(permissions);
    }
  } else {
    // If no permissions specified, allow access
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
