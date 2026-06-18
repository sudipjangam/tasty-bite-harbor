import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Ban } from "lucide-react";
import { useNCMetrics } from "@/hooks/useNCMetrics";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { EnhancedSkeleton } from "@/components/ui/enhanced-skeleton";

interface NCStatsCardProps {
  startDate?: Date;
  endDate?: Date;
}

export const NCStatsCard = ({ startDate, endDate }: NCStatsCardProps) => {
  const { data: metrics, isLoading } = useNCMetrics({ startDate, endDate });
  const { symbol: currencySymbol } = useCurrencyContext();

  if (isLoading) {
    return <EnhancedSkeleton type="card" showHeader />;
  }

  if (!metrics) return null;

  const { totalNCValue, ncOrderCount, ncPercentageOfRevenue } = metrics;
  const isHigh = ncPercentageOfRevenue > 5;

  return (
    <Card className="group relative overflow-hidden border-0 rounded-2xl transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-purple-900/30 dark:to-pink-900/20" />
      
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239333ea' fill-opacity='1'%3E%3Ccircle cx='10' cy='10' r='1.5'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      {/* Subtle glow */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-400/10 blur-[40px] rounded-full" />

      <CardContent className="relative z-10 p-5 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl border border-purple-200/50 dark:border-purple-700/30">
              <Ban className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Non-Chargeable Orders
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent leading-none mb-1">
              <CurrencyDisplay amount={totalNCValue} showTooltip={false} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Total NC value ({ncOrderCount} order{ncOrderCount !== 1 ? "s" : ""})
            </p>
          </div>

          {/* Percentage badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
            isHigh
              ? "bg-red-100/80 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-700/30"
              : "bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/30"
          }`}>
            {isHigh ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{ncPercentageOfRevenue.toFixed(1)}%</span>
            <span className="font-normal opacity-70">of total</span>
          </div>
        </div>

        {/* Warning bar for high NC */}
        {ncPercentageOfRevenue > 10 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/30">
            <span className="text-sm">⚠️</span>
            <span className="font-medium">NC orders exceed 10% of total value</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
