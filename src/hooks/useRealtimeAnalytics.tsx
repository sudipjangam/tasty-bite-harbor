import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Global real-time analytics synchronization hook
 * Subscribes to critical table changes and invalidates relevant queries
 * This ensures all analytics data stays fresh without manual page refreshes
 */
export const useRealtimeAnalytics = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a single channel for all critical table subscriptions
    const channel = supabase
      .channel('realtime-analytics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['analytics-data'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
          queryClient.invalidateQueries({ queryKey: ['liveActivity'] });
          queryClient.invalidateQueries({ queryKey: ['realtime-business-data'] });
          queryClient.invalidateQueries({ queryKey: ['business-dashboard-data'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_billings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['analytics-data'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kitchen_orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['liveActivity'] });
          queryClient.invalidateQueries({ queryKey: ['analytics-data'] });
          queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
          queryClient.invalidateQueries({ queryKey: ['realtime-business-data'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'check_ins' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['liveActivity'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_revenue_stats' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['analytics-data'] });
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
};
