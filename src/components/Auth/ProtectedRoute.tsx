
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkSubscriptionStatus } from "@/utils/subscriptionUtils";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import SubscriptionGuard from "./SubscriptionGuard";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        
        if (session) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("restaurant_id")
              .eq("id", session.user.id)
              .maybeSingle();

            if (profile?.restaurant_id) {
              setRestaurantId(profile.restaurant_id);
              const subscriptionActive = await checkSubscriptionStatus(profile.restaurant_id);
              setHasActiveSubscription(subscriptionActive);
            } else {
              setHasActiveSubscription(false);
            }
          } catch (error) {
            console.error("Error checking session:", error);
            setHasActiveSubscription(false);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error in checkSession:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      setSession(session);
      
      if (session) {
        setLoading(true);
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.restaurant_id) {
            setRestaurantId(profile.restaurant_id);
            const subscriptionActive = await checkSubscriptionStatus(profile.restaurant_id);
            setHasActiveSubscription(subscriptionActive);
          } else {
            setHasActiveSubscription(false);
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
          setHasActiveSubscription(false);
        } finally {
          setLoading(false);
        }
      } else {
        setHasActiveSubscription(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Only show loading indicator on initial page load, not when switching tabs
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (hasActiveSubscription === false) {
    return <SubscriptionPlans restaurantId={restaurantId} />;
  }

  return (
    <SubscriptionGuard>
      {children}
    </SubscriptionGuard>
  );
};

export default ProtectedRoute;
