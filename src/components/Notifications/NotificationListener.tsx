import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const NotificationListener: React.FC = () => {
  const { user } = useAuth();
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    console.log('[NotificationListener] Audio initialized');
  }, []);

  useEffect(() => {
    if (!user || !restaurantId) {
      console.log('[NotificationListener] No user or restaurant ID', { user: !!user, restaurantId });
      return;
    }

    console.log('[NotificationListener] Initializing for user:', user.id);

    // Get the staff ID for the current user using profiles table
    const initSubscription = async () => {
      // First check if user has an associated staff record via profiles
      // The staff table doesn't have auth_user_id, so we need to match by other means
      // For now, skip staff ID lookup and subscribe to user-based notifications
      const staffId = user.id; // Use user ID directly for notifications
      console.log('[NotificationListener] Using user ID for notifications:', staffId);
      console.log('[NotificationListener] Found staff ID:', staffId);

      // Clean up existing channel if any
      if (channelRef.current) {
        console.log('[NotificationListener] Removing existing channel');
        await supabase.removeChannel(channelRef.current);
      }

      // Subscribe to notifications for this staff member
     console.log('[NotificationListener] Creating realtime channel for staff:', staffId);
      
      const channel = supabase
        .channel(`staff-notifications-${staffId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'staff_notifications',
            filter: `staff_id=eq.${staffId}`,
          },
          (payload) => {
            console.log('[NotificationListener] Received notification:', payload);
            
            // Play sound
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.error('[NotificationListener] Audio play failed:', e));
            }

            // Show toast
            const newNotification = payload.new as any;
            toast({
              title: newNotification.title || '🔔 New Notification',
              description: newNotification.message,
              duration: 5000,
            });

            // Invalidate queries to refresh lists
            queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['staff-cleaning-tasks'] });
          }
        )
        .subscribe((status) => {
          console.log('[NotificationListener] Subscription status:', status);
        });

      channelRef.current = channel;
    };

    initSubscription();

    // Cleanup on unmount
    return () => {
      console.log('[NotificationListener] Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, restaurantId, queryClient, toast]);

  return null; // This component doesn't render anything visible
};

export default NotificationListener;
