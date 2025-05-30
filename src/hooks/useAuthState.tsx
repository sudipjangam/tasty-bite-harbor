
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custom hook to manage authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // First set up the auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session ? "session exists" : "no session");
        
        // Clear any stuck state
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setLoading(false);
          return;
        }
        
        setUser(session?.user || null);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Small delay to ensure smoother transition
          setTimeout(() => {
            setLoading(false);
          }, 100);
        } else if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );
    
    // Then check the current session
    const checkUser = async () => {
      try {
        console.log("Checking current session");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setUser(null);
          setLoading(false);
          return;
        }
        
        console.log("Session check result:", data.session ? "session found" : "no session");
        
        if (data.session?.user) {
          setUser(data.session.user);
        } else {
          setUser(null);
        }
        
        // Reduced delay to prevent long loading states
        setTimeout(() => {
          setLoading(false);
        }, 200);
      } catch (error) {
        console.error("Error checking auth:", error);
        setUser(null);
        setLoading(false);
      }
    };
    
    checkUser();
    
    return () => {
      console.log("Cleaning up auth listener");
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
};
