import { useState, useEffect } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "pill" | "compact" | "mini";
}

/**
 * 3D-style Theme Toggle with gradient backgrounds
 * pill variant: Full toggle with text label
 * compact variant: Smaller toggle for tight spaces
 * mini variant: Icon-only toggle for headers
 */
export function ThemeToggle({ className, variant = "pill" }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { actualTheme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = actualTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  if (!mounted) {
    return null;
  }

  const isLight = actualTheme === "light";

  // Mini variant - icon only, very compact
  if (variant === "mini") {
    return (
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
        className={cn(
          "relative flex items-center justify-center p-1.5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg",
          isLight 
            ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-orange-400/20 hover:from-amber-500 hover:to-orange-600" 
            : "bg-gradient-to-r from-indigo-500 to-blue-600 shadow-blue-600/20 hover:from-indigo-600 hover:to-blue-700",
          className
        )}
      >
        {isLight ? (
          <Sun className="h-3.5 w-3.5 text-white" />
        ) : (
          <Moon className="h-3.5 w-3.5 text-white" />
        )}
      </button>
    );
  }

  // Compact variant for mobile and tight spaces
  if (variant === "compact") {
    return (
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-500 shadow-lg",
          isLight 
            ? "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-orange-400/30" 
            : "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 shadow-blue-600/30",
          className
        )}
      >
        <div className={cn(
          "p-1.5 rounded-full bg-white shadow-md transition-transform duration-300",
          isLight ? "translate-x-0" : "translate-x-0"
        )}>
          {isLight ? (
            <Sun className="h-4 w-4 text-orange-500" />
          ) : (
            <Moon className="h-4 w-4 text-blue-600" />
          )}
        </div>
        <span className="text-xs font-bold text-white uppercase tracking-wide">
          {isLight ? "Light" : "Dark"}
        </span>
      </button>
    );
  }

  // Full pill variant with 3D effect
  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      className={cn(
        "group relative flex items-center rounded-full transition-all duration-500 overflow-hidden",
        "shadow-xl hover:shadow-2xl transform hover:scale-105",
        isLight 
          ? "shadow-orange-400/40 hover:shadow-orange-400/50" 
          : "shadow-blue-600/40 hover:shadow-blue-600/50",
        className
      )}
    >
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 transition-all duration-500",
        isLight 
          ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500" 
          : "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700"
      )} />

      {/* Inner shadow for 3D depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent" />

      {/* Content */}
      <div className="relative flex items-center px-4 py-2.5 gap-3">
        {/* Toggle ball with icon */}
        <div className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500",
          "bg-white shadow-lg",
          isLight 
            ? "shadow-orange-500/30" 
            : "shadow-blue-400/30",
          // 3D effect on the ball
          "before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white before:to-gray-100"
        )}>
          <div className="relative z-10">
            {isLight ? (
              <Sun className="h-5 w-5 text-orange-500 drop-shadow-sm transition-transform duration-500 group-hover:rotate-45" />
            ) : (
              <>
                <Moon className="h-5 w-5 text-blue-600 drop-shadow-sm transition-transform duration-500 group-hover:-rotate-12" />
                <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-yellow-400" />
              </>
            )}
          </div>
        </div>

        {/* Text label */}
        <div className="flex flex-col items-start pr-2">
          <span className="text-xs font-bold text-white/90 uppercase tracking-wider leading-none">
            {isLight ? "Light" : "Dark"}
          </span>
          <span className="text-[10px] font-semibold text-white uppercase tracking-widest leading-tight">
            Mode
          </span>
        </div>
      </div>

      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </button>
  );
}

export default ThemeToggle;
