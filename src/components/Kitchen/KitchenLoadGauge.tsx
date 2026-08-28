import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  Clock,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Sparkles,
  Zap,
} from "lucide-react";
import { useKitchenThrottle } from "@/hooks/useKitchenThrottle";

interface KitchenLoadGaugeProps {
  compact?: boolean;
  onOpenSettings?: () => void;
}

export const KitchenLoadGauge: React.FC<KitchenLoadGaugeProps> = ({
  compact = false,
}) => {
  const {
    totalPendingItems,
    totalActiveTickets,
    tier,
    suggestedBufferMinutes,
    isPaused,
    pauseRemainingFormatted,
    pauseStoresForMinutes,
    resumeStores,
  } = useKitchenThrottle();

  const tierColors = {
    normal: {
      badge: "bg-emerald-600 text-white",
      border: "border-emerald-200 dark:border-emerald-800",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      label: "Normal Load",
    },
    busy: {
      badge: "bg-amber-500 text-white",
      border: "border-amber-300 dark:border-amber-700",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-300",
      label: "+10m Surge Buffer",
    },
    surge: {
      badge: "bg-rose-600 text-white animate-slow-pulse",
      border: "border-rose-300 dark:border-rose-700",
      bg: "bg-rose-50 dark:bg-rose-950/40",
      text: "text-rose-700 dark:text-rose-300",
      label: "🔥 Slammed (+20m Buffer)",
    },
  };

  const currentTier = tierColors[tier];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          className={`font-black text-xs px-2.5 py-1 flex items-center gap-1.5 rounded-xl ${
            isPaused
              ? "bg-amber-600 text-white animate-slow-pulse"
              : currentTier.badge
          }`}
          title={`Kitchen Queue: ${totalPendingItems} items across ${totalActiveTickets} tickets`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{totalPendingItems} Items Prep</span>
          {suggestedBufferMinutes > 0 && !isPaused && (
            <span className="opacity-90">+{suggestedBufferMinutes}m</span>
          )}
          {isPaused && <span>(Paused {pauseRemainingFormatted})</span>}
        </Badge>

        {/* 1-Click Quick Pause/Resume Toggle */}
        {isPaused ? (
          <Button
            size="sm"
            onClick={resumeStores}
            className="h-8 px-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            title="Resume Online Orders"
          >
            <PlayCircle className="w-3.5 h-3.5 mr-1" />
            Resume
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseStoresForMinutes(20)}
            className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
              tier === "surge"
                ? "bg-rose-600 text-white hover:bg-rose-700 border-rose-600 animate-slow-pulse"
                : "border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50"
            }`}
            title="Pause Swiggy/Zomato stores for 20 minutes"
          >
            <PauseCircle className="w-3.5 h-3.5 mr-1" />
            Pause (20m)
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        isPaused
          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
          : `${currentTier.bg} ${currentTier.border}`
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              tier === "surge" || isPaused
                ? "bg-rose-500 text-white animate-bounce"
                : "bg-white/80 dark:bg-gray-800 text-orange-600"
            }`}
          >
            <Flame className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                Kitchen Prep Load
              </h4>
              <Badge className={`text-[10px] font-extrabold ${currentTier.badge}`}>
                {currentTier.label}
              </Badge>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              <strong className="text-gray-900 dark:text-white font-black">
                {totalPendingItems} items
              </strong>{" "}
              cooking in queue ({totalActiveTickets} tickets)
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-600 text-white font-mono font-black text-xs px-2.5 py-1">
                ⏱️ Paused: {pauseRemainingFormatted}
              </Badge>
              <Button
                size="sm"
                onClick={resumeStores}
                className="h-8 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <PlayCircle className="w-4 h-4 mr-1" />
                Resume Online
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => pauseStoresForMinutes(20)}
              className={`h-8 rounded-xl text-xs font-bold transition-all shadow-sm ${
                tier === "surge"
                  ? "bg-rose-600 text-white hover:bg-rose-700 border-0"
                  : "bg-white dark:bg-gray-800 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50"
              }`}
            >
              <PauseCircle className="w-4 h-4 mr-1 text-amber-500" />
              1-Click Pause (20m)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KitchenLoadGauge;
