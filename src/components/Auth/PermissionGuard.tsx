
import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Permission, UserRole } from "@/types/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

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
 * Component that conditionally renders children based on user permissions and/or roles
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback,
  showError = false,
  roles,
  requireAnyRole = false
}) => {
  const { hasPermission, hasAnyPermission, isRole, user } = useAuth();

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

  // Check role-based access first if roles are specified
  if (roles && roles.length > 0) {
    if (requireAnyRole) {
      hasAccess = roles.some(role => isRole(role));
    } else {
      // Require all roles
      hasAccess = roles.every(role => isRole(role));
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
      hasAccess = permissions.every(p => hasPermission(p));
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
  showError = false
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
