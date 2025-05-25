
import React, { useState, useEffect } from "react";
import { Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchAllowedComponents } from "@/utils/subscriptionUtils";
import {
  Sidebar as SidebarComponent,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarFooter } from "./SidebarFooter";

const Sidebar = () => {
  const { openMobile, setOpenMobile } = useSidebar();
  const [staffName, setStaffName] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: allowedComponents = [] } = useQuery({
    queryKey: ["allowedComponents", restaurantId],
    queryFn: () =>
      restaurantId ? fetchAllowedComponents(restaurantId) : Promise.resolve([]),
    enabled: !!restaurantId,
  });

  const getProfileData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
          ? `${profile.first_name} ${profile.last_name || ""}`
          : user.email?.split("@")[0] || "User";

        setStaffName(displayName.trim());
        setRestaurantId(profile?.restaurant_id || null);
        
        // Fetch restaurant name
        if (profile?.restaurant_id) {
          fetchRestaurantName(profile.restaurant_id);
        }
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    }
  };
  
  const fetchRestaurantName = async (restId: string) => {
    try {
      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", restId)
        .single();
        
      if (error) {
        console.error("Error fetching restaurant:", error);
        return;
      }
      
      setRestaurantName(restaurant?.name || "Restaurant");
    } catch (error) {
      console.error("Restaurant fetch error:", error);
    }
  };

  useEffect(() => {
    getProfileData();
  }, []);

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
        <SidebarHeader restaurantName={restaurantName} />
        <SidebarNavigation allowedComponents={allowedComponents} />
        <SidebarFooter staffName={staffName} />
      </SidebarComponent>
    </>
  );
};

export default Sidebar;
