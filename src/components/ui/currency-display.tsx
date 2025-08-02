import React from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatIndianCurrency } from '@/utils/formatters';

interface CurrencyDisplayProps {
  amount: number | null | undefined;
  className?: string;
  showTooltip?: boolean;
  useIndianFormat?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ 
  amount, 
  className,
  showTooltip = true,
  useIndianFormat = true
}) => {
  const { formatCurrency, symbol } = useCurrency();
  
  if (!amount && amount !== 0) {
    return <span className={className}>-</span>;
  }
  
  if (useIndianFormat) {
    const { formatted, actual } = formatIndianCurrency(amount);
    
    if (!showTooltip) {
      return <span className={className}>{formatted}</span>;
    }
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help", className)}>
            {formatted}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Exact amount: {actual}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  
  const formatted = formatCurrency(amount);
  
  if (!showTooltip) {
    return <span className={className}>{formatted}</span>;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("cursor-help", className)}>
          {formatted}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Exact amount: {formatted}</p>
      </TooltipContent>
    </Tooltip>
  );
};