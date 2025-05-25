
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custom hook to manage authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First set up the auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Small delay to ensure smoother transition
          setTimeout(() => {
            setLoading(false);
          }, 500);
        } else if (event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );
    
    // Then check the current session
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        
        // Add a small delay before setting loading to false
        // to prevent UI flickering and ensure smooth transitions
        setTimeout(() => {
          setLoading(false);
        }, 800);
      } catch (error) {
        console.error("Error checking auth:", error);
        setLoading(false);
      }
    };
    
    checkUser();
    
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return { user, loading };
};
