import { ReactNode } from 'react';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ComponentGuardProps {
  children: ReactNode;
  component: string;
  fallbackPath?: string;
}

/**
 * ComponentGuard - Restricts access to pages based on component permissions
 * 
 * Use this inside ProtectedRoute to add component-level access control.
 * 
 * Checks:
 * 1. User has access to the specified component (via subscription + role)
 * 
 * Usage:
 * <ProtectedRoute>
 *   <ComponentGuard component="inventory">
 *     <InventoryPage />
 *   </ComponentGuard>
 * </ProtectedRoute>
 */
export const ComponentGuard = ({ 
  children, 
  component, 
  fallbackPath = "/" 
}: ComponentGuardProps) => {
  const { user } = useAuth();
  const { hasAccess, loading } = useAccessControl();
  const navigate = useNavigate();

  // Show loading state while checking permissions
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  // Check component access
  if (!hasAccess(component)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Access Denied
        </h2>
        <p className="text-muted-foreground max-w-md mb-6">
          You don't have permission to access <strong>{component}</strong>. 
          Please contact your administrator if you believe this is an error.
        </p>
        <Button 
          onClick={() => navigate(fallbackPath)}
          className="bg-primary hover:bg-primary/90"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // All checks passed - render the protected content
  return <>{children}</>;
};

export default ComponentGuard;
