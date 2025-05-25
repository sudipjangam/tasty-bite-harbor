
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';

const RealtimeCustomers = () => {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantId();
  
  useEffect(() => {
    if (!restaurantId) return;
    
    // Enable real-time updates for customers table
    const customersChannel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'customers',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          // Invalidate and refetch customers data
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }
      )
      .subscribe();
      
    // Enable real-time updates for customer notes
    const notesChannel = supabase
      .channel('customer-notes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_notes' },
        (payload) => {
          // Invalidate specific customer notes
          if (payload.new && 'customer_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: ['customer-notes', payload.new.customer_id] 
            });
          }
        }
      )
      .subscribe();
      
    // Enable real-time updates for customer activities
    const activitiesChannel = supabase
      .channel('customer-activities-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_activities' },
        (payload) => {
          // Invalidate specific customer activities
          if (payload.new && 'customer_id' in payload.new) {
            queryClient.invalidateQueries({ 
              queryKey: ['customer-activities', payload.new.customer_id] 
            });
          }
        }
      )
      .subscribe();
    
    // Enable real-time updates for room bookings
    const roomOrdersChannel = supabase
      .channel('room-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_food_orders' },
        () => {
          // Invalidate all customer orders data since we need to refresh
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          // Also refresh any current customer orders
          queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
        }
      )
      .subscribe();
      
    // Enable real-time updates for all orders (POS, Table orders)
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          // Invalidate all customer data when orders change
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          // Also refresh any current customer orders
          queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
        }
      )
      .subscribe();
      
    // Enable real-time updates for reservations
    const reservationsChannel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          // Invalidate all customer data when reservations change
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }
      )
      .subscribe();
    
    // Cleanup on unmount
    return () => {
      supabase.removeChannel(customersChannel);
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(roomOrdersChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(reservationsChannel);
    };
  }, [queryClient, restaurantId]);
  
  // This is a utility component that doesn't render anything
  return null;
};

export default RealtimeCustomers;
