import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellOff,
  CalendarDays,
  Clock,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';

interface OwnerNotification {
  id: string;
  restaurant_id: string;
  type: string;
  title: string;
  message: string;
  staff_name: string;
  reference_id: string | null;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Global bell icon with dropdown for owner/admin notifications.
 * Shows unread count badge, list of recent notifications, and
 * provides quick navigation shortcuts.
 */
const OwnerNotificationBell: React.FC = () => {
  const { user, hasPermission, isRole } = useAuth();
  const { restaurantId } = useRestaurantId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOwnerOrAdmin = hasPermission('staff.view' as any) || isRole('admin') || isRole('owner');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch recent notifications
  const { data: notifications = [] } = useQuery<OwnerNotification[]>({
    queryKey: ['owner-notifications', restaurantId],
    enabled: !!restaurantId && isOwnerOrAdmin,
    refetchInterval: 30000, // refresh every 30s
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owner_notifications')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as OwnerNotification[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('owner_notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('owner_notifications')
        .update({ is_read: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-notifications'] });
    },
  });

  const handleNotificationClick = (n: OwnerNotification) => {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    setIsOpen(false);
    navigate(n.action_url || '/staff');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'leave_request':
        return <CalendarDays className="h-4 w-4 text-violet-500" />;
      case 'late_punch':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'missed_punch':
        return <Clock className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!isOwnerOrAdmin) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
        title="Staff Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-500/10 to-pink-500/10 dark:from-violet-500/20 dark:to-pink-500/20 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Staff Alerts
              </h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <BellOff className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  You'll be notified about leave requests & attendance
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    !n.is_read
                      ? 'bg-violet-50/50 dark:bg-violet-900/10'
                      : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                      <ArrowRight className="h-3 w-3 text-violet-400" />
                    </div>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/staff');
                }}
                className="w-full text-center text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center justify-center gap-1"
              >
                Go to Staff Management
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OwnerNotificationBell;
