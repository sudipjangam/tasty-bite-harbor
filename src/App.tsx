
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "./components/Layout/Sidebar";
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import Orders from "./pages/Orders";
import Tables from "./pages/Tables";
import Staff from "./pages/Staff";
import Inventory from "./pages/Inventory";
import Rooms from "./pages/Rooms";
import Suppliers from "./pages/Suppliers";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-muted">
                    <Sidebar />
                    <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                      <div className="max-w-7xl mx-auto">
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/menu" element={<Menu />} />
                          <Route path="/orders" element={<Orders />} />
                          <Route path="/tables" element={<Tables />} />
                          <Route path="/staff" element={<Staff />} />
                          <Route path="/inventory" element={<Inventory />} />
                          <Route path="/rooms" element={<Rooms />} />
                          <Route path="/suppliers" element={<Suppliers />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
