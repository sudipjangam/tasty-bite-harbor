
import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { componentVariants } from "@/config/designTokens";

interface StandardizedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass';
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

/**
 * Standardized card component with consistent styling
 */
export const StandardizedCard: React.FC<StandardizedCardProps> = ({
  children,
  variant = 'default',
  className,
  padding = 'md',
  hover = true
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <Card
      className={cn(
        componentVariants.card[variant],
        paddingClasses[padding],
        hover && 'hover:shadow-lg transition-shadow duration-200',
        className
      )}
    >
      {children}
    </Card>
  );
};
