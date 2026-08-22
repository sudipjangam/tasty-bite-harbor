import React from "react";
import { Users, TrendingUp, Award } from "lucide-react";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface CustomerStatsStripProps {
  totalCustomers: number;
  registeredRevenue: number;
  walkInRevenue: number;
  totalSpent: number;
  averageOrderValue: number;
  totalPoints: number;
  isMobile?: boolean;
}

export const CustomerStatsStrip: React.FC<CustomerStatsStripProps> = ({
  totalCustomers,
  registeredRevenue,
  walkInRevenue,
  totalSpent,
  averageOrderValue,
  totalPoints,
  isMobile = false,
}) => {
  if (isMobile) {
    return (
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl border border-white/20 dark:border-gray-700/30 shadow-xs mb-2">
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-blue-50/60 dark:bg-blue-900/20 text-center">
          <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 truncate">Custs</span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">{totalCustomers}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 text-center">
          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">Total Rev</span>
          <CurrencyDisplay amount={totalSpent} className="text-xs font-bold text-gray-900 dark:text-white" />
        </div>
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-900/20 text-center">
          <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 truncate">Avg Bill</span>
          <CurrencyDisplay amount={Number(averageOrderValue.toFixed(0))} className="text-xs font-bold text-gray-900 dark:text-white" />
        </div>
        <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-purple-50/60 dark:bg-purple-900/20 text-center">
          <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 truncate">Pts Issued</span>
          <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{totalPoints.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4">
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-3.5 shadow-lg shadow-blue-200/60 dark:shadow-blue-900/30">
        <div className="flex flex-col gap-1">
          <div className="p-1.5 bg-white/20 rounded-lg w-fit">
            <Users className="h-4 w-4 text-white" />
          </div>
          <p className="text-[10px] sm:text-xs text-blue-100 font-medium mt-1">Total Customers</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalCustomers}</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-3.5 shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/30">
        <div className="flex flex-col gap-1">
          <div className="p-1.5 bg-white/20 rounded-lg w-fit">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <p className="text-[10px] sm:text-xs text-indigo-100 font-medium mt-1">Registered Rev</p>
          <CurrencyDisplay amount={registeredRevenue} className="text-xl sm:text-2xl font-bold text-white" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl p-3.5 shadow-lg shadow-teal-200/60 dark:shadow-teal-900/30">
        <div className="flex flex-col gap-1">
          <div className="p-1.5 bg-white/20 rounded-lg w-fit">
            <Users className="h-4 w-4 text-white" />
          </div>
          <p className="text-[10px] sm:text-xs text-teal-100 font-medium mt-1">Walk In Rev</p>
          <CurrencyDisplay amount={walkInRevenue} className="text-xl sm:text-2xl font-bold text-white" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-3.5 shadow-lg shadow-green-200/60 dark:shadow-green-900/30">
        <div className="flex flex-col gap-1">
          <div className="p-1.5 bg-white/20 rounded-lg w-fit">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <p className="text-[10px] sm:text-xs text-green-100 font-medium mt-1">Total Revenue</p>
          <CurrencyDisplay amount={totalSpent} className="text-xl sm:text-2xl font-bold text-white" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-3.5 shadow-lg shadow-orange-200/60 dark:shadow-orange-900/30">
        <div className="flex flex-col gap-1">
          <div className="p-1.5 bg-white/20 rounded-lg w-fit">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <p className="text-[10px] sm:text-xs text-orange-100 font-medium mt-1">Avg Order Val</p>
          <CurrencyDisplay amount={Number(averageOrderValue.toFixed(2))} className="text-xl sm:text-2xl font-bold text-white" />
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-3.5 shadow-lg shadow-purple-200/60 dark:shadow-purple-900/30">
        <div className="flex flex-col gap-1">
          <div className="p-1.5 bg-white/20 rounded-lg w-fit">
            <Award className="h-4 w-4 text-white" />
          </div>
          <p className="text-[10px] sm:text-xs text-purple-100 font-medium mt-1">Total Points</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalPoints.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerStatsStrip;
