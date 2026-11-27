/**
 * NetworkStatusContext.tsx
 *
 * Provides real-time network status to the entire app.
 * Exposes { isOnline, pendingCount, triggerSync, refreshCount } via useNetworkStatus().
 *
 * When the app comes back online (or opens online with pending writes),
 * syncManager.flushQueue() is triggered automatically and `pendingCount` counts down to 0.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { App as CapacitorApp } from "@capacitor/app";
import {
  flushQueue,
  getPendingCount,
  hasLegacyPendingPayments,
} from "@/utils/syncManager";
import { OFFLINE_QUEUE_EVENT } from "@/utils/offlineDB";
import { isNativeApp } from "@/utils/platform";

interface NetworkStatusContextType {
  isOnline: boolean;
  pendingCount: number;
  /** Manually trigger a sync flush (e.g. from a retry button) */
  triggerSync: () => void;
  /** Re-read pending write count from IndexedDB */
  refreshCount: () => Promise<void>;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingCount: 0,
  triggerSync: () => {},
  refreshCount: async () => {},
});

export function NetworkStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  // Avoid duplicate flushes in dev strict-mode double-mount
  const flushingRef = useRef(false);
  const resyncNeededRef = useRef(false);

  // Refresh pending count from IDB (including any unmigrated legacy queue entries)
  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count + (hasLegacyPendingPayments() ? 1 : 0));
    } catch {
      // Ignore IDB errors in restricted environments
    }
  }, []);

  // Flush queue and update count
  const triggerSync = useCallback(async () => {
    if (flushingRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    flushingRef.current = true;
    try {
      await flushQueue(async (remaining) => {
        setPendingCount(remaining);
      });
    } finally {
      flushingRef.current = false;
      await refreshCount();
      if (resyncNeededRef.current) {
        resyncNeededRef.current = false;
        setTimeout(() => {
          void triggerSync().catch(() => {});
        }, 0);
      }
    }
  }, [refreshCount]);

  useEffect(() => {
    // Seed initial pending count and auto-flush if online on startup (including legacy queue)
    refreshCount().catch(() => {});
    if (typeof navigator === "undefined" || navigator.onLine) {
      if (hasLegacyPendingPayments()) {
        triggerSync().catch(() => {});
      }
      getPendingCount()
        .then((count) => {
          if (count > 0) triggerSync().catch(() => {});
        })
        .catch(() => {});
    }

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
      // BUG-08 fix: skip Service Worker sync on native Capacitor — no SW registered
      if (!isNativeApp()) {
        try {
          navigator.serviceWorker?.ready.then((reg) => {
            (reg as any).sync?.register("sync-orders").catch(() => {});
          });
        } catch {
          /* Service Worker sync unavailable */
        }
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChanged = (event: Event) => {
      refreshCount();
      if (
        flushingRef.current &&
        (event as CustomEvent)?.detail?.source === "enqueue"
      ) {
        resyncNeededRef.current = true;
      }
    };

    // Listen for FLUSH_QUEUE messages from the Service Worker (background sync)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "FLUSH_QUEUE") {
        triggerSync();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueChanged);

    // BUG-08 fix: only listen for SW messages on web
    if (!isNativeApp()) {
      navigator.serviceWorker?.addEventListener("message", handleSWMessage);
    }

    // On Android native, re-check network and flush pending queue when app returns to foreground
    let appListenerPromise: Promise<{ remove: () => Promise<void> }> | null =
      null;
    if (isNativeApp()) {
      appListenerPromise = CapacitorApp.addListener(
        "appStateChange",
        ({ isActive }) => {
          if (isActive) {
            const onlineNow =
              typeof navigator !== "undefined" ? navigator.onLine : true;
            setIsOnline(onlineNow);
            refreshCount();
            if (onlineNow) {
              triggerSync();
            }
          }
        },
      );
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueChanged);
      if (!isNativeApp()) {
        navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      }
      if (appListenerPromise) {
        appListenerPromise.then((l) => l.remove()).catch(() => {});
      }
    };
  }, [triggerSync, refreshCount]);

  return (
    <NetworkStatusContext.Provider
      value={{ isOnline, pendingCount, triggerSync, refreshCount }}
    >
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatusContextType {
  return useContext(NetworkStatusContext);
}
