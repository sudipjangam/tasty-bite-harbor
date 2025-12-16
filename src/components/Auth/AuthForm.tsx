
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { CardContent, CardFooter } from "@/components/ui/card";

interface AuthFormProps {
  authMode: "signin" | "signup";
  setAuthMode: React.Dispatch<React.SetStateAction<"signin" | "signup">>;
}

const AuthForm: React.FC<AuthFormProps> = ({ authMode, setAuthMode }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
            navigate("/");
          }, 100);
        }
      } else {

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          }
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
            description: "Please check your email to confirm your registration.",
            className: "bg-green-50 border-green-200 text-green-800",
          });
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
    <form onSubmit={handleAuth} className="space-y-6">
      <CardContent className="space-y-6 px-8 pb-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </Label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 w-5 h-5 transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-12 h-14 bg-gray-50/50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 focus:ring-2 transition-all duration-200 rounded-xl text-base"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </Label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 w-5 h-5 transition-colors" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-12 pr-12 h-14 bg-gray-50/50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 focus:ring-2 transition-all duration-200 rounded-xl text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col px-8 pb-8 space-y-6">
        <Button
          type="submit"
          className="w-full h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl text-base"
          disabled={loading || !email || !password}
        >
          {loading ? (
            <>
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              {authMode === "signin" ? "Signing in..." : "Creating account..."}
            </>
          ) : (
            <>
              {authMode === "signin" ? "Sign in to dashboard" : "Create account"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
        
        <div className="w-full">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-800 px-3 text-gray-500 dark:text-gray-400 font-medium">
                {authMode === "signin" ? "New to RMS Pro?" : "Already have an account?"}
              </span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="ghost"
            className="mt-4 w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-700 font-medium transition-all duration-200 h-12 rounded-xl"
            onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {authMode === "signin" ? "Create a new account" : "Sign in to existing account"}
          </Button>
        </div>
        
        {authMode === "signin" && (
          <Button
            type="button"
            variant="link"
            className="text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
          >
            Forgot your password?
          </Button>
        )}
      </CardFooter>
    </form>
  );
};

export default AuthForm;
