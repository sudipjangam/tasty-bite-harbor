
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';

/**
 * Utility component that keeps CRM data live via Supabase realtime.
 *
 * Egress fix: Consolidated 6 separate channels into 1 channel.
 * Added restaurant_id filter to orders, reservations, and room_food_orders
 * (they were previously global — receiving events from ALL restaurants).
 * customer_notes and customer_activities use customer_id payload routing
 * and don't need restaurant-level filtering.
 */
const RealtimeCustomers = () => {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  
  useEffect(() => {
    if (!restaurantId) return;

    // Single channel for all CRM-related table subscriptions
    const crmChannel = supabase
      .channel('crm-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }
      )
      .on(
        'postgres_changes',
        // customer_notes are keyed by customer_id, not restaurant_id
        { event: '*', schema: 'public', table: 'customer_notes' },
        (payload) => {
          if (payload.new && 'customer_id' in payload.new) {
            queryClient.invalidateQueries({
              queryKey: ['customer-notes', payload.new.customer_id],
            });
          }
        }
      )
      .on(
        'postgres_changes',
        // customer_activities are keyed by customer_id
        { event: '*', schema: 'public', table: 'customer_activities' },
        (payload) => {
          if (payload.new && 'customer_id' in payload.new) {
            queryClient.invalidateQueries({
              queryKey: ['customer-activities', payload.new.customer_id],
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_food_orders',
          // Egress fix: was missing filter — received events from all restaurants
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          // Egress fix: was missing filter — received events from all restaurants
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          // Egress fix: was missing filter — received events from all restaurants
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }
      )
      .subscribe();
    
    // Cleanup on unmount
    return () => {
      supabase.removeChannel(crmChannel);
    };
  }, [queryClient, restaurantId]);
  
  // This is a utility component that doesn't render anything
  return null;
};

export default RealtimeCustomers;
