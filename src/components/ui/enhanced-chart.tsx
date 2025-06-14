
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, MoreHorizontal, Download, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartMetric {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'currency' | 'percentage' | 'number';
}

interface EnhancedChartProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  metrics?: ChartMetric[];
  actions?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'highlighted';
}

const formatValue = (value: string | number, format?: string) => {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return `₹${value.toLocaleString()}`;
    case 'percentage':
      return `${value}%`;
    default:
      return value.toLocaleString();
  }
};

const getTrendIcon = (changeType?: string) => {
  switch (changeType) {
    case 'increase':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'decrease':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return null;
  }
};

const getTrendColor = (changeType?: string) => {
  switch (changeType) {
    case 'increase':
      return 'text-green-600';
    case 'decrease':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export const EnhancedChart: React.FC<EnhancedChartProps> = ({
  title,
  description,
  children,
  metrics = [],
  actions,
  className,
  size = 'md',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const variantClasses = {
    default: 'bg-white border border-gray-200',
    minimal: 'bg-white border-0 shadow-none',
    highlighted: 'bg-gradient-to-br from-purple-50 to-white border border-purple-200'
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-lg',
      variantClasses[variant],
      className
    )}>
      <CardHeader className={cn('pb-4', sizeClasses[size])}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-sm text-gray-600">
                {description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {actions}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {metrics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {metrics.map((metric, index) => (
              <div key={index} className="space-y-1">
                <p className="text-sm text-gray-600 font-medium">
                  {metric.label}
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatValue(metric.value, metric.format)}
                  </span>
                  {metric.change !== undefined && (
                    <div className={cn(
                      'flex items-center space-x-1 text-sm font-medium',
                      getTrendColor(metric.changeType)
                    )}>
                      {getTrendIcon(metric.changeType)}
                      <span>{Math.abs(metric.change)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className={cn('pt-0', sizeClasses[size])}>
        <div className="w-full h-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

export const ChartActions: React.FC<{ onExport?: () => void; onExpand?: () => void }> = ({
  onExport,
  onExpand
}) => (
  <div className="flex items-center space-x-1">
    {onExport && (
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExport}>
        <Download className="h-4 w-4" />
      </Button>
    )}
    {onExpand && (
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExpand}>
        <Maximize2 className="h-4 w-4" />
      </Button>
    )}
  </div>
);

export const ChartLoadingState: React.FC<{ height?: string }> = ({ height = "300px" }) => (
  <div className={cn("flex items-center justify-center bg-gray-50 rounded-lg animate-pulse")} style={{ height }}>
    <div className="text-center space-y-2">
      <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto animate-pulse"></div>
      <p className="text-sm text-gray-500">Loading chart data...</p>
    </div>
  </div>
);

export const ChartEmptyState: React.FC<{ message?: string; height?: string }> = ({ 
  message = "No data available", 
  height = "300px" 
}) => (
  <div className={cn("flex items-center justify-center bg-gray-50 rounded-lg")} style={{ height }}>
    <div className="text-center space-y-2">
      <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
        <TrendingUp className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  </div>
);
