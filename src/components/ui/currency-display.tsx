import React from 'react';
import { formatIndianCurrency } from "@/utils/formatters";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number | null | undefined;
  className?: string;
  showTooltip?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ 
  amount, 
  className,
  showTooltip = true 
}) => {
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
};