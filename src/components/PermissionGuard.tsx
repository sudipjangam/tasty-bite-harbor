import { ReactNode } from 'react';
import { Permission } from '../types/auth';
import { useAuth } from '../hooks/useAuth';
import { useSubscriptionAccess } from '../hooks/useSubscriptionAccess';

interface PermissionGuardProps {
  children: ReactNode;
  permission: Permission;
  component: string;
  fallback?: ReactNode;
}

export const PermissionGuard = ({
  children,
  permission,
  component,
  fallback = null
}: PermissionGuardProps) => {
  const { hasPermission } = useAuth();
  const { hasSubscriptionAccess } = useSubscriptionAccess();

  if (!hasPermission(permission) || !hasSubscriptionAccess(component)) {
    return fallback;
  }

  return <>{children}</>;
};