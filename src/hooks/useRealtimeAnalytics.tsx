import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Global real-time analytics synchronization hook
 * Subscribes to critical table changes and invalidates relevant queries with debounce
 * This prevents memory and CPU spikes on rapid realtime event storms
 */
export const useRealtimeAnalytics = () => {
  const queryClient = useQueryClient();
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
    // Create a single channel for all critical table subscriptions
    const channel = supabase
      .channel('realtime-analytics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
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
        { event: '*', schema: 'public', table: 'room_billings' },
        () => {
          debounceInvalidate([
            ['analytics-data'],
            ['dashboard-orders'],
          ]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitchen_orders' },
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
        { event: '*', schema: 'public', table: 'check_ins' },
        () => {
          debounceInvalidate([['liveActivity']]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_revenue_stats' },
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
  }, [queryClient]);

  return null;
};

