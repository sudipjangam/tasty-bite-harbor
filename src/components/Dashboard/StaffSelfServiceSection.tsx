
import React from "react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ClockIcon,
  Calendar,
  CalendarPlus,
  Timer,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Briefcase,
  Coffee,
} from "lucide-react";
import type { StaffTimeClockEntry, StaffLeaveBalance, StaffLeaveRequest } from "@/types/staff";

interface StaffSelfServiceSectionProps {
  staffName: string;
  isClockedIn: boolean;
  activeClockEntry: StaffTimeClockEntry | null;
  recentTimeEntries: StaffTimeClockEntry[];
  leaveBalances: StaffLeaveBalance[];
  upcomingLeave: StaffLeaveRequest[];
  onClockInOut: () => void;
  onRequestLeave: () => void;
  isLoading?: boolean;
}

/**
 * Staff Self-Service Section
 * Displays clock status, leave balances, and quick actions for staff members
 */
const StaffSelfServiceSection: React.FC<StaffSelfServiceSectionProps> = ({
  staffName,
  isClockedIn,
  activeClockEntry,
  recentTimeEntries,
  leaveBalances,
  upcomingLeave,
  onClockInOut,
  onRequestLeave,
  isLoading = false,
}) => {
  // Calculate time elapsed since clock-in
  const getElapsedTime = () => {
    if (!activeClockEntry) return null;
    const clockInTime = new Date(activeClockEntry.clock_in);
    const now = new Date();
    const minutes = differenceInMinutes(now, clockInTime);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Get total remaining leave days
  const getTotalRemainingLeave = () => {
    return leaveBalances.reduce((total, balance) => {
      return total + (balance.total_days - balance.used_days);
    }, 0);
  };

  // Get pending leave requests count
  const getPendingLeaveCount = () => {
    return upcomingLeave.filter(leave => leave.status === "pending").length;
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    denied: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-6 md:p-8 mb-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
          <Briefcase className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            My Workspace
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Manage your attendance and leave
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clock Status Card */}
        <div className={`relative overflow-hidden rounded-2xl p-6 ${
          isClockedIn 
            ? "bg-gradient-to-br from-emerald-500 to-green-600" 
            : "bg-gradient-to-br from-slate-500 to-gray-600"
        } text-white shadow-xl`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              {isClockedIn ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <XCircle className="h-8 w-8 opacity-80" />
              )}
              <div>
                <p className="text-sm font-medium opacity-90">Current Status</p>
                <h3 className="text-xl font-bold">
                  {isClockedIn ? "Clocked In" : "Clocked Out"}
                </h3>
              </div>
            </div>

            {isClockedIn && activeClockEntry && (
              <div className="mb-4 bg-white/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="h-4 w-4" />
                  <span>Started at {format(parseISO(activeClockEntry.clock_in), "h:mm a")}</span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {getElapsedTime()} worked
                </div>
              </div>
            )}

            <Button
              onClick={onClockInOut}
              disabled={isLoading}
              className={`w-full font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 ${
                isClockedIn
                  ? "bg-white text-emerald-700 hover:bg-white/90"
                  : "bg-white text-gray-700 hover:bg-white/90"
              }`}
            >
              <ClockIcon className="h-5 w-5 mr-2" />
              {isClockedIn ? "Clock Out" : "Clock In"}
            </Button>
          </div>
        </div>

        {/* Leave Balance Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Leave Balance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getTotalRemainingLeave()} days available
              </p>
            </div>
          </div>

          {leaveBalances.length > 0 ? (
            <div className="space-y-2 mb-4">
              {leaveBalances.slice(0, 3).map((balance) => (
                <div 
                  key={balance.id}
                  className="flex justify-between items-center bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {balance.leave_type}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {balance.total_days - balance.used_days}/{balance.total_days}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 py-3 text-center">
              No leave balances configured
            </div>
          )}

          <Button
            onClick={onRequestLeave}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md"
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            Request Leave
          </Button>
        </div>

        {/* Recent Activity & Upcoming Leave Card */}
        <div className="space-y-4">
          {/* Upcoming Leave */}
          {upcomingLeave.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/50">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Upcoming Leave
                </h4>
                {getPendingLeaveCount() > 0 && (
                  <Badge className="bg-amber-500 text-white text-xs">
                    {getPendingLeaveCount()} pending
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {upcomingLeave.slice(0, 2).map((leave) => (
                  <div 
                    key={leave.id}
                    className="bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {leave.leave_type}
                      </span>
                      <Badge className={statusColors[leave.status as keyof typeof statusColors]}>
                        {leave.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {format(parseISO(leave.start_date), "MMM d")} - {format(parseISO(leave.end_date), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Time Entries */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h4 className="font-semibold text-gray-900 dark:text-white">Recent Attendance</h4>
            </div>
            {recentTimeEntries.length > 0 ? (
              <div className="space-y-2">
                {recentTimeEntries.slice(0, 3).map((entry) => (
                  <div 
                    key={entry.id}
                    className="flex justify-between items-center bg-white/60 dark:bg-gray-800/60 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {format(parseISO(entry.clock_in), "MMM d")}
                    </span>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {format(parseISO(entry.clock_in), "h:mm a")}
                      {entry.clock_out && (
                        <> - {format(parseISO(entry.clock_out), "h:mm a")}</>
                      )}
                      {!entry.clock_out && (
                        <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">
                <Coffee className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No recent entries
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffSelfServiceSection;
