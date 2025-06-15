
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ui/theme-provider";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, actualTheme } = useTheme();
  const { toast } = useToast();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    const newTheme = actualTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    toast({
      title: `${newTheme === "dark" ? "Dark" : "Light"} Theme Active`,
      description: `The application is now in ${newTheme} mode.`,
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
      onClick={handleClick}
      aria-label={`Switch to ${actualTheme === "light" ? "dark" : "light"} mode`}
      className="rounded-full w-8 h-8 transition-all duration-300 hover:bg-sidebar-purple-dark bg-transparent text-white hover:text-white"
    >
      {actualTheme === "light" ? (
        <Moon className="h-4 w-4 transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Sun className="h-4 w-4 transition-transform duration-300 hover:rotate-45" />
      )}
    </Button>
  );
}
