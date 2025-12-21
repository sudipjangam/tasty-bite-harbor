import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  differenceInMinutes, 
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths
} from 'date-fns';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight, 
  Timer,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  ClipboardList
} from 'lucide-react';

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
    
    // Check if staffStatsMap has proper types if complex but keeping it simple for now
    // Using string as key for staffId
    const staffStatsMap = new Map<string, any>();
    
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
    
    // Calculate expected attendance vs actual (simplified)
    const expectedAttendance = staffList.length * daysInPeriod;
    // unique staff-day combinations in data
    const actualAttendanceDays = new Set(attendanceData.map(e => `${e.staff_id}-${format(new Date(e.clock_in), 'yyyy-MM-dd')}`)).size;
    const absentDays = Math.max(0, (expectedAttendance * 0.7) - actualAttendanceDays); // Rough estimate fix
    
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
      absentDays: Math.round(absentDays),
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      staffStats: Array.from(staffStatsMap.values())
        .filter((s:any) => s.daysWorked > 0)
        .sort((a:any, b:any) => b.hoursWorked - a.hoursWorked)
    };
  }, [attendanceData, staffList, dateRange, view]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (view === 'weekly') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const periodLabel = useMemo(() => {
    if (view === 'weekly') {
      return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  }, [dateRange, view, currentDate]);

  if (isLoading) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-6">
        <div className="flex justify-between mb-6">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>)}
        </div>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Attendance Report
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Employee punctuality details
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1 border border-gray-200 dark:border-gray-600">
              <Button
                size="sm"
                variant={view === 'weekly' ? 'default' : 'ghost'}
                className={`h-7 text-xs rounded-lg transition-all ${
                  view === 'weekly' 
                    ? 'bg-white text-violet-600 shadow-sm dark:bg-gray-600 dark:text-white' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
                onClick={() => setView('weekly')}
              >
                Weekly
              </Button>
              <Button
                size="sm"
                variant={view === 'monthly' ? 'default' : 'ghost'}
                className={`h-7 text-xs rounded-lg transition-all ${
                  view === 'monthly' 
                    ? 'bg-white text-violet-600 shadow-sm dark:bg-gray-600 dark:text-white' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
                onClick={() => setView('monthly')}
              >
                Monthly
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 bg-violet-50/50 dark:bg-violet-900/10 p-2 rounded-xl border border-violet-100 dark:border-violet-900/20">
          <Button variant="ghost" size="sm" onClick={() => navigatePeriod('prev')} className="h-8 w-8 p-0 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30">
            <ChevronLeft className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </Button>
          <span className="font-semibold text-sm text-violet-700 dark:text-violet-300">
            {periodLabel}
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigatePeriod('next')} className="h-8 w-8 p-0 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30">
            <ChevronRight className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-2xl p-3 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center justify-center text-center">
              <div className="mb-1 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <Timer className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{stats.totalHoursWorked}h</div>
              <div className="text-[10px] font-medium text-blue-600/70 uppercase tracking-wide">Total Hours</div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center justify-center text-center">
              <div className="mb-1 p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.onTimeRate}%</div>
              <div className="text-[10px] font-medium text-emerald-600/70 uppercase tracking-wide">On-Time</div>
            </div>
            
            <div className={`bg-gradient-to-br rounded-2xl p-3 border flex flex-col items-center justify-center text-center ${
              stats.lateCount > 0 
                ? 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10 border-orange-100 dark:border-orange-900/30' 
                : 'from-gray-50 to-slate-50 dark:from-gray-800/20 dark:to-slate-900/10 border-gray-100 dark:border-gray-700'
            }`}>
              <div className={`mb-1 p-1.5 rounded-lg ${
                stats.lateCount > 0 
                 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' 
                 : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className={`text-xl font-bold ${stats.lateCount > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-gray-600'}`}>
                {stats.lateCount}
              </div>
              <div className={`text-[10px] font-medium uppercase tracking-wide ${stats.lateCount > 0 ? 'text-orange-600/70' : 'text-gray-500'}`}>
                Late Arrivals
              </div>
            </div>
            
            <div className={`bg-gradient-to-br rounded-2xl p-3 border flex flex-col items-center justify-center text-center ${
              stats.overtimeHours > 0 
                ? 'from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/10 border-purple-100 dark:border-purple-900/30' 
                : 'from-gray-50 to-slate-50 dark:from-gray-800/20 dark:to-slate-900/10 border-gray-100 dark:border-gray-700'
            }`}>
              <div className={`mb-1 p-1.5 rounded-lg ${
                stats.overtimeHours > 0 
                 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                 : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className={`text-xl font-bold ${stats.overtimeHours > 0 ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600'}`}>
                {stats.overtimeHours}h
              </div>
              <div className={`text-[10px] font-medium uppercase tracking-wide ${stats.overtimeHours > 0 ? 'text-purple-600/70' : 'text-gray-500'}`}>
                Overtime
              </div>
            </div>
          </div>

          {/* Staff Breakdown */}
          {stats.staffStats.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                Staff Performance Breakdown
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {stats.staffStats.slice(0, 10).map((staff:any) => (
                  <div key={staff.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <div className="font-medium text-sm text-gray-800 dark:text-gray-200">{staff.name}</div>
                      {staff.position && (
                        <div className="text-[10px] text-gray-500">{staff.position}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{Math.round(staff.hoursWorked * 10) / 10}h</div>
                        <div className="text-[10px] text-gray-400">worked</div>
                      </div>
                      
                      <div className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 min-w-[70px] justify-center ${
                         staff.lateCount === 0 
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                          : staff.lateCount <= 1
                          ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                         {staff.lateCount === 0 ? (
                           <>
                             <CheckCircle2 className="h-3 w-3" />
                             Perfect
                           </>
                         ) : (
                           <>
                             <AlertTriangle className="h-3 w-3" />
                             {staff.lateCount} Late
                           </>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceReportsWidget;
