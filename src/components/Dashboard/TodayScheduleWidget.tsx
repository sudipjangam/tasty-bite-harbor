import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { Card, CardContent } from "@/components/ui/card";
import { format, addDays, subDays } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, Sunrise, Sunset, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShiftData {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface AssignmentData {
  id: string;
  shift_id: string;
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    position: string;
  };
}

const TodayScheduleWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dayOfWeek = selectedDate.getDay();

  // Fetch all shifts for the restaurant
  const { data: shifts } = useQuery({
    queryKey: ['restaurant-shifts', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('start_time');
      
      if (error) throw error;
      return data as ShiftData[];
    },
    enabled: !!restaurantId,
  });

  // Fetch today's shift assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['today-schedule', restaurantId, dayOfWeek],
    queryFn: async () => {
      if (!restaurantId) return [];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('staff_shift_assignments')
        .select(`
          id,
          staff_id,
          shift_id,
          day_of_week,
          staff!inner(id, first_name, last_name, position),
          shifts!inner(id, name, start_time, end_time, color)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .lte('effective_from', dateStr)
        .or(`effective_until.is.null,effective_until.gte.${dateStr}`);
      
      if (error) {
        console.error('Error fetching schedule:', error);
        return [];
      }
      return (data || []) as unknown as AssignmentData[];
    },
    enabled: !!restaurantId,
  });

  // Group assignments by shift
  const assignmentsByShift = React.useMemo(() => {
    if (!assignments || !shifts) return {};
    
    const grouped: Record<string, AssignmentData[]> = {};
    shifts.forEach(shift => {
      grouped[shift.id] = assignments.filter(a => a.shift_id === shift.id);
    });
    return grouped;
  }, [assignments, shifts]);

  // Get shift icon
  const getShiftIcon = (shiftName: string) => {
    const name = shiftName.toLowerCase();
    if (name.includes('morning')) return <Sunrise className="h-4 w-4" />;
    if (name.includes('evening')) return <Sunset className="h-4 w-4" />;
    if (name.includes('night')) return <Moon className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  // Format time
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Navigate dates
  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/20">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Staff Schedule
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Daily shift assignments
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-gray-700"
          onClick={() => navigateDate('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-semibold min-w-[120px] text-center text-gray-700 dark:text-gray-200">
          {isToday ? 'Today' : format(selectedDate, 'EEE, MMM d')}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-gray-700"
          onClick={() => navigateDate('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <CardContent className="p-6">
        {renderHeader()}
        
        {shifts && shifts.length > 0 ? (
          <div className="space-y-3">
            {shifts.map(shift => {
              const shiftAssignments = assignmentsByShift[shift.id];
              return (
                <div 
                  key={shift.id} 
                  className="group relative overflow-hidden bg-white/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 transition-all duration-200 hover:bg-white dark:hover:bg-gray-900 shadow-sm hover:shadow-md"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    shift.name.toLowerCase().includes('morning') ? 'bg-amber-400' :
                    shift.name.toLowerCase().includes('evening') ? 'bg-indigo-400' :
                    'bg-purple-400'
                  }`}></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-3">
                    <div className="flex items-center gap-3 min-w-[150px]">
                      <div className={`p-2 rounded-lg ${
                         shift.name.toLowerCase().includes('morning') ? 'bg-amber-100/50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                         shift.name.toLowerCase().includes('evening') ? 'bg-indigo-100/50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' :
                         'bg-purple-100/50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                      }`}>
                        {getShiftIcon(shift.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                          {shift.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {formatTime(shift.start_time)}
                          </span>
                          <span>-</span>
                          <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {formatTime(shift.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      {shiftAssignments && shiftAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {shiftAssignments.map(assignment => (
                            <div 
                              key={assignment.id} 
                              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm"
                            >
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                {assignment.staff.first_name[0]}{assignment.staff.last_name[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                  {assignment.staff.first_name} {assignment.staff.last_name}
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-none">
                                  {assignment.staff.position}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          No staff assigned
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs font-medium text-gray-400 shrink-0 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {shiftAssignments?.length || 0}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No shifts configured for this day</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayScheduleWidget;
