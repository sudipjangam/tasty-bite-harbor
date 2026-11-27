import * as SentryReact from "@sentry/react";
import * as SentryCapacitor from "@sentry/capacitor";
import { isNativeApp } from "@/utils/platform";

declare const __APP_VERSION__: string | undefined;

let sentryInitialized = false;

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "apikey",
  "x-api-key",
  "cookie",
  "set-cookie",
]);

function scrubEvent<T extends { request?: { headers?: Record<string, unknown> } }>(event: T): T {
  if (event.request?.headers) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.request.headers)) {
      sanitized[key] = SENSITIVE_HEADER_KEYS.has(key.toLowerCase()) ? "[Filtered]" : value;
    }
    event.request.headers = sanitized;
  }
  return event;
}

/**
 * Initialize Sentry for Web and Capacitor Android.
 * Safely no-ops when VITE_SENTRY_DSN is not configured.
 */
export function initSentry(dsnOverride?: string): boolean {
  if (sentryInitialized) return true;

  const dsn = dsnOverride ?? import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || typeof dsn !== "string" || !dsn.trim()) {
    return false;
  }

  const release = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : undefined;
  const isDev = import.meta.env.DEV || import.meta.env.MODE === "development";
  const options: SentryReact.BrowserOptions = {
    dsn: dsn.trim(),
    environment: import.meta.env.MODE || "production",
    release,
    tracesSampleRate: isDev ? 1.0 : 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubEvent(event);
    },
  };

  if (isNativeApp()) {
    SentryCapacitor.init(options, SentryReact.init);
  } else {
    SentryReact.init(options);
  }

  sentryInitialized = true;
  return true;
}

/**
 * Forward an exception to Sentry when initialized.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!sentryInitialized) return;

  if (context && Object.keys(context).length > 0) {
    SentryReact.captureException(error, { extra: context });
  } else {
    SentryReact.captureException(error);
  }
}

export function _resetSentryForTests(): void {
  sentryInitialized = false;
}
