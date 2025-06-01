
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BrandingSection from "@/components/Auth/BrandingSection";
import AuthForm from "@/components/Auth/AuthForm";

const Auth = () => {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log("Auth page: Checking authentication status");
    
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth page: Error checking session:", error);
          if (mounted) {
            setIsAuthenticated(false);
            setSessionChecked(true);
          }
          return;
        }
        
        console.log("Auth page: Session check result:", session ? "authenticated" : "not authenticated");
        
        if (mounted) {
          setIsAuthenticated(!!session);
          setSessionChecked(true);
        }
      } catch (error) {
        console.error("Auth page: Error in checkAuth:", error);
        if (mounted) {
          setIsAuthenticated(false);
          setSessionChecked(true);
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log("Auth page: Auth state changed:", event, session ? "authenticated" : "not authenticated");
        setIsAuthenticated(!!session);
        setSessionChecked(true);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleClearAuth = async () => {
    try {
      console.log("Auth page: Clearing all auth data");
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      setIsAuthenticated(false);
      
      toast({
        title: "Authentication cleared",
        description: "All authentication data has been cleared.",
      });
      
      // Force page reload to reset everything
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Auth page: Error clearing auth:", error);
      toast({
        title: "Error",
        description: "Failed to clear auth data. Refreshing page...",
        variant: "destructive",
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // Wait for session check to complete
  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to dashboard
  if (isAuthenticated === true) {
    console.log("Auth page: User is authenticated, redirecting to dashboard");
    return <Navigate to="/" replace />;
  }

  // Show auth form
  console.log("Auth page: Showing authentication form");
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Clear auth button for debugging */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={handleClearAuth} variant="outline" size="sm">
          <LogOut className="h-4 w-4 mr-2" />
          Clear Auth
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Left side - branding and info */}
      <div className="w-full lg:w-3/5 p-6 md:p-12 flex flex-col justify-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse-gentle"></div>
          <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse-gentle delay-1000"></div>
        </div>
        
        <div className="relative z-10">
          <BrandingSection />
        </div>
      </div>

      {/* Right side - auth form */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 md:p-12 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md animate-fade-in">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-r from-brand-deep-blue to-brand-success-green rounded-full flex items-center justify-center shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 11V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8"></path>
                  <path d="m12 12 4 4"></path>
                  <path d="M20 12h-8"></path>
                </svg>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-brand-deep-blue to-brand-success-green bg-clip-text text-transparent">
                {authMode === "signin" ? "Welcome back" : "Join us today"}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-2">
                {authMode === "signin" 
                  ? "Sign in to continue to your restaurant dashboard" 
                  : "Create your account and start managing your restaurant"}
              </CardDescription>
            </CardHeader>
            <AuthForm authMode={authMode} setAuthMode={setAuthMode} />
          </Card>
          
          {/* Security badges */}
          <div className="mt-8 flex justify-center items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Trusted</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>Fast</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
