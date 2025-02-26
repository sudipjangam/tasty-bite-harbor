
import { 
  LayoutDashboard, 
  Menu as MenuIcon, 
  ClipboardList, 
  LayoutGrid,
  Users,
  Box,
  Hotel,
  Truck,
  ChartBar,
  Settings2,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const Sidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: MenuIcon, label: "Menu", path: "/menu" },
    { icon: ClipboardList, label: "Orders", path: "/orders" },
    { icon: LayoutGrid, label: "Tables", path: "/tables" },
    { icon: Users, label: "Staff", path: "/staff" },
    { icon: Box, label: "Inventory", path: "/inventory" },
    { icon: Hotel, label: "Rooms", path: "/rooms" },
    { icon: Truck, label: "Suppliers", path: "/suppliers" },
    { icon: ChartBar, label: "Analytics", path: "/analytics" },
    { icon: Settings2, label: "Settings", path: "/settings" },
  ];

  if (isMobile && isCollapsed) {
    return null;
  }

  return (
    <div 
      className={cn(
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64",
        "min-h-screen bg-gradient-to-b from-primary/5 to-accent/5 backdrop-blur-xl border-r border-primary/10",
        isMobile && "absolute z-50 shadow-xl"
      )}
    >
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-between mb-8">
          {!isCollapsed && (
            <h1 className="text-accent text-2xl font-bold flex items-center gap-2">
              <span className="text-accent">◻</span>
              Restaurant
            </h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-auto"
          >
            {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        
        <nav className="space-y-1 overflow-y-auto flex-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-accent/10 active:scale-[0.98]",
                location.pathname === item.path
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-primary/80"
              )}
            >
              <item.icon className={cn("w-5 h-5", isCollapsed && "mx-auto")} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {!isCollapsed && (
          <div className="mt-auto pt-4 border-t border-primary/10">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Restaurant Staff</p>
                <p className="text-xs text-primary/60 truncate">Active Now</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
