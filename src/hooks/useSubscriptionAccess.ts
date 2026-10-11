import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './useAuth';
import { Permission } from '../types/auth';

interface SubscriptionComponent {
  name: string;
  permissions: Permission[];
}

export const useSubscriptionAccess = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscriptionComponents = [], isLoading } = useQuery({
    queryKey: ['subscription-components', user?.restaurant_id],
    queryFn: async () => {
      if (!user?.restaurant_id) return [];
      
      const { data: subscription, error } = await supabase
        .from('restaurant_subscriptions')
        .select(`
          components,
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

      if (!subscription) {
        return [];
      }

      // Handle both array and object responses (Supabase can return either)
      let planData: any;
      if (Array.isArray(subscription.subscription_plans)) {
        planData = subscription.subscription_plans[0];
      } else {
        planData = subscription.subscription_plans;
      }

      const planComps = planData?.components ?? [];
      const branchComps = (subscription as any)?.components ?? [];
      const planArr = Array.isArray(planComps) ? planComps : [];
      const branchArr = Array.isArray(branchComps) ? branchComps : [];
      
      return Array.from(new Set([...planArr, ...branchArr]));
    },
    enabled: !!user?.restaurant_id
  });

  // ─── Supabase Realtime: auto-invalidate when plan features or branch overrides change ──────
  useEffect(() => {
    if (!user?.restaurant_id) return; // Don't open WSS without auth

    const channel = supabase
      .channel(`subscription-access-${user.restaurant_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_subscriptions',
          filter: `restaurant_id=eq.${user.restaurant_id}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['subscription-components', user.restaurant_id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.restaurant_id, queryClient]);

  const hasSubscriptionAccess = (component: string): boolean => {
    const normalizedComponent = component.toLowerCase().trim();
    
    return subscriptionComponents.some((c: string) => {
      const normalizedKey = c.toLowerCase().trim();
      
      // 1. Exact match (e.g., 'pos' === 'pos' or 'pos.basic' === 'pos.basic')
      if (normalizedKey === normalizedComponent) return true;
      
      // 2. Prefix match: if checking 'pos', match 'pos.basic', 'pos.hold_orders', etc.
      //    This handles the sidebar which checks flat component names like 'pos', 'orders', 'kitchen'
      //    against dot-notation keys like 'pos.basic', 'orders.view'
      if (normalizedKey.startsWith(normalizedComponent + '.')) return true;
      
      // 3. Reverse prefix: if checking 'pos.basic' and the plan has 'pos' (legacy)
      if (normalizedComponent.startsWith(normalizedKey + '.')) return true;
      
      return false;
    });
  };

  return {
    hasSubscriptionAccess,
    subscriptionComponents,
    isLoading
  };
};
