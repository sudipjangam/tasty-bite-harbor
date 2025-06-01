
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simplified custom hook to manage authentication state with proper session handling
 */
export const useAuthState = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    console.log("useAuthState: Initializing authentication");
    
    const initializeAuth = async () => {
      try {
        // Get the current session first
        console.log("useAuthState: Getting current session");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("useAuthState: Session error:", error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        console.log("useAuthState: Initial session:", session ? "found" : "none");
        
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      } catch (error) {
        console.error("useAuthState: Error getting session:", error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log("useAuthState: Auth event:", event, session ? "with session" : "no session");
        
        setUser(session?.user || null);
        setLoading(false);
      }
    );
    
    // Initialize auth
    initializeAuth();
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
};
