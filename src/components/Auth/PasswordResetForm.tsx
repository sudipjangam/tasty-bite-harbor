import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";

interface ResetPasswordFormProps {
  setAuthMode: React.Dispatch<React.SetStateAction<"signin" | "signup" | "inquiry" | "forgot" | "reset">>;
  token?: string;
  email?: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ setAuthMode, token, email }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = (): string | null => {
    if (password.length < 8) return "Password must be at least 8 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    if (!token || !email) return "Invalid reset link. Please request a new one.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ token, email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      setSuccess(true);
      toast({
        title: "Password updated!",
        description: "Your password has been successfully reset. You can now sign in.",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      // Redirect to sign in after 3 seconds
      setTimeout(() => setAuthMode("signin"), 3000);
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast({
        title: "Failed to reset password",
        description: err.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // No token or email — show invalid link message
  if (!token || !email) {
    return (
      <div className="space-y-6 px-8 pb-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Invalid reset link</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setAuthMode("forgot")}
          className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl"
        >
          Request new reset link
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => setAuthMode("signin")}
          className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-700 font-medium h-12 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Button>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="space-y-6 px-8 pb-8">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Password reset successful!</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your password has been updated. You will be redirected to sign in shortly.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setAuthMode("signin")}
          className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl"
        >
          Sign in now
        </Button>
      </div>
    );
  }

  // Reset form
  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-8 pb-8">
      <div className="text-center space-y-2 mb-2">
        <div className="mx-auto w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Resetting password for <strong className="text-gray-900 dark:text-white">{email}</strong>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter your new password below. It must be at least 8 characters long.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          New Password
        </Label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 w-5 h-5 transition-colors" />
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
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
        {password && password.length < 8 && (
          <p className="text-xs text-amber-600">Password must be at least 8 characters</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Confirm Password
        </Label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 w-5 h-5 transition-colors" />
          <Input
            id="confirm-password"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            disabled={loading}
            className="pl-12 pr-12 h-14 bg-gray-50/50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 focus:ring-2 transition-all duration-200 rounded-xl text-base"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {confirmPassword && password !== confirmPassword && (
          <p className="text-xs text-red-500">Passwords do not match</p>
        )}
        {confirmPassword && password === confirmPassword && confirmPassword.length >= 8 && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Passwords match
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading || !password || !confirmPassword || password.length < 8 || password !== confirmPassword}
        className="w-full h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl text-base"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Resetting password...
          </>
        ) : (
          <>
            Reset password
            <ShieldCheck className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={() => setAuthMode("signin")}
        className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-700 font-medium transition-all duration-200 h-12 rounded-xl"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to sign in
      </Button>
    </form>
  );
};