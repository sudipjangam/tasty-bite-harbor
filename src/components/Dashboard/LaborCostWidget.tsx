import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useCurrency } from "@/hooks/useCurrency";
import { 
  DollarSign, Clock, TrendingUp, TrendingDown, Users, 
  ChevronLeft, ChevronRight, AlertTriangle
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks, differenceInMinutes } from "date-fns";

const LaborCostWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { symbol: currencySymbol } = useCurrency();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Date range for current week
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  
  // Previous week for comparison
  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = subWeeks(weekEnd, 1);

  // Fetch staff with hourly rates
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-with-rates', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, position, hourly_rate')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active');
      if (error) throw error;
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
      const staff = staffData.find(s => s.id === entry.staff_id);
      const hourlyRate = staff?.hourly_rate || DEFAULT_HOURLY_RATE;
      
      staffHours[entry.staff_id] = (staffHours[entry.staff_id] || 0) + hours;
      totalHours += hours;
    });

    // Calculate costs with overtime
    Object.entries(staffHours).forEach(([staffId, hours]) => {
      const staff = staffData.find(s => s.id === staffId);
      const hourlyRate = staff?.hourly_rate || DEFAULT_HOURLY_RATE;
      
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
          name: staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown',
          hours: currentWeekStats.staffHours[staffId] || 0,
          cost
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [currentWeekStats, staffList]);

  // Overtime alerts
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
    setCurrentWeek(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Labor Costs
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-green-600">Total Cost</span>
              {costChange !== 0 && (
                <Badge className={`text-xs ${costChange > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                  {costChange > 0 ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />}
                  {Math.abs(Math.round(costChange))}%
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {currencySymbol}{Math.round(currentWeekStats.totalCost).toLocaleString()}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-blue-600">Total Hours</span>
              {hoursChange !== 0 && (
                <Badge variant="outline" className="text-xs">
                  {hoursChange > 0 ? '+' : ''}{Math.round(hoursChange)}%
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {Math.round(currentWeekStats.totalHours)}h
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50 rounded-xl p-3">
            <span className="text-sm text-gray-600">Regular Hours</span>
            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
              {Math.round(currentWeekStats.regularHours)}h
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-3">
            <span className="text-sm text-orange-600">Overtime</span>
            <div className="text-xl font-bold text-orange-700 dark:text-orange-400">
              {Math.round(currentWeekStats.overtimeHours)}h
            </div>
          </div>
        </div>

        {/* Overtime Alerts */}
        {overtimeStaff.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-medium text-sm mb-2">
              <AlertTriangle className="h-4 w-4" />
              {overtimeStaff.length} staff with overtime this week
            </div>
            <div className="space-y-1">
              {overtimeStaff.slice(0, 3).map((staff, idx) => (
                <div key={idx} className="text-xs text-orange-600 dark:text-orange-400">
                  • {staff.name}: {Math.round(staff.hours)}h total ({Math.round(staff.overtime)}h OT)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Earners */}
        {topEarners.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top by Cost
            </div>
            <div className="space-y-1">
              {topEarners.slice(0, 3).map((staff, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <span>{staff.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(staff.hours)}h
                    </Badge>
                    <span className="font-medium text-green-600">
                      {currencySymbol}{Math.round(staff.cost).toLocaleString()}
                    </span>
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

export default LaborCostWidget;
