
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simplified custom hook to manage authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("useAuthState: Setting up auth listener");
    
    // Set up auth listener first
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("useAuthState: Auth event:", event, session ? "with session" : "no session");
        
        if (session?.user) {
          setUser(session.user);
          setLoading(false);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );
    
    // Then check current session
    const checkCurrentSession = async () => {
      try {
        console.log("useAuthState: Checking current session");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("useAuthState: Session error:", error);
          setUser(null);
          setLoading(false);
          return;
        }
        
        console.log("useAuthState: Current session:", session ? "found" : "none");
        
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      } catch (error) {
        console.error("useAuthState: Error checking session:", error);
        setUser(null);
        setLoading(false);
      }
    };
    
    checkCurrentSession();
    
    return () => {
      console.log("useAuthState: Cleaning up auth listener");
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
};
