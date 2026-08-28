import React from "react";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Percent,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "../context/SandboxContext";
import { formatCurrency } from "@/utils/formatters";

export const SandboxAnalyticsView: React.FC = () => {
  const { orders } = useSandbox();

  const totalRevenue = 48920;
  const foodCost = 14670; // 30%
  const aggregatorCommissions = 3850;
  const netPocketProfit = totalRevenue - foodCost - aggregatorCommissions;
  const netMargin = Math.round((netPocketProfit / totalRevenue) * 100);

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-indigo-600" />
          Real-Time Profit & Loss (P&L) Analytics
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Live gross margin deduction, aggregator commission leaks & pocket profit analysis
        </p>
      </div>

      {/* Main Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Gross Sales (Today)
          </span>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {formatCurrency(totalRevenue)}
          </p>
          <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
            +28.4% vs Last Week
          </Badge>
        </div>

        <div className="p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Ingredient COGS Cost
          </span>
          <p className="text-2xl font-extrabold text-slate-700 dark:text-slate-300 font-mono">
            {formatCurrency(foodCost)}
          </p>
          <span className="text-xs text-slate-500 font-medium">30.0% of Gross</span>
        </div>

        <div className="p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Aggregator Commissions
          </span>
          <p className="text-2xl font-extrabold text-orange-600 font-mono">
            {formatCurrency(aggregatorCommissions)}
          </p>
          <span className="text-xs text-orange-500 font-medium">Swiggy (23%) + Zomato (24%)</span>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            Net Pocket Profit
          </span>
          <p className="text-2xl font-extrabold text-white font-mono">
            {formatCurrency(netPocketProfit)}
          </p>
          <Badge className="bg-white/20 text-white text-[10px] font-bold border-0">
            {netMargin}% Net Margin
          </Badge>
        </div>
      </div>
    </div>
  );
};
