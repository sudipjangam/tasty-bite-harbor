import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { StaffShift, StaffShiftAssignment, ClockInStatus } from "@/types/staff";

interface TodayShiftWidgetProps {
  staffId: string;
  restaurantId: string;
  activeClockEntry?: {
    clock_in: string;
    clock_in_status?: ClockInStatus;
    minutes_variance?: number;
  } | null;
}

const TodayShiftWidget: React.FC<TodayShiftWidgetProps> = ({
  staffId,
  restaurantId,
  activeClockEntry
}) => {
  // Fetch today's shift assignment
  const { data: todayShift, isLoading } = useQuery({
    queryKey: ['staff-today-shift', staffId],
    queryFn: async () => {
      const today = new Date();
      const dayOfWeek = today.getDay();

      const { data, error } = await supabase
        .from('staff_shift_assignments')
        .select(`
          *,
          shifts(*)
        `)
        .eq('staff_id', staffId)
        .eq('restaurant_id', restaurantId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .lte('effective_from', format(today, 'yyyy-MM-dd'))
        .or(`effective_until.is.null,effective_until.gte.${format(today, 'yyyy-MM-dd')}`)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[TodayShiftWidget] Error:', error);
      }
      return data as (StaffShiftAssignment & { shifts: StaffShift }) | null;
    },
    enabled: !!staffId && !!restaurantId,
  });

  // Fetch weekly schedule
  const { data: weeklySchedule } = useQuery({
    queryKey: ['staff-weekly-schedule', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_shift_assignments')
        .select(`
          *,
          shifts(*)
        `)
        .eq('staff_id', staffId)
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('day_of_week', { ascending: true });

      if (error) {
        console.error('[TodayShiftWidget] Weekly schedule error:', error);
        return [];
      }
      return data as (StaffShiftAssignment & { shifts: StaffShift })[];
    },
    enabled: !!staffId && !!restaurantId,
  });

  // Format time helper
  const formatShiftTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  // Get day name
  const getDayName = (dayNum: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayNum];
  };

  // Get status styling
  const getStatusConfig = (status?: ClockInStatus) => {
    switch (status) {
      case 'early':
        return { bg: 'bg-blue-500', text: 'Early', icon: '⏰' };
      case 'on_time':
        return { bg: 'bg-green-500', text: 'On Time', icon: '✓' };
      case 'late':
        return { bg: 'bg-red-500', text: 'Late', icon: '⚠️' };
      default:
        return { bg: 'bg-gray-500', text: 'No Shift', icon: '•' };
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-slate-500 to-gray-600 text-white animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 bg-white/20 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-white/20 rounded w-3/4"></div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(activeClockEntry?.clock_in_status);

  return (
    <div className="space-y-4">
      {/* Today's Shift Card */}
      <Card className={`${
        todayShift 
          ? 'bg-gradient-to-r from-purple-500 to-pink-600' 
          : 'bg-gradient-to-r from-gray-500 to-slate-600'
      } text-white border-0 shadow-lg`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayShift?.shifts ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{todayShift.shifts.name}</div>
                  <div className="text-white/80 flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4" />
                    {formatShiftTime(todayShift.shifts.start_time)} - {formatShiftTime(todayShift.shifts.end_time)}
                  </div>
                </div>
                {activeClockEntry && (
                  <Badge className={`${statusConfig.bg} text-white text-sm px-3 py-1`}>
                    {statusConfig.icon} {statusConfig.text}
                    {activeClockEntry.minutes_variance !== 0 && (
                      <span className="ml-1">
                        ({activeClockEntry.minutes_variance! > 0 ? '+' : ''}{activeClockEntry.minutes_variance} min)
                      </span>
                    )}
                  </Badge>
                )}
              </div>

              {!activeClockEntry && (
                <div className="bg-white/20 rounded-lg p-3 flex items-center gap-2 mt-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>You haven't clocked in yet for this shift</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <div className="text-xl font-semibold">Day Off</div>
                <div className="text-white/70 text-sm">No shift assigned today</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      {weeklySchedule && weeklySchedule.length > 0 && (
        <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              My Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const assignment = weeklySchedule.find(a => a.day_of_week === day);
                const isToday = new Date().getDay() === day;
                
                return (
                  <div 
                    key={day}
                    className={`text-center p-2 rounded-lg ${
                      isToday 
                        ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className={`text-xs font-medium ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'}`}>
                      {getDayName(day)}
                    </div>
                    {assignment?.shifts ? (
                      <>
                        <div 
                          className="text-xs font-semibold mt-1 px-1 py-0.5 rounded"
                          style={{ backgroundColor: assignment.shifts.color || '#3B82F6', color: 'white' }}
                        >
                          {assignment.shifts.name.slice(0, 3)}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {formatShiftTime(assignment.shifts.start_time).replace(' ', '')}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-400 mt-1">Off</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TodayShiftWidget;
