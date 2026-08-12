import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

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
  }, []);

  useEffect(() => {
    if (!user || !restaurantId) {
      return;
    }

    // Get the staff ID for the current user using profiles table
    const initSubscription = async () => {
      // First check if user has an associated staff record via profiles
      // The staff table doesn't have auth_user_id, so we need to match by other means
      // For now, skip staff ID lookup and subscribe to user-based notifications
      const staffId = user.id; // Use user ID directly for notifications

      // Clean up existing channel if any
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }

      // Subscribe to notifications for this staff member
      
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
          async (payload) => {
            // Play notification sound
            // if (audioRef.current) {
            //   audioRef.current.play().catch(() => {});
            // }

            // Show toast
            const newNotification = payload.new as any;
            const title = newNotification.title || '🔔 New Notification';
            const message = newNotification.message || '';
            
            toast({
              title,
              description: message,
              duration: 5000,
            });

            // Trigger OS level native notification if on mobile
            if (Capacitor.isNativePlatform()) {
              try {
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      title: title,
                      body: message,
                      id: new Date().getTime(),
                      schedule: { at: new Date(Date.now() + 100) }, // Trigger immediately
                      sound: null, // Sound is already played by audioRef
                      attachments: undefined,
                      actionTypeId: '',
                      extra: null
                    }
                  ]
                });
              } catch (e) {
                console.error("Local notification failed", e);
              }
            }

            // Invalidate queries to refresh lists
            queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['staff-cleaning-tasks'] });
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    initSubscription();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, restaurantId, queryClient, toast]);

  return null; // This component doesn't render anything visible
};

export default NotificationListener;
