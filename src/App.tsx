import { useEffect, useState } from "react";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/components/Layout/Sidebar";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Menu from "@/pages/Menu";
import Orders from "@/pages/Orders";
import NotFound from "@/pages/NotFound";
import Tables from "@/pages/Tables";
import Settings from "@/pages/Settings";
import Rooms from "@/pages/Rooms";
import Inventory from "@/pages/Inventory";
import Suppliers from "@/pages/Suppliers";
import Staff from "@/pages/Staff";
import Analytics from "@/pages/Analytics";
import BusinessDashboard from "./components/Analytics/BusinessDashboard";
import AI from "@/pages/AI";
import Customers from "@/pages/Customers";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2 } from "lucide-react";
import "./App.css";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          if (isMounted) {
            setIsLoggedIn(false);
            setIsLoading(false);
          }
          return;
        }
        
        if (isMounted) {
          setIsLoggedIn(!!data.session);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        if (isMounted) {
          setIsLoggedIn(false);
          setIsLoading(false);
        }
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          setIsLoggedIn(!!session);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="restaurant-theme">
      <BrowserRouter>
        <SidebarProvider>
          <main className="flex min-h-screen w-full">
            {isLoggedIn && <Sidebar />}
            <div className={`flex-1 ${isLoggedIn ? "ml-0 md:ml-64" : ""} transition-all`}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/menu"
                  element={
                    <ProtectedRoute>
                      <Menu />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <Orders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tables"
                  element={
                    <ProtectedRoute>
                      <Tables />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rooms"
                  element={
                    <ProtectedRoute>
                      <Rooms />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <ProtectedRoute>
                      <Inventory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/suppliers"
                  element={
                    <ProtectedRoute>
                      <Suppliers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute>
                      <Staff />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/business-dashboard"
                  element={
                    <ProtectedRoute>
                      <BusinessDashboard />
                    </ProtectedRoute>
                  }
                /> 
                <Route
                  path="/ai"
                  element={
                    <ProtectedRoute>
                      <AI />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <ProtectedRoute>
                      <Customers />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <div className="fixed bottom-6 right-6 z-50">
              <ThemeToggle />
            </div>
          </main>
          <Toaster />
        </SidebarProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
