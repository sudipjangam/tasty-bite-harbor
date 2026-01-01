import React from "react";
import { Utensils, Package, Truck, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { QSROrderMode } from "@/types/qsr";

interface QSRModeSelectorProps {
  selectedMode: QSROrderMode;
  onModeChange: (mode: QSROrderMode) => void;
}

const modes: {
  value: QSROrderMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    value: "dine_in",
    label: "Dine In",
    icon: Utensils,
    color: "from-indigo-500 to-purple-600",
  },
  {
    value: "takeaway",
    label: "Takeaway",
    icon: Package,
    color: "from-emerald-500 to-teal-600",
  },
  {
    value: "delivery",
    label: "Delivery",
    icon: Truck,
    color: "from-blue-500 to-cyan-600",
  },
  {
    value: "nc",
    label: "NC",
    icon: Gift,
    color: "from-amber-500 to-orange-600",
  },
];

export const QSRModeSelector: React.FC<QSRModeSelectorProps> = ({
  selectedMode,
  onModeChange,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.value;

        return (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 whitespace-nowrap touch-manipulation",
              "min-w-[100px] justify-center",
              isActive
                ? `bg-gradient-to-r ${mode.color} text-white shadow-lg`
                : "bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                isActive ? "text-white" : "text-gray-500"
              )}
            />
            <span className="text-sm">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};
