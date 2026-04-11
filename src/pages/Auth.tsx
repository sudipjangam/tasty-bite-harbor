import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, Sparkles, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BrandingSection from "@/components/Auth/BrandingSection";
import AuthForm from "@/components/Auth/AuthForm";
import { InquiryForm } from "@/components/Auth/InquiryForm";
import { ForgotPasswordForm } from "@/components/Auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/Auth/PasswordResetForm";

export type AuthMode = "signin" | "signup" | "inquiry" | "forgot" | "reset";

const Auth = () => {
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Detect Supabase recovery token or error in URL (from password reset email link)
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'reset') {
      setAuthMode('reset');
    }

    // Parse hash fragment for Supabase errors (e.g., #error=access_denied&error_code=otp_expired)
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');

      if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
        toast({
          title: "Reset link expired",
          description: "Your password reset link has expired. Please request a new one.",
          variant: "destructive",
          duration: 8000,
        });
        setAuthMode('forgot');
        // Clean up the URL hash
        window.history.replaceState(null, '', window.location.pathname);
      } else if (hashParams.get('error')) {
        toast({
          title: "Authentication error",
          description: errorDescription?.replace(/\+/g, ' ') || "Something went wrong. Please try again.",
          variant: "destructive",
          duration: 8000,
        });
        // Clean up the URL hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    // Listen for Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden py-2 sm:py-8"
      style={{
        background: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 40%, #fff7f0 70%, #fef3ec 100%)',
      }}
    >
      {/* Animated background elements — brand-aligned navy & orange */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-[#2E3192]/15 to-[#F26722]/15 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-[#2E3192]/20 to-[#1a1f6e]/15 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-1000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-gradient-to-r from-[#F26722]/10 to-[#ff8a47]/10 rounded-full mix-blend-multiply filter blur-xl animate-float animation-delay-2000"></div>
      </div>

      {/* Top action bar — small, unobtrusive */}
      <div className="relative z-50 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 mb-2 sm:mb-6 flex justify-end gap-2">
        <Button
          onClick={handleClearAuth}
          variant="default"
          size="sm"
          className="bg-[#2E3192] hover:bg-[#1a1f6e] text-white shadow-md rounded-full font-medium h-7 px-2.5 text-[11px] sm:h-9 sm:px-4 sm:text-sm"
        >
          <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Clear Auth
        </Button>
        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
          size="sm"
          className="bg-white hover:bg-gray-50 text-[#2E3192] border border-[#2E3192]/20 shadow-sm rounded-full font-medium h-7 px-2.5 text-[11px] sm:h-9 sm:px-4 sm:text-sm"
        >
          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Refresh
        </Button>
      </div>

      {/* Main content container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left side - branding (desktop only) */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center px-4 py-2 bg-white/40 backdrop-blur-sm border border-[#2E3192]/10 rounded-full text-[#2E3192]">
                <Sparkles className="w-4 h-4 mr-2 text-[#F26722]" />
                <span className="text-sm font-medium">
                  Trusted by 500+ restaurants
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-2 sm:gap-4">
                  <div className="relative flex items-center justify-center transition-transform duration-300 hover:scale-105">
                    <img
                      src="/swadeshi-logo2.png"
                      alt="Swadeshi Solutions Logo"
                      className="object-contain w-28 h-28 sm:w-36 sm:h-36 lg:w-[10rem] lg:h-[10rem]"
                    />
                  </div>
                  <div className="flex flex-row items-center sm:pb-2">
                    <span className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#2E3192] dark:text-white leading-tight sm:leading-none">
                      Swadeshi
                    </span>
                    <span className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#F26722] ml-2 leading-tight sm:leading-none">
                      Solutions
                    </span>
                  </div>
                </div>
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Transform your restaurant operations with our comprehensive
                  management platform. Streamline everything from orders and
                  inventory to staff scheduling and customer analytics.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Complete Management
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    End-to-end solution for all your restaurant needs
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#F26722] to-[#ff4500] rounded-2xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Real-time Analytics
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Make data-driven decisions with powerful insights
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#2E3192] to-[#1a1f6e] rounded-2xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Staff Management
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Efficiently manage your team and schedules
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#F26722]/80 to-[#2E3192]/80 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Inventory Tracking
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Keep track of stock levels and automate ordering
                  </p>
                </div>
              </div>

              {/* Visit our website button */}
              <div className="pt-6">
                <Button
                  variant="outline"
                  className="group border-[#2E3192]/20 text-[#2E3192] hover:bg-[#2E3192] hover:text-white bg-white/60 backdrop-blur-sm transition-all duration-200"
                  onClick={() => window.open("/", "_blank")}
                >
                  <span>Visit our website</span>
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right side - auth form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="shadow-2xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl relative overflow-hidden">
              {/* Card header gradient — brand navy to orange */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2E3192] via-[#4a4fcc] to-[#F26722]"></div>

              <CardHeader className="text-center pb-1 pt-4 sm:pb-4 sm:pt-8 px-5 sm:px-8">
                {/* Mobile: compact row layout; Desktop: comfortable spacing */}
                <div className="mx-auto mb-1 sm:mb-4 flex flex-row items-center justify-center gap-2 sm:gap-3">
                  <div className="relative flex items-center justify-center transition-transform duration-300 hover:scale-105">
                    <img
                      src="/swadeshi-logo2.png"
                      alt="Swadeshi Solutions Logo"
                      className="object-contain w-10 h-10 sm:w-20 sm:h-20"
                    />
                  </div>
                  <div className="flex flex-row items-center">
                    <span className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#2E3192] dark:text-white">
                      Swadeshi
                    </span>
                    <span className="text-xl sm:text-3xl font-extrabold tracking-tight text-[#F26722] ml-1.5">
                      Solutions
                    </span>
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {authMode === "signin" ? "Welcome back!" 
                    : authMode === "forgot" ? "Forgot password?"
                    : authMode === "reset" ? "Reset password"
                    : "Join us today"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-2">
                  {authMode === "signin"
                    ? "Sign in to continue to your restaurant dashboard"
                    : authMode === "inquiry"
                    ? "Create your account and start managing your Business."
                    : authMode === "forgot"
                    ? "We'll send you a link to reset your password."
                    : authMode === "reset"
                    ? "Enter your new password below."
                    : "Create your account and start managing your restaurant"}
                </CardDescription>
              </CardHeader>
              {authMode === "inquiry" ? (
                <InquiryForm setAuthMode={setAuthMode} />
              ) : authMode === "forgot" ? (
                <ForgotPasswordForm setAuthMode={setAuthMode} />
              ) : authMode === "reset" ? (
                <ResetPasswordForm 
                  setAuthMode={setAuthMode} 
                  token={searchParams.get('token') || undefined}
                  email={searchParams.get('email') || undefined}
                />
              ) : (
                <AuthForm authMode={authMode} setAuthMode={setAuthMode} />
              )}
            </Card>

            {/* Trust indicators */}
            <div className="hidden sm:flex mt-6 justify-center items-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#2E3192] rounded-full"></div>
                <span>Trusted</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#F26722] rounded-full"></div>
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
