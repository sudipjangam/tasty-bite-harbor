import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

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

  // Owners and Admins should get these notifications
  const isOwnerOrAdmin = hasPermission('staff.view' as any) || isRole('admin') || isRole('owner');

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    if (!user || !restaurantId || !isOwnerOrAdmin) return;

    const setupChannel = async () => {
      // Clean up previous channel
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`owner-notifications-${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'owner_notifications',
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            const n = payload.new as any;

            // Play notification sound
            if (audioRef.current) {
              audioRef.current.play().catch(() => {});
            }

            // Determine icon based on type
            const icon = n.type === 'leave_request' ? '📋' : '⏰';

            toast({
              title: `${icon} ${n.title}`,
              description: n.message,
              duration: 8000,
              className: "cursor-pointer bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-900/50 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-lg",
              onClick: () => {
                navigate(n.action_url || '/staff');
              }
            });

            // Invalidate queries so bell icon and dashboard update
            queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, restaurantId, isOwnerOrAdmin, queryClient, toast]);

  return null;
};

export default OwnerNotificationListener;
