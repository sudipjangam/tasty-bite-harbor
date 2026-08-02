import { useCallback } from "react";
import { BiometricAuth, BiometryError, BiometryErrorType } from "@aparajita/capacitor-biometric-auth";
import { isNativeApp } from "@/utils/platform";

const STORAGE_KEY = "biometric_lock_enabled";
const BACKGROUND_TS_KEY = "app_background_ts";
const LOCK_AFTER_SECONDS = 30;

// ─── Persistence helpers ──────────────────────────────────────────────────────
export const getBiometricEnabled = (): boolean => {
  if (!isNativeApp()) return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
};

export const setBiometricEnabled = (enabled: boolean): void => {
  localStorage.setItem(STORAGE_KEY, String(enabled));
};

export const shouldLockOnResume = (): boolean => {
  const ts = localStorage.getItem(BACKGROUND_TS_KEY);
  if (!ts) return false;
  const elapsed = (Date.now() - Number(ts)) / 1000;
  return elapsed >= LOCK_AFTER_SECONDS;
};

export const markBackgrounded = (): void => {
  localStorage.setItem(BACKGROUND_TS_KEY, String(Date.now()));
};

export const clearBackgroundTs = (): void => {
  localStorage.removeItem(BACKGROUND_TS_KEY);
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useBiometricAuth = () => {
  /**
   * Returns true if the device supports biometrics / device credentials.
   */
  const isAvailable = useCallback(async (): Promise<boolean> => {
    if (!isNativeApp()) return false;
    try {
      const result = await BiometricAuth.checkBiometry();
      return result.isAvailable;
    } catch {
      return false;
    }
  }, []);

  /**
   * Trigger the OS authentication prompt.
   * Returns true on success, false on failure/cancel.
   */
  const authenticate = useCallback(
    async (options?: { reason?: string; cancelTitle?: string }): Promise<boolean> => {
      if (!isNativeApp()) return true; // no-op on web
      try {
        await BiometricAuth.authenticate({
          reason: options?.reason ?? "Verify your identity to continue",
          cancelTitle: options?.cancelTitle ?? "Cancel",
          allowDeviceCredential: true, // fallback to PIN / pattern / password
          iosFallbackTitle: "Use Passcode",
        });
        return true;
      } catch (err) {
        const bioErr = err as BiometryError;
        // User cancelled — not an error we need to log
        if (bioErr.code === BiometryErrorType.userCancel) return false;
        if (bioErr.code === BiometryErrorType.userFallback) return false;
        console.warn("[BiometricAuth] Error:", bioErr.message);
        return false;
      }
    },
    []
  );

  return { isAvailable, authenticate, getBiometricEnabled, setBiometricEnabled };
};
