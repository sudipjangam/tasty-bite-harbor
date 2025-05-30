
import { Routes as Switch, Route, Navigate } from "react-router-dom";
import { useAuthState } from "@/hooks/useAuthState";
import { AppRoutes } from "./AppRoutes";
import AuthLoader from "./AuthLoader";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Main Routes component that renders all application routes
 * Refactored to improve maintainability and readability
 */
const Routes = () => {
  const { user, loading } = useAuthState();
  const { toast } = useToast();
  
  console.log("Routes component - Loading:", loading, "User:", user ? "authenticated" : "not authenticated");
  
  const handleForceLogout = async () => {
    try {
      console.log("Force logout initiated");
      await supabase.auth.signOut();
      window.location.reload(); // Force a full page reload to clear any stuck state
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // If authentication is still loading, show the loader with debug option
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AuthLoader />
        <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">Having authentication issues?</p>
          <Button onClick={handleForceLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Force Logout
          </Button>
        </div>
      </div>
    );
  }

  // If no user is authenticated, redirect to auth page
  if (!user) {
    console.log("No user found, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Once authentication check is complete and user exists, render routes
  console.log("User authenticated, rendering app routes");
  return <>{AppRoutes}</>;
};

export default Routes;
