import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Global listener for owner/admin notifications.
 * Subscribes to realtime INSERT events on owner_notifications table.
 * Shows toast notifications for leave requests and missed/late punches.
 * Only active for users with admin/owner permissions.
 */
const OwnerNotificationListener: React.FC = () => {
  const { user, hasPermission, isRole } = useAuth();
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Owners and Admins should get these notifications
  const isOwnerOrAdmin = hasPermission('staff.view' as any) || isRole('admin') || isRole('owner');

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    if (!user || !restaurantId || !isOwnerOrAdmin) return;

    let cancelled = false;
    let updateRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPendingUpdateRefresh = () => {
      if (updateRefreshTimer !== null) {
        clearTimeout(updateRefreshTimer);
        updateRefreshTimer = null;
      }
    };

    const setupChannel = async () => {
      // Clean up previous channel
      if (channelRef.current) {
        const prevChannel = channelRef.current;
        channelRef.current = null;
        await supabase.removeChannel(prevChannel);
      }

      if (cancelled) return;

      const channel = supabase
        .channel(`owner-notifications-${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'owner_notifications',
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          async (payload) => {
            if (cancelled) return;
            const eventType = payload.eventType;
            const n = payload.new as any;

            if (eventType === 'INSERT' && n) {
              // Determine icon based on type
              const icon = n.type === 'leave_request' ? '📋' : '⏰';

              toastRef.current({
                title: `${icon} ${n.title}`,
                description: n.message,
                duration: 8000,
                className: "cursor-pointer bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-900/50 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-lg",
                onClick: () => {
                  navigateRef.current(n.action_url || '/staff');
                }
              });

              // Trigger OS level native notification if on mobile
              if (Capacitor.isNativePlatform()) {
                try {
                  await LocalNotifications.schedule({
                    notifications: [
                      {
                        title: n.title,
                        body: n.message,
                        id: Math.floor(Date.now() % 2147483647),
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: null,
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

              // Immediate invalidation on INSERT; clear any queued UPDATE refresh for this restaurant
              if (cancelled) return;
              clearPendingUpdateRefresh();
              queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
              return;
            }

            // Coalesce UPDATE (and DELETE) burst invalidations within a short restaurant-scoped window
            clearPendingUpdateRefresh();
            updateRefreshTimer = setTimeout(() => {
              updateRefreshTimer = null;
              if (!cancelled) {
                queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
              }
            }, 300);
          }
        )
        .subscribe((status) => {
          if (!cancelled && status === 'SUBSCRIBED') {
            // Reconnection or initial subscription: invalidate queries to catch up on any missed notifications
            clearPendingUpdateRefresh();
            queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
          }
        });

      if (cancelled) {
        supabase.removeChannel(channel);
        return;
      }
      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      cancelled = true;
      clearPendingUpdateRefresh();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, restaurantId, isOwnerOrAdmin, queryClient]);

  return null;
};

export default OwnerNotificationListener;
