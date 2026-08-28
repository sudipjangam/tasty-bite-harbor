import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, KeyRound, Lock, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthForm from "@/components/Auth/AuthForm";
import { QuickPinLogin } from "@/components/Auth/QuickPinLogin";
import { InquiryForm } from "@/components/Auth/InquiryForm";
import { ForgotPasswordForm } from "@/components/Auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/Auth/PasswordResetForm";
import { hasQuickPin, getRememberedUser, clearRememberedUser } from "@/utils/pinAuth";
import { safeNextPath } from "@/utils/safeNextPath";
import { cn } from "@/lib/utils";

export type AuthMode = "signin" | "signup" | "inquiry" | "forgot" | "reset";
export type LoginMethod = "pin" | "password";

const Auth = () => {
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(() => {
    return hasQuickPin() ? "pin" : "password";
  });
  const [rememberedUser, setRememberedUser] = useState(() => getRememberedUser());

  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next")) || "/";

  // Check on mount if quick PIN is available
  useEffect(() => {
    const user = getRememberedUser();
    setRememberedUser(user);
    if (hasQuickPin() && authMode === "signin") {
      setLoginMethod("pin");
    }
  }, [authMode]);

  // Detect Supabase recovery token or error in URL
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "reset") {
      setAuthMode("reset");
    }

    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const errorCode = hashParams.get("error_code");
      const errorDescription = hashParams.get("error_description");

      if (errorCode === "otp_expired" || errorDescription?.includes("expired")) {
        toast({
          title: "Reset link expired",
          description: "Your password reset link has expired. Please request a new one.",
          variant: "destructive",
          duration: 8000,
        });
        setAuthMode("forgot");
        window.history.replaceState(null, "", window.location.pathname);
      } else if (hashParams.get("error")) {
        toast({
          title: "Authentication error",
          description: errorDescription?.replace(/\+/g, " ") || "Something went wrong. Please try again.",
          variant: "destructive",
          duration: 8000,
        });
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset");
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams, toast]);

  const handleAuthSuccess = () => {
    navigate(nextPath, { replace: true });
  };

  const handleSwitchAccount = () => {
    clearRememberedUser();
    setRememberedUser(null);
    setLoginMethod("password");
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center relative overflow-hidden px-4 py-6 sm:py-10 bg-[#ebf0f7] dark:bg-[#12151f]"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Subtle Background Glow Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-br from-[#2E3192]/10 to-[#F26722]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-tr from-[#2E3192]/15 to-[#1a1f6e]/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          
          {/* Left Side: Desktop Branding Showcase */}
          <div className="hidden lg:block space-y-6">
            <div className="inline-flex items-center px-4 py-2 skeuo-flat-sm rounded-full text-[#2E3192]">
              <Sparkles className="w-4 h-4 mr-2 text-[#F26722]" />
              <span className="text-xs font-black tracking-wide">Trusted by 500+ Indian Restaurants</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 skeuo-circle">
                  <img
                    src="/swadeshi-logo2.png"
                    alt="Swadeshi Solutions Logo"
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div>
                  <span className="text-4xl font-black text-[#2E3192] tracking-tight">Swadeshi</span>
                  <span className="text-4xl font-black text-[#F26722] ml-2 tracking-tight">Solutions</span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed max-w-md font-medium">
                Fast, GST-compliant restaurant POS, KDS, inventory, and online order management built for high-speed counter operations.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl skeuo-card-sm">
                <div className="font-black text-[#2E3192] dark:text-indigo-400 text-lg">Instant Billing</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Thermal print & digital KOT in &lt; 2 seconds</div>
              </div>
              <div className="p-4 rounded-2xl skeuo-card-sm">
                <div className="font-black text-[#F26722] text-lg">100% Offline</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Uninterrupted billing even with zero internet</div>
              </div>
            </div>
          </div>

          {/* Right Side: Auth Card (Skeuomorphic) */}
          <div className="w-full max-w-md mx-auto">
            <div className="skeuo-card p-6 sm:p-8 rounded-[2.5rem] relative overflow-hidden transition-all duration-300">
              
              <div className="text-center pb-2">
                {/* Mobile Logo */}
                <div className="lg:hidden mx-auto mb-3 flex items-center justify-center gap-2.5">
                  <div className="p-1.5 rounded-full skeuo-circle">
                    <img
                      src="/swadeshi-logo2.png"
                      alt="Swadeshi Solutions"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <div className="text-2xl font-black">
                    <span className="text-[#2E3192]">Swadeshi</span>
                    <span className="text-[#F26722] ml-1.5">Solutions</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {authMode === "signin"
                    ? loginMethod === "pin" && rememberedUser
                      ? "Quick Unlock"
                      : "Welcome Back"
                    : authMode === "inquiry"
                    ? "Register Business"
                    : authMode === "forgot"
                    ? "Forgot Password"
                    : authMode === "reset"
                    ? "Set New Password"
                    : "Create Account"}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  {authMode === "signin"
                    ? loginMethod === "pin" && rememberedUser
                      ? "Enter your 4-digit PIN for instant access"
                      : "Sign in to your restaurant POS dashboard"
                    : authMode === "inquiry"
                    ? "Submit your inquiry to register your restaurant"
                    : authMode === "forgot"
                    ? "We'll send a password reset link to your email"
                    : "Enter your credentials to continue"}
                </p>

                {/* Login Method Switcher (Skeuomorphic Sunken Tray) */}
                {authMode === "signin" && rememberedUser && hasQuickPin() && (
                  <div className="flex justify-center p-1.5 mt-4 rounded-2xl skeuo-inset">
                    <button
                      type="button"
                      onClick={() => setLoginMethod("pin")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all select-none",
                        loginMethod === "pin"
                          ? "skeuo-btn text-[#2E3192] dark:text-white shadow-md"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Quick PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod("password")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all select-none",
                        loginMethod === "password"
                          ? "skeuo-btn text-[#2E3192] dark:text-white shadow-md"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Password / Google
                    </button>
                  </div>
                )}
              </div>

              {/* Form Content */}
              <div className="py-2">
                {authMode === "inquiry" ? (
                  <InquiryForm setAuthMode={setAuthMode} />
                ) : authMode === "forgot" ? (
                  <ForgotPasswordForm setAuthMode={setAuthMode} />
                ) : authMode === "reset" ? (
                  <ResetPasswordForm
                    setAuthMode={setAuthMode}
                    token={searchParams.get("token") || undefined}
                    email={searchParams.get("email") || undefined}
                  />
                ) : loginMethod === "pin" && rememberedUser && hasQuickPin() ? (
                  <QuickPinLogin
                    onSuccess={handleAuthSuccess}
                    onUsePassword={() => setLoginMethod("password")}
                    onSwitchAccount={handleSwitchAccount}
                  />
                ) : (
                  <AuthForm
                    authMode={authMode}
                    setAuthMode={setAuthMode}
                    onSuccess={handleAuthSuccess}
                  />
                )}
              </div>
            </div>

            {/* Subtle Security Badge */}
            <div className="mt-4 flex justify-center items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                256-Bit Encrypted
              </span>
              <span>•</span>
              <span>GST Ready</span>
              <span>•</span>
              <span>Cloud & Offline</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
