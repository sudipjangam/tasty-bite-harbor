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
      
      const { data: subscription } = await supabase
        .from('restaurant_subscriptions')
        .select(`
          subscription_plans (
            components
          )
        `)
        .eq('restaurant_id', user.restaurant_id)
        .eq('status', 'active')
        .single();

      const plans = subscription?.subscription_plans ?? [];
      return plans.flatMap((p: any) => p.components ?? []);
    },
    enabled: !!user?.restaurant_id
  });

  const hasSubscriptionAccess = (component: string): boolean => {
    return subscriptionComponents.includes(component);
  };

  return {
    hasSubscriptionAccess,
    subscriptionComponents,
    isLoading
  };
};