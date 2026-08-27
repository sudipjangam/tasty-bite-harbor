import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Store,
  Zap,
  Flame,
  Clock,
  TrendingUp,
  AlertTriangle,
  Play,
  Volume2,
} from "lucide-react";
import { AggregatorStore, AggregatorSummaryStats } from "@/types/aggregators";
import { FeatureLock } from "@/components/Auth/FeatureLock";

interface AggregatorStoreStatusHeaderProps {
  stores: AggregatorStore[];
  stats: AggregatorSummaryStats;
  onToggleStore: (params: { provider: any; isOpen?: boolean; isInRush?: boolean }) => void;
  onOpenSimulator: () => void;
}

const PROVIDER_CONFIG = {
  swiggy: {
    name: "Swiggy",
    bgColor: "bg-orange-500",
    textColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-500/30",
    gradient: "from-orange-500 to-amber-600",
    featureKey: "aggregators.swiggy",
  },
  zomato: {
    name: "Zomato",
    bgColor: "bg-rose-600",
    textColor: "text-rose-600 dark:text-rose-400",
    borderColor: "border-rose-500/30",
    gradient: "from-rose-600 to-red-700",
    featureKey: "aggregators.zomato",
  },
  magicpin: {
    name: "magicpin",
    bgColor: "bg-blue-600",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/30",
    gradient: "from-blue-600 to-indigo-700",
    featureKey: "aggregators.magicpin",
  },
  urbanpiper: {
    name: "UrbanPiper Hub",
    bgColor: "bg-purple-600",
    textColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/30",
    gradient: "from-purple-600 to-violet-700",
    featureKey: "aggregators.urbanpiper",
  },
};

export const AggregatorStoreStatusHeader: React.FC<AggregatorStoreStatusHeaderProps> = ({
  stores,
  stats,
  onToggleStore,
  onOpenSimulator,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-4 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl shadow-lg shadow-orange-500/20">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
              Online Aggregators Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Direct Two-Way Relay for Swiggy, Zomato, magicpin & UrbanPiper
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onOpenSimulator}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md text-xs font-semibold gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Test Order Simulator
          </Button>
        </div>
      </div>

      {/* Channel Toggles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(["swiggy", "zomato", "magicpin", "urbanpiper"] as const).map((provider) => {
          const cfg = PROVIDER_CONFIG[provider];
          const store = stores.find((s) => s.provider === provider);
          const channelData = stats.channelBreakdown[provider];
          const isOpen = store?.is_store_open ?? channelData?.isOpen ?? true;
          const isInRush = store?.is_in_rush ?? false;

          return (
            <FeatureLock key={provider} feature={cfg.featureKey} className="h-full">
              <Card
                className={`relative overflow-hidden border-2 transition-all duration-300 rounded-2xl ${
                  isOpen
                    ? "bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 shadow-md"
                    : "bg-gray-50/80 dark:bg-gray-900/60 border-dashed border-gray-300 dark:border-gray-700 opacity-80"
                }`}
              >
                <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`} />
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-400"
                        }`}
                      />
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {cfg.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-gray-500">
                        {isOpen ? "ONLINE" : "OFFLINE"}
                      </span>
                      <Switch
                        checked={isOpen}
                        onCheckedChange={(checked) =>
                          onToggleStore({ provider, isOpen: checked })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Today's Orders</span>
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                        {channelData?.orders || 0}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 block text-[10px]">Revenue</span>
                      <span className={`font-bold text-sm ${cfg.textColor}`}>
                        ₹{channelData?.revenue?.toFixed(0) || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FeatureLock>
          );
        })}
      </div>
    </div>
  );
};
