import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { safeNextPath } from "@/utils/safeNextPath";
import { toast } from "@/components/ui/use-toast";
import { Capacitor } from '@capacitor/core';
import {
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CardContent, CardFooter } from "@/components/ui/card";

interface AuthFormProps {
  authMode: "signin" | "signup" | "inquiry" | "forgot" | "reset";
  setAuthMode: React.Dispatch<React.SetStateAction<"signin" | "signup" | "inquiry" | "forgot" | "reset">>;
  onSuccess?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ authMode, setAuthMode, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Preserve an in-app redirect target (e.g. the OAuth consent screen) across sign-in.
  const nextPath = safeNextPath(searchParams.get("next"));
  const postAuthPath = nextPath || "/dashboard";

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: Capacitor.isNativePlatform() 
            ? 'com.swadeshisolutions.app://login-callback' 
            : `${window.location.origin}${postAuthPath}`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("AuthForm: Sign in error:", error);
          throw error;
        }

        if (data?.session) {
          toast({
            title: "Welcome back!",
            description: "You have been successfully signed in.",
            className: "bg-green-50 border-green-200 text-green-800",
          });

          // Small delay to ensure auth state is updated
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            } else {
              navigate(postAuthPath);
            }
          }, 100);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${postAuthPath}`,
          },
        });

        if (error) {
          console.error("AuthForm: Sign up error:", error);
          throw error;
        }

        if (data?.user?.identities?.length === 0) {
          toast({
            title: "Account already exists",
            description: "Please sign in with your existing account.",
            variant: "destructive",
          });
          setAuthMode("signin");
        } else {
          toast({
            title: "Account created successfully!",
            description:
              "Please check your email to confirm your registration.",
            className: "bg-green-50 border-green-200 text-green-800",
          });
          if (onSuccess) onSuccess();
        }
      }
    } catch (error: any) {
      console.error("AuthForm: Auth error:", error);
      toast({
        title: "Authentication error",
        description: error.message || "An error occurred during authentication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAuth} className="space-y-4 sm:space-y-5">
      <CardContent className="space-y-4 sm:space-y-5 px-5 sm:px-8 pb-3 sm:pb-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300"
          >
            Email address
          </Label>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E3192] w-4 h-4 sm:w-5 sm:h-5 transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 sm:pl-12 h-12 sm:h-13 skeuo-inset border-0 text-gray-900 dark:text-white placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#2E3192]/30 transition-all rounded-2xl text-sm sm:text-base font-medium"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300"
          >
            Password
          </Label>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E3192] w-4 h-4 sm:w-5 sm:h-5 transition-colors" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-10 sm:pl-12 pr-11 sm:pr-12 h-12 sm:h-13 skeuo-inset border-0 text-gray-900 dark:text-white placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[#2E3192]/30 transition-all rounded-2xl text-sm sm:text-base font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password Row */}
        {authMode === "signin" && (
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                defaultChecked={true}
                className="h-4 w-4 rounded border-gray-300 text-[#2E3192] focus:ring-[#2E3192]"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => setAuthMode("forgot")}
              className="text-xs sm:text-sm font-bold text-[#2E3192] hover:text-[#1a1f6e] dark:text-indigo-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col px-5 sm:px-8 pb-5 sm:pb-8 space-y-4 sm:space-y-5">
        {/* Primary Email/Password Submit Button (Skeuomorphic) */}
        <button
          type="submit"
          className="w-full h-12 sm:h-14 skeuo-btn-primary flex items-center justify-center font-bold text-sm sm:text-base touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          disabled={loading || !email || !password}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              {authMode === "signin" ? "Signing in..." : "Creating account..."}
            </>
          ) : (
            <>
              {authMode === "signin"
                ? "Sign in to dashboard"
                : "Create account"}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300/60 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#ebf0f7] dark:bg-[#181c28] px-3 text-gray-400 font-bold text-[10px] sm:text-xs">
              or continue with
            </span>
          </div>
        </div>

        {/* Google Sign In Button (Skeuomorphic) */}
        <button
          type="button"
          className="w-full h-12 sm:h-13 skeuo-btn flex items-center justify-center text-gray-800 dark:text-white font-bold text-sm touch-manipulation transition-all"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Toggle auth mode */}
        <div className="w-full pt-1">
          <button
            type="button"
            className="w-full h-11 skeuo-btn text-[#F26722] hover:text-[#d4551a] font-black flex items-center justify-center text-xs sm:text-sm tracking-tight"
            onClick={() =>
              setAuthMode(authMode === "signin" ? "inquiry" : "signin")
            }
          >
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            {authMode === "signin"
              ? "Register your business"
              : "Sign in to existing account"}
          </button>
        </div>

        {authMode === "signin" && (
          <Button
            type="button"
            variant="link"
            className="text-xs sm:text-sm text-gray-400 hover:text-[#2E3192] dark:text-gray-500 dark:hover:text-[#2E3192] transition-colors p-0 h-auto"
            onClick={() => setAuthMode("forgot")}
          >
            Forgot your password?
          </Button>
        )}
      </CardFooter>
    </form>
  );
};

export default AuthForm;
