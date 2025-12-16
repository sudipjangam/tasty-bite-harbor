
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BrandingSection from "@/components/Auth/BrandingSection";
import AuthForm from "@/components/Auth/AuthForm";

const Auth = () => {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const { toast } = useToast();



  const handleClearAuth = async () => {
    try {

      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
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

  // Show auth form directly
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400/30 to-pink-400/30 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400/30 to-indigo-400/30 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-1000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-gradient-to-r from-cyan-400/20 to-teal-400/20 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-2000"></div>
      </div>

      {/* Clear auth button for debugging */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={handleClearAuth} variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm">
          <LogOut className="h-4 w-4 mr-2" />
          Clear Auth
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Main content container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Left side - branding */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Trusted by 500+ restaurants</span>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
                  Swadeshi Solutions
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Transform your restaurant operations with our comprehensive management platform. 
                  Streamline everything from orders and inventory to staff scheduling and customer analytics.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Complete Management</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">End-to-end solution for all your restaurant needs</p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Real-time Analytics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Make data-driven decisions with powerful insights</p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Staff Management</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Efficiently manage your team and schedules</p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Inventory Tracking</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Keep track of stock levels and automate ordering</p>
                </div>
              </div>
              
              {/* Visit our website button */}
              <div className="pt-6">
                <Button 
                  variant="outline" 
                  className="group border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm transition-all duration-200"
                  onClick={() => window.open("/website", "_blank")}
                >
                  <span>Visit our website</span>
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right side - auth form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="shadow-2xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl relative overflow-hidden">
              {/* Card header gradient */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <CardHeader className="text-center pb-6 pt-8">
                <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
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
                <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                  {authMode === "signin" ? "Welcome back!" : "Join us today"}
                </CardTitle>
                <CardDescription className="text-base text-gray-600 dark:text-gray-400 mt-2">
                  {authMode === "signin" 
                    ? "Sign in to continue to your restaurant dashboard" 
                    : "Create your account and start managing your restaurant"}
                </CardDescription>
              </CardHeader>
              <AuthForm authMode={authMode} setAuthMode={setAuthMode} />
            </Card>
            
            {/* Trust indicators */}
            <div className="mt-8 flex justify-center items-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Trusted</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Fast</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
