import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PREFERENCE_OPTIONS,
  PreferenceType,
  GuestPreference,
} from "@/hooks/useGuestPreferences";
import {
  Bed,
  Building,
  UtensilsCrossed,
  Sparkles,
  Heart,
  X,
} from "lucide-react";

interface PreferenceChipsProps {
  preferences: GuestPreference[];
  onRemove?: (id: string) => void;
  size?: "sm" | "md";
  className?: string;
}

const CATEGORY_ICONS: Record<PreferenceType, React.ElementType> = {
  room_type: Building,
  floor: Building,
  bed_type: Bed,
  amenities: Sparkles,
  dietary: UtensilsCrossed,
  special: Heart,
};

const CATEGORY_COLORS: Record<PreferenceType, string> = {
  room_type:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  floor:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  bed_type:
    "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
  amenities:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  dietary:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  special:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
};

const getPreferenceLabel = (type: PreferenceType, value: string): string => {
  const options = PREFERENCE_OPTIONS[type]?.options || [];
  const option = options.find((o) => o.value === value);
  return option?.label || value;
};

const PreferenceChips: React.FC<PreferenceChipsProps> = ({
  preferences,
  onRemove,
  size = "md",
  className,
}) => {
  if (!preferences || preferences.length === 0) {
    return (
      <span className="text-sm text-muted-foreground italic">
        No preferences saved
      </span>
    );
  }

  const sizeClasses =
    size === "sm" ? "text-xs py-0.5 px-2" : "text-sm py-1 px-2.5";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {preferences.map((pref) => {
        const Icon =
          CATEGORY_ICONS[pref.preference_type as PreferenceType] || Sparkles;
        const colors =
          CATEGORY_COLORS[pref.preference_type as PreferenceType] ||
          CATEGORY_COLORS.special;
        const label = getPreferenceLabel(
          pref.preference_type as PreferenceType,
          pref.preference_value
        );

        return (
          <Badge
            key={pref.id}
            className={cn(
              "border transition-all",
              colors,
              sizeClasses,
              onRemove && "pr-1"
            )}
          >
            <Icon
              className={cn(
                size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5",
                "mr-1.5"
              )}
            />
            <span>{label}</span>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(pref.id);
                }}
                className="ml-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
              >
                <X className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
              </button>
            )}
          </Badge>
        );
      })}
    </div>
  );
};

export default PreferenceChips;
