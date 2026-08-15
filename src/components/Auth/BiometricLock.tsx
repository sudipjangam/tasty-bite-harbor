import React, { useEffect, useState, useCallback } from "react";
import { Fingerprint, ShieldAlert, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useBiometricAuth,
  clearBackgroundTs,
} from "@/hooks/useBiometricAuth";
import SwadeshiLoader from "@/styles/Loader/SwadeshiLoader";

interface BiometricLockProps {
  onUnlocked: () => void;
}

type State = "idle" | "prompting" | "failed" | "cancelled";

export const BiometricLock: React.FC<BiometricLockProps> = ({ onUnlocked }) => {
  const { authenticate, isAvailable } = useBiometricAuth();
  const [state, setState] = useState<State>("idle");
  const [supported, setSupported] = useState(true);

  const prompt = useCallback(async () => {
    setState("prompting");
    const ok = await authenticate({
      reason: "Authenticate to access Swadeshi Solutions",
    });
    if (ok) {
      clearBackgroundTs();
      setState("idle");
      onUnlocked();
    } else {
      setState("failed");
    }
  }, [authenticate, onUnlocked]);

  // Auto-trigger on mount
  useEffect(() => {
    isAvailable().then((avail) => {
      if (!avail) {
        setSupported(false);
        clearBackgroundTs();
        onUnlocked();
        return;
      }
      prompt();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#12141c]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center w-full max-w-sm px-6 animate-in fade-in zoom-in duration-500">
        
        {state === "prompting" ? (
          <div className="scale-110 mb-8">
            <SwadeshiLoader 
              loadingText="Scanning" 
              words={["identity", "biometrics", "security"]} 
            />
          </div>
        ) : (
          <>
            {/* Skeuomorphic Scanner Circle */}
            <div className="relative mb-12">
              {/* Outer Bevel */}
              <div className="h-40 w-40 rounded-full flex items-center justify-center bg-slate-50 dark:bg-[#12141c] shadow-[12px_12px_24px_#d1d5db,-12px_-12px_24px_#ffffff] dark:shadow-[12px_12px_24px_#0a0b10,-12px_-12px_24px_#1a1d28] transition-all duration-300">
                
                {/* Inner well */}
                <div className="h-32 w-32 rounded-full flex items-center justify-center bg-slate-100 dark:bg-[#0f1118] shadow-[inset_8px_8px_16px_#d1d5db,inset_-8px_-8px_16px_#ffffff] dark:shadow-[inset_8px_8px_16px_#07080b,inset_-8px_-8px_16px_#171a25]">
                  
                  {/* Glowing Icon */}
                  <div className={cn(
                    "flex items-center justify-center h-20 w-20 rounded-full transition-all duration-500",
                    state === "failed" 
                      ? "text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" 
                      : "text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                  )}>
                    {state === "failed" ? (
                      <ShieldAlert className="h-12 w-12 animate-bounce" strokeWidth={1.5} />
                    ) : (
                      <Fingerprint className="h-12 w-12" strokeWidth={1.5} />
                    )}
                  </div>
                  
                  {/* Glass reflection overlay */}
                  <div className="absolute top-0 left-0 w-full h-full rounded-full bg-gradient-to-tr from-transparent via-white/10 to-white/30 dark:via-white/5 dark:to-white/10 pointer-events-none" />
                </div>
              </div>
              
              {/* Pulsing ring if idle */}
              {state === "idle" && (
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
              )}
            </div>

            {/* Typography */}
            <div className="text-center space-y-3 mb-10">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                {state === "failed" ? "Access Denied" : "App Locked"}
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                {state === "failed"
                  ? "Biometric signature not recognized. Please try again or use your PIN."
                  : "Verify your identity using fingerprint or face scan to continue."}
              </p>
            </div>
            
            {/* Skeuomorphic Button */}
            <button
              onClick={prompt}
              className={cn(
                "group relative w-full h-14 flex items-center justify-center gap-3 rounded-2xl font-bold text-[15px] transition-all duration-200",
                "bg-slate-50 dark:bg-[#12141c] text-slate-700 dark:text-slate-200",
                "shadow-[6px_6px_12px_#d1d5db,-6px_-6px_12px_#ffffff] dark:shadow-[6px_6px_12px_#0a0b10,-6px_-6px_12px_#1a1d28]",
                "active:shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff] dark:active:shadow-[inset_4px_4px_8px_#07080b,inset_-4px_-4px_8px_#171a25]",
                "active:scale-[0.98]"
              )}
            >
              {state === "failed" ? (
                <>
                  <RefreshCw className="h-5 w-5 text-rose-500 group-active:-rotate-180 transition-transform duration-500" />
                  Try Again
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 text-blue-500 group-active:scale-90 transition-transform" />
                  Unlock App
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
