
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = () => {
    toast({
      title: "Light Theme Active",
      description: "The application is in light mode.",
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
      aria-label="Light theme active"
      className="rounded-full w-8 h-8 transition-all duration-300 hover:bg-sidebar-purple-dark bg-transparent text-white"
    >
      <Sun className="h-4 w-4 transition-transform duration-300 hover:rotate-45" />
    </Button>
  );
};
