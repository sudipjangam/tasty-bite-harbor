import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BrowserRouter as Router, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import "./App.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "./components/ui/error-boundary";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessProvider } from "@/contexts/AccessContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NetworkStatusProvider } from "@/contexts/NetworkStatusContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { useRealtimeAnalytics } from "@/hooks/useRealtimeAnalytics";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { usePermissions } from "@/hooks/usePermissions";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import Routes from "./components/Auth/Routes";
import NotificationListener from "@/components/Notifications/NotificationListener";
import OwnerNotificationListener from "@/components/Notifications/OwnerNotificationListener";
import { UpdateNotification } from "@/components/UpdateNotification";
import { registerServiceWorker } from "@/utils/serviceWorkerUtils";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/utils/platform";
import { AppUpdateChecker } from "@/components/AppUpdateChecker";
import { markBackgrounded, shouldLockOnResume, isBiometricEnabled } from "@/hooks/useBiometricAuth";

// BUG-18 fix: defer isNativeApp() call — will be checked at render time, not import time
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: !isNativeApp(),
        staleTime: 1000 * 60 * 3,
        gcTime: 1000 * 60 * 10,
        retry: 1,
      },
    },
  });
}

// Real-time analytics wrapper component
function AppWithRealtime() {
  useRealtimeAnalytics(); // Initialize real-time subscriptions
  useOfflineCache(); // Pre-populate IDB for offline use
  usePermissions(); // Request system permissions on startup
  usePushNotifications(); // Register for Push Notifications and upload token to Supabase
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only register service worker in web browser — native Capacitor handles asset caching
    if (!isNativeApp()) {
      registerServiceWorker({
        onUpdateAvailable: () => {
          setUpdateAvailable(true);
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isNativeApp()) {
      const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        focusManager.setFocused(isActive);
        // BUG-16 fix: wire biometric lock to Capacitor lifecycle
        if (!isActive) {
          markBackgrounded();
        }
        // Note: shouldLockOnResume check should be handled by BiometricGate component
      });
      return () => {
        listener.then((l) => l.remove());
      };
    }
  }, []);

  // Android hardware back button handler
  useEffect(() => {
    if (!isNativeApp()) return;

    const backListener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      const rootPaths = ["/", "/dashboard", "/auth", "/login", "/staff-login"];
      const currentPath = location.pathname.toLowerCase();

      if (rootPaths.includes(currentPath)) {
        // Exit app on top-level root screens
        CapacitorApp.exitApp();
      } else if (canGoBack || window.history.length > 1) {
        // Pop back inside app
        navigate(-1);
      } else {
        // Fallback to dashboard
        navigate("/dashboard");
      }
    });

    return () => {
      backListener.then((l) => l.remove()).catch(console.error);
    };
  }, [navigate, location.pathname]);

  return (
    <div className="min-h-screen w-full overflow-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <AppUpdateChecker>
        {/* Global offline indicator */}
        <OfflineBanner />
        <NotificationListener />
        <OwnerNotificationListener />
        <Routes />
        <Toaster />
        {updateAvailable && (
          <UpdateNotification onDismiss={() => setUpdateAvailable(false)} />
        )}
      </AppUpdateChecker>
    </div>
  );
}

function App() {
  // BUG-18 fix: create queryClient inside component so isNativeApp() runs after Capacitor init
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    // BUG-09 fix: only listen for deep links on native — CapacitorApp on web can throw
    if (!isNativeApp()) return;

    const listener = CapacitorApp.addListener('appUrlOpen', async (event) => {
      const url = new URL(event.url);
      if (url.protocol === 'com.swadeshisolutions.app:') {
        if (url.hash) {
          const hashStr = url.hash.startsWith('#') ? url.hash.substring(1) : url.hash;
          const hashParams = new URLSearchParams(hashStr);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          }
        }
      }
    });
    
    return () => {
      listener.then(l => l.remove()).catch(console.error);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="restaurant-pro-theme">
        <TooltipProvider>
          <AuthProvider>
            <AccessProvider>
              <CurrencyProvider>
                <BrandingProvider>
                  {/* NetworkStatusProvider must be inside AuthProvider to allow sync with auth context */}
                  <NetworkStatusProvider>
                    <ErrorBoundary>
                      <Router>
                        <AppWithRealtime />
                      </Router>
                    </ErrorBoundary>
                  </NetworkStatusProvider>
                </BrandingProvider>
              </CurrencyProvider>
            </AccessProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
