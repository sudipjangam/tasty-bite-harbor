/**
 * Lightweight native haptic feedback utility using HTML5 Vibration API.
 * Supported natively in Android Capacitor WebView with 0 bundle overhead.
 */

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export const triggerHaptic = (style: HapticStyle = "light"): void => {
  if (typeof window === "undefined" || typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  try {
    switch (style) {
      case "light":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(25);
        break;
      case "heavy":
        navigator.vibrate(45);
        break;
      case "success":
        navigator.vibrate([15, 60, 25]);
        break;
      case "warning":
        navigator.vibrate([30, 50, 30]);
        break;
      case "error":
        navigator.vibrate([50, 60, 50]);
        break;
      default:
        navigator.vibrate(15);
    }
  } catch {
    // Non-critical API: ignore environments blocking vibration
  }
};
