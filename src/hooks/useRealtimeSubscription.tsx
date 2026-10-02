
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseRealtimeSubscriptionOptions {
  table: string;
  queryKey: string | string[];
  schema?: string;
  filter?: { column: string; value: any } | null;
  debounceMs?: number;
}

export const useRealtimeSubscription = ({
  table,
  queryKey,
  schema = 'public',
  filter = null,
  debounceMs = 0,
}: UseRealtimeSubscriptionOptions) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Create subscription options
    const subscriptionOptions: any = {
      schema,
      table,
      event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
    };
    
    // Add filter if provided
    if (filter) {
      subscriptionOptions.filter = `${filter.column}=eq.${filter.value}`;
    }
    
    // BUG-10 fix: use crypto.randomUUID() instead of Math.random() to prevent channel collisions
    const channelId = `${table}-${filter ? `${filter.column}-${filter.value}` : 'all'}-${crypto.randomUUID().slice(0, 12)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', subscriptionOptions, () => {
        // Debounce the invalidation to prevent refetch thrashing
        if (debounceMs > 0) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
          }, debounceMs);
        } else {
          queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
        }
      })
      .subscribe();
    
    // Clean up subscription when component unmounts
    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [table, schema, queryKey, queryClient, filter?.column, filter?.value, debounceMs]);
};

export default useRealtimeSubscription;
