import React from "react";
import { Card } from "@/components/ui/card";
import { Package, AlertTriangle, Layers, BarChart3, LucideIcon } from "lucide-react";

interface KPIProps {
  totalItems: number;
  lowStockCount: number;
  categoriesCount: number;
  totalValue: number;
  currencySymbol: string;
}

const InventoryKPIs: React.FC<KPIProps> = ({
  totalItems,
  lowStockCount,
  categoriesCount,
  totalValue,
  currencySymbol,
}) => {
  const stats = [
    { label: "Total Items", value: totalItems, icon: Package, gradient: "from-emerald-500 to-green-500", shadow: "shadow-emerald-500/20" },
    { label: "Low Stock", value: lowStockCount, icon: AlertTriangle, gradient: "from-red-500 to-rose-500", shadow: "shadow-red-500/20" },
    { label: "Categories", value: categoriesCount, icon: Layers, gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/20" },
    { label: "Total Value", value: `${currencySymbol}${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: BarChart3, gradient: "from-violet-500 to-purple-500", shadow: "shadow-violet-500/20" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4 md:p-5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/40 dark:border-gray-700/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity`} />
          <div className="flex items-center gap-3 relative">
            <div className={`p-2.5 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-md ${stat.shadow}`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
              <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {stat.value}
              </h3>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default InventoryKPIs;
