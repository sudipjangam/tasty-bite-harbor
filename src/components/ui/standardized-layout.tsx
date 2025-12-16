
import React from "react";
import { cn } from "@/lib/utils";

interface StandardizedLayoutProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Standardized layout wrapper for consistent spacing and max-widths
 */
export const StandardizedLayout: React.FC<StandardizedLayoutProps> = ({
  children,
  className,
  padding = 'md',
  maxWidth = 'full'
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  };

  return (
    <div className={cn(
      'mx-auto',
      paddingClasses[padding],
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
};

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standardized page header component
 */
export const StandardizedPageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className
}) => {
  return (
    <div className={cn(
      'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6',
      className
    )}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};
