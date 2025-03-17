
import { useState, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkSubscriptionStatus } from "@/utils/subscriptionUtils";
import SubscriptionCheck from "@/components/SubscriptionCheck";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({ children }) => {
  const location = useLocation();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  
  useEffect(() => {
    const checkSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && location.pathname !== "/" && location.pathname !== "/auth") {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.restaurant_id) {
            const hasActiveSubscription = await checkSubscriptionStatus(profile.restaurant_id);
            
            if (!hasActiveSubscription) {
              setShowSubscriptionModal(true);
              setIsRestricted(true);
            } else {
              setIsRestricted(false);
            }
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }
    };
    
    checkSubscription();
  }, [location.pathname]);
  
  if (isRestricted) {
    return (
      <>
        <SubscriptionCheck 
          isOpen={showSubscriptionModal} 
          onClose={() => setShowSubscriptionModal(false)} 
        />
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted">
          <div className="text-center max-w-md p-6">
            <h2 className="text-2xl font-bold mb-4">Subscription Required</h2>
            <p className="text-muted-foreground mb-6">
              An active subscription is required to access this feature.
            </p>
            <Navigate to="/" replace />
          </div>
        </div>
      </>
    );
  }
  
  return <>{children}</>;
};

export default SubscriptionGuard;
