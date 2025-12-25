import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';
import { Permission } from '../types/auth';

interface SubscriptionComponent {
  name: string;
  permissions: Permission[];
}

export const useSubscriptionAccess = () => {
  const { user } = useAuth();

  const { data: subscriptionComponents = [], isLoading } = useQuery({
    queryKey: ['subscription-components', user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return [];
      
      const { data: subscription, error } = await supabase
        .from('restaurant_subscriptions')
        .select(`
          subscription_plans (
            components
          )
        `)
        .eq('restaurant_id', user.restaurant_id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('useSubscriptionAccess: Error fetching subscription:', error);
        return [];
      }

      if (!subscription || !subscription.subscription_plans) {
        console.log('useSubscriptionAccess: No active subscription found');
        return [];
      }

      // Handle both array and object responses (Supabase can return either)
      let planData: any;
      if (Array.isArray(subscription.subscription_plans)) {
        planData = subscription.subscription_plans[0];
      } else {
        planData = subscription.subscription_plans;
      }

      const components = planData?.components ?? [];
      console.log('useSubscriptionAccess: Found components:', components);
      
      return Array.isArray(components) ? components : [];
    },
    enabled: !!user?.restaurant_id
  });

  const hasSubscriptionAccess = (component: string): boolean => {
    // Case-insensitive comparison
    return subscriptionComponents.some(
      (c: string) => c.toLowerCase() === component.toLowerCase()
    );
  };

  return {
    hasSubscriptionAccess,
    subscriptionComponents,
    isLoading
  };
};
