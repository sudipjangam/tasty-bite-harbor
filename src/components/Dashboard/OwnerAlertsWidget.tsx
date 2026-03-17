import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  BellOff,
  CalendarDays,
  Clock,
  ArrowRight,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface OwnerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  staff_name: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Dashboard widget showing recent owner notifications (leave requests, late punches).
 * Only renders for users with staff.view permission.
 */
const OwnerAlertsWidget: React.FC = () => {
  const { hasPermission } = useAuth();
  const { restaurantId } = useRestaurantId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isOwnerOrAdmin = hasPermission('staff.view' as any);

  const { data: notifications = [], isLoading } = useQuery<OwnerNotification[]>({
    queryKey: ['owner-notifications', restaurantId],
    enabled: !!restaurantId && isOwnerOrAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owner_notifications')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as OwnerNotification[];
    },
  });

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'leave_request':
        return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-[10px]">Leave</Badge>;
      case 'late_punch':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">Late</Badge>;
      case 'missed_punch':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">Missed</Badge>;
      default:
        return null;
    }
  };

  if (!isOwnerOrAdmin) return null;

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 rounded-3xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border-b border-gray-100 dark:border-gray-700">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Staff Alerts
            </span>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs ml-1">{unreadCount} new</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            onClick={() => navigate('/staff')}
          >
            View All
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No staff alerts</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              You'll see leave requests & attendance issues here
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                    !n.is_read
                      ? 'bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800'
                      : 'bg-gray-50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                  }`}
                  onClick={() => {
                    if (!n.is_read) markReadMutation.mutate(n.id);
                    navigate(n.action_url || '/staff');
                  }}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      {getTypeBadge(n.type)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(n.id);
                      }}
                      className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default OwnerAlertsWidget;
