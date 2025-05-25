
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import "./App.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { useIsMobile } from "./hooks/use-mobile";
import { ErrorBoundary } from "./components/ui/error-boundary";
import Routes from "./components/Auth/Routes";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  const isMobile = useIsMobile();

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Router>
            <div className="h-screen w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
              <Routes />
              <Toaster />
            </div>
          </Router>
        </ErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
