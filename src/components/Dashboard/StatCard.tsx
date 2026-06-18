import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  color: string;
  gradient?: string;
  shadow?: string;
  onClick: () => void;
  index?: number;
  sparklineData?: number[];
}

// Animated counter hook
const useAnimatedCounter = (target: string, duration: number = 1200) => {
  const [display, setDisplay] = useState("0");
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Extract numeric part
    const numericMatch = target.match(/[\d,.]+/);
    if (!numericMatch) {
      setDisplay(target);
      return;
    }

    const prefix = target.slice(0, target.indexOf(numericMatch[0]));
    const suffix = target.slice(
      target.indexOf(numericMatch[0]) + numericMatch[0].length
    );
    const numStr = numericMatch[0].replace(/,/g, "");
    const targetNum = parseFloat(numStr);

    if (isNaN(targetNum)) {
      setDisplay(target);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = targetNum * eased;

      // Format with same pattern
      let formatted: string;
      if (numStr.includes(".")) {
        const decimals = numStr.split(".")[1]?.length || 0;
        formatted = current.toFixed(decimals);
      } else {
        formatted = Math.floor(current).toString();
      }

      // Add commas
      formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setDisplay(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
};

// Mini sparkline SVG component
const MiniSparkline = ({
  data,
  color = "rgba(255,255,255,0.6)",
}: {
  data?: number[];
  color?: string;
}) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y =
      height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkArea)" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Glow dot on last point */}
      {points.length > 0 && (
        <>
          <circle
            cx={points[points.length - 1].split(",")[0]}
            cy={points[points.length - 1].split(",")[1]}
            r="2.5"
            fill="white"
            className="animate-pulse"
          />
          <circle
            cx={points[points.length - 1].split(",")[0]}
            cy={points[points.length - 1].split(",")[1]}
            r="4"
            fill="white"
            opacity="0.3"
            className="animate-ping"
          />
        </>
      )}
    </svg>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
  gradient,
  shadow,
  onClick,
  index = 0,
  sparklineData,
}: StatCardProps) => {
  const animatedValue = useAnimatedCounter(value);
  const isPositive = trend.startsWith("+") && trend !== "+0" && trend !== "+0%";
  const isNegative = trend.startsWith("-");
  const isNeutral = !isPositive && !isNegative;

  const TrendIcon = isPositive
    ? TrendingUp
    : isNegative
      ? TrendingDown
      : Minus;

  return (
    <Card
      className="group relative overflow-hidden border-0 cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:scale-[1.03] rounded-2xl"
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: "both",
      }}
      onClick={onClick}
    >
      {/* Multi-layer gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient || "from-gray-500 to-gray-600"}`}
      />

      {/* Mesh gradient overlay for depth */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-1/3 -right-1/3 w-2/3 h-2/3 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Animated geometric pattern */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Shine sweep on hover */}
      <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[shine_0.8s_ease-in-out]" />

      {/* Glowing orb accent */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 blur-[40px] rounded-full group-hover:bg-white/20 transition-all duration-700" />
      <div className="absolute -left-4 -top-4 w-20 h-20 bg-white/5 blur-[30px] rounded-full group-hover:bg-white/15 transition-all duration-700" />

      <CardContent className="relative z-10 p-5 sm:p-6 flex flex-col h-full justify-between min-h-[160px]">
        {/* Top row: icon + trend badge */}
        <div className="flex justify-between items-start">
          <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl shadow-inner border border-white/20 group-hover:bg-white/25 group-hover:scale-110 transition-all duration-500">
            <Icon className="w-5 h-5 text-white drop-shadow-md" />
          </div>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md border text-xs font-bold tracking-wide ${
              isPositive
                ? "bg-emerald-400/20 border-emerald-300/30 text-emerald-100"
                : isNegative
                  ? "bg-red-400/20 border-red-300/30 text-red-100"
                  : "bg-white/15 border-white/20 text-white/80"
            }`}
          >
            <TrendIcon className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        </div>

        {/* Bottom: value + title + sparkline */}
        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-[11px] font-semibold text-white/60 tracking-[0.1em] uppercase mb-1 truncate">
                {title}
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm leading-none">
                {animatedValue}
              </h3>
            </div>

            {/* Mini sparkline */}
            {sparklineData && sparklineData.length > 1 && (
              <div className="flex-shrink-0 ml-2 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                <MiniSparkline data={sparklineData} />
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Card>
  );
};

export default StatCard;
