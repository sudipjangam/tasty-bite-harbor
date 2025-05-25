
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface UseRealtimeSubscriptionOptions {
  table: string;
  queryKey: string | string[];
  schema?: string;
  filter?: { column: string; value: any } | null;
}

export const useRealtimeSubscription = ({
  table,
  queryKey,
  schema = 'public',
  filter = null,
}: UseRealtimeSubscriptionOptions) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
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
    
    // Create the subscription channel
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', subscriptionOptions, () => {
        // Invalidate the query to refresh data
        queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
      })
      .subscribe();
    
    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, queryKey, queryClient, filter?.column, filter?.value]);
};

export default useRealtimeSubscription;
