
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import "./App.css";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "./components/ui/error-boundary";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccessProvider } from "@/contexts/AccessContext";
import { useRealtimeAnalytics } from "@/hooks/useRealtimeAnalytics";
import Routes from "./components/Auth/Routes";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Real-time analytics wrapper component
function AppWithRealtime() {
  useRealtimeAnalytics(); // Initialize real-time subscriptions
  
  return (
    <div className="min-h-screen w-full overflow-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <Routes />
      <Toaster />
    </div>
  );
}

function App() {

  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="restaurant-pro-theme">
        <TooltipProvider>
          <AuthProvider>
            <AccessProvider>
              <ErrorBoundary>
                <Router>
                  <AppWithRealtime />
                </Router>
              </ErrorBoundary>
            </AccessProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
