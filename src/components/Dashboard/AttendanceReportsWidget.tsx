import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { 
  Calendar, Clock, TrendingUp, AlertTriangle, CheckCircle2, 
  ChevronLeft, ChevronRight, Download, Users, Timer
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, addWeeks, addMonths, differenceInMinutes, eachDayOfInterval } from "date-fns";

interface AttendanceReportsWidgetProps {
  onExport?: () => void;
}

const AttendanceReportsWidget: React.FC<AttendanceReportsWidgetProps> = ({ onExport }) => {
  const { restaurantId } = useRestaurantId();
  const [view, setView] = useState<'weekly' | 'monthly'>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    if (view === 'weekly') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 })
      };
    } else {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      };
    }
  }, [view, currentDate]);

  // Fetch attendance data for the period
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-report', restaurantId, dateRange.start, dateRange.end],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('staff_time_clock')
        .select(`
          *,
          staff(id, first_name, last_name, position)
        `)
        .eq('restaurant_id', restaurantId)
        .gte('clock_in', dateRange.start.toISOString())
        .lte('clock_in', dateRange.end.toISOString());
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch staff list
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list-report', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, position')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!attendanceData || !staffList.length) {
      return {
        totalHoursWorked: 0,
        avgHoursPerDay: 0,
        onTimeRate: 0,
        lateCount: 0,
        earlyCount: 0,
        absentDays: 0,
        overtimeHours: 0,
        staffStats: []
      };
    }

    let totalMinutes = 0;
    let lateCount = 0;
    let earlyCount = 0;
    let onTimeCount = 0;
    const daysInPeriod = eachDayOfInterval({ start: dateRange.start, end: dateRange.end }).length;
    
    const staffStatsMap = new Map();
    
    // Initialize staff stats
    staffList.forEach(staff => {
      staffStatsMap.set(staff.id, {
        id: staff.id,
        name: `${staff.first_name} ${staff.last_name}`,
        position: staff.position,
        hoursWorked: 0,
        daysWorked: 0,
        lateCount: 0,
        onTimeCount: 0,
        avgClockIn: null
      });
    });

    attendanceData.forEach(entry => {
      const staffStat = staffStatsMap.get(entry.staff_id);
      if (!staffStat) return;

      // Calculate hours worked
      if (entry.clock_in && entry.clock_out) {
        const minutes = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in));
        totalMinutes += minutes;
        staffStat.hoursWorked += minutes / 60;
      }
      
      staffStat.daysWorked++;

      // Count clock-in status
      if (entry.clock_in_status === 'late') {
        lateCount++;
        staffStat.lateCount++;
      } else if (entry.clock_in_status === 'early') {
        earlyCount++;
      } else if (entry.clock_in_status === 'on_time') {
        onTimeCount++;
        staffStat.onTimeCount++;
      }
    });

    const totalEntries = attendanceData.length;
    const onTimeRate = totalEntries > 0 ? ((onTimeCount + earlyCount) / totalEntries * 100) : 0;
    const totalHours = totalMinutes / 60;
    const avgHoursPerDay = daysInPeriod > 0 ? totalHours / daysInPeriod : 0;
    
    // Calculate expected attendance vs actual
    const expectedAttendance = staffList.length * daysInPeriod;
    const absentDays = Math.max(0, expectedAttendance - new Set(attendanceData.map(e => `${e.staff_id}-${format(new Date(e.clock_in), 'yyyy-MM-dd')}`)).size);
    
    // Overtime (assuming 8 hours/day, 40 hours/week standard)
    const standardHoursPerWeek = 40;
    const weeksInPeriod = view === 'weekly' ? 1 : 4;
    const standardHours = staffList.length * standardHoursPerWeek * weeksInPeriod;
    const overtimeHours = Math.max(0, totalHours - standardHours);

    return {
      totalHoursWorked: Math.round(totalHours * 10) / 10,
      avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
      onTimeRate: Math.round(onTimeRate),
      lateCount,
      earlyCount,
      absentDays,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      staffStats: Array.from(staffStatsMap.values())
        .filter(s => s.daysWorked > 0)
        .sort((a, b) => b.hoursWorked - a.hoursWorked)
    };
  }, [attendanceData, staffList, dateRange, view]);

  // Navigate periods
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (view === 'weekly') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const periodLabel = view === 'weekly'
    ? `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy');

  if (isLoading) {
    return (
      <Card className="animate-pulse">
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
    <Card className="bg-white/90 dark:bg-gray-800/90">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            Attendance Report
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Button
                size="sm"
                variant={view === 'weekly' ? 'default' : 'ghost'}
                className="h-7 text-xs"
                onClick={() => setView('weekly')}
              >
                Weekly
              </Button>
              <Button
                size="sm"
                variant={view === 'monthly' ? 'default' : 'ghost'}
                className="h-7 text-xs"
                onClick={() => setView('monthly')}
              >
                Monthly
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="sm" onClick={() => navigatePeriod('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">{periodLabel}</span>
          <Button variant="ghost" size="sm" onClick={() => navigatePeriod('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 text-center">
            <Timer className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats.totalHoursWorked}h</div>
            <div className="text-xs text-blue-600">Total Hours</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-green-700 dark:text-green-400">{stats.onTimeRate}%</div>
            <div className="text-xs text-green-600">On-Time Rate</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-3 text-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-orange-700 dark:text-orange-400">{stats.lateCount}</div>
            <div className="text-xs text-orange-600">Late Arrivals</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 text-center">
            <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <div className="text-xl font-bold text-purple-700 dark:text-purple-400">{stats.overtimeHours}h</div>
            <div className="text-xs text-purple-600">Overtime</div>
          </div>
        </div>

        {/* Staff Breakdown */}
        {stats.staffStats.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff Performance
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.staffStats.slice(0, 5).map(staff => (
                <div key={staff.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{staff.name}</span>
                    {staff.position && (
                      <span className="text-gray-500 ml-1 text-xs">({staff.position})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(staff.hoursWorked * 10) / 10}h
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        staff.lateCount === 0 ? 'bg-green-500' : 
                        staff.lateCount <= 2 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-xs text-gray-500">
                        {staff.lateCount > 0 ? `${staff.lateCount} late` : 'All on-time'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceReportsWidget;
