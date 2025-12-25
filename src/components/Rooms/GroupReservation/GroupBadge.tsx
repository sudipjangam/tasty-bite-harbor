import React from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GroupBadgeProps {
  groupName: string;
  roomCount?: number;
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
}

const GroupBadge: React.FC<GroupBadgeProps> = ({
  groupName,
  roomCount,
  onClick,
  size = "md",
  className,
}) => {
  const badge = (
    <Badge
      variant="secondary"
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40",
        "text-purple-700 dark:text-purple-300",
        "border border-purple-200 dark:border-purple-800",
        "hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-800/60 dark:hover:to-pink-800/60",
        size === "sm" ? "text-xs py-0.5 px-2" : "text-sm py-1 px-3",
        onClick && "hover:scale-105",
        className
      )}
      onClick={onClick}
    >
      <Users className={cn("mr-1.5", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      <span className="truncate max-w-[120px]">{groupName}</span>
      {roomCount && roomCount > 1 && (
        <span className="ml-1.5 opacity-80">({roomCount} rooms)</span>
      )}
    </Badge>
  );

  if (onClick) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>Click to view group details</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};

export default GroupBadge;
