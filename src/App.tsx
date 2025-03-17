
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider } from "@/hooks/useTheme";
import Sidebar from "./components/Layout/Sidebar";
import Watermark from "./components/Layout/Watermark";
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import Staff from "./pages/Staff";
import Inventory from "./pages/Inventory";
import Rooms from "./pages/Rooms";
import Suppliers from "./pages/Suppliers";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { checkSubscriptionStatus } from "@/utils/subscriptionUtils";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import SubscriptionCheck from "@/components/SubscriptionCheck";
import { fetchAllowedComponents } from "@/utils/subscriptionUtils";
import BusinessDashboard from "@/components/Analytics/BusinessDashboard";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const ComponentAccessGuard = ({ 
  children, 
  requiredComponent 
}: { 
  children: React.ReactNode, 
  requiredComponent: string 
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

const SubscriptionGuard = ({ children }: { children: React.ReactNode }) => {
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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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

const App = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <div className="flex min-h-screen w-full bg-gradient-pattern">
                      <Sidebar />
                      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                        <div className="max-w-7xl mx-auto">
                          <Routes>
                            <Route path="/" element={<ComponentAccessGuard requiredComponent="dashboard"><Index /></ComponentAccessGuard>} />
                            <Route path="/menu" element={<ComponentAccessGuard requiredComponent="menu"><Menu /></ComponentAccessGuard>} />
                            <Route path="/orders" element={<ComponentAccessGuard requiredComponent="orders"><Orders /></ComponentAccessGuard>} />
                            <Route path="/tables" element={<ComponentAccessGuard requiredComponent="tables"><Tables /></ComponentAccessGuard>} />
                            <Route path="/staff" element={<ComponentAccessGuard requiredComponent="staff"><Staff /></ComponentAccessGuard>} />
                            <Route path="/inventory" element={<ComponentAccessGuard requiredComponent="inventory"><Inventory /></ComponentAccessGuard>} />
                            <Route path="/rooms" element={<ComponentAccessGuard requiredComponent="rooms"><Rooms /></ComponentAccessGuard>} />
                            <Route path="/suppliers" element={<ComponentAccessGuard requiredComponent="suppliers"><Suppliers /></ComponentAccessGuard>} />
                            <Route path="/analytics" element={<ComponentAccessGuard requiredComponent="analytics"><Analytics /></ComponentAccessGuard>} />
                            <Route path="/business-dashboard" element={<ComponentAccessGuard requiredComponent="business_dashboard"><BusinessDashboard /></ComponentAccessGuard>} />
                            <Route path="/settings" element={<ComponentAccessGuard requiredComponent="settings"><Settings /></ComponentAccessGuard>} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </div>
                      </main>
                      <Watermark />
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
