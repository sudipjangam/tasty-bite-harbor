import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-rose-900/20 border-purple-200 dark:border-purple-800 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
          Non-Chargeable Orders
        </CardTitle>
        <Ban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Total NC Value */}
          <div>
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <CurrencyDisplay amount={totalNCValue} showTooltip={false} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total NC value ({ncOrderCount} order
              {ncOrderCount !== 1 ? "s" : ""})
            </p>
          </div>

          {/* Percentage of Revenue */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              {ncPercentageOfRevenue > 5 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span className="font-medium text-foreground">
                {ncPercentageOfRevenue.toFixed(1)}%
              </span>
            </div>
            <span className="text-muted-foreground">of total value</span>
          </div>

          {/* Warning if high */}
          {ncPercentageOfRevenue > 10 && (
            <div className="mt-2 rounded-md bg-red-50 dark:bg-red-900/20 p-2 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
              ⚠️ NC orders exceed 10% of total value
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
