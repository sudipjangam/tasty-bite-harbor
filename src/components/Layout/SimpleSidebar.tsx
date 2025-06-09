import React, { useState, useEffect } from "react";
import { Menu as MenuIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { SimpleSidebarNavigation } from "./SimpleSidebarNavigation";

const SimpleSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const { user, signOut } = useSimpleAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getProfileData = async () => {
    try {
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        const displayName = profile?.first_name
          ? `${profile.first_name} ${profile.last_name || ""}`
          : user.email?.split("@")[0] || "User";

        setStaffName(displayName.trim());
        
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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
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

  useEffect(() => {
    getProfileData();
  }, [user]);

  return (
    <>
      {/* Mobile toggle */}
      <div className="fixed top-4 left-4 z-40 lg:hidden">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="icon"
          className="bg-card"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-sidebar-purple transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-white">
            {restaurantName || "Restaurant"}
          </h1>
          <p className="text-sm text-white/70">Management System</p>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          <SimpleSidebarNavigation />
        </div>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sidebar-purple font-medium">
              {staffName ? staffName.charAt(0) : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">
                {staffName || "Loading..."}
              </p>
              <p className="text-xs text-white/70 truncate">Staff Member</p>
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
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default SimpleSidebar;
