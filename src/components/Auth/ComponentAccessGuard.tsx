
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllowedComponents } from "@/utils/subscriptionUtils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ComponentAccessGuardProps {
  children: React.ReactNode;
  requiredComponent: string;
}

const ComponentAccessGuard: React.FC<ComponentAccessGuardProps> = ({ 
  children, 
  requiredComponent 
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("restaurant_id")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.restaurant_id) {
            const allowedComponents = await fetchAllowedComponents(profile.restaurant_id);
            const access = allowedComponents.includes(requiredComponent);
            setHasAccess(access);
            if (!access) {
              setShowAccessDenied(true);
            }
          } else {
            setHasAccess(false);
            setShowAccessDenied(true);
          }
        } else {
          setHasAccess(false);
          setShowAccessDenied(true);
        }
      } catch (error) {
        console.error("Error checking component access:", error);
        setHasAccess(false);
        setShowAccessDenied(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccess();
  }, [requiredComponent]);
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }
  
  if (!hasAccess) {
    return (
      <>
        <Dialog open={showAccessDenied} onOpenChange={setShowAccessDenied}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Access Restricted</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                Your current subscription plan does not include access to this component.
                Please upgrade your subscription to access this feature.
              </p>
              <p className="text-sm text-muted-foreground">
                For support, please contact our team:
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Email:</span>{" "}
                  <a href="mailto:support@swadeshisolutions.com" className="text-blue-500 hover:underline">
                    support@swadeshisolutions.com
                  </a>
                </p>
                <p className="text-sm">
                  <span className="font-medium">Phone:</span>{" "}
                  <a href="tel:+918845674567" className="text-blue-500 hover:underline">
                    +91 884-567-4567
                  </a>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => window.location.href = "/"}>
                Return to Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Navigate to="/" replace />
      </>
    );
  }
  
  return <>{children}</>;
};

export default ComponentAccessGuard;
