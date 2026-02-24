/**
 * NetworkStatusContext.tsx
 *
 * Provides real-time network status to the entire app.
 * Exposes { isOnline, pendingCount } via useNetworkStatus().
 *
 * When the app comes back online, syncManager.flushQueue() is triggered
 * automatically and `pendingCount` counts down to 0.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { flushQueue, getPendingCount } from "@/utils/syncManager";

interface NetworkStatusContextType {
  isOnline: boolean;
  pendingCount: number;
  /** Manually trigger a sync flush (e.g. from a retry button) */
  triggerSync: () => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: navigator.onLine,
  pendingCount: 0,
  triggerSync: () => {},
});

export function NetworkStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  // Avoid duplicate flushes in dev strict-mode double-mount
  const flushingRef = useRef(false);

  // Refresh pending count from IDB
  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // Flush queue and update count
  const triggerSync = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    console.log("[NetworkStatus] Online — flushing offline queue");
    try {
      await flushQueue(async (remaining) => {
        setPendingCount(remaining);
      });
    } finally {
      flushingRef.current = false;
      await refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    // Seed initial pending count
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
      // Also register a background sync tag so the SW can retry even when tab is closed
      try {
        navigator.serviceWorker?.ready.then((reg) => {
          (reg as any).sync?.register("sync-orders").catch(() => {});
        });
      } catch (_) {}
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for FLUSH_QUEUE messages from the Service Worker (background sync)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "FLUSH_QUEUE") {
        triggerSync();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
    };
  }, [triggerSync, refreshCount]);

  // Re-count whenever pendingCount could have changed (e.g. new write enqueued)
  // We expose refreshCount as a stable fn so child components can call it
  return (
    <NetworkStatusContext.Provider
      value={{ isOnline, pendingCount, triggerSync }}
    >
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatusContextType {
  return useContext(NetworkStatusContext);
}
