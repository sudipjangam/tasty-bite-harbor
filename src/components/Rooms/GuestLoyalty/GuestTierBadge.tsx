import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Crown, Star, Award, User } from "lucide-react";

export type GuestTier = "regular" | "silver" | "gold" | "platinum";

interface GuestTierBadgeProps {
  tier: GuestTier;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<
  GuestTier,
  {
    label: string;
    icon: React.ElementType;
    colors: string;
    description: string;
    perks: string[];
  }
> = {
  regular: {
    label: "Regular",
    icon: User,
    colors:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    description: "Welcome guest",
    perks: ["Standard rates", "Basic amenities"],
  },
  silver: {
    label: "Silver",
    icon: Award,
    colors:
      "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 border-gray-400 dark:from-gray-600 dark:to-gray-500 dark:text-gray-100 dark:border-gray-400",
    description: "3+ stays",
    perks: [
      "5% discount",
      "Priority check-in",
      "Late checkout (subject to availability)",
    ],
  },
  gold: {
    label: "Gold",
    icon: Star,
    colors:
      "bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-800 border-amber-500 dark:from-amber-600 dark:to-yellow-500 dark:text-amber-100 dark:border-amber-400",
    description: "10+ stays",
    perks: [
      "10% discount",
      "Room upgrade",
      "Free breakfast",
      "Priority reservations",
    ],
  },
  platinum: {
    label: "Platinum",
    icon: Crown,
    colors:
      "bg-gradient-to-r from-purple-300 to-pink-300 text-purple-900 border-purple-500 dark:from-purple-600 dark:to-pink-500 dark:text-purple-100 dark:border-purple-400",
    description: "25+ stays",
    perks: [
      "15% discount",
      "Best room available",
      "All-inclusive amenities",
      "Personal concierge",
      "24/7 support",
    ],
  },
};

export const getTierFromStays = (totalStays: number): GuestTier => {
  if (totalStays >= 25) return "platinum";
  if (totalStays >= 10) return "gold";
  if (totalStays >= 3) return "silver";
  return "regular";
};

export const getNextTierInfo = (currentTier: GuestTier, totalStays: number) => {
  const tierThresholds = {
    regular: 3,
    silver: 10,
    gold: 25,
    platinum: Infinity,
  };
  const tierOrder: GuestTier[] = ["regular", "silver", "gold", "platinum"];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex >= 3) return null; // Already platinum

  const nextTier = tierOrder[currentIndex + 1];
  const staysNeeded = tierThresholds[currentTier] - totalStays;

  return { nextTier, staysNeeded };
};

const GuestTierBadge: React.FC<GuestTierBadgeProps> = ({
  tier,
  size = "md",
  showLabel = true,
  className,
}) => {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs py-0.5 px-1.5",
    md: "text-sm py-1 px-2.5",
    lg: "text-base py-1.5 px-3",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const badge = (
    <Badge
      className={cn(
        "border transition-all hover:shadow-md",
        config.colors,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn(iconSizes[size], showLabel && "mr-1")} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="font-semibold flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {config.label} Member
            </div>
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
            <div className="text-xs">
              <div className="font-medium mb-1">Perks:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {config.perks.map((perk, i) => (
                  <li key={i}>{perk}</li>
                ))}
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default GuestTierBadge;
