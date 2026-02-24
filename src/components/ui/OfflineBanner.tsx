/**
 * OfflineBanner.tsx
 *
 * Sticky amber banner shown at the top of the app when offline.
 * Shows a countdown of pending writes waiting to sync.
 *
 * Also displays a "Syncing..." indicator as the queue flushes.
 */

import React from "react";
import { WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { useNetworkStatus } from "@/contexts/NetworkStatusContext";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const { isOnline, pendingCount, triggerSync } = useNetworkStatus();

  if (isOnline && pendingCount === 0) return null;

  const syncingInProgress = isOnline && pendingCount > 0;

  return (
    <div
      className={cn(
        "w-full px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium z-[9999] transition-all",
        syncingInProgress
          ? "bg-blue-600 text-white"
          : "bg-amber-500 text-white",
      )}
    >
      <div className="flex items-center gap-2">
        {syncingInProgress ? (
          <>
            <CloudUpload className="h-4 w-4 animate-bounce shrink-0" />
            <span>
              Syncing {pendingCount} order{pendingCount !== 1 ? "s" : ""} to
              server…
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              Offline Mode
              {pendingCount > 0
                ? ` · ${pendingCount} order${pendingCount !== 1 ? "s" : ""} pending sync`
                : " · Orders will sync when connected"}
            </span>
          </>
        )}
      </div>

      {!isOnline && (
        <button
          onClick={triggerSync}
          className="flex items-center gap-1 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
          title="Retry sync"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
