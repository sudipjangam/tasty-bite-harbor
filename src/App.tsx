import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
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
import Routes from "./components/Auth/Routes";
import NotificationListener from "@/components/Notifications/NotificationListener";
import OwnerNotificationListener from "@/components/Notifications/OwnerNotificationListener";
import { UpdateNotification } from "@/components/UpdateNotification";
import { registerServiceWorker } from "@/utils/serviceWorkerUtils";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/utils/platform";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Real-time analytics wrapper component
function AppWithRealtime() {
  useRealtimeAnalytics(); // Initialize real-time subscriptions
  useOfflineCache(); // Pre-populate IDB for offline use
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Register service worker with update detection
    registerServiceWorker({
      onUpdateAvailable: () => {
        console.log("[App] Update available!");
        setUpdateAvailable(true);
      },
    });
  }, []);

  useEffect(() => {
    if (isNativeApp()) {
      const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        focusManager.setFocused(isActive);
      });
      return () => {
        listener.then((l) => l.remove());
      };
    }
  }, []);

  return (
    <div className="min-h-screen w-full overflow-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Global offline indicator */}
      <OfflineBanner />
      <NotificationListener />
      <OwnerNotificationListener />
      <Routes />
      <Toaster />
      {updateAvailable && (
        <UpdateNotification onDismiss={() => setUpdateAvailable(false)} />
      )}
    </div>
  );
}

function App() {
  useEffect(() => {
    // Listen for deep links (e.g. Supabase OAuth callback)
    const listener = CapacitorApp.addListener('appUrlOpen', async (event) => {
      const url = new URL(event.url);
      if (url.protocol === 'com.swadeshisolutions.app:') {
        if (url.hash) {
          // Parse the hash to extract tokens
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
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  );
}

export default App;
