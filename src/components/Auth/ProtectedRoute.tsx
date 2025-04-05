
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
        const { data, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error("Session error:", error);
          setSession(null);
          setLoading(false);
          return;
        }
        
        setSession(data.session);
        
        if (data.session) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("restaurant_id")
              .eq("id", data.session.user.id)
              .maybeSingle();

            if (profileError) {
              console.error("Profile error:", profileError);
              if (mounted) {
                setHasActiveSubscription(false);
                setLoading(false);
              }
              return;
            }

            if (profile?.restaurant_id) {
              setRestaurantId(profile.restaurant_id);
              try {
                const subscriptionActive = await checkSubscriptionStatus(profile.restaurant_id);
                if (mounted) {
                  setHasActiveSubscription(subscriptionActive);
                }
              } catch (subError) {
                console.error("Subscription check error:", subError);
                if (mounted) {
                  setHasActiveSubscription(false);
                }
              }
            } else {
              if (mounted) {
                setHasActiveSubscription(false);
              }
            }
          } catch (error) {
            console.error("Error checking profile:", error);
            if (mounted) {
              setHasActiveSubscription(false);
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        } else {
          if (mounted) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error in checkSession:", error);
        if (mounted) {
          setSession(null);
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
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error("Profile error:", profileError);
            if (mounted) {
              setHasActiveSubscription(false);
              setLoading(false);
            }
            return;
          }

          if (profile?.restaurant_id) {
            setRestaurantId(profile.restaurant_id);
            try {
              const subscriptionActive = await checkSubscriptionStatus(profile.restaurant_id);
              if (mounted) {
                setHasActiveSubscription(subscriptionActive);
              }
            } catch (subError) {
              console.error("Subscription check error:", subError);
              if (mounted) {
                setHasActiveSubscription(false);
              }
            }
          } else {
            if (mounted) {
              setHasActiveSubscription(false);
            }
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
          if (mounted) {
            setHasActiveSubscription(false);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        if (mounted) {
          setHasActiveSubscription(null);
          setLoading(false);
        }
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
