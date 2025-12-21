import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Sparkles, Wrench, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RoomStatusWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const navigate = useNavigate();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms-overview', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      console.log('[RoomStatusWidget] Fetching rooms for restaurant:', restaurantId);
      
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');
      
      if (error) {
        console.error('[RoomStatusWidget] Error fetching rooms:', error);
        throw error;
      }
      
      console.log('[RoomStatusWidget] Fetched rooms:', data);
      return data;
    },
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return (
      <Card className="bg-white/90 dark:bg-gray-800/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bed className="h-5 w-5" />
            Room Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const statusCounts = {
    available: rooms?.filter(r => r.status === 'available').length || 0,
    occupied: rooms?.filter(r => r.status === 'occupied').length || 0,
    cleaning: rooms?.filter(r => r.status === 'cleaning').length || 0,
    maintenance: rooms?.filter(r => r.status === 'maintenance').length || 0,
  };

  const statusConfig = {
    available: { bg: 'bg-gradient-to-r from-emerald-500 to-green-500', icon: CheckCircle2, label: 'Available' },
    occupied: { bg: 'bg-gradient-to-r from-blue-500 to-cyan-500', icon: Bed, label: 'Occupied' },
    cleaning: { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', icon: Sparkles, label: 'Cleaning' },
    maintenance: { bg: 'bg-gradient-to-r from-red-500 to-rose-500', icon: Wrench, label: 'Maintenance' },
  };

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => navigate('/rooms')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
            <Bed className="h-5 w-5 text-white" />
          </div>
          Room Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const count = statusCounts[status as keyof typeof statusCounts];
            
            return (
              <div key={status} className={`${config.bg} rounded-xl p-4 text-white shadow-lg`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase opacity-90">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Room list */}
        <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
          {rooms?.map((room) => (
            <div key={room.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-sm">{room.name}</span>
              </div>
              <Badge className={`${statusConfig[room.status as keyof typeof statusConfig]?.bg || 'bg-gray-500'} text-white text-xs`}>
                {room.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomStatusWidget;
