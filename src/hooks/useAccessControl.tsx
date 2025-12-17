import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { fetchAllowedComponents } from '@/utils/subscriptionUtils';
import { supabase } from '@/integrations/supabase/client';

interface AccessControl {
  hasAccess: (component: string) => boolean;
  allowedComponents: string[];
  loading: boolean;
}

/**
 * Hook that combines role-based permissions with subscription-based component access
 * 
 * Access is granted only if:
 * 1. User has full access (admin/owner) OR component is in user's role, AND
 * 2. Component is included in the restaurant's subscription plan
 */
export const useAccessControl = (): AccessControl => {
  const { user } = useAuth();
  const [subscriptionComponents, setSubscriptionComponents] = useState<string[]>([]);
  const [userRoleComponents, setUserRoleComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllowedComponents = async () => {
      if (!user?.restaurant_id || !user?.id) {
        console.log('AccessControl: No user or restaurant_id found');
        setSubscriptionComponents([]);
        setUserRoleComponents([]);
        setLoading(false);
        return;
      }

      try {
        console.log('AccessControl: Fetching components for restaurant:', user.restaurant_id);
        
        // 1. Fetch subscription plan components
        const planComponents = await fetchAllowedComponents(user.restaurant_id);
        console.log('AccessControl: Subscription components:', planComponents);
        setSubscriptionComponents(planComponents);
        
        // 2. Fetch user's role components (what they're allowed to access)
        // Use the RPC function that returns component names
        const { data: userComponents, error: userCompError } = await supabase
          .rpc('get_user_components', { p_user_id: user.id });
        
        if (userCompError) {
          console.error('AccessControl: Error fetching user components:', userCompError);
          setUserRoleComponents([]);
        } else {
          // Extract component names from the RPC result
          const componentNames = (userComponents || []).map((c: any) => c.component_name);
          console.log('AccessControl: User role components:', componentNames);
          setUserRoleComponents(componentNames);
        }
        
      } catch (error) {
        console.error('Error loading allowed components:', error);
        setSubscriptionComponents([]);
        setUserRoleComponents([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllowedComponents();
  }, [user?.restaurant_id, user?.id]);

  /**
   * Check if user has access to a specific component
   * Must satisfy BOTH:
   * - Subscription includes the component
   * - User's role grants access (or user has full access)
   */
  const hasAccess = (component: string): boolean => {
    if (!user) return false;
    
    // If still loading, deny access to prevent showing restricted content
    if (loading) return false;
    
    // Check if subscription includes this component
    const subscriptionHasAccess = subscriptionComponents.some(
      c => c.toLowerCase() === component.toLowerCase()
    );
    
    if (!subscriptionHasAccess) {
      console.log(`AccessControl: Subscription doesn't include ${component}`);
      return false;
    }
    
    // Admin/Owner with full_access bypasses role check
    if (user.role_has_full_access) {
      console.log(`AccessControl: User has full_access, granting ${component}`);
      return true;
    }
    
    // Check if user's role grants access to this component
    const roleHasAccess = userRoleComponents.some(
      c => c.toLowerCase() === component.toLowerCase()
    );
    
    console.log(`AccessControl: Checking ${component} - subscription: ${subscriptionHasAccess}, role: ${roleHasAccess}`);
    return roleHasAccess;
  };

  // Computed: Components user actually has access to (intersection)
  const allowedComponents = subscriptionComponents.filter(sc => 
    user?.role_has_full_access || 
    userRoleComponents.some(rc => rc.toLowerCase() === sc.toLowerCase())
  );

  return {
    hasAccess,
    allowedComponents,
    loading
  };
};
