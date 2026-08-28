import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp } from "lucide-react";

export interface BarChartDataPoint {
  label: string;
  subLabel?: string;
  value: number;
  color?: string;
  secondaryValue?: number;
}

export interface SkeuomorphicBarChartProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  data: BarChartDataPoint[];
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
  formatValue?: (val: number) => string;
  barGradient?: string;
  showTrackWells?: boolean;
  actions?: React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export const SkeuomorphicBarChart: React.FC<SkeuomorphicBarChartProps> = ({
  title,
  subtitle,
  icon,
  data,
  valuePrefix = "",
  valueSuffix = "",
  height = 240,
  formatValue,
  barGradient = "from-[#3b82f6] to-[#2563eb]",
  showTrackWells = true,
  actions,
  emptyMessage = "No data available",
  className,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 1;
    const max = Math.max(...data.map((d) => d.value));
    return max > 0 ? max : 1;
  }, [data]);

  const totalValue = useMemo(() => {
    return data.reduce((acc, d) => acc + d.value, 0);
  }, [data]);

  const activeDataPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  const displayVal = (val: number) => {
    if (formatValue) return formatValue(val);
    return `${valuePrefix}${val.toLocaleString()}${valueSuffix}`;
  };

  return (
    <div className={cn("flex flex-col w-full space-y-4 select-none", className)}>
      
      {/* Header with Title, Icon & Custom Actions */}
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon ? (
              <div className="p-2 rounded-xl skeuo-circle">{icon}</div>
            ) : (
              <div className="p-2 rounded-xl skeuo-circle">
                <BarChart3 className="h-4 w-4 text-[#3b82f6] dark:text-blue-400" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="font-black text-gray-900 dark:text-white text-base tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Floating Active Info Banner */}
      <div className="flex items-center justify-between px-4 py-2 rounded-xl skeuo-inset text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-bold">
            {activeDataPoint ? activeDataPoint.label : "Total Volume"}:
          </span>
          <span className="font-black text-gray-900 dark:text-white text-sm">
            {activeDataPoint ? displayVal(activeDataPoint.value) : displayVal(totalValue)}
          </span>
        </div>

        {activeDataPoint && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full skeuo-btn text-[#3b82f6] dark:text-blue-400">
            {Math.round((activeDataPoint.value / maxValue) * 100)}% of peak
          </span>
        )}
      </div>

      {/* ─── 3D SKEUOMORPHIC CAPSULE BARS CONTAINER ─── */}
      {!data || data.length === 0 ? (
        <div
          style={{ height }}
          className="flex items-center justify-center rounded-2xl skeuo-inset text-gray-400 text-xs font-semibold"
        >
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col space-y-3 pt-2">
          <div
            style={{ height }}
            className="flex items-end justify-around gap-2 sm:gap-3 px-2 sm:px-4"
          >
            {data.map((item, index) => {
              const heightPercent = Math.max(Math.round((item.value / maxValue) * 100), 4);
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer touch-manipulation"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setHoveredIndex(index)}
                >
                  {/* Sunken Vertical Track Capsule (Mockup Look) */}
                  <div
                    className={cn(
                      "w-full max-w-[36px] sm:max-w-[44px] h-full flex flex-col justify-end p-1 rounded-2xl transition-all duration-300 relative",
                      showTrackWells ? "skeuo-inset" : "bg-transparent",
                      isHovered && "scale-[1.04]"
                    )}
                  >
                    {/* Glowing Extruded 3D Capsule Fill Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        "w-full rounded-xl bg-gradient-to-t transition-all duration-500 relative overflow-hidden shadow-md",
                        item.color || barGradient,
                        isHovered && "shadow-[0_0_15px_rgba(59,130,246,0.6)] brightness-110"
                      )}
                    >
                      {/* Top Bevel Highlight for 3D tactile pill look */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-white/40 rounded-t-xl" />
                    </div>
                  </div>

                  {/* Horizontal Labels */}
                  <div className="mt-2 text-center">
                    <span
                      className={cn(
                        "text-[10px] sm:text-xs font-bold block transition-colors truncate max-w-[50px] sm:max-w-[65px]",
                        isHovered
                          ? "text-[#3b82f6] dark:text-blue-400 font-black"
                          : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {item.label}
                    </span>
                    {item.subLabel && (
                      <span className="text-[8px] text-gray-400 block -mt-0.5">
                        {item.subLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkeuomorphicBarChart;
