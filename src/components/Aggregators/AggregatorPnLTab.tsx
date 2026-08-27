import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Percent,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  PieChart as PieIcon,
} from "lucide-react";
import { AggregatorSummaryStats } from "@/types/aggregators";
import { FeatureLock } from "@/components/Auth/FeatureLock";

interface AggregatorPnLTabProps {
  stats: AggregatorSummaryStats;
}

export const AggregatorPnLTab: React.FC<AggregatorPnLTabProps> = ({ stats }) => {
  const gross = stats.grossSalesToday || 48500;
  const commissions = stats.estimatedCommissionsToday || Math.round(gross * 0.185);
  const packaging = Math.round(gross * 0.03);
  const gstTaxes = Math.round(gross * 0.05);
  const netBankPayout = gross - commissions - packaging - gstTaxes;

  return (
    <FeatureLock feature="aggregators.pnl_reconciliation">
      <div className="space-y-6">
        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-md">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Gross Aggregator Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₹{gross.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-2xl shadow-md">
                <Percent className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Platform Commissions (~18%)</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  -₹{commissions.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Packaging & Taxes</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  -₹{(packaging + gstTaxes).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-md">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Estimated Bank Settlement</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ₹{netBankPayout.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Channel-wise Commission Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-bold text-base text-orange-600 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                Swiggy Settlement
              </span>
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                18% Comm
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Gross Revenue:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  ₹{(stats.channelBreakdown.swiggy.revenue || 22000).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>Commission (18%):</span>
                <span>-₹{((stats.channelBreakdown.swiggy.revenue || 22000) * 0.18).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Taxes & Fees:</span>
                <span>-₹{((stats.channelBreakdown.swiggy.revenue || 22000) * 0.05).toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t text-emerald-600">
                <span>Net Bank Payout:</span>
                <span>₹{((stats.channelBreakdown.swiggy.revenue || 22000) * 0.77).toFixed(0)}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-bold text-base text-rose-600 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                Zomato Settlement
              </span>
              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                22% Comm
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Gross Revenue:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  ₹{(stats.channelBreakdown.zomato.revenue || 18500).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>Commission (22%):</span>
                <span>-₹{((stats.channelBreakdown.zomato.revenue || 18500) * 0.22).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Taxes & Fees:</span>
                <span>-₹{((stats.channelBreakdown.zomato.revenue || 18500) * 0.05).toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t text-emerald-600">
                <span>Net Bank Payout:</span>
                <span>₹{((stats.channelBreakdown.zomato.revenue || 18500) * 0.73).toFixed(0)}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-bold text-base text-blue-600 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                magicpin Settlement
              </span>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                10% Comm
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Gross Revenue:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  ₹{(stats.channelBreakdown.magicpin.revenue || 8000).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-rose-500">
                <span>Commission (10%):</span>
                <span>-₹{((stats.channelBreakdown.magicpin.revenue || 8000) * 0.1).toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Taxes & Fees:</span>
                <span>-₹{((stats.channelBreakdown.magicpin.revenue || 8000) * 0.05).toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t text-emerald-600">
                <span>Net Bank Payout:</span>
                <span>₹{((stats.channelBreakdown.magicpin.revenue || 8000) * 0.85).toFixed(0)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </FeatureLock>
  );
};
