
import { Utensils, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebar } from "@/components/ui/sidebar";

interface SidebarHeaderProps {
  restaurantName: string | null;
}

export const SidebarHeader = ({ restaurantName = "Restaurant" }: SidebarHeaderProps) => {
  const { setOpenMobile } = useSidebar();
  
  // Format the restaurant name with "Management" suffix
  const displayName = restaurantName ? `${restaurantName} Management` : "RMS Pro";

  return (
    <div className="flex items-center justify-between border-b border-sidebar-border p-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
          <Utensils className="h-4 w-4 text-sidebar-purple" />
        </div>
        <h1 className="text-lg font-bold text-white truncate max-w-[150px]">{displayName}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button
          onClick={() => setOpenMobile(false)}
          variant="ghost"
          size="icon"
          className="lg:hidden text-white hover:bg-sidebar-purple-dark"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
