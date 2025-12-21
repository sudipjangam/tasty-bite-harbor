import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellOff, 
  CheckCircle2, 
  Clock, 
  ClipboardCheck,
  Home,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StaffNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

interface StaffTaskDashboardProps {
  staffId: string;
}

const StaffTaskDashboard: React.FC<StaffTaskDashboardProps> = ({ staffId }) => {
  const { restaurantId } = useRestaurantId();
  const queryClient = useQueryClient();

  // Fetch staff notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['staff-notifications', staffId],
    queryFn: async () => {
      if (!staffId || !restaurantId) return [];
      
      const { data, error } = await supabase
        .from('staff_notifications')
        .select('*')
        .eq('staff_id', staffId)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as StaffNotification[];
    },
    enabled: !!staffId && !!restaurantId,
  });

  // Fetch assigned cleaning tasks for this staff
  const { data: assignedTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['staff-cleaning-tasks', staffId],
    queryFn: async () => {
      if (!staffId || !restaurantId) return [];
      
      const { data, error } = await supabase
        .from('room_cleaning_schedules')
        .select(`
          *,
          rooms(name)
        `)
        .eq('assigned_staff_id', staffId)
        .eq('restaurant_id', restaurantId)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!staffId && !!restaurantId,
  });

  // Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('staff_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
    }
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!staffId) return;
      
      const { error } = await supabase
        .from('staff_notifications')
        .update({ is_read: true })
        .eq('staff_id', staffId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
    }
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const pendingTasks = assignedTasks?.filter(t => t.status === 'pending').length || 0;
  const inProgressTasks = assignedTasks?.filter(t => t.status === 'in_progress').length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <ClipboardCheck className="h-4 w-4 text-purple-500" />;
      case 'reminder':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Tasks */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 p-4 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/80 font-medium uppercase tracking-wider">Pending Tasks</p>
              <p className="text-2xl font-bold text-white">{pendingTasks}</p>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/80 font-medium uppercase tracking-wider">In Progress</p>
              <p className="text-2xl font-bold text-white">{inProgressTasks}</p>
            </div>
          </div>
        </div>

        {/* Unread Notifications */}
        <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/80 font-medium uppercase tracking-wider">Notifications</p>
              <p className="text-2xl font-bold text-white">{unreadCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Tasks */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-purple-500" />
              My Assigned Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {tasksLoading ? (
                <div className="text-center py-8 text-gray-500">Loading tasks...</div>
              ) : assignedTasks?.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-gray-500">No pending tasks! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedTasks?.map((task) => (
                    <div 
                      key={task.id}
                      className={`p-3 rounded-lg border ${
                        task.priority === 'urgent' 
                          ? 'border-l-4 border-l-red-500 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{task.rooms?.name}</span>
                          {task.priority === 'urgent' && (
                            <Badge variant="destructive" className="text-xs">
                              🔥 Urgent
                            </Badge>
                          )}
                        </div>
                        <Badge className={`${
                          task.status === 'in_progress' 
                            ? 'bg-blue-500' 
                            : 'bg-orange-500'
                        } text-white text-xs`}>
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        Type: {task.cleaning_type.replace('_', ' ')}
                      </p>
                      {task.notes && (
                        <p className="text-xs text-gray-500 mt-1">📝 {task.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-purple-500" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs">{unreadCount}</Badge>
                )}
              </CardTitle>
              {unreadCount > 0 && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >
                  <BellOff className="h-4 w-4 mr-1" />
                  Mark All Read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {notificationsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading notifications...</div>
              ) : notifications?.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications?.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                        notification.is_read
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
                          : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markReadMutation.mutate(notification.id);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffTaskDashboard;
