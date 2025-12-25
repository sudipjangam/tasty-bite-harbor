import React from "react";
import { CellStatus } from "@/hooks/useAvailabilityCalendar";
import { cn } from "@/lib/utils";

interface LegendItem {
  status: CellStatus;
  label: string;
  bg: string;
  border: string;
}

const legendItems: LegendItem[] = [
  {
    status: "available",
    label: "Available",
    bg: "bg-emerald-100",
    border: "border-emerald-300",
  },
  {
    status: "reserved",
    label: "Reserved",
    bg: "bg-blue-100",
    border: "border-blue-300",
  },
  {
    status: "occupied",
    label: "Occupied",
    bg: "bg-gradient-to-r from-indigo-500 to-violet-600",
    border: "border-indigo-500",
  },
  {
    status: "checkout",
    label: "Checkout Day",
    bg: "bg-gradient-to-r from-orange-400 to-amber-500",
    border: "border-orange-500",
  },
  {
    status: "cleaning",
    label: "Cleaning",
    bg: "bg-amber-100",
    border: "border-amber-300",
  },
  {
    status: "maintenance",
    label: "Maintenance",
    bg: "bg-rose-100",
    border: "border-rose-300",
  },
];

const CalendarLegend: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Legend:
      </span>
      {legendItems.map((item) => (
        <div key={item.status} className="flex items-center gap-2">
          <div
            className={cn("w-5 h-5 rounded-md border-2", item.bg, item.border)}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CalendarLegend;
