import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useToast } from "@/hooks/use-toast";
import { Users, Clock, AlertTriangle, CheckCircle2, UserX, ChevronDown, ChevronUp, X, LogOut, Loader2 } from "lucide-react";
import { format } from "date-fns";

type FilterType = 'clockedIn' | 'notArrived' | 'late' | 'total' | null;

const StaffAttendanceWidget: React.FC = () => {
  const { restaurantId } = useRestaurantId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>(null);
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
          staff!inner(id, first_name, last_name)
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

  // Clock out all stale entries
  const clockOutAllStaleMutation = useMutation({
    mutationFn: async (entries: any[]) => {
      const updates = entries.map(entry => 
        supabase
          .from('staff_time_clock')
          .update({ 
            clock_out: new Date().toISOString(),
            auto_clocked_out: true,
            notes: 'Auto clocked out by manager - exceeded 12 hours'
          })
          .eq('id', entry.id)
      );
      
      await Promise.all(updates);
      return entries.length;
    },
    onSuccess: (count) => {
      toast({
        title: "All Stale Entries Clocked Out",
        description: `${count} staff member(s) have been clocked out.`,
      });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clock out some staff members.",
        variant: "destructive",
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
          id: e.id,
          name: `${e.staff?.first_name || ''} ${e.staff?.last_name || ''}`.trim(),
          detail: format(new Date(e.clock_in), 'HH:mm'),
          shift: e.shifts?.name,
          color: e.shifts?.color,
          isStale: staleEntries.some(s => s.id === e.id)
        }));
      case 'notArrived':
        return notArrivedStaff.map(s => ({
          id: s.id,
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          detail: 'Not clocked in'
        }));
      case 'late':
        return lateEntries.map(e => ({
          id: e.id,
          name: `${e.staff?.first_name || ''} ${e.staff?.last_name || ''}`.trim(),
          detail: `${e.minutes_variance || 0} min late`,
          shift: e.shifts?.name,
          color: e.shifts?.color
        }));
      case 'total':
        return allStaff?.map(s => {
          const entry = todayClockIns?.find(e => e.staff_id === s.id);
          return {
            id: s.id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            detail: entry ? (entry.clock_out ? 'Clocked out' : 'On duty') : 'Not arrived',
            status: entry ? (entry.clock_out ? 'out' : 'in') : 'absent'
          };
        }) || [];
      default:
        return [];
    }
  };

  const handleStatClick = (filter: FilterType) => {
    setSelectedFilter(selectedFilter === filter ? null : filter);
  };

  const getFilterTitle = () => {
    switch (selectedFilter) {
      case 'clockedIn': return 'Currently Clocked In';
      case 'notArrived': return 'Not Arrived Yet';
      case 'late': return 'Late Arrivals Today';
      case 'total': return 'All Staff Status';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 animate-pulse">
        <CardContent className="p-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Staff Attendance - Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Grid - Clickable */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div 
            onClick={() => handleStatClick('clockedIn')}
            className={`bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${selectedFilter === 'clockedIn' ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
          >
            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{clockedIn}</div>
            <div className="text-xs text-green-600 dark:text-green-500">Clocked In</div>
            {selectedFilter === 'clockedIn' ? <ChevronUp className="h-3 w-3 mx-auto mt-1 text-green-600" /> : <ChevronDown className="h-3 w-3 mx-auto mt-1 text-green-400" />}
          </div>
          
          <div 
            onClick={() => handleStatClick('notArrived')}
            className={`bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/50 rounded-xl p-3 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${selectedFilter === 'notArrived' ? 'ring-2 ring-gray-500 shadow-lg' : ''}`}
          >
            <UserX className="h-5 w-5 text-gray-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{notArrived}</div>
            <div className="text-xs text-gray-500">Not Arrived</div>
            {selectedFilter === 'notArrived' ? <ChevronUp className="h-3 w-3 mx-auto mt-1 text-gray-600" /> : <ChevronDown className="h-3 w-3 mx-auto mt-1 text-gray-400" />}
          </div>
          
          <div 
            onClick={() => handleStatClick('late')}
            className={`bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-3 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${selectedFilter === 'late' ? 'ring-2 ring-orange-500 shadow-lg' : ''}`}
          >
            <AlertTriangle className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{lateArrivals}</div>
            <div className="text-xs text-orange-600 dark:text-orange-500">Late Today</div>
            {selectedFilter === 'late' ? <ChevronUp className="h-3 w-3 mx-auto mt-1 text-orange-600" /> : <ChevronDown className="h-3 w-3 mx-auto mt-1 text-orange-400" />}
          </div>
          
          <div 
            onClick={() => handleStatClick('total')}
            className={`bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${selectedFilter === 'total' ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
          >
            <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{totalStaff}</div>
            <div className="text-xs text-blue-600 dark:text-blue-500">Total Staff</div>
            {selectedFilter === 'total' ? <ChevronUp className="h-3 w-3 mx-auto mt-1 text-blue-600" /> : <ChevronDown className="h-3 w-3 mx-auto mt-1 text-blue-400" />}
          </div>
        </div>

        {/* Expandable Staff List */}
        {selectedFilter && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">{getFilterTitle()}</h4>
              <button 
                onClick={() => setSelectedFilter(null)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {getFilteredStaffList().length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-3">No staff in this category</div>
              ) : (
                getFilteredStaffList().map((staff, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedFilter === 'clockedIn' ? ((staff as any).isStale ? 'bg-red-500' : 'bg-green-500 animate-pulse') :
                        selectedFilter === 'notArrived' ? 'bg-gray-400' :
                        selectedFilter === 'late' ? 'bg-orange-500' :
                        (staff as any).status === 'in' ? 'bg-green-500' :
                        (staff as any).status === 'out' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{staff.name}</span>
                      {(staff as any).isStale && (
                        <Badge className="text-xs bg-red-500 text-white">12+ hrs</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(staff as any).shift && (
                        <Badge 
                          className="text-xs text-white" 
                          style={{ backgroundColor: (staff as any).color || '#3B82F6' }}
                        >
                          {(staff as any).shift}
                        </Badge>
                      )}
                      <span className="text-gray-500 text-xs">{staff.detail}</span>
                      {selectedFilter === 'clockedIn' && (staff as any).isStale && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            autoClockOutMutation.mutate(staff.id);
                          }}
                          disabled={clockingOutIds.has(staff.id)}
                        >
                          {clockingOutIds.has(staff.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <LogOut className="h-3 w-3 mr-1" />
                              Clock Out
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Stale Entries Warning with Auto Clock-Out */}
        {staleEntries.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                {staleEntries.length} staff clocked in for 12+ hours
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => clockOutAllStaleMutation.mutate(staleEntries)}
                disabled={clockOutAllStaleMutation.isPending}
              >
                {clockOutAllStaleMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <LogOut className="h-3 w-3 mr-1" />
                )}
                Clock Out All
              </Button>
            </div>
            <div className="space-y-1">
              {staleEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-xs text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/30 rounded p-1.5">
                  <span>
                    • {entry.staff?.first_name} {entry.staff?.last_name} - {
                      Math.round((Date.now() - new Date(entry.clock_in).getTime()) / (1000 * 60 * 60))
                    } hours
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 px-1.5 text-xs text-red-700 hover:bg-red-200 dark:hover:bg-red-800"
                    onClick={() => autoClockOutMutation.mutate(entry.id)}
                    disabled={clockingOutIds.has(entry.id)}
                  >
                    {clockingOutIds.has(entry.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <LogOut className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currently On Duty - Quick view only when no filter selected */}
        {!selectedFilter && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-gray-500 mb-2">Currently On Duty:</div>
            {clockedInEntries.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-2">No staff currently on duty</div>
            ) : (
              clockedInEntries.slice(0, 3).map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      staleEntries.some(s => s.id === entry.id) ? 'bg-red-500' : 'bg-green-500 animate-pulse'
                    }`}></div>
                    <span className="font-medium">{entry.staff?.first_name} {entry.staff?.last_name}</span>
                    {staleEntries.some(s => s.id === entry.id) && (
                      <Badge className="text-xs bg-red-500 text-white">Stale</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.shifts && (
                      <Badge 
                        className="text-xs text-white" 
                        style={{ backgroundColor: entry.shifts.color || '#3B82F6' }}
                      >
                        {entry.shifts.name}
                      </Badge>
                    )}
                    <span className="text-gray-500 text-xs">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {format(new Date(entry.clock_in), 'HH:mm')}
                    </span>
                  </div>
                </div>
              ))
            )}
            {clockedInEntries.length > 3 && (
              <button 
                onClick={() => handleStatClick('clockedIn')}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 w-full text-center py-1"
              >
                + {clockedInEntries.length - 3} more...
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffAttendanceWidget;
