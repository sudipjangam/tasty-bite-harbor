import React from "react";
import { cn } from "@/lib/utils";

export interface SkeuomorphicGaugeProps {
  value: number; // 0 to 100
  title?: string;
  subTitle?: string;
  size?: number;
  strokeWidth?: number;
  gradient?: "orange-pink" | "blue-indigo" | "emerald-teal" | "purple-pink";
  centerContent?: React.ReactNode;
  className?: string;
}

export const SkeuomorphicGauge: React.FC<SkeuomorphicGaugeProps> = ({
  value,
  title,
  subTitle,
  size = 180,
  strokeWidth = 18,
  gradient = "orange-pink",
  centerContent,
  className,
}) => {
  const clamped = Math.min(Math.max(value, 0), 100);
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const gradientMap = {
    "orange-pink": { from: "#F26722", to: "#ff4757" },
    "blue-indigo": { from: "#3b82f6", to: "#2E3192" },
    "emerald-teal": { from: "#10b981", to: "#06b6d4" },
    "purple-pink": { from: "#8b5cf6", to: "#ec4899" },
  };

  const selectedGrad = gradientMap[gradient];

  return (
    <div className={cn("flex flex-col items-center justify-center select-none", className)}>
      <div className="relative flex items-center justify-center p-3 rounded-full skeuo-circle-inset">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 filter drop-shadow-md"
        >
          <defs>
            <linearGradient id={`gauge-grad-${gradient}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={selectedGrad.from} />
              <stop offset="100%" stopColor={selectedGrad.to} />
            </linearGradient>
            <filter id="gauge-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Background Track Well */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200/80 dark:text-slate-800"
          />

          {/* Glowing Progress Capsule Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={`url(#gauge-grad-${gradient})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#gauge-shadow)"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Central Raised 3D Disc */}
        <div
          style={{ width: size - strokeWidth * 2 - 16, height: size - strokeWidth * 2 - 16 }}
          className="absolute inset-0 m-auto rounded-full skeuo-circle flex flex-col items-center justify-center text-center p-2"
        >
          {centerContent || (
            <>
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {Math.round(clamped)}%
              </div>
              {title && (
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider -mt-0.5">
                  {title}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {subTitle && (
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-2 text-center">
          {subTitle}
        </span>
      )}
    </div>
  );
};

export default SkeuomorphicGauge;
