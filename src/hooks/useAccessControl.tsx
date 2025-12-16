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
 */
export const useAccessControl = (): AccessControl => {
  const { user } = useAuth();
  const [allowedComponents, setAllowedComponents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllowedComponents = async () => {
      if (!user?.restaurant_id) {
        console.log('AccessControl: No restaurant_id found');
        setAllowedComponents([]);
        setLoading(false);
        return;
      }

      try {
        console.log('AccessControl: Fetching components for restaurant:', user.restaurant_id);
        const components = await fetchAllowedComponents(user.restaurant_id);
        console.log('AccessControl: Allowed components:', components);
        setAllowedComponents(components);
      } catch (error) {
        console.error('Error loading allowed components:', error);
        setAllowedComponents([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllowedComponents();
  }, [user?.restaurant_id]);

  const hasAccess = (component: string): boolean => {
    if (!user) return false;
    
    // If still loading, deny access to prevent showing restricted content
    if (loading) return false;
    
    // If no allowed components loaded, deny access (subscription issue)
    if (allowedComponents.length === 0) {
      console.log('AccessControl: No allowed components, denying access to:', component);
      return false;
    }
    
    // Check if the component is in the allowed list from subscription
    const hasComponentAccess = allowedComponents.includes(component);
    console.log(`AccessControl: Checking ${component}: ${hasComponentAccess}`);
    return hasComponentAccess;
  };

  return {
    hasAccess,
    allowedComponents,
    loading
  };
};
