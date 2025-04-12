
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
  Bot,
} from "lucide-react";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchAllowedComponents } from "@/utils/subscriptionUtils";
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";

const Sidebar = () => {
  const { openMobile, setOpenMobile } = useSidebar();
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
    { name: "AI Assistant", href: "/ai", icon: Bot, component: "dashboard" },
    { name: "Settings", href: "/settings", icon: Settings, component: "settings" },
  ];

  const navigation = allowedComponents.length > 0
    ? allNavigation.filter(item => allowedComponents.includes(item.component))
    : allNavigation;

  const mobileToggle = (
    <div className="fixed top-4 left-4 z-40 lg:hidden">
      <Button
        onClick={() => setOpenMobile(true)}
        variant="outline"
        size="icon"
        className="bg-card"
      >
        <MenuIcon className="h-5 w-5" />
      </Button>
    </div>
  );

  return (
    <>
      {mobileToggle}
      <SidebarComponent className="bg-sidebar-purple">
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <Utensils className="h-4 w-4 text-sidebar-purple" />
              </div>
              <h1 className="text-lg font-bold text-white">RMS Pro</h1>
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
        </SidebarHeader>

        <SidebarContent className="py-4">
          <SidebarMenu>
            {navigation.map((item) => (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild 
                  isActive={location.pathname === item.href}
                  tooltip={item.name}
                  className={location.pathname === item.href 
                    ? "bg-white text-sidebar-purple hover:bg-white hover:text-sidebar-purple" 
                    : "text-white hover:bg-sidebar-purple-dark"
                  }
                >
                  <NavLink to={item.href} className="flex items-center space-x-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sidebar-purple font-medium">
              {staffName ? staffName.charAt(0) : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">
                {staffName || "Loading..."}
              </p>
              <p className="text-xs text-white/70 truncate">
                Staff Member
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
              className="text-white hover:bg-sidebar-purple-dark"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </SidebarFooter>
      </SidebarComponent>
    </>
  );
};

export default Sidebar;
