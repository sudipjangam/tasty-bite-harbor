import React, { useEffect, useState, useCallback } from "react";
import { Fingerprint, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        // Device has no biometrics and no PIN → skip lock
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />

      {/* Logo area */}
      <div className="relative flex flex-col items-center gap-8 px-8">
        
        {state === "prompting" ? (
          <div className="scale-110">
            <SwadeshiLoader 
              loadingText="verifying" 
              words={["identity", "biometrics", "security", "access", "identity"]} 
            />
          </div>
        ) : (
          <>
            {/* Shield icon */}
            <div
              className={cn(
                "flex h-28 w-28 items-center justify-center rounded-3xl shadow-2xl transition-all duration-300",
                state === "failed"
                  ? "bg-destructive/10 border-2 border-destructive/40"
                  : "bg-primary/10 border-2 border-primary/30"
              )}
            >
              {state === "failed" ? (
                <ShieldCheck className="h-12 w-12 text-destructive" />
              ) : (
                <Fingerprint className="h-12 w-12 text-primary" />
              )}
            </div>

            {/* Text */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                {state === "failed" ? "Authentication Failed" : "Swadeshi Solutions"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                {state === "failed"
                  ? "Biometric not recognized. Try again."
                  : "Use fingerprint, face ID, or device PIN to continue"}
              </p>
            </div>
            
            {/* Retry / Authenticate button */}
            <Button
              size="lg"
              className="w-48 gap-2"
              onClick={prompt}
            >
              {state === "failed" ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" />
                  Authenticate
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
