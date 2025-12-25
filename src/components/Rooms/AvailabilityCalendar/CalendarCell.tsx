import React from "react";
import { format, isSameDay, isToday, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarCell as CalendarCellType,
  CellStatus,
} from "@/hooks/useAvailabilityCalendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User, Calendar, Clock, IndianRupee } from "lucide-react";
import { useCurrencyContext } from "@/contexts/CurrencyContext";

interface CalendarCellProps {
  cell: CalendarCellType;
  onClick?: (cell: CalendarCellType) => void;
  showReservationBar?: boolean;
}

const statusConfig: Record<
  CellStatus,
  { bg: string; border: string; text: string; hoverBg: string }
> = {
  available: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  },
  reserved: {
    bg: "bg-blue-100 dark:bg-blue-950/40",
    border: "border-blue-300 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    hoverBg: "hover:bg-blue-150 dark:hover:bg-blue-900/60",
  },
  occupied: {
    bg: "bg-gradient-to-br from-indigo-500 to-violet-600",
    border: "border-indigo-600 dark:border-indigo-500",
    text: "text-white",
    hoverBg: "hover:from-indigo-600 hover:to-violet-700",
  },
  cleaning: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    hoverBg: "hover:bg-amber-150 dark:hover:bg-amber-900/60",
  },
  maintenance: {
    bg: "bg-rose-100 dark:bg-rose-950/40",
    border: "border-rose-300 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-300",
    hoverBg: "hover:bg-rose-150 dark:hover:bg-rose-900/60",
  },
  past: {
    bg: "bg-gray-50 dark:bg-gray-900/30",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-400 dark:text-gray-600",
    hoverBg: "",
  },
  checkout: {
    bg: "bg-gradient-to-br from-orange-400 to-amber-500",
    border: "border-orange-500 dark:border-orange-600",
    text: "text-white",
    hoverBg: "hover:from-orange-500 hover:to-amber-600",
  },
};

const CalendarCell: React.FC<CalendarCellProps> = ({
  cell,
  onClick,
  showReservationBar = true,
}) => {
  const {
    date,
    room,
    status,
    reservation,
    isSpanStart,
    isSpanMiddle,
    isSpanEnd,
  } = cell;
  const config = statusConfig[status];
  const { symbol: currencySymbol } = useCurrencyContext();

  const isClickable = status !== "past";
  const isPast = status === "past";
  const hasReservation = !!reservation;

  const handleClick = () => {
    if (isClickable && onClick) {
      onClick(cell);
    }
  };

  // Tooltip content
  const tooltipContent = () => {
    if (reservation) {
      return (
        <div className="space-y-2 p-1">
          <div className="flex items-center gap-2 font-semibold text-base">
            <User className="h-4 w-4" />
            {reservation.customer_name}
          </div>
          <div className="flex items-center gap-2 text-sm opacity-90">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(reservation.start_time), "MMM d")} -{" "}
            {format(new Date(reservation.end_time), "MMM d")}
          </div>
          {reservation.rooms?.price && (
            <div className="flex items-center gap-2 text-sm opacity-90">
              <IndianRupee className="h-3.5 w-3.5" />
              {currencySymbol}
              {reservation.rooms.price}/night
            </div>
          )}
          <div className="pt-1 border-t border-white/20 text-xs opacity-80 capitalize">
            Status: {reservation.status.replace("_", " ")}
          </div>
        </div>
      );
    }

    return (
      <div className="p-1">
        <div className="font-medium">{room.name}</div>
        <div className="text-sm opacity-80">{format(date, "EEEE, MMM d")}</div>
        <div className="text-sm mt-1 capitalize">
          {status === "available" ? "Click to book" : status}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={isPast}
            className={cn(
              "relative w-full h-12 min-w-[48px] transition-all duration-200",
              "border-r border-b",
              "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:z-10",
              config.bg,
              config.border,
              config.text,
              isClickable && config.hoverBg,
              isClickable && "cursor-pointer",
              isPast && "cursor-default opacity-50",
              isToday(date) && "ring-2 ring-indigo-500 ring-inset",
              isWeekend(date) &&
                status === "available" &&
                "bg-emerald-100/50 dark:bg-emerald-950/20",
              // Span styling for multi-day reservations
              hasReservation && isSpanStart && "rounded-l-lg",
              hasReservation && isSpanEnd && "rounded-r-lg",
              hasReservation && isSpanMiddle && "border-l-0 border-r-0"
            )}
          >
            {/* Show status indicator */}
            {status === "available" && (
              <span className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-xs font-medium">+</span>
              </span>
            )}

            {/* Guest initial for occupied cells */}
            {hasReservation && isSpanStart && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold truncate px-1">
                  {reservation.customer_name.charAt(0).toUpperCase()}
                </span>
              </span>
            )}

            {/* Checkout indicator */}
            {status === "checkout" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </span>
            )}

            {/* Cleaning/Maintenance icons */}
            {status === "cleaning" && (
              <span className="absolute inset-0 flex items-center justify-center text-lg">
                🧹
              </span>
            )}
            {status === "maintenance" && (
              <span className="absolute inset-0 flex items-center justify-center text-lg">
                🔧
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className={cn(
            "max-w-xs",
            hasReservation
              ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-indigo-500"
              : ""
          )}
        >
          {tooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CalendarCell;
