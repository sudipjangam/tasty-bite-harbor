
import React from "react";
import { cn } from "@/lib/utils";

interface StandardizedPageProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Standardized page layout component for consistent page structure
 */
export const StandardizedPage: React.FC<StandardizedPageProps> = ({
  children,
  className,
  title,
  description,
  actions
}) => {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50/30 dark:from-neutral-900 dark:to-primary-950/30",
      className
    )}>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {(title || description || actions) && (
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};
