
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import "./App.css";
import { SimpleAuthProvider } from "@/hooks/useSimpleAuth";
import { ErrorBoundary } from "./components/ui/error-boundary";
import SimpleRoutes from "./components/Auth/SimpleRoutes";

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

function App() {
  console.log("App: Rendering application");
  
  return (
    <QueryClientProvider client={queryClient}>
      <SimpleAuthProvider>
        <ErrorBoundary>
          <Router>
            <div className="h-screen w-full overflow-hidden bg-gray-100">
              <SimpleRoutes />
              <Toaster />
            </div>
          </Router>
        </ErrorBoundary>
      </SimpleAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
