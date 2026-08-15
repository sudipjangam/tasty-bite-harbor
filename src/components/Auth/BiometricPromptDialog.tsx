import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, ShieldCheck, Sparkles, Lock, Zap } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useToast } from "@/components/ui/use-toast";
import { isNativeApp } from "@/utils/platform";

export const BiometricPromptDialog = () => {
  const [open, setOpen] = useState(false);
  const { isAvailable, getBiometricEnabled, setBiometricEnabled, authenticate } =
    useBiometricAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Only run this check on native apps
    if (!isNativeApp()) return;

    const checkAndPrompt = async () => {
      const isEnabled = getBiometricEnabled();
      const hasPrompted = localStorage.getItem("biometric_setup_prompted");

      // If they already enabled it, or we already asked them before, do nothing
      if (isEnabled || hasPrompted) return;

      const supported = await isAvailable();
      if (supported) {
        // Show the prompt dialog
        setOpen(true);
      }
    };

    // Slight delay so it doesn't jarringly appear before the UI settles
    const timeout = setTimeout(checkAndPrompt, 1500);
    return () => clearTimeout(timeout);
  }, [isAvailable, getBiometricEnabled]);

  const handleEnable = async () => {
    localStorage.setItem("biometric_setup_prompted", "true");

    // Authenticate once to verify they are the owner
    const success = await authenticate({ reason: "Verify to enable App Lock" });
    if (success) {
      setBiometricEnabled(true);
      setOpen(false);
      toast({
        title: "App Lock Enabled",
        description: "Your app is now secured with biometrics.",
      });
    } else {
      toast({
        title: "Verification Failed",
        description: "Could not enable app lock.",
        variant: "destructive",
      });
      setOpen(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("biometric_setup_prompted", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleSkip()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 rounded-[2.25rem] bg-gradient-to-b from-white via-slate-50 to-indigo-50/40 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/30 shadow-[0_25px_70px_-15px_rgba(79,70,229,0.35),0_10px_30px_-5px_rgba(0,0,0,0.15)] ring-1 ring-white/80 dark:ring-white/10">
        {/* Top ambient decorative glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-44 bg-gradient-to-br from-indigo-400/30 via-purple-400/25 to-pink-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-7 pt-8 pb-7 flex flex-col items-center">
          {/* Security Chip Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 dark:border-indigo-400/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold tracking-wider uppercase mb-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]">
            <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
            <span>Biometric Protection</span>
          </div>

          {/* 3D Skeuomorphic Biometric Icon Emblem */}
          <div className="relative mb-6 group">
            {/* Outer soft glow ring */}
            <div className="absolute -inset-2.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-30 blur-lg group-hover:opacity-45 transition-opacity" />

            {/* Outer embossed bezel */}
            <div className="relative w-24 h-24 rounded-[1.75rem] p-1 bg-gradient-to-b from-white to-gray-200 dark:from-gray-700 dark:to-gray-900 shadow-[0_12px_24px_-6px_rgba(79,70,229,0.35),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.15)]">
              {/* Inner gradient core */}
              <div className="w-full h-full rounded-[1.5rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex items-center justify-center relative overflow-hidden shadow-[inset_0_3px_6px_rgba(255,255,255,0.35),inset_0_-4px_8px_rgba(0,0,0,0.4)]">
                {/* Gloss specular highlight */}
                <div className="absolute -top-6 -left-6 w-20 h-20 bg-white/25 rounded-full blur-sm pointer-events-none transform rotate-12" />

                {/* Fingerprint + Shield overlay */}
                <div className="relative flex items-center justify-center">
                  <Fingerprint className="w-11 h-11 text-white/95 drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]" />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.6)] border-2 border-white dark:border-gray-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Header Text */}
          <DialogHeader className="space-y-2 text-center">
            <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Enhance Your Security
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-gray-600 dark:text-gray-300 max-w-[280px] mx-auto leading-relaxed">
              Unlock your restaurant POS instantly using your fingerprint or Face ID.
            </DialogDescription>
          </DialogHeader>

          {/* Benefit Cards / Pillars */}
          <div className="w-full grid grid-cols-2 gap-2.5 mt-5 mb-6">
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/80 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">
                  1-Tap Unlock
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  Faster than PIN
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/80 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">
                  Hardware Safe
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                  Device encrypted
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col gap-2.5">
            {/* Skeuomorphic Glossy Primary Button */}
            <button
              type="button"
              onClick={handleEnable}
              className="relative w-full h-13 py-3.5 px-6 rounded-2xl font-bold text-white text-base tracking-wide flex items-center justify-center gap-2.5 bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 shadow-[0_8px_20px_-4px_rgba(79,70,229,0.5),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.25)] border border-indigo-400/40 active:translate-y-0.5 active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.3)] transition-all cursor-pointer overflow-hidden group"
            >
              {/* Button light reflection swipe */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 pointer-events-none" />
              <Fingerprint className="w-5 h-5 text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                Enable App Lock
              </span>
            </button>

            {/* Tactile Secondary Button */}
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/50 active:bg-gray-200/60 transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

