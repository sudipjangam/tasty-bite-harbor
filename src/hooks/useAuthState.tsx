
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
    
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("useAuthState: Session error:", error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        
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
  }, []); // Empty dependency array to run only once

  return { user, loading };
};
