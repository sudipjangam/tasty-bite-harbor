import React from "react";
import { Utensils, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickServeOrderMode = "counter" | "takeaway" | "delivery";

interface QSModeSelectorProps {
  selectedMode: QuickServeOrderMode;
  onModeChange: (mode: QuickServeOrderMode) => void;
  deliveryEnabled?: boolean;
}

const modes: {
  value: QuickServeOrderMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
  gradient: string;
}[] = [
  {
    value: "counter",
    label: "Counter",
    icon: Utensils,
    emoji: "🍽️",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    value: "takeaway",
    label: "Takeaway",
    icon: Package,
    emoji: "📦",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    value: "delivery",
    label: "Delivery",
    icon: Truck,
    emoji: "🛵",
    gradient: "from-blue-500 to-cyan-600",
  },
];

export const QSModeSelector: React.FC<QSModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  deliveryEnabled = true,
}) => {
  const visibleModes = deliveryEnabled
    ? modes
    : modes.filter((m) => m.value !== "delivery");

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
      {visibleModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.value;

        return (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all duration-200 whitespace-nowrap touch-manipulation text-xs",
              isActive
                ? `bg-gradient-to-r ${mode.gradient} text-white shadow-lg shadow-black/20`
                : "bg-white/15 backdrop-blur-md text-white/80 hover:bg-white/25 border border-white/10",
            )}
          >
            <Icon
              className={cn(
                "w-3.5 h-3.5",
                isActive ? "text-white" : "text-white/70",
              )}
            />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};
