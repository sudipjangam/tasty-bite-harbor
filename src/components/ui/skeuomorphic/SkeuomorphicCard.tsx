import React from "react";
import { cn } from "@/lib/utils";

export interface SkeuomorphicCardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "default" | "sm";
  interactive?: boolean;
  onClick?: () => void;
}

export const SkeuomorphicCard: React.FC<SkeuomorphicCardProps> = ({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
  size = "default",
  interactive = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        size === "sm" ? "skeuo-card-sm p-4 sm:p-5" : "skeuo-card p-6 sm:p-7",
        interactive && "cursor-pointer active:scale-[0.99] hover:shadow-lg transition-all",
        "relative overflow-hidden select-none",
        className
      )}
    >
      {(title || icon || actions) && (
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            {icon && <div className="p-2 rounded-xl skeuo-circle">{icon}</div>}
            <div>
              {title && (
                <h3 className="font-black text-gray-900 dark:text-white text-base sm:text-lg tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {children}
    </div>
  );
};

export default SkeuomorphicCard;
