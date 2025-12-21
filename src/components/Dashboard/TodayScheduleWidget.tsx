import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { Calendar, Clock, Users, Sunrise, Sunset, Moon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays } from "date-fns";

interface ShiftData {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface AssignmentData {
  id: string;
  staff_id: string;
  shift_id: string;
  day_of_week: number;
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    position: string;
  };
  shifts: ShiftData;
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

  if (isLoading) {
    return (
      <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            Staff Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[120px] text-center">
              {isToday ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {shifts && shifts.length > 0 ? (
          <div className="space-y-3">
            {shifts.map(shift => {
              const shiftAssignments = assignmentsByShift[shift.id] || [];
              
              return (
                <div 
                  key={shift.id}
                  className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
                  style={{ borderLeftColor: shift.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getShiftIcon(shift.name)}
                      <span className="font-medium">{shift.name}</span>
                      <Badge 
                        className="text-xs text-white"
                        style={{ backgroundColor: shift.color }}
                      >
                        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-3 w-3" />
                      <span>{shiftAssignments.length}</span>
                    </div>
                  </div>
                  
                  {shiftAssignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {shiftAssignments.map(assignment => (
                        <Badge 
                          key={assignment.id}
                          variant="secondary"
                          className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                        >
                          {assignment.staff.first_name} {assignment.staff.last_name}
                          {assignment.staff.position && (
                            <span className="text-gray-500 ml-1">({assignment.staff.position})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">No staff assigned</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No shifts configured</p>
            <p className="text-sm">Add shifts in settings to see the schedule</p>
          </div>
        )}

        {/* Summary */}
        {assignments && assignments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total staff scheduled:</span>
              <Badge variant="outline" className="font-bold">
                {assignments.length} staff
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayScheduleWidget;
