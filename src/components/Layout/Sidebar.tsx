import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Utensils,
  ShoppingCart,
  Coffee,
  Users,
  PackageOpen,
  Bed,
  Truck,
  BarChart3,
  Settings,
  Menu as MenuIcon,
  X,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchAllowedComponents } from "@/utils/subscriptionUtils";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: allowedComponents = [] } = useQuery({
    queryKey: ["allowedComponents", restaurantId],
    queryFn: () => restaurantId ? fetchAllowedComponents(restaurantId) : Promise.resolve([]),
    enabled: !!restaurantId,
  });

  const getProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          toast({
            title: "Error",
            description: "Failed to load profile data.",
            variant: "destructive",
          });
          return;
        }

        const displayName = profile?.first_name 
          ? `${profile.first_name} ${profile.last_name || ''}`
          : user.email?.split('@')[0] || 'User';
        
        setStaffName(displayName.trim());
        setRestaurantId(profile?.restaurant_id || null);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    }
  };

  useEffect(() => {
    getProfileData();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const allNavigation = [
    { name: "Dashboard", href: "/", icon: Home, component: "dashboard" },
    { name: "Menu", href: "/menu", icon: Utensils, component: "menu" },
    { name: "Orders", href: "/orders", icon: ShoppingCart, component: "orders" },
    { name: "Tables", href: "/tables", icon: Coffee, component: "tables" },
    { name: "Staff", href: "/staff", icon: Users, component: "staff" },
    { name: "Inventory", href: "/inventory", icon: PackageOpen, component: "inventory" },
    { name: "Rooms", href: "/rooms", icon: Bed, component: "rooms" },
    { name: "Suppliers", href: "/suppliers", icon: Truck, component: "suppliers" },
    { name: "Analytics", href: "/analytics", icon: BarChart3, component: "analytics" },
    { name: "Business Dashboard", href: "/business-dashboard", icon: LayoutDashboard, component: "business_dashboard" },
    { name: "Settings", href: "/settings", icon: Settings, component: "settings" },
  ];

  const navigation = allNavigation.filter(item => 
    allowedComponents.includes(item.component)
  );

  return (
    <>
      <div className="fixed top-4 left-4 z-40 lg:hidden">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="icon"
          className="bg-card"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-sidebar-background border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0 lg:relative",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Utensils className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-bold text-sidebar-primary">Restaurant</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center space-x-2 rounded-md p-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-medium">
                {staffName ? staffName.charAt(0) : "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">
                  {staffName || "Loading..."}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Staff Member
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleSignOut}
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
