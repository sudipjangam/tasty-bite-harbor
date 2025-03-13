
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
      className: "toast-card",
    });
  };

  if (!mounted) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-full w-10 h-10 transition-all duration-300 hover:bg-secondary/20 bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700 shadow-sm"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-brand-warm-orange transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-5 w-5 text-brand-deep-blue transition-transform duration-300 hover:-rotate-12" />
      )}
    </Button>
  );
};
