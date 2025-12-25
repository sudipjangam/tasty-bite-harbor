import React, { useState } from "react";
import { format, isToday, isWeekend } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
  Bed,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAvailabilityCalendar,
  CalendarCell as CalendarCellType,
  ViewMode,
} from "@/hooks/useAvailabilityCalendar";
import CalendarCell from "./CalendarCell";
import CalendarLegend from "./CalendarLegend";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AvailabilityCalendarGridProps {
  onCellClick?: (cell: CalendarCellType) => void;
  onCreateReservation?: (roomId: string, date: Date) => void;
}

const viewModeLabels: Record<ViewMode, string> = {
  week: "7 Days",
  twoWeek: "14 Days",
  month: "30 Days",
};

const AvailabilityCalendarGrid: React.FC<AvailabilityCalendarGridProps> = ({
  onCellClick,
  onCreateReservation,
}) => {
  const {
    rooms,
    dates,
    calendarGrid,
    loading,
    startDate,
    endDate,
    viewMode,
    setViewMode,
    goToToday,
    goToPrevious,
    goToNext,
    refresh,
  } = useAvailabilityCalendar();

  const [selectedCell, setSelectedCell] = useState<CalendarCellType | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);

  const handleCellClick = (cell: CalendarCellType) => {
    if (cell.status === "available") {
      // Trigger create reservation
      if (onCreateReservation) {
        onCreateReservation(cell.room.id, cell.date);
      }
    } else if (cell.reservation) {
      // Show reservation details
      setSelectedCell(cell);
      setShowDetails(true);
    }

    if (onCellClick) {
      onCellClick(cell);
    }
  };

  return (
    <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-none shadow-xl rounded-3xl overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <LayoutGrid className="h-6 w-6" />
            </div>
            Room Availability Calendar
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <div className="flex bg-white/20 rounded-lg p-1">
              {(["week", "twoWeek", "month"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                    viewMode === mode
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  {viewModeLabels[mode]}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={loading}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="text-lg font-semibold min-w-[200px] text-center">
              {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="text-white hover:bg-white/20"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={goToToday}
            className="bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Legend */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <CalendarLegend />
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Date Headers */}
            <div className="flex sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {/* Room Name Column Header */}
              <div className="w-36 min-w-[144px] flex-shrink-0 p-3 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4" />
                  Room
                </div>
              </div>

              {/* Date Column Headers */}
              {dates.map((date) => (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "w-12 min-w-[48px] flex-shrink-0 p-2 text-center border-r border-gray-200 dark:border-gray-700",
                    isToday(date) && "bg-indigo-100 dark:bg-indigo-900/40",
                    isWeekend(date) &&
                      !isToday(date) &&
                      "bg-gray-100 dark:bg-gray-800/80"
                  )}
                >
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {format(date, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-bold mt-0.5",
                      isToday(date)
                        ? "text-indigo-700 dark:text-indigo-300"
                        : "text-gray-800 dark:text-gray-200"
                    )}
                  >
                    {format(date, "d")}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    {format(date, "MMM")}
                  </div>
                </div>
              ))}
            </div>

            {/* Room Rows */}
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                Loading calendar...
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bed className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No rooms found
              </div>
            ) : (
              calendarGrid.map(({ room, cells }) => (
                <div
                  key={room.id}
                  className="flex border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  {/* Room Name */}
                  <div className="w-36 min-w-[144px] flex-shrink-0 p-3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky left-0 z-10">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {room.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <span>{room.capacity} guests</span>
                      <span className="opacity-50">•</span>
                      <span>₹{room.price}/night</span>
                    </div>
                  </div>

                  {/* Date Cells */}
                  {cells.map((cell) => (
                    <CalendarCell
                      key={`${room.id}-${cell.date.toISOString()}`}
                      cell={cell}
                      onClick={handleCellClick}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Room Count Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              <strong>{rooms.length}</strong> rooms total
            </span>
            <span>
              Showing {format(startDate, "MMM d")} -{" "}
              {format(endDate, "MMM d, yyyy")}
            </span>
          </div>
        </div>
      </CardContent>

      {/* Reservation Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bed className="h-5 w-5 text-indigo-600" />
              Reservation Details
            </DialogTitle>
          </DialogHeader>

          {selectedCell?.reservation && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900">
                <div className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {selectedCell.reservation.customer_name}
                </div>
                {selectedCell.reservation.customer_phone && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    📞 {selectedCell.reservation.customer_phone}
                  </div>
                )}
                {selectedCell.reservation.customer_email && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ✉️ {selectedCell.reservation.customer_email}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 uppercase">
                    Room
                  </div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedCell.room.name}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 uppercase">
                    Status
                  </div>
                  <Badge
                    className={cn(
                      "capitalize",
                      selectedCell.reservation.status === "checked_in" &&
                        "bg-green-500",
                      selectedCell.reservation.status === "confirmed" &&
                        "bg-blue-500",
                      selectedCell.reservation.status === "pending" &&
                        "bg-amber-500"
                    )}
                  >
                    {selectedCell.reservation.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 uppercase">
                    Check-in
                  </div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {format(
                      new Date(selectedCell.reservation.start_time),
                      "MMM d, yyyy"
                    )}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 uppercase">
                    Check-out
                  </div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {format(
                      new Date(selectedCell.reservation.end_time),
                      "MMM d, yyyy"
                    )}
                  </div>
                </div>
              </div>

              {selectedCell.reservation.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase mb-1">
                    Notes
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {selectedCell.reservation.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AvailabilityCalendarGrid;
