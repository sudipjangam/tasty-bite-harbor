import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantId } from '@/hooks/useRestaurantId';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Users, Clock, AlertCircle, CheckCircle2, UserX } from 'lucide-react';
import { StaffMember } from '@/types/staff';

interface FilterType {
  status: 'clockedIn' | 'late' | 'notArrived' | 'all';
}

const StaffAttendanceWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [clockingOutIds, setClockingOutIds] = useState<Set<string>>(new Set());

  // Fetch all staff
  const { data: allStaff } = useQuery({
    queryKey: ['all-staff', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  // Fetch today's clock-ins
  const { data: todayClockIns, isLoading, refetch } = useQuery({
    queryKey: ['today-attendance', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('staff_time_clock')
        .select(`
          *,
          staff!inner(id, first_name, last_name),
          shifts(name, color)
        `)
        .eq('restaurant_id', restaurantId)
        .gte('clock_in', `${today}T00:00:00`)
        .lte('clock_in', `${today}T23:59:59`);
      
      if (error) {
        console.error('Attendance query error:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!restaurantId,
    refetchInterval: 60000,
  });

  // Auto clock-out mutation
  const autoClockOutMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('staff_time_clock')
        .update({ 
          clock_out: new Date().toISOString(),
          auto_clocked_out: true,
          notes: 'Auto clocked out by manager - exceeded 12 hours'
        })
        .eq('id', entryId);
      
      if (error) throw error;
      return entryId;
    },
    onMutate: (entryId) => {
      setClockingOutIds(prev => new Set(prev).add(entryId));
    },
    onSuccess: (entryId) => {
      toast({
        title: "Auto Clock-Out Successful",
        description: "Staff member has been clocked out.",
      });
      setClockingOutIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      refetch();
    },
    onError: (error, entryId) => {
      toast({
        title: "Error",
        description: "Failed to clock out staff member.",
        variant: "destructive",
      });
      setClockingOutIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    },
  });

  // Calculate stats
  const totalStaff = allStaff?.length || 0;
  const clockedInEntries = todayClockIns?.filter(e => !e.clock_out) || [];
  const clockedIn = clockedInEntries.length;
  const lateEntries = todayClockIns?.filter(e => e.clock_in_status === 'late') || [];
  const lateArrivals = lateEntries.length;
  const staffWhoClocked = new Set(todayClockIns?.map(e => e.staff_id));
  const notArrivedStaff = allStaff?.filter(s => !staffWhoClocked.has(s.id)) || [];
  const notArrived = notArrivedStaff.length;

  // Get currently clocked in staff with stale entries (>12 hours)
  const staleEntries = todayClockIns?.filter(e => {
    if (e.clock_out) return false;
    const clockInTime = new Date(e.clock_in);
    const hoursElapsed = (Date.now() - clockInTime.getTime()) / (1000 * 60 * 60);
    return hoursElapsed > 12;
  }) || [];

  // Get staff list based on selected filter
  const getFilteredStaffList = () => {
    switch (selectedFilter) {
      case 'clockedIn':
        return clockedInEntries.map(e => ({
          id: e.id, // Time clock id specific
          name: `${e.staff?.first_name} ${e.staff?.last_name}`,
          status: 'Clocked In',
          time: new Date(e.clock_in),
          isStale: staleEntries.some(s => s.id === e.id),
          badge: e.shifts?.name,
          badgeColor: e.shifts?.color
        }));
      case 'late':
        return lateEntries.map(e => ({
          id: e.id,
          name: `${e.staff?.first_name} ${e.staff?.last_name}`,
          status: 'Late Arrival',
          time: new Date(e.clock_in),
          isStale: false,
          badge: e.shifts?.name,
          badgeColor: e.shifts?.color
        }));
      case 'notArrived':
        return notArrivedStaff.map(s => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          status: 'Not Arrived',
          time: null,
          isStale: false,
          badge: undefined,
          badgeColor: undefined
        }));
      default:
        return [];
    }
  };

  const handleStatClick = (filter: string) => {
    setSelectedFilter(prev => prev === filter ? null : filter);
  };

  const handleAutoClockOut = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    autoClockOutMutation.mutate(entryId);
  };

  if (isLoading) {
    return (
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </Card>
    );
  }

  const statCards = [
    {
      label: "Clocked In",
      value: clockedIn,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      border: "border-green-200 dark:border-green-800/30",
      key: 'clockedIn'
    },
    {
      label: "Not Arrived",
      value: notArrived,
      icon: UserX,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-800/30",
      border: "border-gray-200 dark:border-gray-700",
      key: 'notArrived'
    },
    {
      label: "Late Today",
      value: lateArrivals,
      icon: AlertCircle,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/30",
      border: "border-orange-200 dark:border-orange-800/30",
      key: 'late'
    },
    {
      label: "Total Staff",
      value: totalStaff,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
      border: "border-blue-200 dark:border-blue-800/30",
      key: null
    }
  ];

  const filteredStaff = getFilteredStaffList();

  return (
    <Card className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Staff Attendance
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Track daily attendance & timeliness
              </p>
            </div>
          </div>
          
          <div className="text-xs font-medium px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 text-center">
            {format(new Date(), 'EEEE, MMMM d')}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            const isSelected = selectedFilter === stat.key;
            
            return (
              <div 
                key={i}
                onClick={() => stat.key && handleStatClick(stat.key)}
                className={`relative p-3 rounded-2xl border transition-all duration-200 ${
                  stat.key ? 'cursor-pointer hover:scale-[1.02]' : ''
                } ${
                  isSelected 
                    ? `bg-white dark:bg-gray-800 ring-2 ring-offset-2 ring-blue-500 shadow-md` 
                    : stat.bg
                } ${stat.border}`}
              >
                <div className="flex flex-col items-center text-center gap-1">
                  <div className={`p-1.5 rounded-full ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-white/50 dark:bg-gray-800/50'} mb-1`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Filtered View */}
        {selectedFilter && (
          <div className="space-y-3 bg-white/50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {selectedFilter === 'clockedIn' ? `Clocked In Staff (${filteredStaff.length})` :
                 selectedFilter === 'late' ? `Late Arrivals (${filteredStaff.length})` :
                 `Not Arrived Yet (${filteredStaff.length})`}
              </h3>
              <button 
                onClick={() => setSelectedFilter(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>
            
            {filteredStaff.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredStaff.map((staff, i) => (
                  <div key={staff.id || i} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100/50 dark:border-gray-700/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center font-bold text-gray-500 text-xs">
                        {staff.name.split(' ').map(n => n?.[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-2">
                          {staff.name}
                          {staff.isStale && (
                            <Badge variant="destructive" className="h-4 px-1 text-[10px]">Stale</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {staff.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(staff.time, 'h:mm a')}
                            </span>
                          )}
                          {staff.badge && (
                            <span 
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                              style={{ backgroundColor: staff.badgeColor || '#64748b' }}
                            >
                              {staff.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {staff.isStale && (
                      <button
                        onClick={(e) => handleAutoClockOut(e, staff.id)}
                        disabled={clockingOutIds.has(staff.id)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                      >
                        {clockingOutIds.has(staff.id) ? '...' : 'Auto-out'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 text-center py-4 italic">
                No staff found in this category
              </div>
            )}
          </div>
        )}

        {/* Currently On Duty - Quick view only when no filter selected */}
        {!selectedFilter && (
          <div className="space-y-2 max-h-36 overflow-y-auto mt-2 custom-scrollbar">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 pl-1">Recently Clocked In</div>
            {clockedInEntries.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No staff currently on duty
              </div>
            ) : (
              clockedInEntries.slice(0, 3).map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm p-3 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                       <div className={`w-2.5 h-2.5 rounded-full ${
                        staleEntries.some(s => s.id === entry.id) ? 'bg-red-500' : 'bg-green-500 animate-pulse'
                      } ring-2 ring-white dark:ring-gray-800`}></div>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-200">{entry.staff?.first_name} {entry.staff?.last_name}</span>
                    {staleEntries.some(s => s.id === entry.id) && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1">Stale</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.shifts && (
                      <Badge 
                        variant="secondary"
                        className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800" 
                      >
                        {entry.shifts.name}
                      </Badge>
                    )}
                    <span className="text-gray-400 text-xs font-mono bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {format(new Date(entry.clock_in), 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))
            )}
            {clockedInEntries.length > 3 && (
              <button 
                onClick={() => handleStatClick('clockedIn')}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 w-full text-center py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                + {clockedInEntries.length - 3} more staff
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffAttendanceWidget;
