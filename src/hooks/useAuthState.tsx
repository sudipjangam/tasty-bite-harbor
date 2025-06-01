
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simplified custom hook to manage authentication state with proper refresh handling
 */
export const useAuthState = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return; // Prevent multiple initializations
    
    console.log("useAuthState: Initializing authentication");
    
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // First, get the current session
        console.log("useAuthState: Getting current session");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("useAuthState: Session error:", error);
          if (mounted) {
            setUser(null);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }
        
        console.log("useAuthState: Initial session:", session ? "found" : "none");
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
          } else {
            setUser(null);
          }
          setLoading(false);
          setInitialized(true);
        }
        
        // Then set up the auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return;
            
            console.log("useAuthState: Auth event:", event, session ? "with session" : "no session");
            
            if (session?.user) {
              setUser(session.user);
            } else {
              setUser(null);
            }
            
            if (initialized) {
              setLoading(false);
            }
          }
        );
        
        return () => {
          subscription.unsubscribe();
        };
        
      } catch (error) {
        console.error("useAuthState: Initialization error:", error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };
    
    const cleanup = initializeAuth();
    
    return () => {
      mounted = false;
      cleanup?.then(unsubscribe => unsubscribe?.());
    };
  }, [initialized]);

  return { user, loading };
};
