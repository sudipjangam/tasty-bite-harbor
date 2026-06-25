import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supabase, SUPABASE_DIRECT_URL } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface ForgotPasswordFormProps {
  setAuthMode: React.Dispatch<React.SetStateAction<"signin" | "signup" | "inquiry" | "forgot" | "reset">>;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ setAuthMode }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Check if user exists via our Edge Function
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }

      if (result.exists) {
        // User exists → Supabase built-in reset email was sent by the Edge Function
        setSent(true);
        toast({
          title: "Reset link sent!",
          description: "Check your email for a password reset link.",
          className: "bg-green-50 border-green-200 text-green-800",
        });
      } else {
        // User does NOT exist → encouragement email sent, show UI notification
        toast({
          title: "Business not registered",
          description: "This email is not registered with RMS Pro. We've sent you details on how to register your business.",
          variant: "destructive",
          duration: 8000,
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Success state — email sent
  if (sent) {
    return (
      <div className="space-y-6 px-8 pb-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Check your email</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We've sent a password reset link to <strong className="text-gray-900 dark:text-white">{email}</strong>.
            The link will expire in 20 minutes.
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              If you don't see the email, check your spam folder. The email is sent from Supabase.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setAuthMode("signin")}
          className="w-full h-12 rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Button>
      </div>
    );
  }

  // Form state
  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-8 pb-8">
      <div className="text-center space-y-2 mb-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="forgot-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Email address
        </Label>
        <div className="relative group">
          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#2E3192] w-5 h-5 transition-colors" />
          <Input
            id="forgot-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="pl-12 h-14 bg-gray-50/50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 focus:border-[#2E3192] focus:ring-[#2E3192]/20 focus:ring-2 transition-all duration-200 rounded-xl text-base"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !email}
        className="w-full h-14 bg-gradient-to-r from-[#2E3192] to-[#1a1f6e] hover:from-[#1a1f6e] hover:to-[#0d1045] text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl text-base"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Sending reset link...
          </>
        ) : (
          <>
            Send reset link
            <Mail className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={() => setAuthMode("signin")}
        className="w-full text-[#2E3192] hover:text-[#1a1f6e] hover:bg-[#2E3192]/5 dark:hover:bg-slate-700 font-medium transition-all duration-200 h-12 rounded-xl"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to sign in
      </Button>
    </form>
  );
};
