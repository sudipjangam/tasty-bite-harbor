import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// LOADING SPINNER VARIANTS
// ============================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'white' | 'gray';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  color = 'primary'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'text-primary',
    white: 'text-white',
    gray: 'text-gray-400',
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )} 
    />
  );
};

// ============================================
// FULL PAGE LOADING
// ============================================

interface PageLoadingProps {
  message?: string;
  showSpinner?: boolean;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  message = 'Loading...', 
  showSpinner = true 
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      <div className="flex flex-col items-center gap-4 p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/30">
        {showSpinner && (
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        )}
        <p className="text-gray-600 dark:text-gray-300 font-medium animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

// ============================================
// CARD LOADING SKELETON
// ============================================

interface CardSkeletonProps {
  showImage?: boolean;
  lines?: number;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showImage = true,
  lines = 3,
  className,
}) => {
  return (
    <div className={cn(
      "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 space-y-4 animate-pulse border border-gray-200/50 dark:border-gray-700/50",
      className
    )}>
      {showImage && (
        <div className="h-40 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl" />
      )}
      <div className="space-y-3">
        <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg w-3/4" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg"
            style={{ width: `${Math.random() * 40 + 50}%` }}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// TABLE LOADING SKELETON
// ============================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={cn("space-y-4 animate-pulse", className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-xl">
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-gray-300 dark:bg-gray-600 rounded flex-1" 
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex gap-4 p-4 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/30"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"
              style={{ opacity: 0.7 - (rowIndex * 0.1) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// ============================================
// STATS LOADING SKELETON
// ============================================

interface StatsSkeletonProps {
  count?: number;
  className?: string;
}

export const StatsSkeleton: React.FC<StatsSkeletonProps> = ({
  count = 4,
  className,
}) => {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 animate-pulse border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
      ))}
    </div>
  );
};

// ============================================
// INLINE LOADING (for buttons, text areas)
// ============================================

interface InlineLoadingProps {
  text?: string;
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = 'Loading...',
  className,
}) => {
  return (
    <span className={cn("inline-flex items-center gap-2 text-gray-500", className)}>
      <LoadingSpinner size="sm" color="gray" />
      <span className="text-sm">{text}</span>
    </span>
  );
};

// ============================================
// CHART LOADING SKELETON
// ============================================

export const ChartSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn(
      "bg-white/90 dark:bg-gray-800/90 rounded-2xl p-6 animate-pulse border border-gray-200/50 dark:border-gray-700/50",
      className
    )}>
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
      <div className="h-64 bg-gradient-to-t from-gray-100 to-gray-50 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl flex items-end justify-around px-4 pb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div 
            key={i}
            className="bg-gray-300 dark:bg-gray-600 rounded-t-lg w-8"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// FORM LOADING SKELETON  
// ============================================

export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({ 
  fields = 4,
  className 
}) => {
  return (
    <div className={cn("space-y-6 animate-pulse", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl flex-1" />
        <div className="h-12 bg-indigo-200 dark:bg-indigo-800/50 rounded-xl w-32" />
      </div>
    </div>
  );
};

// ============================================
// SUSPENSE FALLBACK WRAPPER
// ============================================

interface SuspenseFallbackProps {
  type?: 'page' | 'card' | 'table' | 'chart' | 'form';
  message?: string;
}

export const SuspenseFallback: React.FC<SuspenseFallbackProps> = ({ 
  type = 'page',
  message 
}) => {
  switch (type) {
    case 'card':
      return <CardSkeleton />;
    case 'table':
      return <TableSkeleton />;
    case 'chart':
      return <ChartSkeleton />;
    case 'form':
      return <FormSkeleton />;
    default:
      return <PageLoading message={message} />;
  }
};
