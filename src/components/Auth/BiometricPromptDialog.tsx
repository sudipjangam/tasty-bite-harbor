import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useToast } from "@/components/ui/use-toast";
import { isNativeApp } from "@/utils/platform";

export const BiometricPromptDialog = () => {
  const [open, setOpen] = useState(false);
  const { isAvailable, getBiometricEnabled, setBiometricEnabled, authenticate } = useBiometricAuth();
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
      // Force reload to apply lock immediately or just let it lock next time
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
      <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-white/20">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">Enhance Your Security</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Would you like to enable App Lock using your device's fingerprint or face authentication?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleEnable} size="lg" className="w-full gap-2 text-md h-12">
            <Fingerprint className="w-5 h-5" />
            Enable App Lock
          </Button>
          <Button onClick={handleSkip} variant="outline" size="lg" className="w-full h-12 border-gray-300">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
