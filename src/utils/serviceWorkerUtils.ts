// Service Worker Utilities
// Handles service worker lifecycle and update detection

export interface VersionInfo {
  version: string;
  buildTimestamp: string;
  buildDate: string;
}

export interface ServiceWorkerUpdateCallbacks {
  onUpdateAvailable?: () => void;
  onUpdateInstalled?: () => void;
  onNoUpdate?: () => void;
}

/**
 * Check if a new version is available by comparing local and remote version.json
 */
export async function checkForUpdates(): Promise<boolean> {
  try {
    const response = await fetch('/version.json', { cache: 'no-cache' });
    const remoteVersion: VersionInfo = await response.json();
    
    // Get current version (injected at build time)
    const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
    
    console.log('[SW] Current version:', currentVersion);
    console.log('[SW] Remote version:', remoteVersion.version);
    
    return remoteVersion.version !== currentVersion;
  } catch (error) {
    console.error('[SW] Failed to check for updates:', error);
    return false;
  }
}

/**
 * Register service worker with update detection
 */
export function registerServiceWorker(callbacks?: ServiceWorkerUpdateCallbacks): void {
  if (!('serviceWorker' in navigator)) {
    console.log('[SW] Service Worker not supported');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Registered:', registration.scope);

      // Check for updates on registration
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        console.log('[SW] New service worker found, installing...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('[SW] New version available!');
            callbacks?.onUpdateAvailable?.();
          }
        });
      });

      // Check for updates periodically (every 5 minutes)
      setInterval(async () => {
        console.log('[SW] Checking for updates...');
        await registration.update();
      }, 5 * 60 * 1000);

      // Check for updates when tab becomes visible
      document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
          console.log('[SW] Tab visible, checking for updates...');
          await registration.update();
        }
      });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading page...');
        callbacks?.onUpdateInstalled?.();
      });

    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipWaitingAndReload(): void {
  if (!navigator.serviceWorker.controller) return;

  // Send message to service worker to skip waiting
  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Get current app version
 */
export function getAppVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
}

/**
 * Get version info from version.json
 */
export async function getVersionInfo(): Promise<VersionInfo | null> {
  try {
    const response = await fetch('/version.json', { cache: 'no-cache' });
    return await response.json();
  } catch (error) {
    console.error('[SW] Failed to fetch version info:', error);
    return null;
  }
}
