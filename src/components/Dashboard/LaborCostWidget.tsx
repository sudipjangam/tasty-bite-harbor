import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { useCurrencyContext } from '@/contexts/CurrencyContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { startOfWeek, endOfWeek, subWeeks, format, differenceInMinutes, addDays, subDays } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Clock,
  Briefcase
} from 'lucide-react';

const LaborCostWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrencyContext();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Date range for current week
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  
  // Previous week for comparison
  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = subWeeks(weekEnd, 1);

  // Fetch staff with salary (hourly_rate calculated from salary)
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-with-rates', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, position, salary, salary_type')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active');
      if (error) {
        console.log('Error fetching staff:', error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch time clock entries for current week
  const { data: currentWeekEntries = [], isLoading } = useQuery({
    queryKey: ['labor-entries-current', restaurantId, weekStart.toISOString()],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('staff_time_clock')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('clock_in', weekStart.toISOString())
        .lte('clock_in', weekEnd.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch previous week for comparison
  const { data: prevWeekEntries = [] } = useQuery({
    queryKey: ['labor-entries-prev', restaurantId, prevWeekStart.toISOString()],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('staff_time_clock')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('clock_in', prevWeekStart.toISOString())
        .lte('clock_in', prevWeekEnd.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Calculate labor costs
  const calculateCosts = (entries: any[], staffData: any[]) => {
    const DEFAULT_HOURLY_RATE = 150; // Default rate if not set
    const OVERTIME_MULTIPLIER = 1.5;
    const STANDARD_HOURS_PER_WEEK = 40;
    
    let totalCost = 0;
    let totalHours = 0;
    let overtimeHours = 0;
    let regularHours = 0;
    const staffHours: Record<string, number> = {};
    const staffCosts: Record<string, number> = {};

    entries.forEach(entry => {
      if (!entry.clock_in || !entry.clock_out) return;
      
      const hours = differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in)) / 60;
      // We don't modify the object inside forEach, we use staffHours map
      staffHours[entry.staff_id] = (staffHours[entry.staff_id] || 0) + hours;
      totalHours += hours;
    });

    // Calculate costs with overtime
    Object.entries(staffHours).forEach(([staffId, hours]) => {
      const staff = staffData.find(s => s.id === staffId);
      const hourlyRate = staff?.salary ? (staff.salary_type === 'hourly' ? staff.salary : staff.salary / 160) : DEFAULT_HOURLY_RATE;
      
      if (hours > STANDARD_HOURS_PER_WEEK) {
        const overHours = hours - STANDARD_HOURS_PER_WEEK;
        const regHours = STANDARD_HOURS_PER_WEEK;
        overtimeHours += overHours;
        regularHours += regHours;
        const cost = (regHours * hourlyRate) + (overHours * hourlyRate * OVERTIME_MULTIPLIER);
        staffCosts[staffId] = cost;
        totalCost += cost;
      } else {
        regularHours += hours;
        const cost = hours * hourlyRate;
        staffCosts[staffId] = cost;
        totalCost += cost;
      }
    });

    return { totalCost, totalHours, regularHours, overtimeHours, staffHours, staffCosts };
  };

  const currentWeekStats = useMemo(() => 
    calculateCosts(currentWeekEntries, staffList), 
    [currentWeekEntries, staffList]
  );
  
  const prevWeekStats = useMemo(() => 
    calculateCosts(prevWeekEntries, staffList), 
    [prevWeekEntries, staffList]
  );

  // Calculate percentage change
  const costChange = prevWeekStats.totalCost > 0 
    ? ((currentWeekStats.totalCost - prevWeekStats.totalCost) / prevWeekStats.totalCost * 100)
    : 0;

  const hoursChange = prevWeekStats.totalHours > 0 
    ? ((currentWeekStats.totalHours - prevWeekStats.totalHours) / prevWeekStats.totalHours * 100)
    : 0;

  // Top earners
  const topEarners = useMemo(() => {
    return Object.entries(currentWeekStats.staffCosts)
      .map(([staffId, cost]) => {
        const staff = staffList.find(s => s.id === staffId);
        return {
          id: staffId,
          name: staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown Staff',
          cost,
          hours: currentWeekStats.staffHours[staffId] || 0
        };
      })
      .sort((a, b) => b.cost - a.cost);
  }, [currentWeekStats, staffList]);

  // Identify staff with overtime
  const overtimeStaff = useMemo(() => {
    return Object.entries(currentWeekStats.staffHours)
      .filter(([_, hours]) => hours > 40)
      .map(([staffId, hours]) => {
         const staff = staffList.find(s => s.id === staffId);
         return {
           name: staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown',
           hours,
           overtime: hours - 40
         };
      });
  }, [currentWeekStats, staffList]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'next' ? addDays(prev, 7) : subDays(prev, 7));
  };  

  if (isLoading) {
    return (
       <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-6">
         <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
         <div className="grid grid-cols-2 gap-4">
           {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>)}
         </div>
       </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl shadow-lg shadow-pink-500/20">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Labor Costs
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Weekly payroll & expense tracking
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
             <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')} className="h-8 w-8 p-0 rounded-lg">
               <ChevronLeft className="h-4 w-4" />
             </Button>
             <span className="text-xs font-semibold min-w-[100px] text-center text-gray-700 dark:text-gray-200">
               {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
             </span>
             <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')} className="h-8 w-8 p-0 rounded-lg">
               <ChevronRight className="h-4 w-4" />
             </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 transition-transform hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Total Cost</span>
                {costChange !== 0 && (
                  <Badge className={`text-[10px] h-5 px-1.5 ${costChange > 0 ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                    {costChange > 0 ? '+' : ''}{Math.round(costChange)}%
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-green-800 dark:text-green-400">
                {currencySymbol}{Math.round(currentWeekStats.totalCost).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 transition-transform hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Total Hours</span>
                {hoursChange !== 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                    {hoursChange > 0 ? '+' : ''}{Math.round(hoursChange)}%
                  </Badge>
                )}
              </div>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-400">
                {Math.round(currentWeekStats.totalHours)}h
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Regular Hours</span>
              <div className="text-xl font-bold text-gray-700 dark:text-gray-200 mt-1">
                {Math.round(currentWeekStats.regularHours)}h
              </div>
            </div>

            <div className={`rounded-2xl p-4 border shadow-sm ${
              currentWeekStats.overtimeHours > 0 
                ? 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/30' 
                : 'bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-700'
            }`}>
              <span className={`text-xs font-semibold uppercase tracking-wide ${
                currentWeekStats.overtimeHours > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'
              }`}>Overtime</span>
              <div className={`text-xl font-bold mt-1 ${
                currentWeekStats.overtimeHours > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-200'
              }`}>
                {Math.round(currentWeekStats.overtimeHours)}h
              </div>
            </div>
          </div>

          {/* Overtime Alerts */}
          {overtimeStaff.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-3 animate-pulse-slow">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-xs mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Overtime Alert: {overtimeStaff.length} staff exceeded 40h
              </div>
              <div className="space-y-1 pl-5">
                {overtimeStaff.slice(0, 3).map((staff, idx) => (
                  <div key={idx} className="text-xs text-red-600 dark:text-red-300">
                    • <span className="font-medium">{staff.name}</span>: {Math.round(staff.hours)}h total ({Math.round(staff.overtime)}h OT)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Earners */}
          {topEarners.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Briefcase className="h-3 w-3" />
                Staff Cost Breakdown
              </div>
              <div className="space-y-2">
                {topEarners.slice(0, 3).map((staff, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-gray-400 w-4 text-center">{idx + 1}</span>
                       <span className="font-medium text-gray-700 dark:text-gray-200">{staff.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-[10px] h-5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {Math.round(staff.hours)}h
                      </Badge>
                      <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                        {currencySymbol}{Math.round(staff.cost).toLocaleString()}
                      </span>
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

export default LaborCostWidget;
