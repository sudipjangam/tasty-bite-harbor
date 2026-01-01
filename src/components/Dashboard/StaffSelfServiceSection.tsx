import React, { useEffect, useState } from "react";
import { format, parseISO, differenceInSeconds } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Calendar,
  CalendarPlus,
  Timer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Briefcase,
  Coffee,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
} from "lucide-react";
import type {
  StaffTimeClockEntry,
  StaffLeaveBalance,
  StaffLeaveRequest,
} from "@/types/staff";

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
 * Premium UI with real-time tracking and glassmorphism effects
 * Collapsible by default to save space
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
  const [elapsedTime, setElapsedTime] = useState<string>("");
  const [isStale, setIsStale] = useState(false);
  // Collapse state - default to collapsed, persist in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("workspace-collapsed");
    return saved !== null ? saved === "true" : true; // Default collapsed
  });

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem("workspace-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Real-time timer effect
  useEffect(() => {
    if (!activeClockEntry) {
      setElapsedTime("");
      setIsStale(false);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const start = new Date(activeClockEntry.clock_in);
      const outputSeconds = differenceInSeconds(now, start);

      const hours = Math.floor(outputSeconds / 3600);
      const minutes = Math.floor((outputSeconds % 3600) / 60);
      const seconds = outputSeconds % 60;

      // Check for stale shift (e.g., > 12 hours)
      if (hours >= 12) setIsStale(true);
      else setIsStale(false);

      setElapsedTime(
        `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds
          .toString()
          .padStart(2, "0")}s`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeClockEntry]);

  // Get total leave stats
  const getTotalRemainingLeave = () => {
    return leaveBalances.reduce((total, balance) => {
      return total + (balance.total_days - balance.used_days);
    }, 0);
  };

  const getPendingLeaveCount = () => {
    return upcomingLeave.filter((leave) => leave.status === "pending").length;
  };

  const statusColors = {
    pending:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50",
    approved:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50",
    denied:
      "bg-red-100 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",
  };

  return (
    <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-[32px] shadow-2xl p-6 md:p-8 mb-10 transition-all duration-500 hover:shadow-3xl group">
      {/* Dynamic Background Glow */}
      <div
        className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br ${
          isClockedIn
            ? "from-emerald-400/10 to-teal-400/10"
            : "from-blue-400/10 to-indigo-400/10"
        } rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none`}
      />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-2xl shadow-lg transition-all duration-500 ${
              isClockedIn
                ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/30"
                : "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-indigo-500/30"
            }`}
          >
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {staffName}'s Workspace
            </h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Manage your shifts and time off
            </p>
          </div>
        </div>

        {/* Right side: stale warning + toggle button */}
        <div className="flex items-center gap-3">
          {isStale && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-full animate-pulse">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                High Duration Shift ({elapsedTime.split(" ")[0]})
              </span>
            </div>
          )}

          {/* Collapse/Expand Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
              isCollapsed
                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40"
                : "bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {isCollapsed ? (
              <>
                <Maximize2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Expand</span>
              </>
            ) : (
              <>
                <Minimize2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Minimize</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          {/* Primary Action Card - Clock In/Out */}
          <div
            className={`relative overflow-hidden rounded-3xl p-1 transition-all duration-500 ${
              isClockedIn
                ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-xl shadow-emerald-500/20"
                : "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 shadow-lg"
            }`}
          >
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
            <div className="relative h-full bg-white/90 dark:bg-gray-900/90 rounded-[22px] p-6 flex flex-col justify-between overflow-hidden">
              {/* Ambient Background Pulse */}
              {isClockedIn && (
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
              )}

              <div>
                <div className="flex justify-between items-start mb-6">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      isClockedIn
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    }`}
                  >
                    {isClockedIn ? "Active Shift" : "Off Duty"}
                  </span>
                  {isClockedIn ? (
                    <Sparkles className="h-5 w-5 text-emerald-500 animate-spin-slow" />
                  ) : (
                    <Coffee className="h-5 w-5 text-slate-400" />
                  )}
                </div>

                <div className="text-center mb-8">
                  <div
                    className={`text-5xl font-black mb-2 tracking-tight tabular-nums ${
                      isClockedIn
                        ? "bg-gradient-to-b from-emerald-500 to-teal-700 bg-clip-text text-transparent"
                        : "text-slate-400 dark:text-slate-600"
                    }`}
                  >
                    {isClockedIn ? elapsedTime : "00:00:00"}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    {isClockedIn ? "Elapsed Time" : "Ready to start?"}
                  </p>
                </div>
              </div>

              <Button
                onClick={onClockInOut}
                disabled={isLoading}
                className={`w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                  isClockedIn
                    ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-red-500/25"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/25"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isClockedIn ? (
                    <XCircle className="h-6 w-6" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6" />
                  )}
                  {isClockedIn ? "End Shift" : "Start Shift"}
                </div>
              </Button>
            </div>
          </div>

          {/* Stats & Leaves Card */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-3xl p-6 border border-white/40 dark:border-gray-700/40 backdrop-blur-md shadow-lg flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Leave Balance
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                  {getTotalRemainingLeave()} Days Available
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50"
                onClick={onRequestLeave}
              >
                <CalendarPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {leaveBalances.length > 0 ? (
                leaveBalances.map((balance) => {
                  const percent =
                    balance.total_days > 0
                      ? ((balance.total_days - balance.used_days) /
                          balance.total_days) *
                        100
                      : 0;

                  return (
                    <div key={balance.id} className="group">
                      <div className="flex justify-between text-sm font-medium mb-1.5">
                        <span className="text-gray-700 dark:text-gray-200 capitalize group-hover:text-blue-600 transition-colors">
                          {balance.leave_type}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {balance.total_days - balance.used_days} /{" "}
                          {balance.total_days}
                        </span>
                      </div>
                      <Progress
                        value={percent}
                        className="h-2 bg-gray-100 dark:bg-gray-700"
                      >
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </Progress>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                  No leave balances configured
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full mt-4 border-dashed border-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              onClick={onRequestLeave}
            >
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                Manage Requests
              </span>
            </Button>
          </div>

          {/* Activity Timeline Card */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-3xl p-6 border border-white/40 dark:border-gray-700/40 backdrop-blur-md shadow-lg flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                <Timer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                  Last 10 Shifts
                </p>
              </div>
              {getPendingLeaveCount() > 0 && (
                <Badge className="ml-auto bg-amber-500 hover:bg-amber-600">
                  {getPendingLeaveCount()} Pending
                </Badge>
              )}
            </div>

            <div className="space-y-0 relative flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[250px] lg:max-h-none">
              {/* Connector Line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-gray-100 dark:bg-gray-700" />

              {recentTimeEntries.slice(0, 5).map((entry, index) => (
                <div
                  key={entry.id}
                  className="relative pl-10 py-3 first:pt-0 last:pb-0 group"
                >
                  {/* Visual Node */}
                  <div
                    className={`absolute left-3 top-4 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 shadow-sm z-10 transition-colors ${
                      !entry.clock_out
                        ? "bg-emerald-500 scale-125"
                        : "bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-400"
                    }`}
                  />

                  <div className="flex justify-between items-start bg-white/40 dark:bg-gray-800/40 p-3 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/80 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        {format(parseISO(entry.clock_in), "EEEE, MMM d")}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 px-1.5 ${
                            !entry.clock_out
                              ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                              : "text-gray-500 border-gray-200"
                          }`}
                        >
                          {format(parseISO(entry.clock_in), "h:mm a")}
                          {entry.clock_out &&
                            ` - ${format(parseISO(entry.clock_out), "h:mm a")}`}
                        </Badge>
                      </div>
                    </div>

                    {entry.total_minutes && (
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                        {Math.floor(entry.total_minutes / 60)}h{" "}
                        {entry.total_minutes % 60}m
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {recentTimeEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Clock className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffSelfServiceSection;
