import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useRestaurantId } from './useRestaurantId';

/**
 * Global real-time analytics synchronization hook
 * Subscribes to critical table changes and invalidates relevant queries with debounce.
 * This prevents memory and CPU spikes on rapid realtime event storms.
 *
 * Egress fix: added restaurant_id filter to all subscriptions so we only receive
 * events from THIS restaurant. Previously, all 5 subscriptions were global — every
 * order from every restaurant on the platform was triggering analytics refetches.
 */
export const useRealtimeAnalytics = () => {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const debounceInvalidate = (keys: string[][], delay = 600) => {
    keys.forEach((queryKey) => {
      const keyStr = JSON.stringify(queryKey);
      if (debounceTimers.current[keyStr]) {
        clearTimeout(debounceTimers.current[keyStr]);
      }
      debounceTimers.current[keyStr] = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
        delete debounceTimers.current[keyStr];
      }, delay);
    });
  };

  useEffect(() => {
    // Don't subscribe until we know which restaurant we are
    if (!restaurantId) return;

    // Create a single channel for all critical table subscriptions
    // Egress fix: each .on() now has filter: `restaurant_id=eq.${restaurantId}`
    const channel = supabase
      .channel('realtime-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          debounceInvalidate([
            ['analytics-data'],
            ['dashboard-orders'],
            ['liveActivity'],
            ['realtime-business-data'],
            ['business-dashboard-data'],
          ]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_billings',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          debounceInvalidate([
            ['analytics-data'],
            ['dashboard-orders'],
          ]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          debounceInvalidate([
            ['liveActivity'],
            ['analytics-data'],
            ['kitchen-orders'],
            ['realtime-business-data'],
          ]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          debounceInvalidate([['liveActivity']]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_revenue_stats',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          debounceInvalidate([['analytics-data']]);
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
      supabase.removeChannel(channel);
    };
  }, [queryClient, restaurantId]);

  return null;
};
