import React from "react";
import { Utensils, Package, Truck, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { QSROrderMode } from "@/types/qsr";

interface QSRModeSelectorProps {
  selectedMode: QSROrderMode;
  onModeChange: (mode: QSROrderMode) => void;
  /** When true uses smaller padding + shortLabel for mobile screens */
  compact?: boolean;
}

const modes: {
  value: QSROrderMode;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tooltip?: string;
}[] = [
  {
    value: "dine_in",
    label: "Dine In",
    shortLabel: "Dine In",
    icon: Utensils,
    color: "from-indigo-500 to-purple-600",
  },
  {
    value: "takeaway",
    label: "Takeaway",
    shortLabel: "Takeaway",
    icon: Package,
    color: "from-emerald-500 to-teal-600",
  },
  {
    value: "delivery",
    label: "Delivery",
    shortLabel: "Delivery",
    icon: Truck,
    color: "from-blue-500 to-cyan-600",
  },
  {
    value: "nc",
    label: "Non-Chargeable",
    shortLabel: "N-C",
    icon: Gift,
    color: "from-amber-500 to-orange-600",
    tooltip: "Non Chargeable",
  },
];

export const QSRModeSelector: React.FC<QSRModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  compact = false,
}) => {
  return (
    <div className={cn("flex overflow-x-auto pb-1 scrollbar-hide", compact ? "gap-1.5" : "gap-2")}>
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.value;
        const displayLabel = compact ? (mode.shortLabel || mode.label) : mode.label;

        return (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            title={mode.tooltip || mode.label}
            className={cn(
              "flex items-center gap-1.5 rounded-xl font-medium transition-all duration-200 whitespace-nowrap touch-manipulation flex-1 justify-center",
              compact
                ? "px-2.5 py-1.5 text-xs min-w-0"
                : "px-4 py-2.5 text-sm min-w-[100px]",
              isActive
                ? `bg-gradient-to-r ${mode.color} text-white shadow-lg`
                : "bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600",
            )}
          >
            <Icon
              className={cn(
                compact ? "w-3.5 h-3.5" : "w-4 h-4",
                isActive ? "text-white" : "text-gray-500",
              )}
            />
            <span>{displayLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
