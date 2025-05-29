
import { Navigate } from "react-router-dom";
import { useAuthState } from "@/hooks/useAuthState";
import { PermissionGuard } from "./PermissionGuard";
import { Permission } from "@/types/auth";

interface GuardProps {
  children: JSX.Element;
}

interface ComponentGuardProps {
  children: JSX.Element;
  requiredComponent?: string;
}

/**
 * Prevents authenticated users from accessing login/register pages
 */
export const LoginRegisterAccessGuard: React.FC<GuardProps> = ({ children }) => {
  const { user, loading } = useAuthState();
  
  if (loading) {
    return null; // Will be handled by the main Routes component
  }
  
  if (user) {
    return <Navigate to="/" />;
  }
  
  return children;
};

/**
 * Prevents unauthenticated users from accessing protected pages
 */
export const ComponentAccessGuard: React.FC<ComponentGuardProps> = ({ children, requiredComponent }) => {
  const { user, loading } = useAuthState();
  
  if (loading) {
    return null; // Will be handled by the main Routes component
  }
  
  if (!user) {
    return <Navigate to="/auth" />;
  }
  
  return children;
};

/**
 * Permission-based route guard that checks specific permissions
 */
interface PermissionRouteGuardProps {
  children: JSX.Element;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallbackPath?: string;
}

export const PermissionRouteGuard: React.FC<PermissionRouteGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallbackPath = "/"
}) => {
  return (
    <PermissionGuard
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      fallback={<Navigate to={fallbackPath} replace />}
    >
      {children}
    </PermissionGuard>
  );
};
