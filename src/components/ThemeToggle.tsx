
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast({
      title: `${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Theme Activated`,
      description: `The application is now in ${newTheme} mode.`,
      // Removed explicit duration since we now have a default of 3 seconds
      className: "toast-card",
    });
  };

  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-full w-9 h-9 transition-all duration-300 hover:bg-secondary/20"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-brand-warm-orange transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 text-brand-deep-blue transition-transform duration-300 hover:-rotate-12" />
      )}
    </Button>
  );
};
