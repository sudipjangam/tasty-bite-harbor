import React from "react";
import { Capacitor } from "@capacitor/core";
import PaymentDialog from "./PaymentDialog";
import type { PaymentDialogProps } from "./PaymentDialog/types";

/**
 * AdaptivePaymentDialog
 *
 * Smart wrapper that renders the correct dialog based on platform:
 *  - Web / Desktop  → PaymentDialog (standard web dialog, PDF support)
 *  - Android APK    → MobilePaymentDialog (touch-first, native printing)
 *
 * Uses React.lazy() so MobilePaymentDialog is EXCLUDED from the web bundle entirely.
 * This means no native-only imports (Capacitor plugins, etc.) ever execute on web.
 */

// Lazy-loaded: NOT bundled in web build. Only resolved when isNativePlatform() is true.
const MobilePaymentDialog = React.lazy(() => import("./MobilePaymentDialog"));

const AdaptivePaymentDialog: React.FC<PaymentDialogProps> = (props) => {
  if (Capacitor.isNativePlatform()) {
    return (
      <React.Suspense fallback={null}>
        <MobilePaymentDialog {...props} />
      </React.Suspense>
    );
  }
  return <PaymentDialog {...props} />;
};

export default AdaptivePaymentDialog;
