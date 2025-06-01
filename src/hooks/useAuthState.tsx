
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simplified custom hook to manage authentication state with proper session handling
 */
export const useAuthState = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current) {
      return;
    }
    
    initialized.current = true;
    console.log("useAuthState: Initializing authentication (single instance)");
    
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
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
      console.log("useAuthState: Cleaning up");
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to run only once

  return { user, loading };
};
