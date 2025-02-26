
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Fetch user and profile data
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ['restaurant', profile?.restaurant_id],
    enabled: !!profile?.restaurant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile?.restaurant_id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all queries from the cache on logout
      queryClient.clear();
      
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/auth");
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading || restaurantLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button 
          variant="destructive" 
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}
          Logout
        </Button>
      </div>

      <Card className="p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{session?.user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{profile?.role || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">First Name</p>
            <p className="font-medium">{profile?.first_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Name</p>
            <p className="font-medium">{profile?.last_name || 'N/A'}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white">
        <h2 className="text-xl font-semibold mb-4">Restaurant Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Restaurant Name</p>
            <p className="font-medium">{restaurant?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">{restaurant?.address || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone Number</p>
            <p className="font-medium">{restaurant?.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{restaurant?.email || 'N/A'}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
