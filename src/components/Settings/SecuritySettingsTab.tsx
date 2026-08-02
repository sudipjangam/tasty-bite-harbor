import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Fingerprint, Loader2 } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { isNativeApp } from "@/utils/platform";
import { useToast } from "@/components/ui/use-toast";

export const SecuritySettingsTab = () => {
  const { isAvailable, getBiometricEnabled, setBiometricEnabled, authenticate } = useBiometricAuth();
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(getBiometricEnabled());
  const { toast } = useToast();

  useEffect(() => {
    isAvailable().then(avail => {
      setSupported(avail);
      setLoading(false);
    });
  }, [isAvailable]);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // Prompt user to verify before enabling
      const success = await authenticate({ reason: "Verify to enable App Lock" });
      if (success) {
        setBiometricEnabled(true);
        setEnabled(true);
        toast({ title: "App Lock Enabled", description: "Biometric lock is now active." });
      } else {
        toast({ title: "Verification Failed", description: "Could not enable app lock.", variant: "destructive" });
      }
    } else {
      // Just disable it
      setBiometricEnabled(false);
      setEnabled(false);
      toast({ title: "App Lock Disabled", description: "Biometric lock has been removed." });
    }
  };

  if (!isNativeApp()) {
    return (
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" /> Security Settings
          </CardTitle>
          <CardDescription>Security features for the mobile app.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">App Lock is only available on the native mobile app.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" /> Security Settings
        </CardTitle>
        <CardDescription>Manage your app's security and authentication methods.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-muted">
          <div className="space-y-1">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Fingerprint className="h-4 w-4" /> App Lock
            </Label>
            <p className="text-sm text-muted-foreground">
              Require fingerprint, face, or PIN to open the app.
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={!supported}
            />
          )}
        </div>
        {!supported && !loading && (
          <p className="text-sm text-destructive px-2">
            * Your device does not support biometric authentication or it is not set up.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
