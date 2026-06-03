import React from "react";
import { Package, AlertTriangle, Layers, BarChart3, LucideIcon } from "lucide-react";

interface KPIProps {
  totalItems: number;
  lowStockCount: number;
  categoriesCount: number;
  totalValue: number;
  currencySymbol: string;
}

interface StatConfig {
  label: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  glowColor: string;
  borderGlow: string;
  pulse?: boolean;
}

const InventoryKPIs: React.FC<KPIProps> = ({
  totalItems,
  lowStockCount,
  categoriesCount,
  totalValue,
  currencySymbol,
}) => {
  const stats: StatConfig[] = [
    {
      label: "Total Items",
      value: totalItems,
      icon: Package,
      gradient: "from-emerald-400 via-green-500 to-teal-600",
      glowColor: "shadow-emerald-500/40",
      borderGlow: "hover:border-emerald-400/50",
    },
    {
      label: "Low Stock",
      value: lowStockCount,
      icon: AlertTriangle,
      gradient: "from-red-400 via-rose-500 to-pink-600",
      glowColor: "shadow-rose-500/40",
      borderGlow: "hover:border-rose-400/50",
      pulse: lowStockCount > 0,
    },
    {
      label: "Categories",
      value: categoriesCount,
      icon: Layers,
      gradient: "from-blue-400 via-indigo-500 to-violet-600",
      glowColor: "shadow-indigo-500/40",
      borderGlow: "hover:border-indigo-400/50",
    },
    {
      label: "Total Value",
      value: `${currencySymbol}${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: BarChart3,
      gradient: "from-violet-400 via-purple-500 to-fuchsia-600",
      glowColor: "shadow-purple-500/40",
      borderGlow: "hover:border-purple-400/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`group relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/30 dark:border-white/[0.08] bg-white/50 dark:bg-gray-900/50 backdrop-blur-2xl p-4 md:p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl cursor-default ${stat.borderGlow}`}
        >
          {/* Animated gradient sweep background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.04] group-hover:opacity-[0.10] transition-opacity duration-500`}
          />
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-[0.06] group-hover:opacity-[0.12] blur-2xl transition-all duration-700 group-hover:scale-125" style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />

          <div className="relative flex items-center gap-3 md:gap-4">
            {/* 3D Icon Sphere */}
            <div className="relative">
              {stat.pulse && (
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} animate-ping opacity-30`} />
              )}
              <div
                className={`relative p-2.5 md:p-3 bg-gradient-to-br ${stat.gradient} rounded-2xl shadow-lg ${stat.glowColor} group-hover:shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}
                style={{
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.1)',
                }}
              >
                <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-white drop-shadow-sm" />
              </div>
            </div>

            {/* Text */}
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                {stat.label}
              </p>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums truncate">
                {stat.value}
              </h3>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventoryKPIs;
